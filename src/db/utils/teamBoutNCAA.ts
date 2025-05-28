import { eq, and, sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import { teamBouts, teamBoutScores, teams, fencers } from '../schema';
import { getTeamStarters, TeamMember } from './team';

// Type alias for the database client
type DrizzleClient = typeof db;

// NCAA format constants
const NCAA_BOUTS_TO_WIN = 5;
const NCAA_TOUCHES_PER_BOUT = 5;
const NCAA_TOTAL_BOUTS = 9;

// NCAA bout order (1-indexed positions)
const NCAA_BOUT_ORDER: [number, number][] = [
    [3, 2], // Bout 1: A3 vs B2
    [1, 3], // Bout 2: A1 vs B3
    [2, 1], // Bout 3: A2 vs B1
    [3, 1], // Bout 4: A3 vs B1
    [1, 2], // Bout 5: A1 vs B2
    [2, 3], // Bout 6: A2 vs B3
    [3, 3], // Bout 7: A3 vs B3
    [1, 1], // Bout 8: A1 vs B1
    [2, 2], // Bout 9: A2 vs B2
];

export interface NCAABoutStatus {
    teamBoutId: number;
    teamAScore: number; // Number of bouts won
    teamBScore: number; // Number of bouts won
    currentBoutNumber: number;
    isComplete: boolean;
    winnerId: number | null;
    boutScores: NCAAIndividualBout[];
}

export interface NCAAIndividualBout {
    boutNumber: number;
    fencerAId: number;
    fencerBId: number;
    fencerAName: string;
    fencerBName: string;
    fencerAScore: number;
    fencerBScore: number;
    winnerId: number | null;
    isComplete: boolean;
}

// Create NCAA team bout with all 9 individual bouts
export async function createNCAATeamBout(
    client: DrizzleClient,
    roundId: number,
    teamAId: number,
    teamBId: number,
    eventId: number,
    tableOf?: number
): Promise<number> {
    // Create the team bout
    const [teamBout] = await client.insert(teamBouts).values({
        roundid: roundId,
        eventid: eventId,
        team_a_id: teamAId,
        team_b_id: teamBId,
        format: 'NCAA',
        team_format: 'NCAA',
        bout_type: 'pool',
        status: 'pending',
        team_a_score: 0,
        team_b_score: 0,
        tableof: tableOf
    }).returning();
    
    // Get starters for both teams
    const teamAStarters = await getTeamStarters(client, teamAId);
    const teamBStarters = await getTeamStarters(client, teamBId);
    
    if (teamAStarters.length !== 3 || teamBStarters.length !== 3) {
        throw new Error('Both teams must have exactly 3 starters for NCAA format');
    }
    
    // Sort by position to ensure correct order
    teamAStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    teamBStarters.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    
    // Create all 9 individual bout records
    const boutScoreInserts = NCAA_BOUT_ORDER.map((order, index) => {
        const [aPos, bPos] = order;
        const fencerA = teamAStarters[aPos - 1]; // Convert to 0-indexed
        const fencerB = teamBStarters[bPos - 1];
        
        return {
            team_bout_id: teamBout.id,
            bout_number: index + 1,
            fencer_a_id: fencerA.fencerid,
            fencer_b_id: fencerB.fencerid,
            fencer_a_score: 0,
            fencer_b_score: 0,
            is_complete: false
        };
    });
    
    await client.insert(teamBoutScores).values(boutScoreInserts);
    
    return teamBout.id;
}

// Get current NCAA bout status
export async function getNCAABoutStatus(client: DrizzleClient, teamBoutId: number): Promise<NCAABoutStatus | null> {
    const [teamBout] = await client.select()
        .from(teamBouts)
        .where(eq(teamBouts.id, teamBoutId));
    
    if (!teamBout || teamBout.format !== 'NCAA') {
        return null;
    }
    
    const boutScoresData = await client.select({
        boutScore: teamBoutScores,
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
    .from(teamBoutScores)
    .innerJoin(fencers, eq(teamBoutScores.fencer_a_id, fencers.id))
    .innerJoin(sql`${fencers} as f2`, eq(teamBoutScores.fencer_b_id, sql`f2.id`))
    .where(eq(teamBoutScores.team_bout_id, teamBoutId))
    .orderBy(teamBoutScores.bout_number);
    
    const boutScores: NCAAIndividualBout[] = boutScoresData.map(row => ({
        boutNumber: row.boutScore.bout_number,
        fencerAId: row.boutScore.fencer_a_id!,
        fencerBId: row.boutScore.fencer_b_id!,
        fencerAName: `${row.fencerA.fname} ${row.fencerA.lname}`,
        fencerBName: `${row.fencerB.fname} ${row.fencerB.lname}`,
        fencerAScore: row.boutScore.fencer_a_score,
        fencerBScore: row.boutScore.fencer_b_score,
        winnerId: row.boutScore.winner_id,
        isComplete: row.boutScore.is_complete === 1
    }));
    
    // Find the current bout (first incomplete bout)
    const currentBoutNumber = boutScores.findIndex(b => !b.isComplete) + 1 || boutScores.length + 1;
    
    return {
        teamBoutId,
        teamAScore: teamBout.team_a_score,
        teamBScore: teamBout.team_b_score,
        currentBoutNumber,
        isComplete: teamBout.status === 'complete',
        winnerId: teamBout.winner_id,
        boutScores
    };
}

// Update individual bout score
export async function updateNCAABoutScore(
    client: DrizzleClient,
    teamBoutId: number,
    boutNumber: number,
    fencerAScore: number,
    fencerBScore: number,
    manualWinnerId?: number
): Promise<void> {
    await client.transaction(async (tx) => {
        // Get the bout score record
        const [boutScore] = await tx.select()
            .from(teamBoutScores)
            .where(and(
                eq(teamBoutScores.team_bout_id, teamBoutId),
                eq(teamBoutScores.bout_number, boutNumber)
            ));
        
        if (!boutScore) {
            throw new Error(`Bout ${boutNumber} not found`);
        }
        
        // Check if bout should be complete
        // A bout is complete if either fencer reaches 5 touches OR if scores are different (indicating a time/cards decision)
        // OR if a manual winner is provided (for tie-breaking)
        const isComplete = (fencerAScore >= NCAA_TOUCHES_PER_BOUT || fencerBScore >= NCAA_TOUCHES_PER_BOUT) || 
                          (fencerAScore !== fencerBScore && (fencerAScore > 0 || fencerBScore > 0)) ||
                          (manualWinnerId !== undefined);
        
        // Determine winner: use manual winner if provided, otherwise base on scores
        let winnerId: number | null = null;
        if (manualWinnerId !== undefined) {
            winnerId = manualWinnerId;
        } else if (fencerAScore > fencerBScore) {
            winnerId = boutScore.fencer_a_id;
        } else if (fencerBScore > fencerAScore) {
            winnerId = boutScore.fencer_b_id;
        }
        
        // Update the individual bout score
        await tx.update(teamBoutScores)
            .set({
                fencer_a_score: fencerAScore,
                fencer_b_score: fencerBScore,
                is_complete: isComplete,
                winner_id: isComplete ? winnerId : null
            })
            .where(and(
                eq(teamBoutScores.team_bout_id, teamBoutId),
                eq(teamBoutScores.bout_number, boutNumber)
            ));
        
        // If bout is complete, update team scores
        if (isComplete) {
            await updateTeamScores(tx, teamBoutId);
        }
    });
}

// Complete an individual bout
export async function completeNCAAIndividualBout(
    client: DrizzleClient,
    teamBoutId: number,
    boutNumber: number
): Promise<void> {
    await client.transaction(async (tx) => {
        const [boutScore] = await tx.select()
            .from(teamBoutScores)
            .where(and(
                eq(teamBoutScores.team_bout_id, teamBoutId),
                eq(teamBoutScores.bout_number, boutNumber)
            ));
        
        if (!boutScore) {
            throw new Error(`Bout ${boutNumber} not found`);
        }
        
        if (boutScore.fencer_a_score < NCAA_TOUCHES_PER_BOUT && 
            boutScore.fencer_b_score < NCAA_TOUCHES_PER_BOUT) {
            throw new Error('Cannot complete bout - neither fencer has reached 5 touches');
        }
        
        const winnerId = boutScore.fencer_a_score > boutScore.fencer_b_score 
            ? boutScore.fencer_a_id 
            : boutScore.fencer_b_id;
        
        await tx.update(teamBoutScores)
            .set({
                is_complete: true,
                winner_id: winnerId
            })
            .where(and(
                eq(teamBoutScores.team_bout_id, teamBoutId),
                eq(teamBoutScores.bout_number, boutNumber)
            ));
        
        await updateTeamScores(tx, teamBoutId);
    });
}

// Update team scores based on individual bout results
async function updateTeamScores(tx: any, teamBoutId: number): Promise<void> {
    // Count completed bouts won by each team
    const boutScores = await tx.select()
        .from(teamBoutScores)
        .where(eq(teamBoutScores.team_bout_id, teamBoutId));
    
    const [teamBout] = await tx.select()
        .from(teamBouts)
        .where(eq(teamBouts.id, teamBoutId));
    
    let teamAWins = 0;
    let teamBWins = 0;
    
    for (const bout of boutScores) {
        if (bout.is_complete && bout.winner_id) {
            // Check which team the winner belongs to
            const teamAMembers = await tx.select()
                .from(teamBoutScores)
                .where(and(
                    eq(teamBoutScores.team_bout_id, teamBoutId),
                    eq(teamBoutScores.fencer_a_id, bout.winner_id)
                ));
            
            if (teamAMembers.length > 0) {
                teamAWins++;
            } else {
                teamBWins++;
            }
        }
    }
    
    // Check if match is complete
    const isComplete = teamAWins >= NCAA_BOUTS_TO_WIN || teamBWins >= NCAA_BOUTS_TO_WIN;
    const winnerId = isComplete 
        ? (teamAWins > teamBWins ? teamBout.team_a_id : teamBout.team_b_id)
        : null;
    
    await tx.update(teamBouts)
        .set({
            team_a_score: teamAWins,
            team_b_score: teamBWins,
            status: isComplete ? 'complete' : 'in_progress',
            winner_id: winnerId
        })
        .where(eq(teamBouts.id, teamBoutId));
}

// Handle substitution during NCAA bout
export async function substituteNCAAFencer(
    client: DrizzleClient,
    teamBoutId: number,
    outFencerId: number,
    inFencerId: number
): Promise<void> {
    await client.transaction(async (tx) => {
        // Get all future bouts for the outgoing fencer
        const futureBouts = await tx.select()
            .from(teamBoutScores)
            .where(and(
                eq(teamBoutScores.team_bout_id, teamBoutId),
                eq(teamBoutScores.is_complete, false),
                or(
                    eq(teamBoutScores.fencer_a_id, outFencerId),
                    eq(teamBoutScores.fencer_b_id, outFencerId)
                )
            ));
        
        // Update future bouts with the incoming fencer
        for (const bout of futureBouts) {
            if (bout.fencer_a_id === outFencerId) {
                await tx.update(teamBoutScores)
                    .set({ fencer_a_id: inFencerId })
                    .where(eq(teamBoutScores.id, bout.id));
            } else if (bout.fencer_b_id === outFencerId) {
                await tx.update(teamBoutScores)
                    .set({ fencer_b_id: inFencerId })
                    .where(eq(teamBoutScores.id, bout.id));
            }
        }
    });
}

// Get NCAA bout order description
export function getNCAABoutOrderDescription(boutNumber: number): string {
    if (boutNumber < 1 || boutNumber > 9) {
        return 'Invalid bout number';
    }
    
    const [aPos, bPos] = NCAA_BOUT_ORDER[boutNumber - 1];
    return `Position ${aPos} vs Position ${bPos}`;
}