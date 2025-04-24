// round.ts - Round-related database functions
import { and, eq, asc } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Round, Fencer, Event } from '../../navigation/navigation/types';
import { dbCalculateAndSaveSeedingFromRoundResults } from './seeding';
import { dbCreatePoolAssignmentsAndBoutOrders } from './pool';
import { calculatePreliminarySeeding } from '../../navigation/utils/RoundAlgorithms';
import { dbSaveSeeding, dbGetSeedingForRound } from './seeding';
import { createFirstRoundDEBouts } from './bracket';

/**
 * Marks a round as complete and calculates seeding
 */
export async function dbMarkRoundAsComplete(roundId: number): Promise<void> {
    try {
        console.log(`Attempting to mark round ${roundId} as complete`);

        // First, get the round and event info
        const round = await db.select().from(schema.rounds).where(eq(schema.rounds.id, roundId)).limit(1);

        if (!round || round.length === 0) {
            throw new Error(`Round with id ${roundId} not found`);
        }

        console.log(`Found round ${roundId}, calculating seeding`);

        // Calculate and save seeding from the round results
        await dbCalculateAndSaveSeedingFromRoundResults(round[0].eventid, roundId);

        // Then mark the round as complete
        await db.update(schema.rounds).set({ iscomplete: true }).where(eq(schema.rounds.id, roundId));

        console.log(`Round ${roundId} marked as complete successfully`);
    } catch (error) {
        console.error('Error marking round complete:', error);
        throw error; // Rethrow the error so the mutation can properly handle it
    }
}

/**
 * Gets all rounds for an event
 */
export async function dbGetRoundsForEvent(eventId: number): Promise<Round[]> {
    try {
        const rounds = await db
            .select()
            .from(schema.rounds)
            .where(eq(schema.rounds.eventid, eventId))
            .orderBy(schema.rounds.rorder);

        console.log(`Fetched ${rounds.length} rounds for event ${eventId}`);
        return rounds as Round[];
    } catch (error) {
        console.error('Error fetching rounds:', error);
        throw error;
    }
}

/**
 * Adds a new round to an event
 */
export async function dbAddRound(round: {
    eventid: number;
    rorder: number;
    type: 'pool' | 'de';
    promotionpercent: number;
    targetbracket: number;
    usetargetbracket: number;
    deformat: string;
    detablesize: number;
    iscomplete: number;
    poolcount: number | null;
    poolsize: number | null;
    poolsoption: string | undefined;
}): Promise<void> {
    try {
        await db.insert(schema.rounds).values({
            eventid: round.eventid,
            rorder: round.rorder,
            type: round.type,
            promotionpercent: round.promotionpercent,
            targetbracket: round.targetbracket,
            usetargetbracket: round.usetargetbracket === 1,
            deformat: round.deformat,
            detablesize: round.detablesize,
            iscomplete: round.iscomplete === 1,
            poolcount: round.poolcount,
            poolsize: round.poolsize,
            poolsoption: round.poolsoption,
        });

        console.log('Round added successfully.');
    } catch (error) {
        console.error('Error adding round:', error);
        throw error;
    }
}

/**
 * Updates a round in the database
 */
export async function dbUpdateRound(round: Round): Promise<void> {
    try {
        await db
            .update(schema.rounds)
            .set({
                rorder: round.rorder,
                type: round.type,
                promotionpercent: round.promotionpercent,
                targetbracket: round.targetbracket,
                usetargetbracket: round.usetargetbracket === 1,
                deformat: round.deformat,
                detablesize: round.detablesize,
                iscomplete: round.iscomplete === 1,
                poolcount: round.poolcount,
                poolsize: round.poolsize,
                poolsoption: round.poolsoption,
            })
            .where(eq(schema.rounds.id, round.id));

        console.log('Round updated successfully.');
    } catch (error) {
        console.error('Error updating round:', error);
        throw error;
    }
}

/**
 * Deletes a round from the database
 */
export async function dbDeleteRound(roundId: number): Promise<void> {
    try {
        await db.delete(schema.rounds).where(eq(schema.rounds.id, roundId));

        console.log(`Round ${roundId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting round:', error);
        throw error;
    }
}

/**
 * Marks a round as started
 */
export async function dbMarkRoundAsStarted(roundId: number): Promise<void> {
    try {
        await db.update(schema.rounds).set({ isstarted: true }).where(eq(schema.rounds.id, roundId));

        console.log(`Round ${roundId} marked as started.`);
    } catch (error) {
        console.error('Error marking round as started:', error);
        throw error;
    }
}

/**
 * Gets a round by ID
 */
export async function dbGetRoundById(roundId: number): Promise<Round> {
    try {
        const rounds = await db.select().from(schema.rounds).where(eq(schema.rounds.id, roundId)).limit(1);

        if (!rounds.length) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        return rounds[0] as Round;
    } catch (error) {
        console.error('Error fetching round by ID:', error);
        throw error;
    }
}

/**
 * Initializes a round with the proper bout structure based on its type (pool or DE)
 */
export async function dbInitializeRound(event: Event, round: Round, fencers: Fencer[]): Promise<void> {
    try {
        console.log(
            `Initializing round ${round.id} (order: ${round.rorder}) for event ${event.id}, type: ${round.type}, with ${fencers.length} fencers`
        );
        console.log(`Pool count: ${round.poolcount}, pool size: ${round.poolsize}`);

        if (!round.type) {
            console.error('Round type is undefined, defaulting to "pool"');
            round.type = 'pool'; // Default to pool if undefined
        }
        // Get seeding for this round
        let seeding;

        // If this is the first round, calculate preliminary seeding
        if (round.rorder === 1) {
            seeding = calculatePreliminarySeeding(fencers);
            // Save the preliminary seeding to the database
            await dbSaveSeeding(event.id, round.id, seeding);
        } else {
            // Get the results-based seeding from the previous round
            const previousRounds = await dbGetRoundsForEvent(event.id);
            const previousRound = previousRounds.find(r => r.rorder === round.rorder - 1);

            if (previousRound) {
                // Explicitly use the previous round's results to determine seeding
                seeding = await dbGetSeedingForRound(previousRound.id);

                // If no seeding found, we need to calculate it from the previous round's results
                if (!seeding || seeding.length === 0) {
                    await dbCalculateAndSaveSeedingFromRoundResults(event.id, previousRound.id);
                    seeding = await dbGetSeedingForRound(previousRound.id);
                }
            }

            // If still no seeding found (unlikely), use preliminary seeding as a last resort
            if (!seeding || seeding.length === 0) {
                console.warn('No previous round results found, using preliminary seeding as fallback');
                seeding = calculatePreliminarySeeding(fencers);
            }

            // Save this seeding for the current round too
            await dbSaveSeeding(event.id, round.id, seeding);
        }

        if (round.type === 'pool') {
            await dbCreatePoolAssignmentsAndBoutOrders(
                event,
                round,
                fencers,
                round.poolcount || 1,
                round.poolsize || 6,
                seeding
            );
        } else if (round.type === 'de') {
            // Automatically determine the appropriate bracket size
            let tableSize = 2;
            while (tableSize < fencers.length) {
                tableSize *= 2;
            }

            // Update the round with the automatically calculated table size
            await db.update(schema.rounds).set({ detablesize: tableSize }).where(eq(schema.rounds.id, round.id));

            console.log(`Automatically set DE table size to ${tableSize} for ${fencers.length} fencers`);

            // Initialize based on DE format
            if (round.deformat === 'single') {
                console.log('Creating single elimination bracket');
                await createFirstRoundDEBouts(event, round, fencers, seeding);
            } else if (round.deformat === 'double') {
                console.log('Double elimination bracket creation is disabled and will be reimplemented later');
                // Fall back to single elimination instead
                console.log('Falling back to single elimination bracket');
                await createFirstRoundDEBouts(event, round, fencers, seeding);
            } else if (round.deformat === 'compass') {
                console.log('Compass draw bracket creation is disabled and will be reimplemented later');
                // Fall back to single elimination instead
                console.log('Falling back to single elimination bracket');
                await createFirstRoundDEBouts(event, round, fencers, seeding);
            }
        }
        await dbMarkRoundAsStarted(round.id);
    } catch (error) {
        console.error('Error initializing round:', error);
        throw error;
    }
}

/**
 * Gets the DE format for a round
 */
export async function dbGetDEFormat(roundId: number): Promise<'single' | 'double' | 'compass'> {
    try {
        const rounds = await db
            .select({ deformat: schema.rounds.deformat })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!rounds.length) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Default to single elimination if no format is specified
        return (rounds[0].deformat as 'single' | 'double' | 'compass') || 'single';
    } catch (error) {
        console.error('Error getting DE format:', error);
        return 'single'; // Default to single elimination
    }
}

/**
 * Gets the table size for a DE round
 */
export async function dbGetDETableSize(roundId: number): Promise<number> {
    try {
        const result = await db
            .select({
                detablesize: schema.rounds.detablesize,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!result.length) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        return result[0].detablesize || 0;
    } catch (error) {
        console.error('Error getting DE table size:', error);
        return 0;
    }
}
