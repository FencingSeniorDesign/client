// bracket.ts - DE bracket-related database functions
import { and, count, eq, asc, desc, isNull, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Event, Round, Fencer } from '../../navigation/navigation/types';

/**
 * Generates the standard bracket positions for a given table size
 * @param tableSize The size of the DE table (must be a power of 2)
 * @returns An array of pairs [seedA, seedB] for each first round match
 */
export function generateBracketPositions(tableSize: number): [number, number][] {
    const positions: [number, number][] = [];

    // For a table of size N, the first round has N/2 bouts
    for (let i = 0; i < tableSize / 2; i++) {
        // Standard bracket pairing: 1 vs N, 2 vs N-1, etc.
        const seedA = i + 1;
        const seedB = tableSize - i;
        positions.push([seedA, seedB]);
    }

    return positions;
}

/**
 * Creates the first round DE bouts based on seeding and table size
 */
export async function createDEBoutsForRound(
    event: Event,
    round: any,
    fencers: Fencer[],
    seeding: any[]
): Promise<void> {
    try {
        console.log(
            `Creating first round DE bouts for event ${event.id}, round ${round.id} with ${fencers.length} fencers`
        );
        console.log(`Seeding data: ${seeding.length} entries`);

        // Check if bouts already exist for this round to prevent duplicates
        const existingBouts = await db
            .select({ count: count() })
            .from(schema.bouts)
            .where(eq(schema.bouts.roundid, round.id));

        if (existingBouts[0]?.count > 0) {
            console.log(`Bouts already exist for round ${round.id}. Skipping creation to prevent duplicates.`);
            return;
        }

        // Determine the appropriate table size based on number of fencers
        const fencerCount = fencers.length;
        let tableSize = 2;
        while (tableSize < fencerCount) {
            tableSize *= 2;
        }

        console.log(`Using table size ${tableSize} for ${fencerCount} fencers`);

        // Use a transaction to ensure all operations succeed or fail together
        await db.transaction(async tx => {
            try {
                // Update the round with the DE table size
                await tx.update(schema.rounds).set({ detablesize: tableSize }).where(eq(schema.rounds.id, round.id));

                // Sort fencers by seed
                const sortedFencers = [...seeding].sort((a, b) => a.seed - b.seed);

                // Generate standard bracket positions
                const positions = generateBracketPositions(tableSize);
                console.log(`Generated ${positions.length} bracket positions`);

                // Track created bout IDs for better error handling
                const createdBoutIds = [];

                // Place fencers according to seeding
                for (let i = 0; i < positions.length; i++) {
                    const [posA, posB] = positions[i];

                    // Get fencers for this bout (or null for byes)
                    const fencerA = posA <= sortedFencers.length ? sortedFencers[posA - 1].fencer : null;
                    const fencerB = posB <= sortedFencers.length ? sortedFencers[posB - 1].fencer : null;

                    // If both fencers are null, skip this bout
                    if (!fencerA && !fencerB) {
                        console.log(`Skipping bout ${i + 1} as both fencers are null`);
                        continue;
                    }

                    // If only one fencer, it's a bye
                    const isBye = !fencerA || !fencerB;

                    // If it's a bye, the present fencer automatically advances
                    const victor = isBye ? (fencerA ? fencerA.id : fencerB.id) : null;

                    console.log(
                        `Creating bout ${i + 1}: ${fencerA?.fname || 'BYE'} vs ${fencerB?.fname || 'BYE'}, bye: ${isBye}, victor: ${victor}`
                    );

                    // Insert the bout
                    const boutResult = await tx
                        .insert(schema.bouts)
                        .values({
                            lfencer: fencerA ? fencerA.id : null,
                            rfencer: fencerB ? fencerB.id : null,
                            victor: victor,
                            eventid: event.id,
                            roundid: round.id,
                            tableof: tableSize,
                        })
                        .returning({ id: schema.bouts.id });

                    const boutId = boutResult[0].id;
                    createdBoutIds.push(boutId);
                    console.log(`Created bout with ID ${boutId}`);

                    // For byes, we don't award any points as the fencer didn't actually fence
                    // We only mark the victor for advancement purposes
                    if (isBye && victor) {
                        console.log(`Bye for fencer ${victor} in bout ${boutId} - advancing without points`);
                    }
                }

                // Create ALL rounds in advance so they appear in the UI immediately
                let currentTableSize = tableSize;
                while (currentTableSize > 2) {
                    currentTableSize = currentTableSize / 2;
                    console.log(`Creating bouts for table of ${currentTableSize}`);

                    // Create placeholders for all bouts in this round
                    for (let i = 0; i < currentTableSize / 2; i++) {
                        await tx.insert(schema.bouts).values({
                            lfencer: null, // Will be populated as fencers advance
                            rfencer: null, // Will be populated as fencers advance
                            eventid: event.id,
                            roundid: round.id,
                            tableof: currentTableSize,
                        });
                    }
                }

                // For byes in the first round, advance fencers to the next round
                if (fencers.length < tableSize) {
                    console.log(`Advancing fencers with byes to next round (${tableSize / 2})`);

                    // Get all completed bouts from first round (byes)
                    const byeBouts = await tx
                        .select()
                        .from(schema.bouts)
                        .where(
                            and(
                                eq(schema.bouts.roundid, round.id),
                                eq(schema.bouts.tableof, tableSize),
                                isNotNull(schema.bouts.victor)
                            )
                        )
                        .orderBy(schema.bouts.id);

                    // Get next round bouts
                    const nextRoundBouts = await tx
                        .select()
                        .from(schema.bouts)
                        .where(and(eq(schema.bouts.roundid, round.id), eq(schema.bouts.tableof, tableSize / 2)))
                        .orderBy(schema.bouts.id);

                    // Place bye winners in correct positions in next round
                    for (let i = 0; i < byeBouts.length; i += 2) {
                        const boutA = byeBouts[i];
                        const nextBoutIndex = Math.floor(i / 2);

                        if (nextBoutIndex < nextRoundBouts.length) {
                            const nextBout = nextRoundBouts[nextBoutIndex];

                            // Place first winner
                            if (boutA.victor) {
                                await tx
                                    .update(schema.bouts)
                                    .set({ lfencer: boutA.victor })
                                    .where(eq(schema.bouts.id, nextBout.id));
                            }

                            // Place second winner if available
                            if (i + 1 < byeBouts.length) {
                                const boutB = byeBouts[i + 1];
                                if (boutB.victor) {
                                    await tx
                                        .update(schema.bouts)
                                        .set({ rfencer: boutB.victor })
                                        .where(eq(schema.bouts.id, nextBout.id));
                                }
                            }
                        }
                    }
                }

                console.log(`Successfully created all DE bouts for table size ${tableSize}`);
            } catch (error) {
                console.error('Error in DE bout creation transaction:', error);
                throw error; // Re-throw to trigger transaction rollback
            }
        });
    } catch (error) {
        console.error('Error creating first round DE bouts:', error);
        throw error;
    }
}

/**
 * Checks if a DE round has completed (final bout has a winner)
 */
export async function dbIsDERoundComplete(roundId: number): Promise<boolean> {
    try {
        // Get information about the round format first
        const round = await db
            .select({
                deformat: schema.rounds.deformat,
                type: schema.rounds.type,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        // If it's not a DE round, return false
        if (!round.length || round[0].type !== 'de') return false;

        // For single elimination, check if the finals bout has a winner
        const finalBoutResult = await db
            .select({
                count: count(),
            })
            .from(schema.bouts)
            .where(and(eq(schema.bouts.roundid, roundId), eq(schema.bouts.tableof, 2), isNotNull(schema.bouts.victor)));

        return finalBoutResult[0].count > 0;
    } catch (error) {
        console.error('Error checking if DE round is complete:', error);
        return false;
    }
}

/**
 * Gets the bracket structure for a round
 */
export async function dbGetBracketForRound(roundId: number): Promise<any> {
    try {
        // Get all bouts for single elimination
        const bouts = await db
            .select()
            .from(schema.bouts)
            .where(eq(schema.bouts.roundid, roundId))
            .orderBy(desc(schema.bouts.tableof), asc(schema.bouts.id));

        // Get the table size for the round
        const tableSize = await db
            .select({
                detablesize: schema.rounds.detablesize,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        // Structure the data for a single elimination bracket
        const bracket = {
            type: 'single',
            tableSize: tableSize[0]?.detablesize || 0,
            rounds: Math.log2(tableSize[0]?.detablesize || 2),
            bouts,
        };

        return bracket;
    } catch (error) {
        console.error('Error getting bracket for round:', error);
        return null;
    }
}
