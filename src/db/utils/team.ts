import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import {
    teams,
    teamMembers,
    teamBouts,
    teamBoutScores,
    relayBoutState,
    teamPoolAssignment,
    fencers,
    events,
} from '../schema';

// Type alias for the database client
type DrizzleClient = typeof db;

// Types
export interface TeamCreate {
    name: string;
    eventid: number;
    clubid?: number;
    seed?: number;
}

export interface TeamMemberCreate {
    teamid: number;
    fencerid: number;
    role: 'starter' | 'substitute';
    position?: number;
}

export interface TeamWithMembers {
    id: number;
    name: string;
    eventid: number;
    clubid: number | null;
    seed: number | null;
    members: TeamMember[];
}

export interface TeamMember {
    id: number;
    teamid: number;
    fencerid: number;
    role: 'starter' | 'substitute';
    position: number | null;
    fencer: {
        id: number;
        fname: string;
        lname: string;
        nickname: string | null;
    };
}

// Team CRUD operations
export async function createTeam(client: DrizzleClient, team: TeamCreate): Promise<number> {
    const result = await client.insert(teams).values(team).returning({ id: teams.id });
    return result[0].id;
}

export async function updateTeam(client: DrizzleClient, id: number, updates: Partial<TeamCreate>): Promise<void> {
    await client.update(teams).set(updates).where(eq(teams.id, id));
}

export async function deleteTeam(client: DrizzleClient, id: number): Promise<void> {
    // Delete team members first
    await client.delete(teamMembers).where(eq(teamMembers.teamid, id));
    // Delete team
    await client.delete(teams).where(eq(teams.id, id));
}

export async function getTeam(client: DrizzleClient, id: number): Promise<TeamWithMembers | null> {
    const teamResult = await client.select().from(teams).where(eq(teams.id, id));
    if (teamResult.length === 0) return null;

    const team = teamResult[0];
    const members = await getTeamMembers(client, id);

    return {
        ...team,
        members,
    };
}

export async function getEventTeams(client: DrizzleClient, eventid: number): Promise<TeamWithMembers[]> {
    const teamsResult = await client
        .select()
        .from(teams)
        .where(eq(teams.eventid, eventid))
        .orderBy(asc(teams.seed), asc(teams.name));

    const teamsWithMembers = await Promise.all(
        teamsResult.map(async team => {
            const members = await getTeamMembers(client, team.id);
            return { ...team, members };
        })
    );

    return teamsWithMembers;
}

// Team member operations
export async function addTeamMember(client: DrizzleClient, member: TeamMemberCreate): Promise<number> {
    // Validate that fencer isn't already on another team in this event
    const existingMembership = await client
        .select()
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamid, teams.id))
        .where(
            and(
                eq(teams.eventid, sql`(SELECT eventid FROM ${teams} WHERE id = ${member.teamid})`),
                eq(teamMembers.fencerid, member.fencerid)
            )
        );

    if (existingMembership.length > 0) {
        throw new Error('Fencer is already on a team in this event');
    }

    // If adding a starter with a position, ensure position is not taken
    if (member.role === 'starter' && member.position) {
        const existingPosition = await client
            .select()
            .from(teamMembers)
            .where(and(eq(teamMembers.teamid, member.teamid), eq(teamMembers.position, member.position)));

        if (existingPosition.length > 0) {
            throw new Error(`Position ${member.position} is already taken`);
        }
    }

    const result = await client.insert(teamMembers).values(member).returning({ id: teamMembers.id });
    return result[0].id;
}

export async function removeTeamMember(client: DrizzleClient, teamid: number, fencerid: number): Promise<void> {
    await client.delete(teamMembers).where(and(eq(teamMembers.teamid, teamid), eq(teamMembers.fencerid, fencerid)));
}

export async function updateTeamMember(
    client: DrizzleClient,
    teamid: number,
    fencerid: number,
    updates: Partial<Pick<TeamMemberCreate, 'role' | 'position'>>
): Promise<void> {
    await client
        .update(teamMembers)
        .set(updates)
        .where(and(eq(teamMembers.teamid, teamid), eq(teamMembers.fencerid, fencerid)));
}

export async function getTeamMembers(client: DrizzleClient, teamid: number): Promise<TeamMember[]> {
    const members = await client
        .select({
            id: teamMembers.id,
            teamid: teamMembers.teamid,
            fencerid: teamMembers.fencerid,
            role: teamMembers.role,
            position: teamMembers.position,
            fencer: {
                id: fencers.id,
                fname: fencers.fname,
                lname: fencers.lname,
                nickname: fencers.nickname,
            },
        })
        .from(teamMembers)
        .innerJoin(fencers, eq(teamMembers.fencerid, fencers.id))
        .where(eq(teamMembers.teamid, teamid))
        .orderBy(asc(teamMembers.position), asc(teamMembers.role));

    return members;
}

export async function getTeamStarters(client: DrizzleClient, teamid: number): Promise<TeamMember[]> {
    const starters = await getTeamMembers(client, teamid);
    return starters.filter(m => m.role === 'starter').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export async function getTeamSubstitutes(client: DrizzleClient, teamid: number): Promise<TeamMember[]> {
    const subs = await getTeamMembers(client, teamid);
    return subs.filter(m => m.role === 'substitute');
}

// Substitution operations
export async function substituteTeamMember(
    client: DrizzleClient,
    teamid: number,
    outFencerId: number,
    inFencerId: number
): Promise<void> {
    // Get the position of the outgoing fencer
    const outMember = await client
        .select()
        .from(teamMembers)
        .where(
            and(eq(teamMembers.teamid, teamid), eq(teamMembers.fencerid, outFencerId), eq(teamMembers.role, 'starter'))
        );

    if (outMember.length === 0) {
        throw new Error('Outgoing fencer is not a starter on this team');
    }

    const position = outMember[0].position;

    // Verify incoming fencer is a substitute
    const inMember = await client
        .select()
        .from(teamMembers)
        .where(
            and(
                eq(teamMembers.teamid, teamid),
                eq(teamMembers.fencerid, inFencerId),
                eq(teamMembers.role, 'substitute')
            )
        );

    if (inMember.length === 0) {
        throw new Error('Incoming fencer is not a substitute on this team');
    }

    // Perform the substitution
    await client.transaction(async tx => {
        // Make outgoing fencer a substitute
        await tx
            .update(teamMembers)
            .set({ role: 'substitute', position: null })
            .where(and(eq(teamMembers.teamid, teamid), eq(teamMembers.fencerid, outFencerId)));

        // Make incoming fencer a starter
        await tx
            .update(teamMembers)
            .set({ role: 'starter', position: position })
            .where(and(eq(teamMembers.teamid, teamid), eq(teamMembers.fencerid, inFencerId)));
    });
}

// Team seeding
export async function seedTeams(client: DrizzleClient, eventid: number): Promise<void> {
    const eventTeams = await getEventTeams(client, eventid);

    // Calculate team strength based on sum of fencer ratings
    const teamsWithStrength = await Promise.all(
        eventTeams.map(async team => {
            const starters = team.members.filter(m => m.role === 'starter');
            let totalStrength = 0;

            for (const starter of starters) {
                const fencerData = await client.select().from(fencers).where(eq(fencers.id, starter.fencerid));

                if (fencerData.length > 0) {
                    const fencer = fencerData[0];
                    const eventData = await client.select().from(events).where(eq(events.id, eventid));

                    if (eventData.length > 0) {
                        const weapon = eventData[0].weapon.toLowerCase();
                        let rating = 'U';

                        if (weapon === 'epee') rating = fencer.erating || 'U';
                        else if (weapon === 'foil') rating = fencer.frating || 'U';
                        else if (weapon === 'sabre') rating = fencer.srating || 'U';

                        // Convert rating to numeric strength
                        const ratingStrength = {
                            A: 6,
                            B: 5,
                            C: 4,
                            D: 3,
                            E: 2,
                            U: 1,
                        };
                        totalStrength += ratingStrength[rating as keyof typeof ratingStrength] || 1;
                    }
                }
            }

            return { team, strength: totalStrength };
        })
    );

    // Sort by strength (descending) and assign seeds
    teamsWithStrength.sort((a, b) => b.strength - a.strength);

    await client.transaction(async tx => {
        for (let i = 0; i < teamsWithStrength.length; i++) {
            await tx
                .update(teams)
                .set({ seed: i + 1 })
                .where(eq(teams.id, teamsWithStrength[i].team.id));
        }
    });
}

// Seed teams by strength (just assigns seed numbers, doesn't create pool assignments)
export async function seedTeamsForEvent(client: DrizzleClient, eventid: number): Promise<void> {
    // This just seeds the teams by strength
    await seedTeams(client, eventid);
}

// Team pool assignment
export async function assignTeamToPools(
    client: DrizzleClient,
    roundid: number,
    poolAssignments: { teamid: number; poolid: number; teamidinpool: number }[]
): Promise<void> {
    await client.transaction(async tx => {
        // Clear existing assignments
        await tx.delete(teamPoolAssignment).where(eq(teamPoolAssignment.roundid, roundid));

        // Insert new assignments
        for (const assignment of poolAssignments) {
            await tx.insert(teamPoolAssignment).values({
                roundid,
                ...assignment,
            });
        }
    });
}

export async function getTeamPoolAssignments(client: DrizzleClient, roundid: number): Promise<any[]> {
    return await client
        .select({
            team: teams,
            poolid: teamPoolAssignment.poolid,
            teamidinpool: teamPoolAssignment.teamidinpool,
        })
        .from(teamPoolAssignment)
        .innerJoin(teams, eq(teamPoolAssignment.teamid, teams.id))
        .where(eq(teamPoolAssignment.roundid, roundid))
        .orderBy(asc(teamPoolAssignment.poolid), asc(teamPoolAssignment.teamidinpool));
}

// Validation helpers
export async function validateTeamRoster(
    client: DrizzleClient,
    teamid: number
): Promise<{ valid: boolean; errors: string[] }> {
    const members = await getTeamMembers(client, teamid);
    const starters = members.filter(m => m.role === 'starter');
    const errors: string[] = [];

    if (starters.length < 3) {
        errors.push('Team must have at least 3 starters');
    }

    if (starters.length > 3) {
        errors.push('Team cannot have more than 3 starters');
    }

    // Check for duplicate positions
    const positions = starters.map(s => s.position).filter(p => p !== null);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
        errors.push('Duplicate starter positions found');
    }

    // Check positions are 1, 2, 3
    const expectedPositions = [1, 2, 3];
    for (const pos of expectedPositions) {
        if (!positions.includes(pos)) {
            errors.push(`Missing starter at position ${pos}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
