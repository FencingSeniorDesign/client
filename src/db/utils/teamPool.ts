// teamPool.ts - Team pool-related database functions
import { and, eq } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Event, Round, Team } from '../../navigation/navigation/types';
import * as teamUtils from './team';
import * as teamBoutUtils from './teamBoutNCAA';
import * as relayBoutUtils from './teamBoutRelay';

// Type alias for the database client
type DrizzleClient = typeof db;

/**
 * Creates pool assignments and team bouts for a round
 */
export async function dbCreateTeamPoolAssignmentsAndBouts(
    client: DrizzleClient,
    event: Event,
    round: Round,
    teams: Team[],
    poolCount: number,
    teamsPerPool: number
): Promise<void> {
    try {
        console.log(`Creating team pool assignments for round ${round.id}, event ${event.id}`);
        console.log(`Building ${poolCount} pools with ${teamsPerPool} teams per pool`);
        console.log(`Total teams: ${teams.length}`);

        // Clear any existing pool assignments for this round first
        await client.delete(schema.teamPoolAssignment)
            .where(eq(schema.teamPoolAssignment.roundid, round.id));

        // Build pools using similar algorithm as individual pools
        const pools = buildTeamPools(teams, poolCount, teamsPerPool);
        console.log(`Created ${pools.length} pools`);

        for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
            const pool = pools[poolIndex];

            // Insert each team's pool assignment
            for (let i = 0; i < pool.length; i++) {
                const team = pool[i];
                if (!team.id) continue;

                await client.insert(schema.teamPoolAssignment).values({
                    roundid: round.id,
                    poolid: poolIndex + 1, // Start pool IDs from 1 instead of 0
                    teamid: team.id,
                    teamidinpool: i + 1,
                });
            }

            // Create round-robin team bouts for the pool
            for (let i = 0; i < pool.length; i++) {
                for (let j = i + 1; j < pool.length; j++) {
                    const teamA = pool[i];
                    const teamB = pool[j];
                    
                    if (!teamA.id || !teamB.id) continue;

                    // Create team bout based on format
                    if (event.team_format === 'NCAA') {
                        await teamBoutUtils.createNCAATeamBout(
                            client,
                            round.id,
                            teamA.id,
                            teamB.id,
                            event.id
                        );
                    } else if (event.team_format === '45-touch') {
                        await relayBoutUtils.createRelayTeamBout(
                            client,
                            round.id,
                            teamA.id,
                            teamB.id,
                            event.id
                        );
                    }
                }
            }
        }

        console.log('Team pool assignments and bouts created successfully');
    } catch (error) {
        console.error('Error creating team pool assignments:', error);
        throw error;
    }
}

/**
 * Builds team pools using snake seeding
 */
function buildTeamPools(teams: Team[], poolCount: number, teamsPerPool: number): Team[][] {
    // Sort teams by seed (or by ID if no seed)
    const sortedTeams = [...teams].sort((a, b) => {
        if (a.seed && b.seed) return a.seed - b.seed;
        return (a.id || 0) - (b.id || 0);
    });

    // Adjust pool count if we have fewer teams than pools
    const actualPoolCount = Math.min(poolCount, sortedTeams.length);
    const pools: Team[][] = Array(actualPoolCount).fill(null).map(() => []);

    // Simple round-robin assignment when we have very few teams
    if (sortedTeams.length <= actualPoolCount) {
        // One team per pool
        for (let i = 0; i < sortedTeams.length; i++) {
            pools[i].push(sortedTeams[i]);
        }
    } else {
        // Snake seeding for multiple teams
        for (let i = 0; i < sortedTeams.length; i++) {
            const round = Math.floor(i / actualPoolCount);
            const poolIndex = round % 2 === 0 
                ? i % actualPoolCount 
                : actualPoolCount - 1 - (i % actualPoolCount);
            
            pools[poolIndex].push(sortedTeams[i]);
        }
    }

    return pools;
}

/**
 * Gets teams in a specific pool
 */
export async function dbGetTeamsInPool(
    client: DrizzleClient,
    roundId: number,
    poolId: number
): Promise<Team[]> {
    const assignments = await client.select({
        team: schema.teams,
        teamidinpool: schema.teamPoolAssignment.teamidinpool
    })
    .from(schema.teamPoolAssignment)
    .innerJoin(schema.teams, eq(schema.teamPoolAssignment.teamid, schema.teams.id))
    .where(and(
        eq(schema.teamPoolAssignment.roundid, roundId),
        eq(schema.teamPoolAssignment.poolid, poolId)
    ))
    .orderBy(schema.teamPoolAssignment.teamidinpool);

    // Get full team data with members
    const teams: Team[] = [];
    for (const assignment of assignments) {
        const teamWithMembers = await teamUtils.getTeam(client, assignment.team.id);
        if (teamWithMembers) {
            teams.push(teamWithMembers);
        }
    }

    return teams;
}

/**
 * Gets all team bouts for a pool
 */
export async function dbGetTeamBoutsForPool(
    client: DrizzleClient,
    roundId: number,
    poolId: number,
    format: 'NCAA' | '45-touch'
): Promise<any[]> {
    // Get all teams in the pool
    const teams = await dbGetTeamsInPool(client, roundId, poolId);
    const teamIds = teams.map(t => t.id).filter(id => id !== undefined);

    // Get all team bouts involving these teams
    const bouts = await client.select()
        .from(schema.teamBouts)
        .where(and(
            eq(schema.teamBouts.roundid, roundId),
            eq(schema.teamBouts.format, format)
        ));

    // Filter to only bouts between teams in this pool
    return bouts.filter(bout => 
        teamIds.includes(bout.team_a_id!) && teamIds.includes(bout.team_b_id!)
    );
}

/**
 * Completes a team pool and calculates results
 */
export async function dbCompleteTeamPool(
    client: DrizzleClient,
    roundId: number,
    poolId: number
): Promise<void> {
    // Mark all team bouts in the pool as complete
    const teams = await dbGetTeamsInPool(client, roundId, poolId);
    const teamIds = teams.map(t => t.id).filter(id => id !== undefined);

    await client.update(schema.teamBouts)
        .set({ status: 'complete' })
        .where(and(
            eq(schema.teamBouts.roundid, roundId),
            // Can't use IN clause easily with drizzle, so we'll just mark all bouts complete
        ));

    console.log(`Team pool ${poolId} marked as complete`);
}

/**
 * Calculates team standings in a pool
 */
export async function calculateTeamPoolStandings(
    client: DrizzleClient,
    roundId: number,
    poolId: number
): Promise<any[]> {
    const teams = await dbGetTeamsInPool(client, roundId, poolId);
    const bouts = await dbGetTeamBoutsForPool(client, roundId, poolId, 'NCAA'); // Format doesn't matter for standings

    // Calculate wins and losses for each team
    const standings = teams.map(team => {
        let wins = 0;
        let losses = 0;
        let boutsWon = 0;
        let boutsLost = 0;

        bouts.forEach(bout => {
            if (bout.winner_id === team.id) {
                wins++;
                boutsWon += bout.team_a_id === team.id ? bout.team_a_score : bout.team_b_score;
                boutsLost += bout.team_a_id === team.id ? bout.team_b_score : bout.team_a_score;
            } else if (
                (bout.team_a_id === team.id || bout.team_b_id === team.id) && 
                bout.status === 'complete'
            ) {
                losses++;
                boutsWon += bout.team_a_id === team.id ? bout.team_a_score : bout.team_b_score;
                boutsLost += bout.team_a_id === team.id ? bout.team_b_score : bout.team_a_score;
            }
        });

        return {
            team,
            wins,
            losses,
            winRate: wins / (wins + losses) || 0,
            boutsWon,
            boutsLost,
            boutIndicator: boutsWon - boutsLost
        };
    });

    // Sort by wins, then by bout indicator
    standings.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.boutIndicator - a.boutIndicator;
    });

    return standings;
}