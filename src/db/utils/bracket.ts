// bracket.ts - DE bracket-related database functions
import { and, count, eq, asc, desc, isNull, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Event, Round, Fencer } from '../../navigation/navigation/types';
import { generateDoubleEliminationStructure, placeFencersInDoubleElimination } from '../../navigation/utils/DoubleEliminationUtils';
import { generateCompassDrawStructure, placeFencersInCompassDraw } from '../../navigation/utils/CompassDrawUtils';

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
export async function createFirstRoundDEBouts(
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
                        .where(
                            and(
                                eq(schema.bouts.roundid, round.id),
                                eq(schema.bouts.tableof, tableSize / 2)
                            )
                        )
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
 * Creates bouts for the next DE round after all bouts in the current round are complete
 */
export async function createNextRoundBouts(roundId: number, tableOf: number): Promise<void> {
    try {
        // Use the transaction version but create our own transaction context
        await db.transaction(async tx => {
            await createNextRoundBoutsInTransaction(tx, roundId, tableOf);
        });
    } catch (error) {
        console.error('Error creating next round bouts:', error);
        throw error;
    }
}

/**
 * Transaction-aware version of createNextRoundBouts that works within an existing transaction
 */
export async function createNextRoundBoutsInTransaction(tx: any, roundId: number, tableOf: number): Promise<void> {
    try {
        // Check if bouts already exist for this table size to prevent duplicates
        const existingBouts = await tx
            .select({ count: count() })
            .from(schema.bouts)
            .where(and(eq(schema.bouts.roundid, roundId), eq(schema.bouts.tableof, tableOf)));

        if (existingBouts[0]?.count > 0) {
            console.log(`Bouts already exist for round ${roundId} and table size ${tableOf}. Skipping creation.`);
            return;
        }

        // Get the round and event info
        const round = await tx.select().from(schema.rounds).where(eq(schema.rounds.id, roundId)).limit(1);

        if (!round.length) throw new Error(`Round with id ${roundId} not found`);

        // Get all completed bouts from the previous round (higher tableOf)
        const prevTableOf = tableOf * 2;
        const prevBouts = await tx
            .select()
            .from(schema.bouts)
            .where(
                and(
                    eq(schema.bouts.roundid, roundId),
                    eq(schema.bouts.tableof, prevTableOf),
                    isNotNull(schema.bouts.victor)
                )
            )
            .orderBy(schema.bouts.id);

        // Create bouts for the next round
        for (let i = 0; i < prevBouts.length; i += 2) {
            const boutA = prevBouts[i];

            // If we don't have enough bouts, break
            if (i + 1 >= prevBouts.length) break;

            const boutB = prevBouts[i + 1];

            // Create a new bout with the winners from boutA and boutB
            await tx.insert(schema.bouts).values({
                lfencer: boutA.victor,
                rfencer: boutB.victor,
                eventid: round[0].eventid,
                roundid: roundId,
                tableof: tableOf,
            });
        }

        console.log(`Created ${Math.floor(prevBouts.length / 2)} bouts for table of ${tableOf}`);

        // If tableOf is 2, we've reached the final
        if (tableOf === 2) {
            console.log('Reached the final bout');
        }
    } catch (error) {
        console.error('Error creating next round bouts in transaction:', error);
        throw error;
    }
}

/**
 * Creates a double elimination bracket structure in the database.
 */
export async function dbCreateDoubleEliminationBracket(
    roundId: number,
    tableSize: number,
    seededFencers: { fencer: any; seed: number }[]
): Promise<void> {
    console.log('Double elimination bracket creation is disabled and will be reimplemented later');
    // Return without creating any brackets - feature has been disabled
    return;
}

/**
 * Creates a compass draw bracket structure in the database.
 */
export async function dbCreateCompassDrawBracket(
    roundId: number,
    tableSize: number,
    seededFencers: { fencer: any; seed: number }[]
): Promise<void> {
    console.log('Compass draw bracket creation is disabled and will be reimplemented later');
    // Return without creating any brackets - feature has been disabled
    return;
}

/**
 * Gets bouts for a double elimination format
 */
export async function dbGetDoubleBracketBouts(
    roundId: number
): Promise<{ winners: any[]; losers: any[]; finals: any[] }> {
    // Return empty brackets - feature has been temporarily disabled
    console.log('Double elimination brackets temporarily disabled');
    return { winners: [], losers: [], finals: [] };
}

/**
 * Gets bouts for a compass draw format
 */
export async function dbGetCompassBracketBouts(
    roundId: number
): Promise<{ east: any[]; north: any[]; west: any[]; south: any[] }> {
    // Return empty brackets - feature has been temporarily disabled
    console.log('Compass draw brackets temporarily disabled');
    return { east: [], north: [], west: [], south: [] };
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

        let isComplete = false;

        // Check completion based on the DE format
        if (round[0].deformat === 'single') {
            // For single elimination, check if the finals bout has a winner
            const finalBoutResult = await db
                .select({
                    count: count(),
                })
                .from(schema.bouts)
                .where(
                    and(eq(schema.bouts.roundid, roundId), eq(schema.bouts.tableof, 2), isNotNull(schema.bouts.victor))
                );

            isComplete = finalBoutResult[0].count > 0;
        } else if (round[0].deformat === 'double') {
            // For double elimination, check if the finals bracket has a winner
            const finalBoutResult = await db
                .select({
                    count: count(),
                })
                .from(schema.bouts)
                .innerJoin(schema.deBracketBouts, eq(schema.bouts.id, schema.deBracketBouts.bout_id))
                .where(
                    and(
                        eq(schema.bouts.roundid, roundId),
                        eq(schema.deBracketBouts.bracket_type, 'finals'),
                        isNotNull(schema.bouts.victor)
                    )
                );

            isComplete = finalBoutResult[0].count > 0;
        } else if (round[0].deformat === 'compass') {
            // For compass draw, check if the east bracket final is complete
            const eastFinalResult = await db
                .select({
                    count: count(),
                })
                .from(schema.bouts)
                .innerJoin(schema.deBracketBouts, eq(schema.bouts.id, schema.deBracketBouts.bout_id))
                .where(
                    and(
                        eq(schema.bouts.roundid, roundId),
                        eq(schema.deBracketBouts.bracket_type, 'east'),
                        eq(schema.deBracketBouts.bracket_round, 1),
                        isNotNull(schema.bouts.victor)
                    )
                );

            isComplete = eastFinalResult[0].count > 0;
        }

        return isComplete;
    } catch (error) {
        console.error('Error checking if DE round is complete:', error);
        return false;
    }
}

/**
 * Gets summary statistics for a DE round
 */
export async function dbGetDESummary(roundId: number): Promise<{
    totalFencers: number;
    tableSize: number;
    remainingFencers: number;
    currentRound: number;
    totalRounds: number;
    topSeeds: any[];
}> {
    try {
        // Get the round information
        const round = await db
            .select({
                id: schema.rounds.id,
                eventid: schema.rounds.eventid,
                detablesize: schema.rounds.detablesize,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!round.length) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Get the total number of fencers in the event
        const fencersResult = await db
            .select({
                count: count(),
            })
            .from(schema.fencerEvents)
            .where(eq(schema.fencerEvents.eventid, round[0].eventid));

        const totalFencers = fencersResult[0].count;

        // Get the table size
        const tableSize = round[0].detablesize || 0;

        // Get the number of remaining fencers (those who have not been eliminated yet)
        const remainingResult = await db.execute(sql`
      SELECT COUNT(DISTINCT fencerid) as count 
      FROM ${schema.fencerBouts} fb
      JOIN ${schema.bouts} b ON fb.boutid = b.id
      WHERE b.roundid = ${roundId} AND b.victor IS NULL
    `);

        const remainingFencers = remainingResult.rows[0]?.count || 0;

        // Calculate the current round and total rounds based on table size
        const totalRounds = Math.log2(tableSize);

        // Get the most advanced round that has any bouts
        const currentRoundResult = await db
            .select({
                max_round: sql<number>`MAX(${schema.deBracketBouts.bracket_round})`,
            })
            .from(schema.deBracketBouts)
            .where(eq(schema.deBracketBouts.roundid, roundId));

        const currentRound = (currentRoundResult[0]?.max_round || 1) + 1;

        // Get the top 4 seeds
        const topSeeds = await db
            .select({
                seed: schema.seedingFromRoundResults.seed,
                id: schema.fencers.id,
                fname: schema.fencers.fname,
                lname: schema.fencers.lname,
                erating: schema.fencers.erating,
                eyear: schema.fencers.eyear,
                frating: schema.fencers.frating,
                fyear: schema.fencers.fyear,
                srating: schema.fencers.srating,
                syear: schema.fencers.syear,
            })
            .from(schema.seedingFromRoundResults)
            .innerJoin(schema.fencers, eq(schema.seedingFromRoundResults.fencerid, schema.fencers.id))
            .where(eq(schema.seedingFromRoundResults.roundid, roundId))
            .orderBy(schema.seedingFromRoundResults.seed)
            .limit(4);

        return {
            totalFencers,
            tableSize,
            remainingFencers,
            currentRound,
            totalRounds,
            topSeeds: topSeeds.map(row => ({
                seed: row.seed,
                fencer: {
                    id: row.id,
                    fname: row.fname,
                    lname: row.lname,
                    erating: row.erating,
                    eyear: row.eyear,
                    frating: row.frating,
                    fyear: row.fyear,
                    srating: row.srating,
                    syear: row.syear,
                },
            })),
        };
    } catch (error) {
        console.error('Error getting DE summary:', error);
        throw error;
    }
}

/**
 * Creates the bracket structure for a round
 */
export async function dbGetBracketForRound(roundId: number): Promise<any> {
    try {
        // Get the DE format
        const format = await db
            .select({
                deformat: schema.rounds.deformat,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!format.length) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        const deFormat = format[0].deformat as 'single' | 'double' | 'compass';

        // Get all bouts based on the format
        if (deFormat === 'single') {
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
        } else if (deFormat === 'double') {
            const { winners, losers, finals } = await dbGetDoubleBracketBouts(roundId);

            // Structure the data for a double elimination bracket
            return {
                type: 'double',
                winners,
                losers,
                finals,
            };
        } else if (deFormat === 'compass') {
            const { east, north, west, south } = await dbGetCompassBracketBouts(roundId);

            // Structure the data for a compass draw bracket
            return {
                type: 'compass',
                east,
                north,
                west,
                south,
            };
        }

        // If we can't determine the format, return null
        return null;
    } catch (error) {
        console.error('Error getting bracket for round:', error);
        return null;
    }
}
