// PoolUtils.ts
import { and, count, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db, schema } from './CommonUtils';
import { buildPools } from '../../navigation/utils/RoundAlgorithms';
import type { Fencer, Event, Round, Bout } from '../../navigation/navigation/types';

/**
 * Creates pool assignments and bout orders for a pool round
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

                        // Update the scores to 0 (in case they were null from trigger)
                        try {
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
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error creating pool assignments and bout orders:', error);
        throw error;
    }
}
