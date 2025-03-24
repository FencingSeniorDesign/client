/**
 * Round Service
 * Provides optimized data access functions for the Round domain
 */
import { Round, RoundType, PoolsOption, DEFormat } from '../../../core/types';
import { rounds } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

// Type definitions
export type RoundInsert = {
  eventId: number;
  type: RoundType;
  rorder: number;
  
  // Pool settings (optional)
  poolCount?: number;
  poolSize?: number;
  poolsOption?: PoolsOption;
  promotionPercent?: number;
  targetBracket?: number;
  useTargetBracket?: boolean;
  
  // DE settings (optional)
  deFormat?: DEFormat;
  deTableSize?: number;
  
  isStarted?: boolean;
  isComplete?: boolean;
};

export type BatchRoundUpdate = {
  id: number;
  data: Partial<Round>;
};

// Prepared statements for optimized queries
const getRoundByIdStatement = db
  .select()
  .from(rounds)
  .where(eq(rounds.id, sql.placeholder('id')))
  .prepare();

const getRoundsByEventIdStatement = db
  .select()
  .from(rounds)
  .where(eq(rounds.eventId, sql.placeholder('eventId')))
  .orderBy(asc(rounds.rorder))
  .prepare();

const getRoundsByEventIdAndTypeStatement = db
  .select()
  .from(rounds)
  .where(
    and(
      eq(rounds.eventId, sql.placeholder('eventId')),
      eq(rounds.type, sql.placeholder('type'))
    )
  )
  .orderBy(asc(rounds.rorder))
  .prepare();

const getActiveRoundsStatement = db
  .select()
  .from(rounds)
  .where(
    and(
      eq(rounds.eventId, sql.placeholder('eventId')),
      eq(rounds.isStarted, true),
      eq(rounds.isComplete, false)
    )
  )
  .orderBy(asc(rounds.rorder))
  .limit(1)
  .prepare();

const getPendingRoundsStatement = db
  .select()
  .from(rounds)
  .where(
    and(
      eq(rounds.eventId, sql.placeholder('eventId')),
      eq(rounds.isStarted, false)
    )
  )
  .orderBy(asc(rounds.rorder))
  .limit(1)
  .prepare();

const getCompletedRoundsStatement = db
  .select()
  .from(rounds)
  .where(
    and(
      eq(rounds.eventId, sql.placeholder('eventId')),
      eq(rounds.isComplete, true)
    )
  )
  .orderBy(desc(rounds.rorder))
  .limit(1)
  .prepare();

/**
 * Get all rounds
 */
export async function getAllRounds(): Promise<Round[]> {
  try {
    return await db.select().from(rounds).orderBy(asc(rounds.eventId), asc(rounds.rorder));
  } catch (error) {
    console.error('Failed to get all rounds:', error);
    throw new Error(`Failed to get all rounds: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get round by ID
 */
export async function getRoundById(id: number): Promise<Round | null> {
  try {
    const result = await getRoundByIdStatement.execute({ id });
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Failed to get round with ID ${id}:`, error);
    throw new Error(`Failed to get round: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find rounds by event ID using optimized prepared statement
 */
export async function getRoundsByEventId(eventId: number): Promise<Round[]> {
  try {
    return await getRoundsByEventIdStatement.execute({ eventId });
  } catch (error) {
    console.error(`Failed to get rounds for event ${eventId}:`, error);
    throw new Error(`Failed to get rounds for event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find rounds by event ID and type using optimized prepared statement
 */
export async function getRoundsByEventIdAndType(eventId: number, type: RoundType): Promise<Round[]> {
  try {
    return await getRoundsByEventIdAndTypeStatement.execute({ eventId, type });
  } catch (error) {
    console.error(`Failed to get ${type} rounds for event ${eventId}:`, error);
    throw new Error(`Failed to get ${type} rounds for event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Find the current (active) round for an event using optimized queries
 * Logic: 
 * 1. First round that is started but not complete
 * 2. If none, the first round that is not started
 * 3. If all rounds are complete, the last round
 */
export async function getCurrentRound(eventId: number): Promise<Round | null> {
  try {
    // First try to find a round that is started but not complete
    const activeRounds = await getActiveRoundsStatement.execute({ eventId });
    
    if (activeRounds.length > 0) {
      return activeRounds[0];
    }
    
    // Then try to find a round that is not started
    const pendingRounds = await getPendingRoundsStatement.execute({ eventId });
    
    if (pendingRounds.length > 0) {
      return pendingRounds[0];
    }
    
    // If all rounds are complete, return the last round
    const completedRounds = await getCompletedRoundsStatement.execute({ eventId });
    
    return completedRounds.length > 0 ? completedRounds[0] : null;
  } catch (error) {
    console.error(`Failed to get current round for event ${eventId}:`, error);
    throw new Error(`Failed to get current round: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new round
 */
export async function createRound(roundData: RoundInsert): Promise<Round> {
  try {
    const defaultValues = {
      isStarted: false,
      isComplete: false,
    };
    
    const result = await db
      .insert(rounds)
      .values({ ...defaultValues, ...roundData })
      .returning();
    
    if (!result.length) {
      throw new Error('Failed to create round: No result returned');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create round:', error);
    throw new Error(`Failed to create round: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new pool round
 */
export async function createPoolRound(
  eventId: number,
  rorder: number,
  poolCount: number,
  poolSize: number,
  options?: {
    poolsOption?: PoolsOption;
    promotionPercent?: number;
    targetBracket?: number;
    useTargetBracket?: boolean;
  }
): Promise<Round> {
  try {
    const roundData: RoundInsert = {
      eventId,
      type: 'pool',
      rorder,
      poolCount,
      poolSize,
      ...options,
      isStarted: false,
      isComplete: false,
    };
    
    return await createRound(roundData);
  } catch (error) {
    console.error(`Failed to create pool round for event ${eventId}:`, error);
    throw new Error(`Failed to create pool round: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new DE round
 */
export async function createDERound(
  eventId: number,
  rorder: number,
  deFormat: DEFormat,
  deTableSize: number
): Promise<Round> {
  try {
    const roundData: RoundInsert = {
      eventId,
      type: 'de',
      rorder,
      deFormat,
      deTableSize,
      isStarted: false,
      isComplete: false,
    };
    
    return await createRound(roundData);
  } catch (error) {
    console.error(`Failed to create DE round for event ${eventId}:`, error);
    throw new Error(`Failed to create DE round: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create multiple rounds in a batch operation
 */
export async function createRounds(roundsList: RoundInsert[]): Promise<Round[]> {
  try {
    if (roundsList.length === 0) {
      return [];
    }
    
    const defaultValues = {
      isStarted: false,
      isComplete: false,
    };
    
    const roundsWithDefaults = roundsList.map(round => ({
      ...defaultValues,
      ...round
    }));
    
    return await db.insert(rounds).values(roundsWithDefaults).returning();
  } catch (error) {
    console.error('Failed to create rounds in batch:', error);
    throw new Error(`Failed to create rounds: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update a round
 */
export async function updateRound(id: number, data: Partial<Round>): Promise<Round | null> {
  try {
    const result = await db
      .update(rounds)
      .set(data)
      .where(eq(rounds.id, id))
      .returning();
    
    if (!result.length) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update round with ID ${id}:`, error);
    throw new Error(`Failed to update round: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update multiple rounds in a single transaction
 */
export async function batchUpdateRounds(updates: BatchRoundUpdate[]): Promise<Round[]> {
  try {
    if (updates.length === 0) {
      return [];
    }
    
    const updatedRounds: Round[] = [];
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const result = await tx
          .update(rounds)
          .set(update.data)
          .where(eq(rounds.id, update.id))
          .returning();
        
        if (result.length > 0) {
          updatedRounds.push(result[0]);
        }
      }
    });
    
    return updatedRounds;
  } catch (error) {
    console.error('Failed to batch update rounds:', error);
    throw new Error(`Failed to batch update rounds: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a round
 */
export async function deleteRound(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(rounds)
      .where(eq(rounds.id, id))
      .returning();
    
    return result.length > 0;
  } catch (error) {
    console.error(`Failed to delete round with ID ${id}:`, error);
    throw new Error(`Failed to delete round: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete multiple rounds
 */
export async function batchDeleteRounds(ids: number[]): Promise<number> {
  try {
    if (ids.length === 0) {
      return 0;
    }
    
    const result = await db
      .delete(rounds)
      .where(sql`${rounds.id} IN (${ids.join(', ')})`)
      .returning();
    
    return result.length;
  } catch (error) {
    console.error('Failed to batch delete rounds:', error);
    throw new Error(`Failed to batch delete rounds: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Mark a round as started
 */
export async function markRoundAsStarted(id: number): Promise<Round | null> {
  try {
    return await updateRound(id, { isStarted: true });
  } catch (error) {
    console.error(`Failed to mark round ${id} as started:`, error);
    throw new Error(`Failed to mark round as started: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Mark a round as complete
 */
export async function markRoundAsComplete(id: number): Promise<Round | null> {
  try {
    return await updateRound(id, { isComplete: true });
  } catch (error) {
    console.error(`Failed to mark round ${id} as complete:`, error);
    throw new Error(`Failed to mark round as complete: ${error instanceof Error ? error.message : String(error)}`);
  }
}