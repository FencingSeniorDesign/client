// DrizzleDatabaseUtils.ts
import { and, count, countDistinct, eq, gt, like, or, sql, desc, isNull, isNotNull, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from './DrizzleClient';
import * as schema from './schema';
import {
    buildPools,
    calculateSeedingFromResults,
    calculatePreliminarySeeding,
} from '../navigation/utils/RoundAlgorithms';
import type { Fencer, Event, Tournament, Round, Bout } from '../navigation/navigation/types';
import {
    generateDoubleEliminationStructure,
    placeFencersInDoubleElimination,
} from '../navigation/utils/DoubleEliminationUtils';
import { generateCompassDrawStructure, placeFencersInCompassDraw } from '../navigation/utils/CompassDrawUtils';

// Tournament Functions
export async function dbCreateTournament(tournamentName: string, iscomplete: number = 0): Promise<void> {
    try {
        await db.insert(schema.tournaments).values({
            name: tournamentName,
            iscomplete: iscomplete === 1,
        });
        console.log(`Tournament "${tournamentName}" created successfully.`);
    } catch (error) {
        console.error('Error creating tournament:', error);
        throw error;
    }
}

export async function dbDeleteTournament(tournamentName: string): Promise<void> {
    try {
        await db.delete(schema.tournaments).where(eq(schema.tournaments.name, tournamentName));
        console.log(`Tournament "${tournamentName}" deleted successfully.`);
    } catch (error) {
        console.error('Error deleting tournament:', error);
        throw error;
    }
}

export async function dbListOngoingTournaments(): Promise<Tournament[]> {
    try {
        const tournaments = await db.select().from(schema.tournaments).where(eq(schema.tournaments.iscomplete, false));

        console.log(`[${tournaments.length}] ongoing tournaments listed successfully.`);
        return tournaments as Tournament[];
    } catch (error) {
        console.error('Error listing ongoing tournaments:', error);
        throw error;
    }
}

export async function dbListCompletedTournaments(): Promise<Tournament[]> {
    try {
        const tournaments = await db.select().from(schema.tournaments).where(eq(schema.tournaments.iscomplete, true));

        console.log(`[${tournaments.length}] completed tournaments listed successfully.`);
        return tournaments as Tournament[];
    } catch (error) {
        console.error('Error listing completed tournaments:', error);
        throw error;
    }
}

// Event Functions
export async function dbListEvents(tournamentName: string): Promise<Event[]> {
    try {
        // Create a subquery for counting started rounds per event
        const events = await db
            .select({
                ...schema.events,
                startedCount: sql<number>`COALESCE(
        (SELECT COUNT(*) FROM ${schema.rounds} 
         WHERE ${schema.rounds.eventid} = ${schema.events.id} 
         AND ${schema.rounds.isstarted} = true), 0)`,
            })
            .from(schema.events)
            .where(eq(schema.events.tname, tournamentName));

        return events as Event[];
    } catch (error) {
        console.error('Error listing events:', error);
        throw error;
    }
}

export async function dbCreateEvent(tournamentName: string, event: Event): Promise<void> {
    try {
        const age = event.age || 'senior';
        const eventClass = event.class || 'N/A';
        const seeding = event.seeding || 'N/A';

        await db.insert(schema.events).values({
            id: event.id,
            tname: tournamentName,
            weapon: event.weapon,
            gender: event.gender,
            age: age,
            class: eventClass,
            seeding: seeding,
        });

        console.log('Event created successfully.');
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
}

export async function dbDeleteEvent(eventId: number): Promise<void> {
    try {
        await db.delete(schema.events).where(eq(schema.events.id, eventId));

        console.log('Event deleted successfully.');
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

// Club Functions
export async function dbCreateClub(club: { name: string; abbreviation?: string }): Promise<number> {
    try {
        // Auto-generate abbreviation if not provided
        if (!club.abbreviation && club.name) {
            club.abbreviation = generateClubAbbreviation(club.name);
        }

        const result = await db
            .insert(schema.clubs)
            .values({
                name: club.name,
                abbreviation: club.abbreviation,
            })
            .returning({ id: schema.clubs.id });

        console.log(`Club "${club.name}" created with id ${result[0]?.id}.`);
        return result[0]?.id || -1;
    } catch (error) {
        console.error('Error creating club:', error);
        throw error;
    }
}

export async function dbSearchClubs(query: string): Promise<any[]> {
    try {
        const clubs = await db
            .select()
            .from(schema.clubs)
            .where(like(schema.clubs.name, `%${query}%`));

        console.log(`Search returned ${clubs.length} clubs`);
        return clubs;
    } catch (error) {
        console.error('Error searching clubs:', error);
        return [];
    }
}

// Helper function to generate club abbreviation
function generateClubAbbreviation(name: string): string {
    if (!name) return '';

    // Take first letter of each word, uppercase
    const abbr = name
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase())
        .join('');

    // Ensure it's between 2-5 characters
    if (abbr.length < 2) {
        // If too short, add the second letter of the first word if available
        return name.length > 1 ? name.substring(0, 2).toUpperCase() : abbr;
    } else if (abbr.length > 5) {
        // If too long, truncate to 5 characters
        return abbr.substring(0, 5);
    }

    return abbr;
}

// Fencer Functions
export async function dbCreateFencerByName(
    fencer: Fencer,
    event?: Event,
    insertOnCreate: boolean = false
): Promise<void> {
    try {
        // Handle club creation/assignment if needed
        if (fencer.club && !fencer.clubid) {
            // Check if club already exists
            const existingClubs = await dbSearchClubs(fencer.club);
            const exactMatch = existingClubs.find(c => c.name.toLowerCase() === fencer.club?.toLowerCase());

            if (exactMatch) {
                fencer.clubid = exactMatch.id;
            } else {
                // Create new club
                const clubId = await dbCreateClub({ name: fencer.club });
                fencer.clubid = clubId;
            }
        }

        const result = await db
            .insert(schema.fencers)
            .values({
                fname: fencer.fname,
                lname: fencer.lname,
                club: fencer.club || null,
                clubid: fencer.clubid || null,
                erating: fencer.erating ?? 'U',
                eyear: fencer.eyear ?? 0,
                frating: fencer.frating ?? 'U',
                fyear: fencer.fyear ?? 0,
                srating: fencer.srating ?? 'U',
                syear: fencer.syear ?? 0,
            })
            .returning({ id: schema.fencers.id });

        const newFencerId = result[0]?.id;
        fencer.id = newFencerId;

        console.log(
            `Fencer "${fencer.fname} ${fencer.lname}" created with id ${fencer.id}.`,
            JSON.stringify(fencer, null, '\t')
        );

        if (event && insertOnCreate && fencer.id) {
            await dbAddFencerToEventById(fencer, event);
        }
    } catch (error) {
        console.error('Error creating fencer:', error);
    }
}

export async function dbSearchFencers(query: string): Promise<Fencer[]> {
    try {
        const fencers = await db
            .select({
                id: schema.fencers.id,
                fname: schema.fencers.fname,
                lname: schema.fencers.lname,
                club: schema.fencers.club,
                clubid: schema.fencers.clubid,
                clubName: schema.clubs.name,
                clubAbbreviation: schema.clubs.abbreviation,
                erating: schema.fencers.erating,
                eyear: schema.fencers.eyear,
                frating: schema.fencers.frating,
                fyear: schema.fencers.fyear,
                srating: schema.fencers.srating,
                syear: schema.fencers.syear,
            })
            .from(schema.fencers)
            .leftJoin(schema.clubs, eq(schema.fencers.clubid, schema.clubs.id))
            .where(or(like(schema.fencers.fname, `%${query}%`), like(schema.fencers.lname, `%${query}%`)));

        console.log(`Search returned ${fencers.length} results`);
        return fencers as Fencer[];
    } catch (error) {
        console.error('Error searching fencers:', error);
        return [];
    }
}

export async function dbGetFencersInEventById(event: Event): Promise<Fencer[]> {
    try {
        const fencersWithEvents = await db
            .select({
                id: schema.fencers.id,
                fname: schema.fencers.fname,
                lname: schema.fencers.lname,
                club: schema.fencers.club,
                clubid: schema.fencers.clubid,
                clubName: schema.clubs.name,
                clubAbbreviation: schema.clubs.abbreviation,
                erating: schema.fencers.erating,
                eyear: schema.fencers.eyear,
                frating: schema.fencers.frating,
                fyear: schema.fencers.fyear,
                srating: schema.fencers.srating,
                syear: schema.fencers.syear,
            })
            .from(schema.fencers)
            .innerJoin(schema.fencerEvents, eq(schema.fencers.id, schema.fencerEvents.fencerid))
            .leftJoin(schema.clubs, eq(schema.fencers.clubid, schema.clubs.id))
            .where(eq(schema.fencerEvents.eventid, event.id));

        console.log(`Fencers associated with Event ID [${event.id}]: ${fencersWithEvents.length}`);
        return fencersWithEvents as Fencer[];
    } catch (error) {
        console.error('Error getting fencers in event:', error);
        return [];
    }
}

export async function dbAddFencerToEventById(fencer: Fencer, event: Event): Promise<void> {
    try {
        if (!fencer.id) {
            throw new Error('Fencer ID is required');
        }

        await db
            .insert(schema.fencerEvents)
            .values({
                fencerid: fencer.id,
                eventid: event.id,
            })
            .onConflictDoNothing();

        console.log(`"${fencer.fname} ${fencer.lname}" added to "${event.gender} ${event.age} ${event.weapon}"`);
    } catch (error) {
        console.error(`Error adding fencer ${fencer.id} to event ${event.id}:`, error);
    }
}

export async function dbDeleteFencerFromEventById(fencer: Fencer, event: Event): Promise<void> {
    try {
        if (!fencer.id) {
            throw new Error('Fencer ID is required');
        }

        await db
            .delete(schema.fencerEvents)
            .where(and(eq(schema.fencerEvents.fencerid, fencer.id), eq(schema.fencerEvents.eventid, event.id)));
    } catch (error) {
        console.error('Error deleting fencer from event:', error);
        throw error;
    }
}

// Round Functions
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

export async function dbDeleteRound(roundId: number): Promise<void> {
    try {
        await db.delete(schema.rounds).where(eq(schema.rounds.id, roundId));

        console.log(`Round ${roundId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting round:', error);
        throw error;
    }
}

export async function dbMarkRoundAsStarted(roundId: number): Promise<void> {
    try {
        await db.update(schema.rounds).set({ isstarted: true }).where(eq(schema.rounds.id, roundId));

        console.log(`Round ${roundId} marked as started.`);
    } catch (error) {
        console.error('Error marking round as started:', error);
        throw error;
    }
}

// Pool and Bout Functions
export async function dbCreatePoolAssignmentsAndBoutOrders(
    event: Event,
    round: Round,
    fencers: Fencer[],
    poolCount: number,
    fencersPerPool: number,
    seeding?: any[]
): Promise<void> {
    try {
        console.log(`Creating pool assignments for round ${round.id}, event ${event.id}`);
        console.log(`Building ${poolCount} pools with ${fencersPerPool} fencers per pool`);
        console.log(`Total fencers: ${fencers.length}, seeding available: ${seeding ? 'yes' : 'no'}`);

        const pools: Fencer[][] = buildPools(fencers, poolCount, fencersPerPool, seeding);
        console.log(`Created ${pools.length} pools`);

        // Quick verification
        pools.forEach((pool, index) => {
            console.log(`Pool ${index} has ${pool.length} fencers: ${pool.map(f => f.id).join(', ')}`);
        });

        for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
            const pool = pools[poolIndex];

            // Insert each fencer's pool assignment
            for (let i = 0; i < pool.length; i++) {
                const fencer = pool[i];
                if (!fencer.id) continue;

                await db.insert(schema.fencerPoolAssignment).values({
                    roundid: round.id,
                    poolid: poolIndex,
                    fencerid: fencer.id,
                    fenceridinpool: i + 1,
                });
            }

            // Create round-robin bouts for the pool
            for (let i = 0; i < pool.length; i++) {
                for (let j = i + 1; j < pool.length; j++) {
                    const fencerA = pool[i];
                    const fencerB = pool[j];

                    if (!fencerA.id || !fencerB.id) continue;

                    console.log(
                        `Creating bout between ${fencerA.fname} ${fencerA.lname} and ${fencerB.fname} ${fencerB.lname}`
                    );

                    // Insert the bout
                    const boutResult = await db
                        .insert(schema.bouts)
                        .values({
                            lfencer: fencerA.id,
                            rfencer: fencerB.id,
                            eventid: event.id,
                            roundid: round.id,
                            tableof: 2, // Using default value for tableof
                        })
                        .returning({ id: schema.bouts.id });

                    const boutId = boutResult[0]?.id;

                    if (boutId) {
                        console.log(`Bout created with ID: ${boutId}`);

                        // IMPORTANT FIX: We don't need to manually insert FencerBouts records
                        // The trigger `create_fencer_bouts_after_bout_insert` already creates these records
                        // If we do need to update scores, we can use onConflictDoUpdate:

                        try {
                            // Update the scores to 0 (in case they were null from trigger)
                            await db
                                .update(schema.fencerBouts)
                                .set({ score: 0 })
                                .where(
                                    and(
                                        eq(schema.fencerBouts.boutid, boutId),
                                        eq(schema.fencerBouts.fencerid, fencerA.id)
                                    )
                                );

                            await db
                                .update(schema.fencerBouts)
                                .set({ score: 0 })
                                .where(
                                    and(
                                        eq(schema.fencerBouts.boutid, boutId),
                                        eq(schema.fencerBouts.fencerid, fencerB.id)
                                    )
                                );
                        } catch (fbError) {
                            console.error('Error updating fencerBouts scores:', fbError);
                        }
                    } else {
                        console.error('Failed to get bout ID for newly created bout');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error creating pool assignments and bout orders:', error);
        throw error;
    }
}

export async function dbGetPoolsForRound(roundId: number): Promise<{ poolid: number; fencers: Fencer[] }[]> {
    try {
        console.log(`Getting pool assignments for round ${roundId}`);

        // First, get all pools and their fencer counts for this round
        const poolCounts = await db
            .select({
                poolid: schema.fencerPoolAssignment.poolid,
                count: count(),
            })
            .from(schema.fencerPoolAssignment)
            .where(eq(schema.fencerPoolAssignment.roundid, roundId))
            .groupBy(schema.fencerPoolAssignment.poolid);

        console.log(
            `Found ${poolCounts.length} pools with assigned fencers`,
            poolCounts.map(p => `Pool ${p.poolid}: ${p.count} fencers`)
        );

        // Get detailed fencer data with club information
        const results = await db
            .select({
                poolid: schema.fencerPoolAssignment.poolid,
                poolposition: schema.fencerPoolAssignment.fenceridinpool,
                fencer: {
                    id: schema.fencers.id,
                    fname: schema.fencers.fname,
                    lname: schema.fencers.lname,
                    club: schema.fencers.club,
                    clubid: schema.fencers.clubid,
                    erating: schema.fencers.erating,
                    eyear: schema.fencers.eyear,
                    frating: schema.fencers.frating,
                    fyear: schema.fencers.fyear,
                    srating: schema.fencers.srating,
                    syear: schema.fencers.syear,
                },
                // Using optional fields for clubs to prevent null issues
                clubName: schema.clubs.name,
                clubAbbr: schema.clubs.abbreviation,
            })
            .from(schema.fencerPoolAssignment)
            .innerJoin(schema.fencers, eq(schema.fencerPoolAssignment.fencerid, schema.fencers.id))
            .leftJoin(schema.clubs, eq(schema.fencers.clubid, schema.clubs.id))
            .where(eq(schema.fencerPoolAssignment.roundid, roundId))
            .orderBy(schema.fencerPoolAssignment.poolid, schema.fencerPoolAssignment.fenceridinpool);

        console.log(`Found ${results.length} total fencer-pool assignments`);

        // Group by poolid
        const poolsMap = new Map<number, Fencer[]>();

        // First initialize pools based on the pool counts (this ensures empty pools still show up)
        for (const poolCount of poolCounts) {
            poolsMap.set(poolCount.poolid, []);
        }

        // Log a sample of the results to debug
        if (results.length > 0) {
            console.log(`Sample first result:`, JSON.stringify(results[0]));
        }

        // Then add all fencers to their respective pools
        for (const result of results) {
            const { poolid, poolposition, fencer, clubName, clubAbbr } = result;

            // Add club information to fencer (whether club is present or not)
            const fencerWithClubInfo: Fencer = {
                ...(fencer as Fencer),
                poolNumber: poolposition, // Important: set the pool position here
                clubName: clubName || fencer.club || '', // Use joined club name or fallback to legacy field
                clubAbbreviation: clubAbbr || '', // Use abbreviation from joined club table
            };

            // Ensure the pool exists in the map (should already be there from the poolCounts loop)
            if (!poolsMap.has(poolid)) {
                poolsMap.set(poolid, []);
            }

            poolsMap.get(poolid)?.push(fencerWithClubInfo);
        }

        // Log counts of fencers per pool in our map
        console.log(
            'Fencers per pool after processing:',
            Array.from(poolsMap.entries()).map(([poolid, fencers]) => `Pool ${poolid}: ${fencers.length} fencers`)
        );

        // Convert map to array
        const pools: { poolid: number; fencers: Fencer[] }[] = [];
        poolsMap.forEach((fencers, poolid) => {
            pools.push({ poolid, fencers });
        });

        pools.sort((a, b) => a.poolid - b.poolid);

        console.log(
            `Returning ${pools.length} pools with ${pools.reduce((sum, pool) => sum + pool.fencers.length, 0)} total fencers`
        );
        return pools;
    } catch (error) {
        console.error('Error getting pools for round:', error);
        return [];
    }
}

// Using SQL for complex joins when dealing with table aliases is challenging
export async function dbGetBoutsForPool(roundId: number, poolId: number): Promise<Bout[]> {
    try {
        console.log(`Getting bouts for pool ${poolId} in round ${roundId}`);

        // Check if pool exists and has fencers
        const poolFencers = await db
            .select({ count: count() })
            .from(schema.fencerPoolAssignment)
            .where(
                and(eq(schema.fencerPoolAssignment.roundid, roundId), eq(schema.fencerPoolAssignment.poolid, poolId))
            );

        console.log(`Pool ${poolId} has ${poolFencers[0]?.count || 0} fencers assigned`);

        // Check if bouts exist for this pool
        const simpleBoutCount = await db
            .select({ count: count() })
            .from(schema.bouts)
            .where(eq(schema.bouts.roundid, roundId));

        console.log(`Round ${roundId} has ${simpleBoutCount[0]?.count || 0} bouts total`);

        // Create table aliases using the imported alias function
        const fpa1 = alias(schema.fencerPoolAssignment, 'fpa1');
        const fpa2 = alias(schema.fencerPoolAssignment, 'fpa2');
        const leftFencer = alias(schema.fencers, 'leftF');
        const rightFencer = alias(schema.fencers, 'rightF');
        const fb1 = alias(schema.fencerBouts, 'fb1');
        const fb2 = alias(schema.fencerBouts, 'fb2');

        // Using Drizzle's join API with proper aliases
        const bouts = await db
            .select({
                id: schema.bouts.id,
                lfencer: schema.bouts.lfencer,
                rfencer: schema.bouts.rfencer,
                victor: schema.bouts.victor,
                left_fencerid: fpa1.fencerid,
                right_fencerid: fpa2.fencerid,
                left_poolposition: fpa1.fenceridinpool,
                right_poolposition: fpa2.fenceridinpool,
                left_fname: leftFencer.fname,
                left_lname: leftFencer.lname,
                right_fname: rightFencer.fname,
                right_lname: rightFencer.lname,
                left_score: fb1.score,
                right_score: fb2.score,
            })
            .from(schema.bouts)
            .innerJoin(fpa1, and(eq(schema.bouts.lfencer, fpa1.fencerid), eq(schema.bouts.roundid, fpa1.roundid)))
            .innerJoin(fpa2, and(eq(schema.bouts.rfencer, fpa2.fencerid), eq(schema.bouts.roundid, fpa2.roundid)))
            .innerJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
            .innerJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
            .leftJoin(fb1, and(eq(fb1.boutid, schema.bouts.id), eq(fb1.fencerid, schema.bouts.lfencer)))
            .leftJoin(fb2, and(eq(fb2.boutid, schema.bouts.id), eq(fb2.fencerid, schema.bouts.rfencer)))
            .where(and(eq(schema.bouts.roundid, roundId), eq(fpa1.poolid, poolId), eq(fpa2.poolid, poolId)));

        console.log(`Found ${bouts.length || 0} bouts for pool ${poolId} in round ${roundId}`);

        // If we didn't get any bouts with the complex query, try a simpler approach
        if (!bouts.length) {
            console.log('No bouts found with complex query, falling back to simpler query');

            // Try a simpler approach just to get bout IDs
            const simpleBouts = await db
                .select({
                    id: schema.bouts.id,
                    lfencer: schema.bouts.lfencer,
                    rfencer: schema.bouts.rfencer,
                    victor: schema.bouts.victor,
                })
                .from(schema.bouts)
                .where(eq(schema.bouts.roundid, roundId))
                .limit(10);

            console.log(`Simple query found ${simpleBouts.length} bouts for this round`);
            if (simpleBouts.length > 0) {
                console.log('Sample bout:', JSON.stringify(simpleBouts[0]));
            }
        }

        return bouts as Bout[];
    } catch (error) {
        console.error('Error getting bouts for pool:', error);
        return [];
    }
}

export async function dbUpdateBoutScore(boutId: number, fencerId: number, score: number): Promise<void> {
    try {
        await db
            .update(schema.fencerBouts)
            .set({ score })
            .where(and(eq(schema.fencerBouts.boutid, boutId), eq(schema.fencerBouts.fencerid, fencerId)));
    } catch (error) {
        console.error('Error updating bout score:', error);
        throw error;
    }
}

export async function dbUpdateBoutScores(
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number,
    winnerId?: number
): Promise<void> {
    // Update individual fencer scores
    await dbUpdateBoutScore(boutId, fencerAId, scoreA);
    await dbUpdateBoutScore(boutId, fencerBId, scoreB);

    // Update the victor field in the bouts table if winner ID is provided
    if (winnerId !== undefined) {
        try {
            await db.update(schema.bouts).set({ victor: winnerId }).where(eq(schema.bouts.id, boutId));
            console.log(`Updated victor for bout ${boutId} to fencer ${winnerId}`);
        } catch (error) {
            console.error('Error updating bout victor:', error);
            throw error;
        }
    }
}

// Seeding Functions
export async function dbSaveSeeding(eventId: number, roundId: number, seeding: any[]): Promise<void> {
    try {
        // Delete any existing seeding for this round
        await db.delete(schema.seedingFromRoundResults).where(eq(schema.seedingFromRoundResults.roundid, roundId));

        // Insert new seeding data
        for (const seedingItem of seeding) {
            await db.insert(schema.seedingFromRoundResults).values({
                fencerid: seedingItem.fencer.id,
                eventid: eventId,
                roundid: roundId,
                seed: seedingItem.seed,
            });
        }

        console.log(`Saved seeding for round ${roundId}`);
    } catch (error) {
        console.error('Error saving seeding:', error);
        throw error;
    }
}

export async function dbGetSeedingForRound(roundId: number): Promise<any[]> {
    try {
        const results = await db
            .select({
                seedingInfo: {
                    seed: schema.seedingFromRoundResults.seed,
                },
                fencer: {
                    id: schema.fencers.id,
                    fname: schema.fencers.fname,
                    lname: schema.fencers.lname,
                    erating: schema.fencers.erating,
                    eyear: schema.fencers.eyear,
                    frating: schema.fencers.frating,
                    fyear: schema.fencers.fyear,
                    srating: schema.fencers.srating,
                    syear: schema.fencers.syear,
                },
            })
            .from(schema.seedingFromRoundResults)
            .innerJoin(schema.fencers, eq(schema.seedingFromRoundResults.fencerid, schema.fencers.id))
            .where(eq(schema.seedingFromRoundResults.roundid, roundId))
            .orderBy(schema.seedingFromRoundResults.seed);

        // Transform to the format expected by buildPools
        return results.map(row => ({
            seed: row.seedingInfo.seed || 0,
            fencer: {
                id: row.fencer.id,
                fname: row.fencer.fname || '',
                lname: row.fencer.lname || '',
                erating: row.fencer.erating || '',
                eyear: row.fencer.eyear || 0,
                frating: row.fencer.frating || '',
                fyear: row.fencer.fyear || 0,
                srating: row.fencer.srating || '',
                syear: row.fencer.syear || 0,
            },
        }));
    } catch (error) {
        console.error('Error getting seeding:', error);
        return [];
    }
}

// The calculateAndSaveSeedingFromRoundResults function involves complex calculations
// and aggregations that combine database queries with JavaScript processing.
export async function dbCalculateAndSaveSeedingFromRoundResults(eventId: number, roundId: number): Promise<void> {
    try {
        // Get all pools for the round
        const pools = await dbGetPoolsForRound(roundId);
        console.log(`Found ${pools.length} pools for round ${roundId}`);

        // For each pool, calculate stats for each fencer
        const poolResults = [];

        for (const pool of pools) {
            // Get all bouts for this pool
            const bouts = await dbGetBoutsForPool(roundId, pool.poolid);

            // Initialize stats for each fencer
            const fencerStats = new Map();
            pool.fencers.forEach(fencer => {
                if (fencer.id !== undefined) {
                    fencerStats.set(fencer.id, {
                        fencer,
                        boutsCount: 0,
                        wins: 0,
                        touchesScored: 0,
                        touchesReceived: 0,
                        winRate: 0,
                        indicator: 0,
                    });
                }
            });

            // Process each bout to update fencer stats
            bouts.forEach((bout: any) => {
                const leftId = bout.left_fencerid;
                const rightId = bout.right_fencerid;
                const leftScore = bout.left_score ?? 0;
                const rightScore = bout.right_score ?? 0;

                // Update left fencer stats
                if (fencerStats.has(leftId)) {
                    const stats = fencerStats.get(leftId);
                    stats.boutsCount += 1;
                    stats.touchesScored += leftScore;
                    stats.touchesReceived += rightScore;
                    if (leftScore > rightScore) {
                        stats.wins += 1;
                    }
                }

                // Update right fencer stats
                if (fencerStats.has(rightId)) {
                    const stats = fencerStats.get(rightId);
                    stats.boutsCount += 1;
                    stats.touchesScored += rightScore;
                    stats.touchesReceived += leftScore;
                    if (rightScore > leftScore) {
                        stats.wins += 1;
                    }
                }
            });

            // Calculate win rates and indicators
            fencerStats.forEach(stats => {
                if (stats.boutsCount > 0) {
                    stats.winRate = (stats.wins / stats.boutsCount) * 100;
                }
                stats.indicator = stats.touchesScored - stats.touchesReceived;
            });

            // Add to pool results
            poolResults.push({
                poolid: pool.poolid,
                stats: Array.from(fencerStats.values()),
            });
        }

        // Calculate seeding based on pool results
        const seeding = calculateSeedingFromResults(poolResults);

        // Save the seeding to the database
        await dbSaveSeeding(eventId, roundId, seeding);

        console.log(`Calculated and saved seeding from results of round ${roundId}`);
    } catch (error) {
        console.error('Error calculating seeding from round results:', error);
        throw error;
    }
}

// Referee functions
export async function dbCreateReferee(referee: {
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
}): Promise<number> {
    try {
        const result = await db
            .insert(schema.referees)
            .values({
                fname: referee.fname,
                lname: referee.lname,
                nickname: referee.nickname,
                device_id: referee.device_id,
            })
            .returning({ id: schema.referees.id });

        const newRefereeId = result[0]?.id;
        if (!newRefereeId) {
            throw new Error('Failed to get new referee ID');
        }

        console.log(`Referee "${referee.fname} ${referee.lname}" created with id ${newRefereeId}.`);
        return newRefereeId;
    } catch (error) {
        console.error('Error creating referee:', error);
        throw error;
    }
}

export async function dbGetRefereeByDeviceId(deviceId: string): Promise<any | null> {
    try {
        const referees = await db
            .select()
            .from(schema.referees)
            .where(eq(schema.referees.device_id, deviceId))
            .limit(1);

        return referees.length > 0 ? referees[0] : null;
    } catch (error) {
        console.error('Error getting referee by device ID:', error);
        return null;
    }
}

export async function dbAddRefereeToEvent(refereeId: number, eventId: number): Promise<void> {
    try {
        await db
            .insert(schema.refereeEvents)
            .values({
                refereeid: refereeId,
                eventid: eventId,
            })
            .onConflictDoNothing();

        console.log(`Referee ID ${refereeId} added to event ID ${eventId}`);
    } catch (error) {
        console.error('Error adding referee to event:', error);
        throw error;
    }
}

export async function dbGetRefereesForEvent(eventId: number): Promise<any[]> {
    try {
        const result = await db
            .select()
            .from(schema.referees)
            .innerJoin(schema.refereeEvents, eq(schema.referees.id, schema.refereeEvents.refereeid))
            .where(eq(schema.refereeEvents.eventid, eventId));

        // Extract just the referee data from the joined result
        const referees = result.map(({ referees }) => referees);

        return referees;
    } catch (error) {
        console.error('Error getting referees for event:', error);
        return [];
    }
}

export async function dbListReferees(): Promise<any[]> {
    try {
        return await db.select().from(schema.referees);
    } catch (error) {
        console.error('Error listing referees:', error);
        return [];
    }
}

export async function dbDeleteReferee(refereeId: number): Promise<void> {
    try {
        // First, remove the referee from all events they may be associated with
        await db.delete(schema.refereeEvents).where(eq(schema.refereeEvents.refereeid, refereeId));

        // Then, delete the referee record
        await db.delete(schema.referees).where(eq(schema.referees.id, refereeId));

        console.log(`Deleted referee with ID: ${refereeId}`);
    } catch (error) {
        console.error(`Error deleting referee: ${error}`);
        throw error;
    }
}

// Official functions
export async function dbCreateOfficial(official: {
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
}): Promise<number> {
    try {
        const result = await db
            .insert(schema.officials)
            .values({
                fname: official.fname,
                lname: official.lname,
                nickname: official.nickname,
                device_id: official.device_id,
            })
            .returning({ id: schema.officials.id });

        const newOfficialId = result[0]?.id;
        if (!newOfficialId) {
            throw new Error('Failed to get new official ID');
        }

        console.log(`Official "${official.fname} ${official.lname}" created with id ${newOfficialId}.`);
        return newOfficialId;
    } catch (error) {
        console.error('Error creating official:', error);
        throw error;
    }
}

export async function dbGetOfficialByDeviceId(deviceId: string): Promise<any | null> {
    try {
        const officials = await db
            .select()
            .from(schema.officials)
            .where(eq(schema.officials.device_id, deviceId))
            .limit(1);

        return officials.length > 0 ? officials[0] : null;
    } catch (error) {
        console.error('Error getting official by device ID:', error);
        return null;
    }
}

export async function dbAddOfficialToEvent(officialId: number, eventId: number): Promise<void> {
    try {
        await db
            .insert(schema.officialEvents)
            .values({
                officialid: officialId,
                eventid: eventId,
            })
            .onConflictDoNothing();

        console.log(`Official ID ${officialId} added to event ID ${eventId}`);
    } catch (error) {
        console.error('Error adding official to event:', error);
        throw error;
    }
}

export async function dbGetOfficialsForEvent(eventId: number): Promise<any[]> {
    try {
        const result = await db
            .select()
            .from(schema.officials)
            .innerJoin(schema.officialEvents, eq(schema.officials.id, schema.officialEvents.officialid))
            .where(eq(schema.officialEvents.eventid, eventId));

        // Extract just the official data from the joined result
        const officials = result.map(({ officials }) => officials);

        return officials;
    } catch (error) {
        console.error('Error getting officials for event:', error);
        return [];
    }
}

export async function dbListOfficials(): Promise<any[]> {
    try {
        return await db.select().from(schema.officials);
    } catch (error) {
        console.error('Error listing officials:', error);
        return [];
    }
}

export async function dbDeleteOfficial(officialId: number): Promise<void> {
    try {
        // First, remove the official from all events they may be associated with
        await db.delete(schema.officialEvents).where(eq(schema.officialEvents.officialid, officialId));

        // Then, delete the official record
        await db.delete(schema.officials).where(eq(schema.officials.id, officialId));

        console.log(`Deleted official with ID: ${officialId}`);
    } catch (error) {
        console.error(`Error deleting official: ${error}`);
        throw error;
    }
}

// Event management
export async function dbGetEventById(eventId: number): Promise<Event> {
    try {
        const events = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);

        if (!events.length) {
            throw new Error(`Event with ID ${eventId} not found`);
        }

        return events[0] as Event;
    } catch (error) {
        console.error('Error fetching event by ID:', error);
        throw error;
    }
}

// Round management
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

// DE format management
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

// This is a complex function that would require detailed SQL for DE bracket creation
// A complete implementation would involve several database queries
export async function dbCreateDEBouts(
    event: Event,
    round: Round,
    bracketData: any // DEBracketData type
): Promise<void> {
    try {
        // Implementation would need to follow the original function's logic
        // but using Drizzle ORM functions where possible
        console.log('DE bouts creation would be implemented here');
    } catch (error) {
        console.error('Error creating DE bouts:', error);
        throw error;
    }
}

/**
 * Initialize a round with the proper bout structure based on its type (pool or DE)
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
            await dbCreatePoolAssignmentsAndBoutOrders(event, round, fencers, round.poolcount, round.poolsize, seeding);
        } else if (round.type === 'de') {
            // Automatically determine the appropriate bracket size
            let tableSize = 2;
            while (tableSize < fencers.length) {
                tableSize *= 2;
            }

            // Update the round with the automatically calculated table size
            await db.update(schema.rounds).set({ detablesize: tableSize }).where(eq(schema.rounds.id, round.id));

            console.log(`Automatically set DE table size to ${tableSize} for ${fencers.length} fencers`);

            // // Initialize based on DE format
            if (round.deformat === 'single') {
                console.log('Creating single elimination bracket');
                await createFirstRoundDEBouts(event, round, fencers, seeding);
            } else if (round.deformat === 'double') {
                console.log('Creating double elimination bracket');
                await dbCreateDoubleEliminationBracket(round.id, tableSize, seeding);
            } else if (round.deformat === 'compass') {
                console.log('Creating compass draw bracket');
                await dbCreateCompassDrawBracket(round.id, tableSize, seeding);
            }
        }

        // Mark the round as started
        await dbMarkRoundAsStarted(round.id);
    } catch (error) {
        console.error('Error initializing round:', error);
        throw error;
    }
}

/**
 * Gets all bouts for a DE round
 */
export async function dbGetDEBouts(roundId: number): Promise<any[]> {
    try {
        console.log(`Fetching DE bouts for round ${roundId}`);

        // First check if there are any bouts for this round
        const boutCount = await db
            .select({ count: count() })
            .from(schema.bouts)
            .where(eq(schema.bouts.roundid, roundId));

        console.log(`Found ${boutCount[0]?.count || 0} bouts for round ${roundId}`);

        if (boutCount[0]?.count === 0) {
            console.log('No bouts found for this round, returning empty array');
            return [];
        }

        // Create aliases for the joined tables to handle multiple joins on the same table
        const leftFencer = alias(schema.fencers, 'leftF');
        const rightFencer = alias(schema.fencers, 'rightF');
        const leftFencerBout = alias(schema.fencerBouts, 'fb1');
        const rightFencerBout = alias(schema.fencerBouts, 'fb2');
        const leftSeeding = alias(schema.seedingFromRoundResults, 'LEFT_SEEDING');
        const rightSeeding = alias(schema.seedingFromRoundResults, 'RIGHT_SEEDING');

        // Using Drizzle's structured join API with table aliases
        console.log('Executing bout query with careful null handling...');

        // First get a simple list of bouts to ensure we have data
        const basicBouts = await db
            .select({
                id: schema.bouts.id,
                lfencer: schema.bouts.lfencer,
                rfencer: schema.bouts.rfencer,
            })
            .from(schema.bouts)
            .where(eq(schema.bouts.roundid, roundId));

        if (basicBouts.length === 0) {
            console.log('No bouts found in basic query');
            return [];
        }

        console.log(`Basic query found ${basicBouts.length} bouts. Sample: ${JSON.stringify(basicBouts[0])}`);

        // Continue with the detailed query now that we know bouts exist
        const bouts = await db
            .select({
                bout: {
                    id: schema.bouts.id,
                    lfencer: schema.bouts.lfencer,
                    rfencer: schema.bouts.rfencer,
                    victor: schema.bouts.victor,
                    eventid: schema.bouts.eventid,
                    roundid: schema.bouts.roundid,
                    tableof: schema.bouts.tableof,
                },
                // Use coalesce to handle null fields
                leftFencer: {
                    fname: sql`COALESCE(${leftFencer.fname}, '')`,
                    lname: sql`COALESCE(${leftFencer.lname}, '')`,
                },
                rightFencer: {
                    fname: sql`COALESCE(${rightFencer.fname}, '')`,
                    lname: sql`COALESCE(${rightFencer.lname}, '')`,
                },
                scores: {
                    left_score: leftFencerBout.score,
                    right_score: rightFencerBout.score,
                },
                seeding: {
                    seed_left: leftSeeding.seed,
                    seed_right: rightSeeding.seed,
                },
            })
            .from(schema.bouts)
            .leftJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
            .leftJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
            .leftJoin(
                leftFencerBout,
                and(eq(leftFencerBout.boutid, schema.bouts.id), eq(leftFencerBout.fencerid, schema.bouts.lfencer))
            )
            .leftJoin(
                rightFencerBout,
                and(eq(rightFencerBout.boutid, schema.bouts.id), eq(rightFencerBout.fencerid, schema.bouts.rfencer))
            )
            .leftJoin(
                leftSeeding,
                and(eq(leftSeeding.fencerid, schema.bouts.lfencer), eq(leftSeeding.roundid, schema.bouts.roundid))
            )
            .leftJoin(
                rightSeeding,
                and(eq(rightSeeding.fencerid, schema.bouts.rfencer), eq(rightSeeding.roundid, schema.bouts.roundid))
            )
            .where(eq(schema.bouts.roundid, roundId))
            .orderBy(desc(schema.bouts.tableof), asc(schema.bouts.id));

        // Transform the results to the expected flat format with careful null checking
        const transformedBouts = bouts.map(bout => {
            // Debug output for troubleshooting
            console.log(
                `Processing bout ID ${bout.bout.id}: leftFencer=${JSON.stringify(bout.leftFencer)}, rightFencer=${JSON.stringify(bout.rightFencer)}`
            );

            return {
                id: bout.bout.id,
                lfencer: bout.bout.lfencer,
                rfencer: bout.bout.rfencer,
                victor: bout.bout.victor,
                eventid: bout.bout.eventid,
                roundid: bout.bout.roundid,
                tableof: bout.bout.tableof,
                // Handle null/undefined fencer data safely
                left_fname: bout.leftFencer && bout.leftFencer.fname !== undefined ? bout.leftFencer.fname : '',
                left_lname: bout.leftFencer && bout.leftFencer.lname !== undefined ? bout.leftFencer.lname : '',
                right_fname: bout.rightFencer && bout.rightFencer.fname !== undefined ? bout.rightFencer.fname : '',
                right_lname: bout.rightFencer && bout.rightFencer.lname !== undefined ? bout.rightFencer.lname : '',
                // Handle null/undefined scores safely
                left_score: bout.scores && bout.scores.left_score !== undefined ? bout.scores.left_score : null,
                right_score: bout.scores && bout.scores.right_score !== undefined ? bout.scores.right_score : null,
                // Handle null/undefined seeding data safely
                seed_left: bout.seeding && bout.seeding.seed_left !== undefined ? bout.seeding.seed_left : null,
                seed_right: bout.seeding && bout.seeding.seed_right !== undefined ? bout.seeding.seed_right : null,
            };
        });

        console.log(`Returning ${transformedBouts.length} transformed DE bouts`);
        if (transformedBouts.length > 0) {
            console.log('Sample bout:', JSON.stringify(transformedBouts[0]));
        } else {
            console.log('No bouts found for this round');

            // Additional check to see if any bouts exist at all for this round
            const simpleBoutCheck = await db
                .select({
                    count: count(),
                })
                .from(schema.bouts)
                .where(eq(schema.bouts.roundid, roundId));

            console.log(`Simple count check: ${simpleBoutCheck[0]?.count || 0} bouts exist for round ${roundId}`);
        }

        return transformedBouts;
    } catch (error) {
        console.error('Error getting DE bouts:', error);
        throw error;
    }
}

/**
 * Gets all bouts for a round
 */
export async function dbGetBoutsForRound(roundId: number): Promise<any[]> {
    try {
        // First, get the round type to determine approach
        const round = await db
            .select({
                type: schema.rounds.type,
                deformat: schema.rounds.deformat,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!round.length) {
            console.error(`Round with ID ${roundId} not found`);
            return [];
        }

        if (round[0].type === 'pool') {
            // For pool rounds, get all bouts with pool info
            const fpa1 = alias(schema.fencerPoolAssignment, 'FPA1');
            const fpa2 = alias(schema.fencerPoolAssignment, 'FPA2');
            const leftFencer = alias(schema.fencers, 'leftF');
            const rightFencer = alias(schema.fencers, 'rightF');
            const leftFencerBout = alias(schema.fencerBouts, 'fb1');
            const rightFencerBout = alias(schema.fencerBouts, 'fb2');

            const bouts = await db
                .select({
                    bout: {
                        id: schema.bouts.id,
                        lfencer: schema.bouts.lfencer,
                        rfencer: schema.bouts.rfencer,
                        victor: schema.bouts.victor,
                        eventid: schema.bouts.eventid,
                        roundid: schema.bouts.roundid,
                    },
                    pool: {
                        poolid: fpa1.poolid,
                    },
                    leftFencer: {
                        fname: leftFencer.fname,
                        lname: leftFencer.lname,
                    },
                    rightFencer: {
                        fname: rightFencer.fname,
                        lname: rightFencer.lname,
                    },
                    scores: {
                        left_score: leftFencerBout.score,
                        right_score: rightFencerBout.score,
                    },
                })
                .from(schema.bouts)
                .innerJoin(fpa1, and(eq(schema.bouts.lfencer, fpa1.fencerid), eq(schema.bouts.roundid, fpa1.roundid)))
                .innerJoin(
                    fpa2,
                    and(
                        eq(schema.bouts.rfencer, fpa2.fencerid),
                        eq(schema.bouts.roundid, fpa2.roundid),
                        eq(fpa1.poolid, fpa2.poolid)
                    )
                )
                .leftJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
                .leftJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
                .leftJoin(
                    leftFencerBout,
                    and(eq(leftFencerBout.boutid, schema.bouts.id), eq(leftFencerBout.fencerid, schema.bouts.lfencer))
                )
                .leftJoin(
                    rightFencerBout,
                    and(eq(rightFencerBout.boutid, schema.bouts.id), eq(rightFencerBout.fencerid, schema.bouts.rfencer))
                )
                .where(eq(schema.bouts.roundid, roundId))
                .orderBy(asc(fpa1.poolid), asc(schema.bouts.id));

            // Transform the nested structure to the flat structure expected by the application
            return bouts.map(bout => ({
                id: bout.bout.id,
                lfencer: bout.bout.lfencer,
                rfencer: bout.bout.rfencer,
                victor: bout.bout.victor,
                eventid: bout.bout.eventid,
                roundid: bout.bout.roundid,
                left_fname: bout.leftFencer.fname,
                left_lname: bout.leftFencer.lname,
                right_fname: bout.rightFencer.fname,
                right_lname: bout.rightFencer.lname,
                left_score: bout.scores.left_score,
                right_score: bout.scores.right_score,
                poolid: bout.pool.poolid,
            }));
        } else if (round[0].type === 'de') {
            // For DE rounds, choose appropriate query based on format
            if (round[0].deformat === 'single') {
                return await dbGetDEBouts(roundId);
            } else {
                // For double elimination or compass draw, include bracket info
                const leftFencer = alias(schema.fencers, 'leftF');
                const rightFencer = alias(schema.fencers, 'rightF');
                const leftFencerBout = alias(schema.fencerBouts, 'fb1');
                const rightFencerBout = alias(schema.fencerBouts, 'fb2');
                const leftSeeding = alias(schema.seedingFromRoundResults, 'LEFT_SEEDING');
                const rightSeeding = alias(schema.seedingFromRoundResults, 'RIGHT_SEEDING');

                const bouts = await db
                    .select({
                        bout: {
                            id: schema.bouts.id,
                            lfencer: schema.bouts.lfencer,
                            rfencer: schema.bouts.rfencer,
                            victor: schema.bouts.victor,
                            tableof: schema.bouts.tableof,
                            eventid: schema.bouts.eventid,
                            roundid: schema.bouts.roundid,
                        },
                        bracketInfo: {
                            bracket_type: schema.deBracketBouts.bracket_type,
                            bracket_round: schema.deBracketBouts.bracket_round,
                            bout_order: schema.deBracketBouts.bout_order,
                        },
                        leftFencer: {
                            fname: leftFencer.fname,
                            lname: leftFencer.lname,
                        },
                        rightFencer: {
                            fname: rightFencer.fname,
                            lname: rightFencer.lname,
                        },
                        scores: {
                            left_score: leftFencerBout.score,
                            right_score: rightFencerBout.score,
                        },
                        seeding: {
                            seed_left: leftSeeding.seed,
                            seed_right: rightSeeding.seed,
                        },
                    })
                    .from(schema.bouts)
                    .innerJoin(schema.deBracketBouts, eq(schema.bouts.id, schema.deBracketBouts.bout_id))
                    .leftJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
                    .leftJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
                    .leftJoin(
                        leftFencerBout,
                        and(
                            eq(leftFencerBout.boutid, schema.bouts.id),
                            eq(leftFencerBout.fencerid, schema.bouts.lfencer)
                        )
                    )
                    .leftJoin(
                        rightFencerBout,
                        and(
                            eq(rightFencerBout.boutid, schema.bouts.id),
                            eq(rightFencerBout.fencerid, schema.bouts.rfencer)
                        )
                    )
                    .leftJoin(
                        leftSeeding,
                        and(
                            eq(leftSeeding.fencerid, schema.bouts.lfencer),
                            eq(leftSeeding.roundid, schema.bouts.roundid)
                        )
                    )
                    .leftJoin(
                        rightSeeding,
                        and(
                            eq(rightSeeding.fencerid, schema.bouts.rfencer),
                            eq(rightSeeding.roundid, schema.bouts.roundid)
                        )
                    )
                    .where(eq(schema.bouts.roundid, roundId))
                    .orderBy(
                        asc(schema.deBracketBouts.bracket_type),
                        asc(schema.deBracketBouts.bracket_round),
                        asc(schema.deBracketBouts.bout_order)
                    );

                // Transform the nested structure to the flat structure expected by the application
                return bouts.map(bout => ({
                    id: bout.bout.id,
                    lfencer: bout.bout.lfencer,
                    rfencer: bout.bout.rfencer,
                    victor: bout.bout.victor,
                    tableof: bout.bout.tableof,
                    eventid: bout.bout.eventid,
                    roundid: bout.bout.roundid,
                    left_fname: bout.leftFencer.fname,
                    left_lname: bout.leftFencer.lname,
                    right_fname: bout.rightFencer.fname,
                    right_lname: bout.rightFencer.lname,
                    left_score: bout.scores.left_score,
                    right_score: bout.scores.right_score,
                    bracket_type: bout.bracketInfo.bracket_type,
                    bracket_round: bout.bracketInfo.bracket_round,
                    bout_order: bout.bracketInfo.bout_order,
                    seed_left: bout.seeding.seed_left,
                    seed_right: bout.seeding.seed_right,
                }));
            }
        }

        // Default empty array if round type is unrecognized
        return [];
    } catch (error) {
        console.error('Error getting bouts for round:', error);
        throw error;
    }
}

/**
 * Gets bouts for a double elimination format
 */
export async function dbGetDoubleBracketBouts(
    roundId: number
): Promise<{ winners: any[]; losers: any[]; finals: any[] }> {
    try {
        // Create aliases for the joined tables to handle multiple joins on the same table
        const leftFencer = alias(schema.fencers, 'leftF');
        const rightFencer = alias(schema.fencers, 'rightF');
        const leftFencerBout = alias(schema.fencerBouts, 'fb1');
        const rightFencerBout = alias(schema.fencerBouts, 'fb2');
        const leftSeeding = alias(schema.seedingFromRoundResults, 'LEFT_SEEDING');
        const rightSeeding = alias(schema.seedingFromRoundResults, 'RIGHT_SEEDING');

        // Using structured nested selection for better type safety and organization
        const allBouts = await db
            .select({
                bout: {
                    id: schema.bouts.id,
                    lfencer: schema.bouts.lfencer,
                    rfencer: schema.bouts.rfencer,
                    victor: schema.bouts.victor,
                    tableof: schema.bouts.tableof,
                    eventid: schema.bouts.eventid,
                },
                bracketInfo: {
                    bracket_type: schema.deBracketBouts.bracket_type,
                    bracket_round: schema.deBracketBouts.bracket_round,
                    bout_order: schema.deBracketBouts.bout_order,
                },
                leftFencer: {
                    fname: leftFencer.fname,
                    lname: leftFencer.lname,
                },
                rightFencer: {
                    fname: rightFencer.fname,
                    lname: rightFencer.lname,
                },
                scores: {
                    left_score: leftFencerBout.score,
                    right_score: rightFencerBout.score,
                },
                seeding: {
                    seed_left: leftSeeding.seed,
                    seed_right: rightSeeding.seed,
                },
            })
            .from(schema.bouts)
            .innerJoin(schema.deBracketBouts, eq(schema.bouts.id, schema.deBracketBouts.bout_id))
            .leftJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
            .leftJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
            .leftJoin(
                leftFencerBout,
                and(eq(leftFencerBout.boutid, schema.bouts.id), eq(leftFencerBout.fencerid, schema.bouts.lfencer))
            )
            .leftJoin(
                rightFencerBout,
                and(eq(rightFencerBout.boutid, schema.bouts.id), eq(rightFencerBout.fencerid, schema.bouts.rfencer))
            )
            .leftJoin(
                leftSeeding,
                and(eq(leftSeeding.fencerid, schema.bouts.lfencer), eq(leftSeeding.roundid, schema.bouts.roundid))
            )
            .leftJoin(
                rightSeeding,
                and(eq(rightSeeding.fencerid, schema.bouts.rfencer), eq(rightSeeding.roundid, schema.bouts.roundid))
            )
            .where(eq(schema.bouts.roundid, roundId))
            .orderBy(
                asc(schema.deBracketBouts.bracket_type),
                asc(schema.deBracketBouts.bracket_round),
                asc(schema.deBracketBouts.bout_order)
            );

        // Transform the nested structure to the flat structure expected by the application
        const transformedBouts = allBouts.map(bout => ({
            id: bout.bout.id,
            lfencer: bout.bout.lfencer,
            rfencer: bout.bout.rfencer,
            victor: bout.bout.victor,
            tableof: bout.bout.tableof,
            eventid: bout.bout.eventid,
            left_fname: bout.leftFencer.fname,
            left_lname: bout.leftFencer.lname,
            right_fname: bout.rightFencer.fname,
            right_lname: bout.rightFencer.lname,
            left_score: bout.scores.left_score,
            right_score: bout.scores.right_score,
            bracket_type: bout.bracketInfo.bracket_type,
            bracket_round: bout.bracketInfo.bracket_round,
            bout_order: bout.bracketInfo.bout_order,
            seed_left: bout.seeding.seed_left,
            seed_right: bout.seeding.seed_right,
        }));

        // Separate into different brackets
        const winners = transformedBouts.filter(bout => bout.bracket_type === 'winners');
        const losers = transformedBouts.filter(bout => bout.bracket_type === 'losers');
        const finals = transformedBouts.filter(bout => bout.bracket_type === 'finals');

        return { winners, losers, finals };
    } catch (error) {
        console.error('Error getting double elimination bouts:', error);
        throw error;
    }
}

/**
 * Gets bouts for a compass draw format
 */
export async function dbGetCompassBracketBouts(
    roundId: number
): Promise<{ east: any[]; north: any[]; west: any[]; south: any[] }> {
    try {
        // Create aliases for the joined tables to handle multiple joins on the same table
        const leftFencer = alias(schema.fencers, 'leftF');
        const rightFencer = alias(schema.fencers, 'rightF');
        const leftFencerBout = alias(schema.fencerBouts, 'fb1');
        const rightFencerBout = alias(schema.fencerBouts, 'fb2');
        const leftSeeding = alias(schema.seedingFromRoundResults, 'LEFT_SEEDING');
        const rightSeeding = alias(schema.seedingFromRoundResults, 'RIGHT_SEEDING');

        const allBouts = await db
            .select({
                id: schema.bouts.id,
                lfencer: schema.bouts.lfencer,
                rfencer: schema.bouts.rfencer,
                victor: schema.bouts.victor,
                tableof: schema.bouts.tableof,
                eventid: schema.bouts.eventid,
                left_fname: leftFencer.fname,
                left_lname: leftFencer.lname,
                right_fname: rightFencer.fname,
                right_lname: rightFencer.lname,
                left_score: leftFencerBout.score,
                right_score: rightFencerBout.score,
                bracket_type: schema.deBracketBouts.bracket_type,
                bracket_round: schema.deBracketBouts.bracket_round,
                bout_order: schema.deBracketBouts.bout_order,
                seed_left: leftSeeding.seed,
                seed_right: rightSeeding.seed,
            })
            .from(schema.bouts)
            .innerJoin(schema.deBracketBouts, eq(schema.bouts.id, schema.deBracketBouts.bout_id))
            .leftJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
            .leftJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
            .leftJoin(
                leftFencerBout,
                and(eq(leftFencerBout.boutid, schema.bouts.id), eq(leftFencerBout.fencerid, schema.bouts.lfencer))
            )
            .leftJoin(
                rightFencerBout,
                and(eq(rightFencerBout.boutid, schema.bouts.id), eq(rightFencerBout.fencerid, schema.bouts.rfencer))
            )
            .leftJoin(
                leftSeeding,
                and(eq(leftSeeding.fencerid, schema.bouts.lfencer), eq(leftSeeding.roundid, schema.bouts.roundid))
            )
            .leftJoin(
                rightSeeding,
                and(eq(rightSeeding.fencerid, schema.bouts.rfencer), eq(rightSeeding.roundid, schema.bouts.roundid))
            )
            .where(eq(schema.bouts.roundid, roundId))
            .orderBy(
                asc(schema.deBracketBouts.bracket_type),
                asc(schema.deBracketBouts.bracket_round),
                asc(schema.deBracketBouts.bout_order)
            );

        // Separate into different brackets
        const east = allBouts.filter(bout => bout.bracket_type === 'east');
        const north = allBouts.filter(bout => bout.bracket_type === 'north');
        const west = allBouts.filter(bout => bout.bracket_type === 'west');
        const south = allBouts.filter(bout => bout.bracket_type === 'south');

        return { east, north, west, south };
    } catch (error) {
        console.error('Error getting compass draw bouts:', error);
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
 * Gets the event name for a DE round
 */
export async function dbGetEventNameForRound(roundId: number): Promise<string> {
    try {
        const result = await db
            .select({
                weapon: schema.events.weapon,
                gender: schema.events.gender,
                age: schema.events.age,
            })
            .from(schema.events)
            .innerJoin(schema.rounds, eq(schema.events.id, schema.rounds.eventid))
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!result.length) {
            return 'Unknown Event';
        }

        return `${result[0].gender} ${result[0].age} ${result[0].weapon}`;
    } catch (error) {
        console.error('Error getting event name:', error);
        return 'Unknown Event';
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

/**
 * Creates the first round of DE bouts based on seeding and table size
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

                // For byes, also create the next round bouts for advancing fencers
                if (fencers.length < tableSize) {
                    console.log(`Creating next round bouts for advancing fencers (${tableSize / 2})`);
                    await createNextRoundBoutsInTransaction(tx, round.id, tableSize / 2);
                }

                console.log(`Successfully created ${Math.ceil(tableSize / 2)} first round DE bouts`);
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
    try {
        // Get round information
        const round = await db
            .select({
                id: schema.rounds.id,
                eventid: schema.rounds.eventid,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!round.length) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Create the structure
        const brackets = generateDoubleEliminationStructure(seededFencers.length);

        // Place fencers in the brackets
        const populatedBrackets = placeFencersInDoubleElimination(brackets, seededFencers);

        // Insert all bouts into the database
        const { winnersBracket, losersBracket, finalsBracket } = populatedBrackets;
        const allBrackets = [
            ...winnersBracket.map(bout => ({ ...bout, bracketType: 'winners' })),
            ...losersBracket.map(bout => ({ ...bout, bracketType: 'losers' })),
            ...finalsBracket.map(bout => ({ ...bout, bracketType: 'finals' })),
        ];

        // Create bouts first
        for (const bout of allBrackets) {
            // Insert bout
            const boutResult = await db
                .insert(schema.bouts)
                .values({
                    lfencer: bout.fencerA || null,
                    rfencer: bout.fencerB || null,
                    victor: bout.winner || null,
                    eventid: round[0].eventid,
                    roundid: roundId,
                    tableof: tableSize,
                })
                .returning({ id: schema.bouts.id });

            const boutId = boutResult[0].id;

            // Then add bracket information
            await db.insert(schema.deBracketBouts).values({
                roundid: roundId,
                bout_id: boutId,
                bracket_type: bout.bracketType,
                bracket_round: bout.round,
                bout_order: bout.position,
                next_bout_id: bout.nextBoutId || null,
                loser_next_bout_id: bout.loserNextBoutId || null,
            });

            // If it's a bye, automatically advance the fencer without awarding points
            if ((bout.fencerA === null && bout.fencerB !== null) || (bout.fencerA !== null && bout.fencerB === null)) {
                const winningFencer = bout.fencerA || bout.fencerB;

                if (winningFencer) {
                    // Set the victor in Bouts table (no points awarded for byes)
                    await db.update(schema.bouts).set({ victor: winningFencer }).where(eq(schema.bouts.id, boutId));

                    console.log(
                        `Bye for fencer ${winningFencer} in double elimination bout ${boutId} - advancing without points`
                    );
                }
            }
        }

        console.log(`Created double elimination bracket for round ${roundId}`);
    } catch (error) {
        console.error('Error creating double elimination bracket:', error);
        throw error;
    }
}

/**
 * Creates a compass draw bracket structure in the database.
 */
export async function dbCreateCompassDrawBracket(
    roundId: number,
    tableSize: number,
    seededFencers: { fencer: any; seed: number }[]
): Promise<void> {
    try {
        // Get round information
        const round = await db
            .select({
                id: schema.rounds.id,
                eventid: schema.rounds.eventid,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!round.length) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Create the structure
        const brackets = generateCompassDrawStructure(seededFencers.length);

        // Place fencers in the brackets
        const populatedBrackets = placeFencersInCompassDraw(brackets, seededFencers);

        // Insert all bouts into the database
        const { eastBracket, northBracket, westBracket, southBracket } = populatedBrackets;
        const allBrackets = [
            ...eastBracket.map(bout => ({ ...bout, bracketType: 'east' })),
            ...northBracket.map(bout => ({ ...bout, bracketType: 'north' })),
            ...westBracket.map(bout => ({ ...bout, bracketType: 'west' })),
            ...southBracket.map(bout => ({ ...bout, bracketType: 'south' })),
        ];

        // Create bouts first
        for (const bout of allBrackets) {
            // Insert bout
            const boutResult = await db
                .insert(schema.bouts)
                .values({
                    lfencer: bout.fencerA || null,
                    rfencer: bout.fencerB || null,
                    victor: bout.winner || null,
                    eventid: round[0].eventid,
                    roundid: roundId,
                    tableof: tableSize,
                })
                .returning({ id: schema.bouts.id });

            const boutId = boutResult[0].id;

            // Then add bracket information
            await db.insert(schema.deBracketBouts).values({
                roundid: roundId,
                bout_id: boutId,
                bracket_type: bout.bracketType,
                bracket_round: bout.round,
                bout_order: bout.position,
                next_bout_id: bout.nextBoutId || null,
                loser_next_bout_id: bout.loserNextBoutId || null,
            });

            // If it's a bye, automatically advance the fencer without awarding points
            if ((bout.fencerA === null && bout.fencerB !== null) || (bout.fencerA !== null && bout.fencerB === null)) {
                const winningFencer = bout.fencerA || bout.fencerB;

                if (winningFencer) {
                    // Set the victor in Bouts table (no points awarded for byes)
                    await db.update(schema.bouts).set({ victor: winningFencer }).where(eq(schema.bouts.id, boutId));

                    console.log(
                        `Bye for fencer ${winningFencer} in compass draw bout ${boutId} - advancing without points`
                    );
                }
            }
        }

        console.log(`Created compass draw bracket for round ${roundId}`);
    } catch (error) {
        console.error('Error creating compass draw bracket:', error);
        throw error;
    }
}

/**
 * Updates a bout with scores and advances the winner to the next round
 */
export async function dbUpdateDEBoutAndAdvanceWinner(
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number
): Promise<void> {
    try {
        // Update the scores
        await dbUpdateBoutScores(boutId, scoreA, scoreB, fencerAId, fencerBId);

        // Determine the winner
        const victorId = scoreA > scoreB ? fencerAId : fencerBId;

        // Update the bout with the victor
        await db.update(schema.bouts).set({ victor: victorId }).where(eq(schema.bouts.id, boutId));

        // Get the bout details to determine next steps
        const bout = await db
            .select({
                roundid: schema.bouts.roundid,
                tableof: schema.bouts.tableof,
            })
            .from(schema.bouts)
            .where(eq(schema.bouts.id, boutId))
            .limit(1);

        if (!bout.length) throw new Error(`Bout with id ${boutId} not found`);

        // Get all bouts in the same round and table
        const boutsInSameTable = await db
            .select({
                id: schema.bouts.id,
                victor: schema.bouts.victor,
            })
            .from(schema.bouts)
            .where(and(eq(schema.bouts.roundid, bout[0].roundid), eq(schema.bouts.tableof, bout[0].tableof)));

        // Check if all bouts in the current table have victors
        const allComplete = boutsInSameTable.every(b => b.victor !== null);

        // If all complete and not the final (tableof > 2), create next round bouts
        if (allComplete && bout[0].tableof > 2) {
            await createNextRoundBouts(bout[0].roundid, bout[0].tableof / 2);
        }

        console.log(`Updated bout ${boutId} and advanced winner ${victorId}`);
    } catch (error) {
        console.error('Error updating bout and advancing winner:', error);
        throw error;
    }
}

/**
 * Creates the bracket structure for a round
 */
export async function dbGetBracketForRound(roundId: number): Promise<any> {
    try {
        // Get the DE format
        const format = await dbGetDEFormat(roundId);

        // Get all bouts based on the format
        if (format === 'single') {
            const bouts = await dbGetDEBouts(roundId);

            // Structure the data for a single elimination bracket
            const tableSize = await dbGetDETableSize(roundId);
            const rounds = Math.log2(tableSize);

            // Create a structured bracket object
            const bracket = {
                type: 'single',
                tableSize,
                rounds: Math.log2(tableSize),
                bouts,
            };

            return bracket;
        } else if (format === 'double') {
            const { winners, losers, finals } = await dbGetDoubleBracketBouts(roundId);

            // Structure the data for a double elimination bracket
            return {
                type: 'double',
                winners,
                losers,
                finals,
            };
        } else if (format === 'compass') {
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
