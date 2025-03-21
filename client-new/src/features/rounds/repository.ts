/**
 * Round repository
 * Implements data access operations for the Round domain
 */

import { Round, RoundType, PoolsOption, DEFormat } from '../../core/types';
import { BaseRepository, IBaseRepository } from '../../infrastructure/database/base-repository';
import { rounds, fencerPoolAssignment, bouts, deBracketBouts, deTable } from '../../infrastructure/database/schema';
import db from '../../infrastructure/database/client';
import { eq, and, desc, asc } from 'drizzle-orm';

// Define the round insert type - used for creating new rounds
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

/**
 * Round repository interface
 * Extends the base repository interface with round-specific operations
 */
export interface IRoundRepository extends IBaseRepository<Round, RoundInsert> {
  /**
   * Find rounds by event ID
   */
  findByEventId(eventId: number): Promise<Round[]>;
  
  /**
   * Find rounds by event ID and type (pool or DE)
   */
  findByEventIdAndType(eventId: number, type: RoundType): Promise<Round[]>;
  
  /**
   * Find the current (active) round for an event
   */
  findCurrentRound(eventId: number): Promise<Round | undefined>;
  
  /**
   * Create a new pool round
   */
  createPoolRound(
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
  ): Promise<Round>;
  
  /**
   * Create a new DE round
   */
  createDERound(
    eventId: number,
    rorder: number,
    deFormat: DEFormat,
    deTableSize: number
  ): Promise<Round>;
  
  /**
   * Mark a round as started
   */
  markAsStarted(roundId: number): Promise<Round | undefined>;
  
  /**
   * Mark a round as complete
   */
  markAsComplete(roundId: number): Promise<Round | undefined>;
}

/**
 * Rounds repository implementation
 * Provides data access operations for rounds using Drizzle ORM
 */
export class RoundRepository 
  extends BaseRepository<Round, RoundInsert>
  implements IRoundRepository {
  
  constructor() {
    // Initialize with the rounds table and the primary key
    super(rounds, 'id');
  }

  /**
   * Find rounds by event ID
   */
  async findByEventId(eventId: number): Promise<Round[]> {
    return db
      .select()
      .from(rounds)
      .where(eq(rounds.eventId, eventId))
      .orderBy(asc(rounds.rorder));
  }
  
  /**
   * Find rounds by event ID and type (pool or DE)
   */
  async findByEventIdAndType(eventId: number, type: RoundType): Promise<Round[]> {
    return db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.eventId, eventId),
          eq(rounds.type, type)
        )
      )
      .orderBy(asc(rounds.rorder));
  }
  
  /**
   * Find the current (active) round for an event
   * Logic: 
   * 1. First round that is started but not complete
   * 2. If none, the first round that is not started
   * 3. If all rounds are complete, the last round
   */
  async findCurrentRound(eventId: number): Promise<Round | undefined> {
    // First try to find a round that is started but not complete
    const activeRounds = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.eventId, eventId),
          eq(rounds.isStarted, true),
          eq(rounds.isComplete, false)
        )
      )
      .orderBy(asc(rounds.rorder))
      .limit(1);
    
    if (activeRounds.length > 0) {
      return activeRounds[0];
    }
    
    // Then try to find a round that is not started
    const pendingRounds = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.eventId, eventId),
          eq(rounds.isStarted, false)
        )
      )
      .orderBy(asc(rounds.rorder))
      .limit(1);
    
    if (pendingRounds.length > 0) {
      return pendingRounds[0];
    }
    
    // If all rounds are complete, return the last round
    const completedRounds = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.eventId, eventId),
          eq(rounds.isComplete, true)
        )
      )
      .orderBy(desc(rounds.rorder))
      .limit(1);
    
    return completedRounds.length > 0 ? completedRounds[0] : undefined;
  }
  
  /**
   * Create a new pool round
   */
  async createPoolRound(
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
    
    return this.create(roundData);
  }
  
  /**
   * Create a new DE round
   */
  async createDERound(
    eventId: number,
    rorder: number,
    deFormat: DEFormat,
    deTableSize: number
  ): Promise<Round> {
    const roundData: RoundInsert = {
      eventId,
      type: 'de',
      rorder,
      deFormat,
      deTableSize,
      isStarted: false,
      isComplete: false,
    };
    
    return this.create(roundData);
  }
  
  /**
   * Mark a round as started
   */
  async markAsStarted(roundId: number): Promise<Round | undefined> {
    return this.update(roundId, { isStarted: true });
  }
  
  /**
   * Mark a round as complete
   */
  async markAsComplete(roundId: number): Promise<Round | undefined> {
    return this.update(roundId, { isComplete: true });
  }
}

// Create and export a singleton instance of the repository
export const roundRepository = new RoundRepository();

// Export convenience functions for direct use
export const getAllRounds = () => roundRepository.findAll();
export const getRoundById = (id: number) => roundRepository.findById(id);
export const getRoundsByEventId = (eventId: number) => roundRepository.findByEventId(eventId);
export const getRoundsByEventIdAndType = (eventId: number, type: RoundType) => roundRepository.findByEventIdAndType(eventId, type);
export const getCurrentRound = (eventId: number) => roundRepository.findCurrentRound(eventId);
export const createPoolRound = (eventId: number, rorder: number, poolCount: number, poolSize: number, options?: {
  poolsOption?: PoolsOption;
  promotionPercent?: number;
  targetBracket?: number;
  useTargetBracket?: boolean;
}) => roundRepository.createPoolRound(eventId, rorder, poolCount, poolSize, options);
export const createDERound = (eventId: number, rorder: number, deFormat: DEFormat, deTableSize: number) => roundRepository.createDERound(eventId, rorder, deFormat, deTableSize);
export const markRoundAsStarted = (roundId: number) => roundRepository.markAsStarted(roundId);
export const markRoundAsComplete = (roundId: number) => roundRepository.markAsComplete(roundId);

// Export the repository for direct access
export default roundRepository;