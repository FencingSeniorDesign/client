/**
 * Pool bout repository hook
 * Provides methods for managing pool bouts
 */
import { useCallback } from 'react';
import { Bout, Fencer } from '../../../../core/types';
import db from '../../../../infrastructure/database/client';
import { bouts, fencers, fencerPoolAssignment } from '../../../../infrastructure/database/schema';
import { eq, and, SQL } from 'drizzle-orm';

// Response type definitions
type BoutResponse<T = any> = {
  success: true;
  error: null;
  bout: T;
};

type BoutErrorResponse = {
  success: false;
  error: string;
  bout: null;
};

type BoutResult<T = any> = BoutResponse<T> | BoutErrorResponse;

type BoutsResponse<T = any> = {
  success: true;
  error: null;
  bouts: T[];
};

type BoutsErrorResponse = {
  success: false;
  error: string;
  bouts: null;
};

type BoutsResult<T = any> = BoutsResponse<T> | BoutsErrorResponse;

// Pool bout type with fencer details
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

type SeedingEntry = {
  seed: number;
  fencer: Fencer;
};

export const usePoolBoutRepository = () => {
  /**
   * Get bouts for a pool
   * Note: Since poolId isn't directly in the Drizzle schema for bouts,
   * we use a raw SQL query to join the necessary tables
   */
  const getBoutsForPool = useCallback(async (
    roundId: number, 
    poolId: number
  ): Promise<BoutsResult<PoolBout>> => {
    try {
      // Need to use raw SQL due to complex join requirement
      const poolBouts = await db.execute(
        `SELECT 
          b.id, 
          b.roundId, 
          ? as poolId,
          b.lFencer as leftFencerId, 
          b.rFencer as rightFencerId, 
          b.leftScore, 
          b.rightScore,
          f1.fname as left_fname, 
          f1.lname as left_lname, 
          fp1.fencerIdInPool as left_poolposition,
          f2.fname as right_fname, 
          f2.lname as right_lname,
          fp2.fencerIdInPool as right_poolposition
        FROM bouts b
        LEFT JOIN fencers f1 ON b.lFencer = f1.id
        LEFT JOIN fencers f2 ON b.rFencer = f2.id
        LEFT JOIN fencerPoolAssignment fp1 ON (b.lFencer = fp1.fencerId AND b.roundId = fp1.roundId AND fp1.poolId = ?)
        LEFT JOIN fencerPoolAssignment fp2 ON (b.rFencer = fp2.fencerId AND b.roundId = fp2.roundId AND fp2.poolId = ?)
        WHERE b.roundId = ? AND b.poolId = ?
        ORDER BY b.id`,
        [poolId, poolId, poolId, roundId, poolId]
      );
      
      return { 
        success: true, 
        error: null, 
        bouts: poolBouts.rows as PoolBout[]
      };
    } catch (error) {
      console.error(`Failed to get bouts for pool ${poolId} in round ${roundId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to get bouts for pool`,
        bouts: null,
      };
    }
  }, []);

  /**
   * Update bout scores using Drizzle ORM
   */
  const updateBoutScores = useCallback(async (
    boutId: number,
    leftScore: number,
    rightScore: number
  ): Promise<BoutResult> => {
    try {
      // Using Drizzle ORM for the update
      const result = await db.update(bouts)
        .set({ 
          leftScore, 
          rightScore 
        })
        .where(eq(bouts.id, boutId))
        .returning();
      
      if (!result.length) {
        return { 
          success: false, 
          error: `Bout with ID ${boutId} not found`, 
          bout: null 
        };
      }

      return { 
        success: true, 
        error: null, 
        bout: result[0]
      };
    } catch (error) {
      console.error(`Failed to update scores for bout ${boutId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to update bout scores`,
        bout: null,
      };
    }
  }, []);

  /**
   * Get seeding for a round
   */
  const getSeedingForRound = useCallback(async (
    roundId: number
  ): Promise<{ success: boolean; error: string | null; seeding: SeedingEntry[] | null }> => {
    try {
      // Using a combination of Drizzle joins and result mapping
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
      
      // Convert to the expected format
      const seeding = assignments.map(row => ({
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
      
      return { success: true, error: null, seeding };
    } catch (error) {
      console.error(`Failed to get seeding for round ${roundId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to get seeding`,
        seeding: null,
      };
    }
  }, []);

  /**
   * Check if all bouts in a pool are complete
   */
  const checkBoutsCompletion = useCallback(async (
    roundId: number,
    poolId: number
  ): Promise<{ success: boolean; error: string | null; isComplete: boolean | null }> => {
    try {
      const boutList = await db.execute(
        `SELECT leftScore, rightScore FROM bouts 
         WHERE roundId = ? AND poolId = ?`,
        [roundId, poolId]
      );
      
      if (!boutList.rows.length) {
        return { success: true, error: null, isComplete: false };
      }
      
      // Check if all bouts have scores recorded
      const isComplete = boutList.rows.every((bout: any) => {
        const scoreA = bout.leftScore ?? 0;
        const scoreB = bout.rightScore ?? 0;
        return scoreA !== 0 || scoreB !== 0;
      });
      
      return { success: true, error: null, isComplete };
    } catch (error) {
      console.error(`Failed to check bout completion for pool ${poolId} in round ${roundId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to check bout completion`,
        isComplete: null,
      };
    }
  }, []);

  return {
    getBoutsForPool,
    updateBoutScores,
    getSeedingForRound,
    checkBoutsCompletion
  };
};

export default usePoolBoutRepository;