/**
 * Pool Bout Service
 * Provides data access functions for pool bouts
 */
import db from '../../../../infrastructure/database/client';
import { bouts, fencers, fencerPoolAssignment } from '../../../../infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';
import { Fencer } from '../../../../core/types';

// Type definitions
export type PoolBout = {
  id: number;
  roundId: number;
  poolId?: number;
  leftFencerId: number;
  rightFencerId: number;
  leftScore?: number;
  rightScore?: number;
  left_fname?: string;
  left_lname?: string;
  left_poolposition?: number;
  right_fname?: string;
  right_lname?: string;
  right_poolposition?: number;
};

export type SeedingEntry = {
  seed: number;
  fencer: Fencer;
};

/**
 * Get bouts for a pool with fencer details
 * Uses Drizzle's query builder with table aliases for complex joins
 */
export async function getBoutsForPool(roundId: number, poolId: number): Promise<PoolBout[]> {
  try {
    // Using Drizzle's query builder for joins with table aliases
    const results = await db
      .select({
        id: bouts.id,
        roundId: bouts.roundId,
        leftFencerId: bouts.lFencer,
        rightFencerId: bouts.rFencer,
        leftScore: bouts.leftScore,
        rightScore: bouts.rightScore,
        left_fname: fencers.as('leftFencer').fname,
        left_lname: fencers.as('leftFencer').lname,
        right_fname: fencers.as('rightFencer').fname,
        right_lname: fencers.as('rightFencer').lname,
        left_poolposition: fencerPoolAssignment.as('leftAssignment').fencerIdInPool,
        right_poolposition: fencerPoolAssignment.as('rightAssignment').fencerIdInPool
      })
      .from(bouts)
      .leftJoin(
        fencers.as('leftFencer'), 
        eq(bouts.lFencer, fencers.as('leftFencer').id)
      )
      .leftJoin(
        fencers.as('rightFencer'), 
        eq(bouts.rFencer, fencers.as('rightFencer').id)
      )
      .leftJoin(
        fencerPoolAssignment.as('leftAssignment'),
        and(
          eq(bouts.lFencer, fencerPoolAssignment.as('leftAssignment').fencerId),
          eq(bouts.roundId, fencerPoolAssignment.as('leftAssignment').roundId),
          eq(fencerPoolAssignment.as('leftAssignment').poolId, poolId)
        )
      )
      .leftJoin(
        fencerPoolAssignment.as('rightAssignment'),
        and(
          eq(bouts.rFencer, fencerPoolAssignment.as('rightAssignment').fencerId),
          eq(bouts.roundId, fencerPoolAssignment.as('rightAssignment').roundId),
          eq(fencerPoolAssignment.as('rightAssignment').poolId, poolId)
        )
      )
      .where(
        and(
          eq(bouts.roundId, roundId),
          eq(bouts.poolId, poolId)
        )
      )
      .orderBy(bouts.id);
    
    // Add the poolId to each result
    return results.map(bout => ({
      ...bout,
      poolId
    }));
  } catch (error) {
    console.error(`Failed to get bouts for pool ${poolId} in round ${roundId}:`, error);
    throw new Error(`Failed to get bouts for pool: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update scores for a bout
 */
export async function updateBoutScores(boutId: number, leftScore: number, rightScore: number) {
  try {
    const result = await db.update(bouts)
      .set({ 
        leftScore, 
        rightScore 
      })
      .where(eq(bouts.id, boutId))
      .returning();
    
    if (!result.length) {
      throw new Error(`Bout with ID ${boutId} not found`);
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update scores for bout ${boutId}:`, error);
    throw new Error(`Failed to update bout scores: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get seeding for a round
 */
export async function getSeedingForRound(roundId: number): Promise<SeedingEntry[]> {
  try {
    const assignments = await db
      .select({
        fencerId: fencerPoolAssignment.fencerId,
        seed: fencerPoolAssignment.fencerIdInPool,
        fname: fencers.fname,
        lname: fencers.lname,
        erating: fencers.erating,
        eyear: fencers.eyear,
        frating: fencers.frating,
        fyear: fencers.fyear,
        srating: fencers.srating,
        syear: fencers.syear,
      })
      .from(fencerPoolAssignment)
      .leftJoin(fencers, eq(fencerPoolAssignment.fencerId, fencers.id))
      .where(eq(fencerPoolAssignment.roundId, roundId))
      .orderBy(fencerPoolAssignment.fencerIdInPool);
    
    return assignments.map(row => ({
      seed: row.seed || 0,
      fencer: {
        id: row.fencerId,
        fname: row.fname || '',
        lname: row.lname || '',
        erating: row.erating || 'U',
        eyear: row.eyear || 0,
        frating: row.frating || 'U',
        fyear: row.fyear || 0,
        srating: row.srating || 'U',
        syear: row.syear || 0,
      } as Fencer
    }));
  } catch (error) {
    console.error(`Failed to get seeding for round ${roundId}:`, error);
    throw new Error(`Failed to get seeding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if all bouts in a pool are complete
 */
export async function checkBoutsCompletion(roundId: number, poolId: number): Promise<boolean> {
  try {
    const boutList = await db
      .select({
        leftScore: bouts.leftScore,
        rightScore: bouts.rightScore
      })
      .from(bouts)
      .where(
        and(
          eq(bouts.roundId, roundId),
          eq(bouts.poolId, poolId)
        )
      );
    
    if (!boutList.length) {
      return false;
    }
    
    // Check if all bouts have scores recorded
    return boutList.every(bout => {
      const scoreA = bout.leftScore ?? 0;
      const scoreB = bout.rightScore ?? 0;
      return scoreA !== 0 || scoreB !== 0;
    });
  } catch (error) {
    console.error(`Failed to check bout completion for pool ${poolId} in round ${roundId}:`, error);
    throw new Error(`Failed to check bout completion: ${error instanceof Error ? error.message : String(error)}`);
  }
}