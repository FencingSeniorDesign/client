/**
 * Pool repository hook
 * Provides methods for managing pools
 */
import { useCallback } from 'react';
import { Fencer } from '../../../../core/types';
import db from '../../../../infrastructure/database/client';
import { fencerPoolAssignment, fencers } from '../../../../infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';

// Response type definitions
type PoolResponse<T = any> = {
  success: true;
  error: null;
  pool: T;
};

type PoolErrorResponse = {
  success: false;
  error: string;
  pool: null;
};

type PoolResult<T = any> = PoolResponse<T> | PoolErrorResponse;

type PoolsResponse<T = any> = {
  success: true;
  error: null;
  pools: T[];
};

type PoolsErrorResponse = {
  success: false;
  error: string;
  pools: null;
};

type PoolsResult<T = any> = PoolsResponse<T> | PoolsErrorResponse;

// Pool with fencers type
export type Pool = {
  poolid: number;
  fencers: Fencer[];
};

export const usePoolRepository = () => {
  /**
   * Get all pools for a round with their assigned fencers
   */
  const getPoolsForRound = useCallback(async (
    roundId: number
  ): Promise<PoolsResult<Pool>> => {
    try {
      // First get all unique pool IDs for this round
      const poolIdsQuery = await db
        .select({ poolId: fencerPoolAssignment.poolId })
        .from(fencerPoolAssignment)
        .where(eq(fencerPoolAssignment.roundId, roundId))
        .groupBy(fencerPoolAssignment.poolId);
      
      const poolIds = poolIdsQuery.map(row => row.poolId);
      
      if (poolIds.length === 0) {
        return { success: true, error: null, pools: [] };
      }
      
      // For each pool, get all fencers
      const pools: Pool[] = await Promise.all(
        poolIds.map(async (poolId) => {
          // For each fencer in the pool, get their details
          const fencerAssignments = await db
            .select({
              fencerId: fencerPoolAssignment.fencerId,
              fencerIdInPool: fencerPoolAssignment.fencerIdInPool,
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
            .where(
              and(
                eq(fencerPoolAssignment.roundId, roundId),
                eq(fencerPoolAssignment.poolId, poolId)
              )
            );
          
          // Map the database results to the Fencer type
          const poolFencers = fencerAssignments.map(row => ({
            id: row.fencerId,
            fname: row.fname || '',
            lname: row.lname || '',
            erating: row.erating || 'U',
            eyear: row.eyear || 0,
            frating: row.frating || 'U',
            fyear: row.fyear || 0,
            srating: row.srating || 'U',
            syear: row.syear || 0,
            poolNumber: row.fencerIdInPool,
          } as Fencer));
          
          return {
            poolid: poolId,
            fencers: poolFencers,
          };
        })
      );
      
      return { success: true, error: null, pools };
    } catch (error) {
      console.error(`Failed to get pools for round ${roundId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to get pools`,
        pools: null,
      };
    }
  }, []);

  return {
    getPoolsForRound,
  };
};

export default usePoolRepository;