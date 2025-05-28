// teamBracket.ts - Team DE bracket-related database functions
import { and, count, eq, asc, desc, isNull, isNotNull, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Event, Round, Team } from '../../navigation/navigation/types';
import { generateBracketPositions } from './bracket';

/**
 * Creates the DE bouts for a team round and sets up the bracket structure
 */
export async function createTeamDEBoutsForRound(
    event: Event,
    round: any,
    teams: Team[],
    seeding: any[]
): Promise<void> {
    try {
        console.log(`Creating team DE bouts for event ${event.id}, round ${round.id} with ${teams.length} teams`);
        console.log(`Seeding data: ${seeding.length} entries`);

        // Check if team bouts already exist for this round to prevent duplicates
        const existingBouts = await db
            .select({ count: count() })
            .from(schema.teamBouts)
            .where(eq(schema.teamBouts.roundid, round.id));

        if (existingBouts[0]?.count > 0) {
            console.log(`Team bouts already exist for round ${round.id}. Skipping creation to prevent duplicates.`);
            return;
        }

        // Determine the appropriate table size based on number of teams
        const teamCount = teams.length;
        let tableSize = 2;
        while (tableSize < teamCount) {
            tableSize *= 2;
        }

        console.log(`Using table size ${tableSize} for ${teamCount} teams`);

        // Use a transaction to ensure all operations succeed or fail together
        await db.transaction(async tx => {
            try {
                // Update the round with the DE table size
                await tx.update(schema.rounds).set({ detablesize: tableSize }).where(eq(schema.rounds.id, round.id));

                // Sort teams by seed
                const sortedTeams = [...seeding].sort((a, b) => a.seed - b.seed);

                // Generate standard bracket positions (reuse from individual bracket)
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

                // Create all team bouts for all rounds
                currentTableSize = tableSize;

                while (currentTableSize >= 2) {
                    const boutIds: number[] = [];
                    const numBouts = currentTableSize / 2;

                    console.log(`Creating ${numBouts} team bouts for table of ${currentTableSize}`);

                    for (let i = 0; i < numBouts; i++) {
                        // For the first round, place teams according to seeding
                        let teamAId = null;
                        let teamBId = null;
                        let victor = null;

                        if (currentTableSize === tableSize) {
                            // This is the first round, so place teams according to seeding
                            const [posA, posB] = positions[i];

                            // Get teams for this bout (or null for byes)
                            const teamA = posA <= sortedTeams.length ? sortedTeams[posA - 1].team : null;
                            const teamB = posB <= sortedTeams.length ? sortedTeams[posB - 1].team : null;

                            teamAId = teamA ? teamA.id : null;
                            teamBId = teamB ? teamB.id : null;

                            // If only one team, it's a bye
                            const isBye = !teamA || !teamB;

                            // If it's a bye, the present team automatically advances
                            victor = isBye ? (teamA ? teamA.id : teamB ? teamB.id : null) : null;

                            console.log(
                                `Creating team bout ${i + 1}: ${teamA?.name || 'BYE'} vs ${teamB?.name || 'BYE'}, bye: ${isBye}, victor: ${victor}`
                            );
                        }

                        // Insert the team bout
                        const boutResult = await tx
                            .insert(schema.teamBouts)
                            .values({
                                team_a_id: teamAId,
                                team_b_id: teamBId,
                                winner_id: victor,
                                eventid: event.id,
                                roundid: round.id,
                                bout_type: 'de',
                                table_of: currentTableSize,
                                // Set team format from event settings
                                team_format: event.team_format || 'NCAA',
                            })
                            .returning({ id: schema.teamBouts.id });

                        const boutId = boutResult[0].id;
                        boutIds.push(boutId);
                        console.log(`Created team bout with ID ${boutId} for table of ${currentTableSize}`);
                    }

                    // Store the bout IDs for this round
                    boutsByRound.set(currentTableSize, boutIds);

                    // Move to the next round
                    currentTableSize /= 2;
                }

                // Now create the TeamDEBracketBouts entries to define the bracket structure
                for (const [tableSize, boutIds] of boutsByRound.entries()) {
                    if (tableSize === 2) {
                        // This is the final - it has no next bout
                        // But still create a bracket entry for it
                        if (boutIds.length > 0) {
                            await tx.insert(schema.teamDeBracketBouts).values({
                                roundid: round.id,
                                team_bout_id: boutIds[0],
                                bracket_type: 'winners',
                                bracket_round: Math.log2(tableSize),
                                bout_order: 0,
                                next_bout_id: null, // Final has no next bout
                                loser_next_bout_id: null, // Not used in single elimination
                            });
                            console.log(`Created bracket entry for final team bout ${boutIds[0]}`);
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

                            // Create the TeamDEBracketBout entry
                            await tx.insert(schema.teamDeBracketBouts).values({
                                roundid: round.id,
                                team_bout_id: boutId,
                                bracket_type: 'winners',
                                bracket_round: Math.log2(tableSize),
                                bout_order: i,
                                next_bout_id: nextBoutId,
                                loser_next_bout_id: null, // Not used in single elimination
                            });

                            console.log(`Created team bracket structure: Bout ${boutId} -> Next bout ${nextBoutId}`);
                        }
                    }
                }

                // For byes in the first round, advance teams to the next round
                if (teams.length < tableSize) {
                    console.log(`Advancing teams with byes to next round (${tableSize / 2})`);

                    // Get all first round bouts with byes (have a victor already set)
                    const byeBouts = await tx
                        .select({
                            id: schema.teamBouts.id,
                            winner_id: schema.teamBouts.winner_id,
                        })
                        .from(schema.teamBouts)
                        .where(
                            and(
                                eq(schema.teamBouts.roundid, round.id),
                                eq(schema.teamBouts.table_of, tableSize),
                                isNotNull(schema.teamBouts.winner_id)
                            )
                        )
                        .orderBy(asc(schema.teamBouts.id));

                    console.log(`Found ${byeBouts.length} team bouts with byes to advance`);

                    // For each bye bout, find its next bout from TeamDEBracketBouts and advance the winner
                    for (const bout of byeBouts) {
                        // Find the TeamDEBracketBout entry for this bout
                        const bracketBout = await tx
                            .select({
                                next_bout_id: schema.teamDeBracketBouts.next_bout_id,
                                bout_order: schema.teamDeBracketBouts.bout_order,
                            })
                            .from(schema.teamDeBracketBouts)
                            .where(eq(schema.teamDeBracketBouts.team_bout_id, bout.id))
                            .limit(1);

                        if (bracketBout.length > 0 && bracketBout[0].next_bout_id) {
                            const nextBoutId = bracketBout[0].next_bout_id;
                            const boutOrder = bracketBout[0].bout_order;

                            // Even bout_order goes to team A side, odd to team B side
                            if (boutOrder % 2 === 0) {
                                // Even positions go to team A side of next bout
                                console.log(
                                    `Advancing bye winner team ${bout.winner_id} to team A position of bout ${nextBoutId}`
                                );
                                await tx
                                    .update(schema.teamBouts)
                                    .set({ team_a_id: bout.winner_id })
                                    .where(eq(schema.teamBouts.id, nextBoutId));
                            } else {
                                // Odd positions go to team B side of next bout
                                console.log(
                                    `Advancing bye winner team ${bout.winner_id} to team B position of bout ${nextBoutId}`
                                );
                                await tx
                                    .update(schema.teamBouts)
                                    .set({ team_b_id: bout.winner_id })
                                    .where(eq(schema.teamBouts.id, nextBoutId));
                            }
                        }
                    }
                }

                console.log(`Successfully created all team DE bouts and bracket structure for table size ${tableSize}`);
            } catch (error) {
                console.error('Error in team DE bout creation transaction:', error);
                throw error; // Re-throw to trigger transaction rollback
            }
        });
    } catch (error) {
        console.error('Error creating team DE bouts:', error);
        throw error;
    }
}

/**
 * Checks if a team DE round has completed (final bout has a winner)
 */
export async function dbIsTeamDERoundComplete(roundId: number): Promise<boolean> {
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
            .from(schema.teamBouts)
            .where(
                and(
                    eq(schema.teamBouts.roundid, roundId), 
                    eq(schema.teamBouts.table_of, 2), 
                    isNotNull(schema.teamBouts.winner_id)
                )
            );

        return finalBoutResult[0].count > 0;
    } catch (error) {
        console.error('Error checking if team DE round is complete:', error);
        return false;
    }
}

/**
 * Gets the team bracket structure for a round
 */
export async function dbGetTeamBracketForRound(roundId: number): Promise<any> {
    try {
        // Get all team bouts for single elimination
        const bouts = await db
            .select({
                id: schema.teamBouts.id,
                team_a_id: schema.teamBouts.team_a_id,
                team_b_id: schema.teamBouts.team_b_id,
                winner_id: schema.teamBouts.winner_id,
                eventid: schema.teamBouts.eventid,
                roundid: schema.teamBouts.roundid,
                bout_type: schema.teamBouts.bout_type,
                table_of: schema.teamBouts.table_of,
                team_format: schema.teamBouts.team_format,
            })
            .from(schema.teamBouts)
            .where(eq(schema.teamBouts.roundid, roundId))
            .orderBy(desc(schema.teamBouts.table_of), asc(schema.teamBouts.id));

        // Get the table size for the round
        const tableSize = await db
            .select({
                detablesize: schema.rounds.detablesize,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        // Get bracket structure
        const bracketStructure = await db
            .select()
            .from(schema.teamDeBracketBouts)
            .where(eq(schema.teamDeBracketBouts.roundid, roundId))
            .orderBy(
                asc(schema.teamDeBracketBouts.bracket_round), 
                asc(schema.teamDeBracketBouts.bout_order)
            );

        // Structure the data for a single elimination bracket
        const bracket = {
            type: 'single',
            tableSize: tableSize[0]?.detablesize || 0,
            rounds: Math.log2(tableSize[0]?.detablesize || 2),
            bouts,
            structure: bracketStructure,
        };

        return bracket;
    } catch (error) {
        console.error('Error getting team bracket for round:', error);
        return null;
    }
}

/**
 * Advances the winner of a team bout to the next round
 */
export async function advanceTeamToNextBout(
    teamBoutId: number,
    winnerId: number
): Promise<void> {
    try {
        await db.transaction(async tx => {
            // Update the bout with the winner
            await tx
                .update(schema.teamBouts)
                .set({ winner_id: winnerId })
                .where(eq(schema.teamBouts.id, teamBoutId));

            // Find the next bout from the bracket structure
            const bracketBout = await tx
                .select({
                    next_bout_id: schema.teamDeBracketBouts.next_bout_id,
                    bout_order: schema.teamDeBracketBouts.bout_order,
                })
                .from(schema.teamDeBracketBouts)
                .where(eq(schema.teamDeBracketBouts.team_bout_id, teamBoutId))
                .limit(1);

            if (bracketBout.length > 0 && bracketBout[0].next_bout_id) {
                const nextBoutId = bracketBout[0].next_bout_id;
                const boutOrder = bracketBout[0].bout_order;

                // Even bout_order goes to team A side, odd to team B side
                if (boutOrder % 2 === 0) {
                    console.log(
                        `Advancing winner team ${winnerId} to team A position of bout ${nextBoutId}`
                    );
                    await tx
                        .update(schema.teamBouts)
                        .set({ team_a_id: winnerId })
                        .where(eq(schema.teamBouts.id, nextBoutId));
                } else {
                    console.log(
                        `Advancing winner team ${winnerId} to team B position of bout ${nextBoutId}`
                    );
                    await tx
                        .update(schema.teamBouts)
                        .set({ team_b_id: winnerId })
                        .where(eq(schema.teamBouts.id, nextBoutId));
                }
            }

            console.log(`Successfully advanced team ${winnerId} from bout ${teamBoutId}`);
        });
    } catch (error) {
        console.error('Error advancing team to next bout:', error);
        throw error;
    }
}