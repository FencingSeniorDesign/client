import { eq, and, sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import { teamBouts, relayBoutState, teams, fencers } from '../schema';
import { getTeamStarters } from './team';

// Type alias for the database client
type DrizzleClient = typeof db;

// Relay format constants
const RELAY_TOTAL_TOUCHES = 45;
const RELAY_ROTATION_INTERVAL = 5;

export interface RelayBoutStatus {
    teamBoutId: number;
    teamAScore: number;
    teamBScore: number;
    currentFencerAId: number;
    currentFencerBId: number;
    currentFencerAName: string;
    currentFencerBName: string;
    rotationCountA: number;
    rotationCountB: number;
    lastRotationScoreA: number;
    lastRotationScoreB: number;
    isComplete: boolean;
    winnerId: number | null;
}

export interface RelayRotation {
    teamId: number;
    fromFencerId: number;
    toFencerId: number;
    atScore: number;
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
    const [teamBout] = await client.insert(teamBouts).values({
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
        tableof: tableOf
    }).returning();
    
    // Create relay bout state with first fencers
    await client.insert(relayBoutState).values({
        team_bout_id: teamBout.id,
        current_fencer_a_id: teamAStarters[0].fencerid,
        current_fencer_b_id: teamBStarters[0].fencerid,
        rotation_count_a: 0,
        rotation_count_b: 0,
        last_rotation_score_a: 0,
        last_rotation_score_b: 0
    });
    
    return teamBout.id;
}

// Get current relay bout status
export async function getRelayBoutStatus(client: DrizzleClient, teamBoutId: number): Promise<RelayBoutStatus | null> {
    const result = await client.select({
        teamBout: teamBouts,
        relayState: relayBoutState,
        fencerA: {
            id: fencers.id,
            fname: fencers.fname,
            lname: fencers.lname,
            nickname: fencers.nickname
        },
        fencerB: {
            id: sql`f2.id`.as('fencer_b_id'),
            fname: sql`f2.fname`.as('fencer_b_fname'),
            lname: sql`f2.lname`.as('fencer_b_lname'),
            nickname: sql`f2.nickname`.as('fencer_b_nickname')
        }
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
        rotationCountA: relayState.rotation_count_a,
        rotationCountB: relayState.rotation_count_b,
        lastRotationScoreA: relayState.last_rotation_score_a,
        lastRotationScoreB: relayState.last_rotation_score_b,
        isComplete: teamBout.status === 'complete',
        winnerId: teamBout.winner_id
    };
}

// Update relay bout score
export async function updateRelayBoutScore(
    client: DrizzleClient,
    teamBoutId: number,
    teamAScore: number,
    teamBScore: number
): Promise<void> {
    await client.transaction(async (tx) => {
        const [teamBout] = await tx.select()
            .from(teamBouts)
            .where(eq(teamBouts.id, teamBoutId));
        
        if (!teamBout || teamBout.format !== '45-touch') {
            throw new Error('Invalid relay bout');
        }
        
        const [relayState] = await tx.select()
            .from(relayBoutState)
            .where(eq(relayBoutState.team_bout_id, teamBoutId));
        
        if (!relayState) {
            throw new Error('Relay state not found');
        }
        
        // Check for rotations
        const rotations: RelayRotation[] = [];
        
        // Check team A rotation
        const teamANextRotation = Math.floor(teamAScore / RELAY_ROTATION_INTERVAL);
        if (teamANextRotation > relayState.rotation_count_a) {
            const teamAStarters = await getTeamStarters(tx, teamBout.team_a_id!);
            teamAStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            
            const currentIndex = teamAStarters.findIndex(f => f.fencerid === relayState.current_fencer_a_id);
            const nextIndex = (currentIndex + 1) % teamAStarters.length;
            
            rotations.push({
                teamId: teamBout.team_a_id!,
                fromFencerId: relayState.current_fencer_a_id!,
                toFencerId: teamAStarters[nextIndex].fencerid,
                atScore: teamAScore
            });
            
            await tx.update(relayBoutState)
                .set({
                    current_fencer_a_id: teamAStarters[nextIndex].fencerid,
                    rotation_count_a: teamANextRotation,
                    last_rotation_score_a: teamAScore
                })
                .where(eq(relayBoutState.team_bout_id, teamBoutId));
        }
        
        // Check team B rotation
        const teamBNextRotation = Math.floor(teamBScore / RELAY_ROTATION_INTERVAL);
        if (teamBNextRotation > relayState.rotation_count_b) {
            const teamBStarters = await getTeamStarters(tx, teamBout.team_b_id!);
            teamBStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            
            const currentIndex = teamBStarters.findIndex(f => f.fencerid === relayState.current_fencer_b_id);
            const nextIndex = (currentIndex + 1) % teamBStarters.length;
            
            rotations.push({
                teamId: teamBout.team_b_id!,
                fromFencerId: relayState.current_fencer_b_id!,
                toFencerId: teamBStarters[nextIndex].fencerid,
                atScore: teamBScore
            });
            
            await tx.update(relayBoutState)
                .set({
                    current_fencer_b_id: teamBStarters[nextIndex].fencerid,
                    rotation_count_b: teamBNextRotation,
                    last_rotation_score_b: teamBScore
                })
                .where(eq(relayBoutState.team_bout_id, teamBoutId));
        }
        
        // Check if bout is complete
        // A relay bout is complete if either team reaches 45 touches OR if scores are different (indicating time/decision)
        const isComplete = (teamAScore >= RELAY_TOTAL_TOUCHES || teamBScore >= RELAY_TOTAL_TOUCHES) ||
                          (teamAScore !== teamBScore && (teamAScore > 0 || teamBScore > 0));
        const winnerId = isComplete 
            ? (teamAScore > teamBScore ? teamBout.team_a_id : 
               teamBScore > teamAScore ? teamBout.team_b_id : null)
            : null;
        
        // Update team bout scores
        await tx.update(teamBouts)
            .set({
                team_a_score: teamAScore,
                team_b_score: teamBScore,
                status: isComplete ? 'complete' : 'in_progress',
                winner_id: winnerId
            })
            .where(eq(teamBouts.id, teamBoutId));
    });
}

// Force a rotation (e.g., for substitution or injury)
export async function forceRelayRotation(
    client: DrizzleClient,
    teamBoutId: number,
    teamId: number,
    newFencerId: number
): Promise<void> {
    await client.transaction(async (tx) => {
        const [teamBout] = await tx.select()
            .from(teamBouts)
            .where(eq(teamBouts.id, teamBoutId));
        
        if (!teamBout || teamBout.format !== '45-touch') {
            throw new Error('Invalid relay bout');
        }
        
        const [relayState] = await tx.select()
            .from(relayBoutState)
            .where(eq(relayBoutState.team_bout_id, teamBoutId));
        
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
            await tx.update(relayBoutState)
                .set({ current_fencer_a_id: newFencerId })
                .where(eq(relayBoutState.team_bout_id, teamBoutId));
        } else if (teamId === teamBout.team_b_id) {
            await tx.update(relayBoutState)
                .set({ current_fencer_b_id: newFencerId })
                .where(eq(relayBoutState.team_bout_id, teamBoutId));
        } else {
            throw new Error('Invalid team ID');
        }
    });
}

// Get next fencer in rotation order
export async function getNextRelayFencer(
    client: DrizzleClient,
    teamId: number,
    currentFencerId: number
): Promise<number> {
    const teamStarters = await getTeamStarters(client, teamId);
    teamStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    const currentIndex = teamStarters.findIndex(f => f.fencerid === currentFencerId);
    if (currentIndex === -1) {
        throw new Error('Current fencer not found in team starters');
    }
    
    const nextIndex = (currentIndex + 1) % teamStarters.length;
    return teamStarters[nextIndex].fencerid;
}

// Calculate touches scored in current rotation
export function getRotationTouches(
    currentScore: number,
    lastRotationScore: number
): number {
    return currentScore - lastRotationScore;
}

// Calculate remaining touches until next rotation
export function getTouchesUntilRotation(currentScore: number): number {
    const nextRotationScore = Math.ceil(currentScore / RELAY_ROTATION_INTERVAL) * RELAY_ROTATION_INTERVAL;
    return nextRotationScore - currentScore;
}