import { eq, and, sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import { teamBouts, relayBoutState, teams, fencers, relayLegHistory } from '../schema';
import { getTeamStarters } from './team';
import { advanceTeamToNextBout } from './teamBracket';

// Type alias for the database client
type DrizzleClient = typeof db;

// Relay format constants
const RELAY_TOTAL_TOUCHES = 45;
const RELAY_MAX_LEGS = 9;

// 9-leg relay rotation pattern for 3-fencer teams
// Each team rotates through their 3 fencers in a specific pattern
// [Team A fencer index, Team B fencer index] (0-indexed for 3 fencers)
const RELAY_BOUT_ORDER = [
    [2, 2], // Leg 1: Fencer 3 vs Fencer 3
    [1, 0], // Leg 2: Fencer 2 vs Fencer 1
    [0, 1], // Leg 3: Fencer 1 vs Fencer 2
    [2, 0], // Leg 4: Fencer 3 vs Fencer 1
    [1, 1], // Leg 5: Fencer 2 vs Fencer 2
    [0, 2], // Leg 6: Fencer 1 vs Fencer 3
    [2, 1], // Leg 7: Fencer 3 vs Fencer 2
    [1, 2], // Leg 8: Fencer 2 vs Fencer 3
    [0, 0], // Leg 9: Fencer 1 vs Fencer 1
];

export interface RelayBoutStatus {
    teamBoutId: number;
    teamAScore: number;
    teamBScore: number;
    currentFencerAId: number;
    currentFencerBId: number;
    currentFencerAName: string;
    currentFencerBName: string;
    rotationCount: number;
    lastRotationCombinedScore: number;
    currentLeg: number;
    isComplete: boolean;
    winnerId: number | null;
}

export interface RelayRotation {
    teamId: number;
    fromFencerId: number;
    toFencerId: number;
    atScore: number;
}

export interface RelayLegHistoryEntry {
    id: number;
    teamBoutId: number;
    legNumber: number;
    fencerAId: number;
    fencerBId: number;
    scoreA: number;
    scoreB: number;
    fencerAName: string;
    fencerBName: string;
    createdAt: string;
    updatedAt: string;
}

// Create 45-touch relay team bout
export async function createRelayTeamBout(
    client: DrizzleClient,
    roundId: number,
    teamAId: number,
    teamBId: number,
    eventId: number,
    tableOf?: number
): Promise<number> {
    // Get starters for both teams
    const teamAStarters = await getTeamStarters(client, teamAId);
    const teamBStarters = await getTeamStarters(client, teamBId);

    if (teamAStarters.length !== 3 || teamBStarters.length !== 3) {
        throw new Error('Both teams must have exactly 3 starters for relay format');
    }

    // Sort by position to get the first fencers
    teamAStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    teamBStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // Create the team bout
    const [teamBout] = await client
        .insert(teamBouts)
        .values({
            roundid: roundId,
            eventid: eventId,
            team_a_id: teamAId,
            team_b_id: teamBId,
            format: '45-touch',
            team_format: '45-touch',
            bout_type: 'pool',
            status: 'pending',
            team_a_score: 0,
            team_b_score: 0,
            tableof: tableOf,
        })
        .returning();

    // Get fencers for first leg (Fencer 3 vs Fencer 3)
    const firstLeg = RELAY_BOUT_ORDER[0];
    const fencerAIndex = firstLeg[0];
    const fencerBIndex = firstLeg[1];
    const firstFencerA = teamAStarters[fencerAIndex];
    const firstFencerB = teamBStarters[fencerBIndex];

    // Additional validation to ensure fencers exist
    if (!firstFencerA) {
        throw new Error(`Team A fencer at index ${fencerAIndex} not found for first leg`);
    }
    if (!firstFencerB) {
        throw new Error(`Team B fencer at index ${fencerBIndex} not found for first leg`);
    }

    // Create relay bout state with first leg fencers
    await client.insert(relayBoutState).values({
        team_bout_id: teamBout.id,
        current_fencer_a_id: firstFencerA.fencerid,
        current_fencer_b_id: firstFencerB.fencerid,
        rotation_count_a: 0,
        rotation_count_b: 0,
        last_rotation_score_a: 0,
        last_rotation_score_b: 0,
    });

    return teamBout.id;
}

// Get current relay bout status
export async function getRelayBoutStatus(client: DrizzleClient, teamBoutId: number): Promise<RelayBoutStatus | null> {
    const result = await client
        .select({
            teamBout: teamBouts,
            relayState: relayBoutState,
            fencerA: {
                id: fencers.id,
                fname: fencers.fname,
                lname: fencers.lname,
                nickname: fencers.nickname,
            },
            fencerB: {
                id: sql`f2.id`.as('fencer_b_id'),
                fname: sql`f2.fname`.as('fencer_b_fname'),
                lname: sql`f2.lname`.as('fencer_b_lname'),
                nickname: sql`f2.nickname`.as('fencer_b_nickname'),
            },
        })
        .from(teamBouts)
        .innerJoin(relayBoutState, eq(teamBouts.id, relayBoutState.team_bout_id))
        .innerJoin(fencers, eq(relayBoutState.current_fencer_a_id, fencers.id))
        .innerJoin(sql`${fencers} as f2`, eq(relayBoutState.current_fencer_b_id, sql`f2.id`))
        .where(eq(teamBouts.id, teamBoutId));

    if (result.length === 0) {
        return null;
    }

    const { teamBout, relayState, fencerA, fencerB } = result[0];

    return {
        teamBoutId,
        teamAScore: teamBout.team_a_score,
        teamBScore: teamBout.team_b_score,
        currentFencerAId: fencerA.id,
        currentFencerBId: fencerB.id,
        currentFencerAName: `${fencerA.fname} ${fencerA.lname}`,
        currentFencerBName: `${fencerB.fname} ${fencerB.lname}`,
        rotationCount: Math.max(relayState.rotation_count_a, relayState.rotation_count_b),
        lastRotationCombinedScore: Math.max(relayState.last_rotation_score_a, relayState.last_rotation_score_b),
        currentLeg: Math.max(relayState.rotation_count_a, relayState.rotation_count_b) + 1,
        isComplete: teamBout.status === 'complete',
        winnerId: teamBout.winner_id,
    };
}

// Update relay bout score
export async function updateRelayBoutScore(
    client: DrizzleClient,
    teamBoutId: number,
    teamAScore: number,
    teamBScore: number
): Promise<void> {
    await client.transaction(async tx => {
        const [teamBout] = await tx.select().from(teamBouts).where(eq(teamBouts.id, teamBoutId));

        if (!teamBout || teamBout.format !== '45-touch') {
            throw new Error('Invalid relay bout');
        }

        const [relayState] = await tx.select().from(relayBoutState).where(eq(relayBoutState.team_bout_id, teamBoutId));

        if (!relayState) {
            throw new Error('Relay state not found');
        }

        // Check if we need to advance to the next leg based on completed legs
        const completedLegs = await getRelayLegHistory(tx, teamBoutId);
        const currentLegNumber = completedLegs.length + 1;

        // Check if bout is complete first
        const isComplete =
            teamAScore >= RELAY_TOTAL_TOUCHES ||
            teamBScore >= RELAY_TOTAL_TOUCHES ||
            completedLegs.length >= RELAY_MAX_LEGS;

        // Only update fencers if we haven't exceeded the maximum legs and bout isn't complete
        if (currentLegNumber <= RELAY_MAX_LEGS && !isComplete) {
            const teamAStarters = await getTeamStarters(tx, teamBout.team_a_id!);
            const teamBStarters = await getTeamStarters(tx, teamBout.team_b_id!);
            teamAStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            teamBStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            // Get the current leg's fencer assignments
            if (currentLegNumber <= RELAY_BOUT_ORDER.length) {
                const legAssignment = RELAY_BOUT_ORDER[currentLegNumber - 1];
                const expectedFencerA = teamAStarters[legAssignment[0]];
                const expectedFencerB = teamBStarters[legAssignment[1]];

                // Update fencers if they don't match the expected assignment
                if (
                    relayState.current_fencer_a_id !== expectedFencerA.fencerid ||
                    relayState.current_fencer_b_id !== expectedFencerB.fencerid
                ) {
                    await tx
                        .update(relayBoutState)
                        .set({
                            current_fencer_a_id: expectedFencerA.fencerid,
                            current_fencer_b_id: expectedFencerB.fencerid,
                            rotation_count_a: currentLegNumber - 1,
                            rotation_count_b: currentLegNumber - 1,
                        })
                        .where(eq(relayBoutState.team_bout_id, teamBoutId));
                }
            }
        }

        // Note: isComplete is already calculated above
        const winnerId = isComplete
            ? teamAScore > teamBScore
                ? teamBout.team_a_id
                : teamBScore > teamAScore
                  ? teamBout.team_b_id
                  : null
            : null;

        // Update team bout scores
        await tx
            .update(teamBouts)
            .set({
                team_a_score: teamAScore,
                team_b_score: teamBScore,
                status: isComplete ? 'complete' : 'in_progress',
                winner_id: winnerId,
            })
            .where(eq(teamBouts.id, teamBoutId));

        // Advance winner to next bout if match is complete
        if (isComplete && winnerId) {
            await advanceTeamToNextBout(teamBoutId, winnerId);
        }
    });
}

// Force a rotation (e.g., for substitution or injury)
export async function forceRelayRotation(
    client: DrizzleClient,
    teamBoutId: number,
    teamId: number,
    newFencerId: number
): Promise<void> {
    await client.transaction(async tx => {
        const [teamBout] = await tx.select().from(teamBouts).where(eq(teamBouts.id, teamBoutId));

        if (!teamBout || teamBout.format !== '45-touch') {
            throw new Error('Invalid relay bout');
        }

        const [relayState] = await tx.select().from(relayBoutState).where(eq(relayBoutState.team_bout_id, teamBoutId));

        if (!relayState) {
            throw new Error('Relay state not found');
        }

        // Verify the new fencer is on the team
        const teamStarters = await getTeamStarters(tx, teamId);
        const isValidFencer = teamStarters.some(s => s.fencerid === newFencerId);

        if (!isValidFencer) {
            throw new Error('Fencer is not a starter on this team');
        }

        // Update the appropriate fencer
        if (teamId === teamBout.team_a_id) {
            await tx
                .update(relayBoutState)
                .set({ current_fencer_a_id: newFencerId })
                .where(eq(relayBoutState.team_bout_id, teamBoutId));
        } else if (teamId === teamBout.team_b_id) {
            await tx
                .update(relayBoutState)
                .set({ current_fencer_b_id: newFencerId })
                .where(eq(relayBoutState.team_bout_id, teamBoutId));
        } else {
            throw new Error('Invalid team ID');
        }
    });
}

// Get next fencer based on proper relay leg order
export async function getNextRelayFencer(
    client: DrizzleClient,
    teamId: number,
    currentLegNumber: number,
    isTeamA: boolean
): Promise<number> {
    const teamStarters = await getTeamStarters(client, teamId);
    teamStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // Get the next leg (current leg is 1-indexed)
    const nextLegIndex = currentLegNumber; // This will be the index for the next leg (0-indexed)

    if (nextLegIndex >= RELAY_BOUT_ORDER.length) {
        throw new Error('No more legs in relay format');
    }

    const legAssignment = RELAY_BOUT_ORDER[nextLegIndex];
    const fencerIndex = isTeamA ? legAssignment[0] : legAssignment[1];

    if (fencerIndex >= teamStarters.length) {
        throw new Error('Fencer position not found in team starters');
    }

    return teamStarters[fencerIndex].fencerid;
}

// Get fencers for a specific leg
export async function getFencersForLeg(
    client: DrizzleClient,
    teamAId: number,
    teamBId: number,
    legNumber: number
): Promise<{ fencerAId: number; fencerBId: number; fencerAName: string; fencerBName: string }> {
    if (legNumber < 1 || legNumber > RELAY_MAX_LEGS) {
        throw new Error(`Invalid leg number: ${legNumber}. Must be between 1 and ${RELAY_MAX_LEGS}`);
    }

    const teamAStarters = await getTeamStarters(client, teamAId);
    const teamBStarters = await getTeamStarters(client, teamBId);
    teamAStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    teamBStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // Validate that both teams have exactly 3 fencers
    if (teamAStarters.length !== 3) {
        throw new Error(`Team A must have exactly 3 fencers for relay format. Found: ${teamAStarters.length}`);
    }
    if (teamBStarters.length !== 3) {
        throw new Error(`Team B must have exactly 3 fencers for relay format. Found: ${teamBStarters.length}`);
    }

    const legAssignment = RELAY_BOUT_ORDER[legNumber - 1];
    const fencerAIndex = legAssignment[0];
    const fencerBIndex = legAssignment[1];
    const fencerA = teamAStarters[fencerAIndex];
    const fencerB = teamBStarters[fencerBIndex];

    // Additional validation to ensure fencers exist
    if (!fencerA) {
        throw new Error(`Team A fencer at index ${fencerAIndex} not found for leg ${legNumber}`);
    }
    if (!fencerB) {
        throw new Error(`Team B fencer at index ${fencerBIndex} not found for leg ${legNumber}`);
    }

    return {
        fencerAId: fencerA.fencerid,
        fencerBId: fencerB.fencerid,
        fencerAName: `${fencerA.fname} ${fencerA.lname}`,
        fencerBName: `${fencerB.fname} ${fencerB.lname}`,
    };
}

// Get the maximum number of legs for relay format
export function getMaxRelayLegs(): number {
    return RELAY_MAX_LEGS;
}

// Get the bout order for display purposes
export function getRelayBoutOrder(): Array<[number, number]> {
    return RELAY_BOUT_ORDER.map(([a, b]) => [a + 1, b + 1]); // Convert to 1-indexed for display
}

// Save a leg score to history
export async function saveRelayLegHistory(
    client: DrizzleClient,
    teamBoutId: number,
    legNumber: number,
    fencerAId: number,
    fencerBId: number,
    scoreA: number,
    scoreB: number
): Promise<void> {
    await client.insert(relayLegHistory).values({
        team_bout_id: teamBoutId,
        leg_number: legNumber,
        fencer_a_id: fencerAId,
        fencer_b_id: fencerBId,
        score_a: scoreA,
        score_b: scoreB,
    });
}

// Get all leg history for a relay bout
export async function getRelayLegHistory(client: DrizzleClient, teamBoutId: number): Promise<RelayLegHistoryEntry[]> {
    const result = await client
        .select({
            id: relayLegHistory.id,
            teamBoutId: relayLegHistory.team_bout_id,
            legNumber: relayLegHistory.leg_number,
            fencerAId: relayLegHistory.fencer_a_id,
            fencerBId: relayLegHistory.fencer_b_id,
            scoreA: relayLegHistory.score_a,
            scoreB: relayLegHistory.score_b,
            createdAt: relayLegHistory.created_at,
            updatedAt: relayLegHistory.updated_at,
            fencerAName: sql<string>`${fencers.fname} || ' ' || ${fencers.lname}`.as('fencer_a_name'),
            fencerBName: sql<string>`f2.fname || ' ' || f2.lname`.as('fencer_b_name'),
        })
        .from(relayLegHistory)
        .innerJoin(fencers, eq(relayLegHistory.fencer_a_id, fencers.id))
        .innerJoin(sql`${fencers} as f2`, eq(relayLegHistory.fencer_b_id, sql`f2.id`))
        .where(eq(relayLegHistory.team_bout_id, teamBoutId))
        .orderBy(relayLegHistory.leg_number);

    return result;
}

// Update a historical leg score
export async function updateRelayLegHistory(
    client: DrizzleClient,
    legHistoryId: number,
    scoreA: number,
    scoreB: number
): Promise<void> {
    await client
        .update(relayLegHistory)
        .set({
            score_a: scoreA,
            score_b: scoreB,
            updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(relayLegHistory.id, legHistoryId));
}

// Add a new leg score and update bout totals
export async function addRelayLegScore(
    client: DrizzleClient,
    teamBoutId: number,
    scoreA: number,
    scoreB: number
): Promise<void> {
    await client.transaction(async tx => {
        // Get current bout status
        const status = await getRelayBoutStatus(tx, teamBoutId);
        if (!status) {
            throw new Error('Relay bout not found');
        }

        // Get current leg number (number of existing legs + 1)
        const existingLegs = await getRelayLegHistory(tx, teamBoutId);
        const legNumber = existingLegs.length + 1;

        // Check if we've exceeded the maximum number of legs
        if (legNumber > RELAY_MAX_LEGS) {
            throw new Error(`Cannot add more than ${RELAY_MAX_LEGS} legs to a relay bout`);
        }

        // Save leg history with current fencers
        await saveRelayLegHistory(
            tx,
            teamBoutId,
            legNumber,
            status.currentFencerAId,
            status.currentFencerBId,
            scoreA,
            scoreB
        );

        // Calculate new total scores
        const newTeamAScore = status.teamAScore + scoreA;
        const newTeamBScore = status.teamBScore + scoreB;

        // Check if we need to set up the next leg's fencers
        const nextLegNumber = legNumber + 1;
        if (
            nextLegNumber <= RELAY_MAX_LEGS &&
            newTeamAScore < RELAY_TOTAL_TOUCHES &&
            newTeamBScore < RELAY_TOTAL_TOUCHES
        ) {
            // Get team bout info
            const [teamBout] = await tx.select().from(teamBouts).where(eq(teamBouts.id, teamBoutId));

            if (teamBout && teamBout.team_a_id && teamBout.team_b_id) {
                try {
                    // Get the fencers for the next leg
                    const nextLegFencers = await getFencersForLeg(
                        tx,
                        teamBout.team_a_id,
                        teamBout.team_b_id,
                        nextLegNumber
                    );

                    // Update the relay state with the next leg's fencers
                    await tx
                        .update(relayBoutState)
                        .set({
                            current_fencer_a_id: nextLegFencers.fencerAId,
                            current_fencer_b_id: nextLegFencers.fencerBId,
                            rotation_count_a: legNumber,
                            rotation_count_b: legNumber,
                        })
                        .where(eq(relayBoutState.team_bout_id, teamBoutId));
                } catch (error) {
                    // If we can't get the next leg fencers (e.g., bout is complete),
                    // just continue with the score update
                    console.warn('Could not set up next leg fencers:', error);
                }
            }
        }

        // Update bout with new totals
        await updateRelayBoutScore(tx, teamBoutId, newTeamAScore, newTeamBScore);
    });
}

// Recalculate bout scores from leg history
export async function recalculateRelayBoutFromHistory(client: DrizzleClient, teamBoutId: number): Promise<void> {
    await client.transaction(async tx => {
        // Get all leg history
        const legHistory = await getRelayLegHistory(tx, teamBoutId);

        // Calculate total scores from all legs
        let totalScoreA = 0;
        let totalScoreB = 0;

        for (const leg of legHistory) {
            totalScoreA += leg.scoreA;
            totalScoreB += leg.scoreB;
        }

        // Update the team bout with recalculated scores
        await updateRelayBoutScore(tx, teamBoutId, totalScoreA, totalScoreB);
    });
}
