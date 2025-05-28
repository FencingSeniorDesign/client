// round.ts - Round-related database functions
import { and, eq, asc } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Round, Fencer, Event } from '../../navigation/navigation/types';
import { dbCalculateAndSaveSeedingFromRoundResults } from './seeding';
import { dbCreatePoolAssignmentsAndBoutOrders } from './pool';
import { calculatePreliminarySeeding } from '../../navigation/utils/RoundAlgorithms';
import { dbSaveSeeding, dbGetSeedingForRound } from './seeding';
import { createDEBoutsForRound, generateBracketPositions } from './bracket';
import { createTeamDEBoutsForRound as createTeamDEBouts } from './teamBracket';
import * as teamUtils from './team';
import * as teamPoolUtils from './teamPool';

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
    round_format: 'individual_pools' | 'team_round_robin' | 'individual_de' | 'team_de';
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
            round_format: round.round_format,
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
                round_format: round.round_format,
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

        if (round.round_format === 'individual_pools') {
            // For individual pools, require pool configuration
            if (!round.poolcount || !round.poolsize) {
                throw new Error('Pool count and size must be set for individual pool rounds');
            }

            await dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, round.poolcount, round.poolsize, seeding);
        } else if (round.round_format === 'individual_de') {
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
                await createDEBoutsForRound(event, round, fencers, seeding);
            } else if (round.deformat === 'double') {
                console.log('Double elimination bracket creation is disabled and will be reimplemented later');
                // Fall back to single elimination instead
                console.log('Falling back to single elimination bracket');
                await createDEBoutsForRound(event, round, fencers, seeding);
            } else if (round.deformat === 'compass') {
                console.log('Compass draw bracket creation is disabled and will be reimplemented later');
                // Fall back to single elimination instead
                console.log('Falling back to single elimination bracket');
                await createDEBoutsForRound(event, round, fencers, seeding);
            }
        } else {
            throw new Error(`Unsupported individual round format: ${round.round_format}`);
        }
        await dbMarkRoundAsStarted(round.id);
    } catch (error) {
        console.error('Error initializing round:', error);
        throw error;
    }
}

/**
 * Initializes a team round with the proper bout structure
 */
export async function dbInitializeTeamRound(event: Event, round: Round): Promise<void> {
    try {
        console.log(
            `Initializing team round ${round.id} (order: ${round.rorder}) for event ${event.id}, type: ${round.type}, format: ${event.team_format}`
        );

        if (!round.type) {
            console.error('Round type is undefined, defaulting to "pool"');
            round.type = 'pool';
        }

        // Get all teams for the event
        const teams = await teamUtils.getEventTeams(db, event.id);
        console.log(`Found ${teams.length} teams for the event`);

        if (teams.length === 0) {
            throw new Error('No teams found for the event. Cannot initialize round.');
        }

        // Handle different round formats for team events
        if (round.round_format === 'team_round_robin') {
            // Team Round Robin: all teams fence all teams in one group
            // No pool configuration needed, but set for compatibility
            const poolcount = 1; // Single round robin group
            const poolsize = teams.length; // All teams in one group

            // Update the round with the computed values for consistency
            await db
                .update(schema.rounds)
                .set({ poolcount: poolcount, poolsize: poolsize })
                .where(eq(schema.rounds.id, round.id));

            // First, seed teams by strength
            await teamUtils.seedTeamsForEvent(db, event.id);

            // Get the seeded teams
            const seededTeams = await teamUtils.getEventTeams(db, event.id);

            // Create pool assignments and team bouts
            await teamPoolUtils.dbCreateTeamPoolAssignmentsAndBouts(db, event, round, seededTeams, poolcount, poolsize);

            console.log(`Created team pool assignments and bouts for round ${round.id}`);
        } else if (round.round_format === 'team_de') {
            // Seed teams if not already done
            await teamUtils.seedTeamsForEvent(db, event.id);
            const seededTeams = await teamUtils.getEventTeams(db, event.id);

            // Automatically determine table size
            let tableSize = 2;
            while (tableSize < seededTeams.length) {
                tableSize *= 2;
            }

            // Update round with table size and force single elimination for team events
            await db
                .update(schema.rounds)
                .set({ detablesize: tableSize, deformat: 'single' })
                .where(eq(schema.rounds.id, round.id));

            console.log(`Automatically set team DE table size to ${tableSize} for ${seededTeams.length} teams`);

            // Create team DE bracket
            // Transform seededTeams to the format expected by the proper function
            const teams = seededTeams.map(st => ({
                id: st.id,
                name: st.name,
                eventid: st.eventid,
                clubid: st.clubid || undefined,
                seed: st.seed || undefined,
            }));
            const seeding = seededTeams.map(st => ({
                team: {
                    id: st.id,
                    name: st.name,
                    eventid: st.eventid,
                    clubid: st.clubid || undefined,
                    seed: st.seed || undefined,
                },
                seed: st.seed || 999,
            }));
            await createTeamDEBouts(event, round, teams, seeding);

            console.log(`Created team DE bracket for round ${round.id}`);
        } else {
            throw new Error(`Unsupported team round format: ${round.round_format}`);
        }

        // Mark the round as started
        await dbMarkRoundAsStarted(round.id);
        console.log(`Team round ${round.id} initialized successfully`);
    } catch (error) {
        console.error('Error initializing team round:', error);
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
