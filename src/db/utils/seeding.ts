// seeding.ts - Seeding-related database functions
import { eq } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import { calculateSeedingFromResults } from '../../navigation/utils/RoundAlgorithms';
import { dbGetPoolsForRound } from './pool';
import { dbGetBoutsForPool } from './pool';

/**
 * Saves seeding results to the database
 */
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

/**
 * Gets seeding for a round
 */
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

/**
 * The calculateAndSaveSeedingFromRoundResults function involves complex calculations
 * and aggregations that combine database queries with JavaScript processing.
 */
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
