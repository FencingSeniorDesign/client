/**
 * Pool Service
 * Provides data access functions for pools with optimized Drizzle ORM usage
 */
import db from '../../../../infrastructure/database/client';
import { fencerPoolAssignment, fencers } from '../../../../infrastructure/database/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { Fencer } from '../../../../core/types';

// Pool with fencers type
export type Pool = {
  poolid: number;
  fencers: Fencer[];
};

// Type for pool assignment creation
export type PoolAssignment = {
  roundId: number;
  poolId: number;
  fencerId: number;
  fencerIdInPool: number;
};

// Prepared statement for getting pool IDs
const getPoolIdsStatement = db
  .select({ poolId: fencerPoolAssignment.poolId })
  .from(fencerPoolAssignment)
  .where(eq(fencerPoolAssignment.roundId, sql.placeholder('roundId')))
  .groupBy(fencerPoolAssignment.poolId)
  .prepare();

// Prepared statement for getting fencers in a specific pool
const getFencersInPoolStatement = db
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
      eq(fencerPoolAssignment.roundId, sql.placeholder('roundId')),
      eq(fencerPoolAssignment.poolId, sql.placeholder('poolId'))
    )
  )
  .prepare();

/**
 * Get all pools for a round with their assigned fencers
 * Uses optimized query approach with prepared statements
 */
export async function getPoolsForRound(roundId: number): Promise<Pool[]> {
  try {
    // First get all unique pool IDs for this round using prepared statement
    const poolIdsQuery = await getPoolIdsStatement.execute({ roundId });
    const poolIds = poolIdsQuery.map(row => row.poolId);
    
    if (poolIds.length === 0) {
      return [];
    }
    
    // For each pool, get all fencers using prepared statement
    const pools: Pool[] = await Promise.all(
      poolIds.map(async (poolId) => {
        // For each fencer in the pool, get their details
        const fencerAssignments = await getFencersInPoolStatement.execute({ 
          roundId, 
          poolId 
        });
        
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
    
    return pools;
  } catch (error) {
    console.error(`Failed to get pools for round ${roundId}:`, error);
    throw new Error(`Failed to get pools: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create pool assignments in batch for better performance
 */
export async function createPoolAssignments(assignments: PoolAssignment[]): Promise<number> {
  try {
    if (assignments.length === 0) {
      return 0;
    }
    
    // Use transaction for atomicity and performance
    let insertedCount = 0;
    await db.transaction(async (tx) => {
      const result = await tx.insert(fencerPoolAssignment)
        .values(assignments)
        .returning();
      
      insertedCount = result.length;
    });
    
    return insertedCount;
  } catch (error) {
    console.error(`Failed to create pool assignments:`, error);
    throw new Error(`Failed to create pool assignments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update pool assignments in batch
 */
export async function updatePoolAssignments(assignments: PoolAssignment[]): Promise<number> {
  try {
    if (assignments.length === 0) {
      return 0;
    }
    
    let updatedCount = 0;
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const assignment of assignments) {
        const result = await tx.update(fencerPoolAssignment)
          .set({ fencerIdInPool: assignment.fencerIdInPool })
          .where(
            and(
              eq(fencerPoolAssignment.roundId, assignment.roundId),
              eq(fencerPoolAssignment.poolId, assignment.poolId),
              eq(fencerPoolAssignment.fencerId, assignment.fencerId)
            )
          )
          .returning();
        
        if (result.length > 0) {
          updatedCount += 1;
        }
      }
    });
    
    return updatedCount;
  } catch (error) {
    console.error(`Failed to update pool assignments:`, error);
    throw new Error(`Failed to update pool assignments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete pool assignments by round and pool ID
 */
export async function deletePoolAssignments(roundId: number, poolIds?: number[]): Promise<number> {
  try {
    let result;
    
    if (poolIds && poolIds.length > 0) {
      // Delete assignments for specific pools
      result = await db.delete(fencerPoolAssignment)
        .where(
          and(
            eq(fencerPoolAssignment.roundId, roundId),
            inArray(fencerPoolAssignment.poolId, poolIds)
          )
        )
        .returning();
    } else {
      // Delete all assignments for the round
      result = await db.delete(fencerPoolAssignment)
        .where(eq(fencerPoolAssignment.roundId, roundId))
        .returning();
    }
    
    return result.length;
  } catch (error) {
    console.error(`Failed to delete pool assignments:`, error);
    throw new Error(`Failed to delete pool assignments: ${error instanceof Error ? error.message : String(error)}`);
  }
}