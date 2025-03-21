/**
 * Round repository hooks
 * React hooks for accessing round repository functionality
 */
import { useCallback } from 'react';
import { Round, RoundType, PoolsOption, DEFormat } from '../../../core/types';
import roundRepository, { RoundInsert } from '../repository';

/**
 * Type for successful round response
 */
type RoundResponse<T = Round> = {
  success: true;
  error: null;
  round: T;
};

/**
 * Type for failed round response
 */
type RoundErrorResponse = {
  success: false;
  error: string;
  round: null;
};

/**
 * Union type for all possible round responses
 */
type RoundResult<T = Round> = RoundResponse<T> | RoundErrorResponse;

/**
 * Type for successful rounds response
 */
type RoundsResponse = {
  success: true;
  error: null;
  rounds: Round[];
};

/**
 * Type for failed rounds response
 */
type RoundsErrorResponse = {
  success: false;
  error: string;
  rounds: null;
};

/**
 * Union type for all possible rounds responses
 */
type RoundsResult = RoundsResponse | RoundsErrorResponse;

/**
 * Hook for accessing round repository functionality
 */
export const useRoundRepository = () => {
  /**
   * Get all rounds
   */
  const getAll = useCallback(async (): Promise<RoundsResult> => {
    try {
      const rounds = await roundRepository.findAll();
      return { success: true, error: null, rounds };
    } catch (error) {
      console.error('Failed to get all rounds:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get all rounds', 
        rounds: null 
      };
    }
  }, []);

  /**
   * Get a round by ID
   */
  const getById = useCallback(async (id: number): Promise<RoundResult> => {
    try {
      const round = await roundRepository.findById(id);
      if (!round) {
        return { success: false, error: `Round with ID ${id} not found`, round: null };
      }
      return { success: true, error: null, round };
    } catch (error) {
      console.error(`Failed to get round with ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get round with ID ${id}`, 
        round: null 
      };
    }
  }, []);

  /**
   * Get rounds by event ID
   */
  const getByEventId = useCallback(async (eventId: number): Promise<RoundsResult> => {
    try {
      const rounds = await roundRepository.findByEventId(eventId);
      return { success: true, error: null, rounds };
    } catch (error) {
      console.error(`Failed to get rounds for event ${eventId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get rounds for event ${eventId}`, 
        rounds: null 
      };
    }
  }, []);

  /**
   * Get rounds by event ID and type
   */
  const getByEventIdAndType = useCallback(
    async (eventId: number, type: RoundType): Promise<RoundsResult> => {
      try {
        const rounds = await roundRepository.findByEventIdAndType(eventId, type);
        return { success: true, error: null, rounds };
      } catch (error) {
        console.error(`Failed to get ${type} rounds for event ${eventId}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : `Failed to get ${type} rounds for event ${eventId}`, 
          rounds: null 
        };
      }
    }, []);

  /**
   * Get the current round for an event
   */
  const getCurrentRound = useCallback(async (eventId: number): Promise<RoundResult> => {
    try {
      const round = await roundRepository.findCurrentRound(eventId);
      if (!round) {
        return { success: false, error: `No current round found for event ${eventId}`, round: null };
      }
      return { success: true, error: null, round };
    } catch (error) {
      console.error(`Failed to get current round for event ${eventId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get current round for event ${eventId}`, 
        round: null 
      };
    }
  }, []);

  /**
   * Create a new pool round
   */
  const createPoolRound = useCallback(
    async (
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
    ): Promise<RoundResult> => {
      try {
        const round = await roundRepository.createPoolRound(
          eventId,
          rorder,
          poolCount,
          poolSize,
          options
        );
        return { success: true, error: null, round };
      } catch (error) {
        console.error(`Failed to create pool round for event ${eventId}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : `Failed to create pool round for event ${eventId}`, 
          round: null 
        };
      }
    }, []);

  /**
   * Create a new DE round
   */
  const createDERound = useCallback(
    async (
      eventId: number,
      rorder: number,
      deFormat: DEFormat,
      deTableSize: number
    ): Promise<RoundResult> => {
      try {
        const round = await roundRepository.createDERound(
          eventId,
          rorder,
          deFormat,
          deTableSize
        );
        return { success: true, error: null, round };
      } catch (error) {
        console.error(`Failed to create DE round for event ${eventId}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : `Failed to create DE round for event ${eventId}`, 
          round: null 
        };
      }
    }, []);

  /**
   * Create a custom round
   */
  const createRound = useCallback(async (data: RoundInsert): Promise<RoundResult> => {
    try {
      const round = await roundRepository.create(data);
      return { success: true, error: null, round };
    } catch (error) {
      console.error('Failed to create round:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create round', 
        round: null 
      };
    }
  }, []);

  /**
   * Update a round
   */
  const updateRound = useCallback(
    async (id: number, data: Partial<Round>): Promise<RoundResult> => {
      try {
        const round = await roundRepository.update(id, data);
        if (!round) {
          return { success: false, error: `Round with ID ${id} not found`, round: null };
        }
        return { success: true, error: null, round };
      } catch (error) {
        console.error(`Failed to update round with ID ${id}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : `Failed to update round with ID ${id}`, 
          round: null 
        };
      }
    }, []);

  /**
   * Delete a round
   */
  const deleteRound = useCallback(async (id: number): Promise<{ success: boolean; error: string | null }> => {
    try {
      const result = await roundRepository.delete(id);
      if (!result) {
        return { success: false, error: `Round with ID ${id} not found` };
      }
      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to delete round with ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to delete round with ID ${id}` 
      };
    }
  }, []);

  /**
   * Mark a round as started
   */
  const markAsStarted = useCallback(async (id: number): Promise<RoundResult> => {
    try {
      const round = await roundRepository.markAsStarted(id);
      if (!round) {
        return { success: false, error: `Round with ID ${id} not found`, round: null };
      }
      return { success: true, error: null, round };
    } catch (error) {
      console.error(`Failed to mark round ${id} as started:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to mark round ${id} as started`, 
        round: null 
      };
    }
  }, []);

  /**
   * Mark a round as complete
   */
  const markAsComplete = useCallback(async (id: number): Promise<RoundResult> => {
    try {
      const round = await roundRepository.markAsComplete(id);
      if (!round) {
        return { success: false, error: `Round with ID ${id} not found`, round: null };
      }
      return { success: true, error: null, round };
    } catch (error) {
      console.error(`Failed to mark round ${id} as complete:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to mark round ${id} as complete`, 
        round: null 
      };
    }
  }, []);

  return {
    getAll,
    getById,
    getByEventId,
    getByEventIdAndType,
    getCurrentRound,
    createPoolRound,
    createDERound,
    createRound,
    updateRound,
    deleteRound,
    markAsStarted,
    markAsComplete,
  };
};

export default useRoundRepository;