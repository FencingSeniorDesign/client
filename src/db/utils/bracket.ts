// bracket.ts - DE bracket-related database functions
import { and, count, eq, asc, desc, isNull, isNotNull, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Event, Round, Fencer } from '../../navigation/navigation/types';

/**
 * Generates the standard bracket positions for a given table size
 * @param tableSize The size of the DE table (must be a power of 2)
 * @returns An array of pairs [seedA, seedB] for each first round match
 */
/**
 * Generates the standard bracket positions for a given table size
 * @param tableSize The size of the DE table (must be a power of 2)
 * @returns An array of pairs [seedA, seedB] for each first round match
 */
export function generateBracketPositions(tableSize: number): [number, number][] {
    // Define the standard seeding patterns for different bracket sizes
    let seedingPattern: number[];
    
    switch (tableSize) {
        case 2:
            seedingPattern = [1, 2];
            break;
        case 4:
            seedingPattern = [1, 4, 3, 2];
            break;
        case 8:
            seedingPattern = [1, 8, 5, 4, 3, 6, 7, 2];
            break;
        case 16:
            seedingPattern = [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2];
            break;
        case 32:
            seedingPattern = [
                1, 32, 17, 16, 9, 24, 25, 8, 5, 28, 21, 12, 13, 20, 29, 4,
                3, 30, 19, 14, 11, 22, 27, 6, 7, 26, 23, 10, 15, 18, 31, 2
            ];
            break;
        case 64:
            seedingPattern = [
                1, 64, 33, 32, 17, 48, 49, 16, 9, 56, 41, 24, 25, 40, 57, 8,
                5, 60, 37, 28, 21, 44, 53, 12, 13, 52, 45, 20, 29, 36, 61, 4,
                3, 62, 35, 30, 19, 46, 51, 14, 11, 54, 43, 22, 27, 38, 59, 6,
                7, 58, 39, 26, 23, 42, 55, 10, 15, 50, 47, 18, 31, 34, 63, 2
            ];
            break;
        case 128:
            seedingPattern = [
                1, 128, 65, 64, 33, 96, 97, 32, 17, 112, 81, 48, 49, 80, 113, 16,
                9, 120, 73, 56, 41, 88, 105, 24, 25, 104, 89, 40, 57, 72, 121, 8,
                5, 124, 69, 60, 37, 92, 101, 28, 21, 108, 85, 44, 53, 76, 117, 12,
                13, 116, 77, 52, 45, 84, 109, 20, 29, 100, 93, 36, 61, 68, 125, 4,
                3, 126, 67, 62, 35, 94, 99, 30, 19, 110, 83, 46, 51, 78, 115, 14,
                11, 118, 75, 54, 43, 86, 107, 22, 27, 102, 91, 38, 59, 70, 123, 6,
                7, 122, 71, 58, 39, 90, 103, 26, 23, 106, 87, 42, 55, 74, 119, 10,
                15, 114, 79, 50, 47, 82, 111, 18, 31, 98, 95, 34, 63, 66, 127, 2
            ];
            break;
        default:
            throw new Error(`Unsupported table size: ${tableSize}`);
    }
    
    // Create pairs of opponents for the first round
    const positions: [number, number][] = [];
    for (let i = 0; i < seedingPattern.length; i += 2) {
        positions.push([seedingPattern[i], seedingPattern[i + 1]]);
    }
    
    return positions;
}


/**
 * Creates the first round DE bouts based on seeding and table size
 */
/**
 * Creates the DE bouts for a round and sets up the bracket structure
 */
export async function createDEBoutsForRound(
    event: Event,
    round: any,
    fencers: Fencer[],
    seeding: any[]
): Promise<void> {
    try {
        console.log(
            `Creating DE bouts for event ${event.id}, round ${round.id} with ${fencers.length} fencers`
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

                // Create a map to track bouts for each round
                const boutsByRound: Map<number, number[]> = new Map();

                // Initialize maps for each table size
                let currentTableSize = tableSize;
                while (currentTableSize >= 2) {
                    boutsByRound.set(currentTableSize, []);
                    currentTableSize /= 2;
                }

                // Create all bouts for all rounds
                // Start with the first round (largest table size)
                currentTableSize = tableSize;

                // Create all bouts for all rounds
                while (currentTableSize >= 2) {
                    const boutIds: number[] = [];
                    const numBouts = currentTableSize / 2;
                    
                    console.log(`Creating ${numBouts} bouts for table of ${currentTableSize}`);
                    
                    for (let i = 0; i < numBouts; i++) {
                        // For the first round, place fencers according to seeding
                        let leftFencerId = null;
                        let rightFencerId = null;
                        let victor = null;
                        
                        if (currentTableSize === tableSize) {
                            // This is the first round, so place fencers according to seeding
                            const [posA, posB] = positions[i];
                            
                            // Get fencers for this bout (or null for byes)
                            const fencerA = posA <= sortedFencers.length ? sortedFencers[posA - 1].fencer : null;
                            const fencerB = posB <= sortedFencers.length ? sortedFencers[posB - 1].fencer : null;
                            
                            leftFencerId = fencerA ? fencerA.id : null;
                            rightFencerId = fencerB ? fencerB.id : null;
                            
                            // If only one fencer, it's a bye
                            const isBye = !fencerA || !fencerB;
                            
                            // If it's a bye, the present fencer automatically advances
                            victor = isBye ? (fencerA ? fencerA.id : (fencerB ? fencerB.id : null)) : null;
                            
                            console.log(
                                `Creating bout ${i + 1}: ${fencerA?.fname || 'BYE'} vs ${fencerB?.fname || 'BYE'}, bye: ${isBye}, victor: ${victor}`
                            );
                        }
                        
                        // Insert the bout
                        const boutResult = await tx
                            .insert(schema.bouts)
                            .values({
                                lfencer: leftFencerId,
                                rfencer: rightFencerId,
                                victor: victor,
                                eventid: event.id,
                                roundid: round.id,
                                tableof: currentTableSize,
                            })
                            .returning({ id: schema.bouts.id });
                            
                        const boutId = boutResult[0].id;
                        boutIds.push(boutId);
                        console.log(`Created bout with ID ${boutId} for table of ${currentTableSize}`);
                    }
                    
                    // Store the bout IDs for this round
                    boutsByRound.set(currentTableSize, boutIds);
                    
                    // Move to the next round
                    currentTableSize /= 2;
                }
                
                // Now create the DEBracketBouts entries to define the bracket structure
                for (const [tableSize, boutIds] of boutsByRound.entries()) {
                    if (tableSize === 2) {
                        // This is the final - it has no next bout
                        // But still create a bracket entry for it
                        if (boutIds.length > 0) {
                            await tx
                                .insert(schema.deBracketBouts)
                                .values({
                                    roundid: round.id,
                                    bout_id: boutIds[0],
                                    bracket_type: 'winners',
                                    bracket_round: Math.log2(tableSize),
                                    bout_order: 0,
                                    next_bout_id: null, // Final has no next bout
                                    loser_next_bout_id: null, // Not used in single elimination
                                });
                            console.log(`Created bracket entry for final bout ${boutIds[0]}`);
                        }
                        continue;
                    }
                    
                    const nextTableSize = tableSize / 2;
                    const nextRoundBouts = boutsByRound.get(nextTableSize) || [];
                    
                    for (let i = 0; i < boutIds.length; i++) {
                        const boutId = boutIds[i];
                        const nextBoutIndex = Math.floor(i / 2);
                        
                        if (nextBoutIndex < nextRoundBouts.length) {
                            const nextBoutId = nextRoundBouts[nextBoutIndex];
                            
                            // Create the DEBracketBout entry
                            await tx
                                .insert(schema.deBracketBouts)
                                .values({
                                    roundid: round.id,
                                    bout_id: boutId,
                                    bracket_type: 'winners',
                                    bracket_round: Math.log2(tableSize),
                                    bout_order: i,
                                    next_bout_id: nextBoutId,
                                    loser_next_bout_id: null, // Not used in single elimination
                                });
                                
                            console.log(`Created bracket structure: Bout ${boutId} -> Next bout ${nextBoutId}`);
                        }
                    }
                }
                
                // For byes in the first round, advance fencers to the next round
                if (fencers.length < tableSize) {
                    console.log(`Advancing fencers with byes to next round (${tableSize / 2})`);
                    
                    // Get all first round bouts with byes (have a victor already set)
                    const byeBouts = await tx
                        .select({
                            id: schema.bouts.id,
                            victor: schema.bouts.victor,
                        })
                        .from(schema.bouts)
                        .where(
                            and(
                                eq(schema.bouts.roundid, round.id),
                                eq(schema.bouts.tableof, tableSize),
                                isNotNull(schema.bouts.victor)
                            )
                        )
                        .orderBy(asc(schema.bouts.id));
                        
                    console.log(`Found ${byeBouts.length} bouts with byes to advance`);
                        
                    // For each bye bout, find its next bout from DEBracketBouts and advance the winner
                    for (const bout of byeBouts) {
                        // Find the DEBracketBout entry for this bout
                        const bracketBout = await tx
                            .select({
                                next_bout_id: schema.deBracketBouts.next_bout_id,
                                bout_order: schema.deBracketBouts.bout_order,
                            })
                            .from(schema.deBracketBouts)
                            .where(eq(schema.deBracketBouts.bout_id, bout.id))
                            .limit(1);
                            
                        if (bracketBout.length > 0 && bracketBout[0].next_bout_id) {
                            const nextBoutId = bracketBout[0].next_bout_id;
                            const boutOrder = bracketBout[0].bout_order;
                            
                            // Even bout_order goes to left side, odd to right side
                            if (boutOrder % 2 === 0) {
                                // Even positions go to left side of next bout
                                console.log(`Advancing bye winner ${bout.victor} to left position of bout ${nextBoutId}`);
                                await tx
                                    .update(schema.bouts)
                                    .set({ lfencer: bout.victor })
                                    .where(eq(schema.bouts.id, nextBoutId));
                            } else {
                                // Odd positions go to right side of next bout
                                console.log(`Advancing bye winner ${bout.victor} to right position of bout ${nextBoutId}`);
                                await tx
                                    .update(schema.bouts)
                                    .set({ rfencer: bout.victor })
                                    .where(eq(schema.bouts.id, nextBoutId));
                            }
                        }
                    }
                }
                
                console.log(`Successfully created all DE bouts and bracket structure for table size ${tableSize}`);
            } catch (error) {
                console.error('Error in DE bout creation transaction:', error);
                throw error; // Re-throw to trigger transaction rollback
            }
        });
    } catch (error) {
        console.error('Error creating DE bouts:', error);
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
