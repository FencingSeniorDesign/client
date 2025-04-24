// pool.ts - Pool-related database functions
import { and, count, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Fencer, Event, Round, Bout } from '../../navigation/navigation/types';
import { buildPools } from '../../navigation/utils/RoundAlgorithms';

/**
 * Creates pool assignments and bout orders for a round
 */
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

/**
 * Gets pools for a round
 */
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

/**
 * Gets bouts for a pool
 */
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
