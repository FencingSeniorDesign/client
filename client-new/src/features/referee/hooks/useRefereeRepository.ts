/**
 * Referee repository hooks
 * React hooks for accessing referee repository functionality
 */
import { useCallback } from 'react';
import { Referee, Bout, FencerBout } from '../../../core/types';
import refereeRepository, { RefereeInsert } from '../repository';

/**
 * Type for successful referee response
 */
type RefereeResponse<T = Referee> = {
  success: true;
  error: null;
  referee: T;
};

/**
 * Type for failed referee response
 */
type RefereeErrorResponse = {
  success: false;
  error: string;
  referee: null;
};

/**
 * Union type for all possible referee responses
 */
type RefereeResult<T = Referee> = RefereeResponse<T> | RefereeErrorResponse;

/**
 * Type for successful referees response
 */
type RefereesResponse = {
  success: true;
  error: null;
  referees: Referee[];
};

/**
 * Type for failed referees response
 */
type RefereesErrorResponse = {
  success: false;
  error: string;
  referees: null;
};

/**
 * Union type for all possible referees responses
 */
type RefereesResult = RefereesResponse | RefereesErrorResponse;

/**
 * Type for successful bout with scores response
 */
type BoutWithScoresResponse = {
  success: true;
  error: null;
  bout: Bout;
  scores: FencerBout[];
};

/**
 * Type for failed bout response
 */
type BoutErrorResponse = {
  success: false;
  error: string;
  bout: null;
  scores: null;
};

/**
 * Union type for all possible bout responses
 */
type BoutWithScoresResult = BoutWithScoresResponse | BoutErrorResponse;

/**
 * Hook for accessing referee repository functionality
 */
export const useRefereeRepository = () => {
  /**
   * Get all referees
   */
  const getAll = useCallback(async (): Promise<RefereesResult> => {
    try {
      const referees = await refereeRepository.findAll();
      return { success: true, error: null, referees };
    } catch (error) {
      console.error('Failed to get all referees:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get all referees', 
        referees: null 
      };
    }
  }, []);

  /**
   * Get a referee by ID
   */
  const getById = useCallback(async (id: number): Promise<RefereeResult> => {
    try {
      const referee = await refereeRepository.findById(id);
      if (!referee) {
        return { success: false, error: `Referee with ID ${id} not found`, referee: null };
      }
      return { success: true, error: null, referee };
    } catch (error) {
      console.error(`Failed to get referee with ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get referee with ID ${id}`, 
        referee: null 
      };
    }
  }, []);

  /**
   * Get referees by name
   */
  const getByName = useCallback(async (name: string): Promise<RefereesResult> => {
    try {
      const referees = await refereeRepository.findByName(name);
      return { success: true, error: null, referees };
    } catch (error) {
      console.error(`Failed to get referees with name ${name}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get referees with name ${name}`, 
        referees: null 
      };
    }
  }, []);

  /**
   * Get a referee by device ID
   */
  const getByDeviceId = useCallback(async (deviceId: string): Promise<RefereeResult> => {
    try {
      const referee = await refereeRepository.findByDeviceId(deviceId);
      if (!referee) {
        return { success: false, error: `Referee with device ID ${deviceId} not found`, referee: null };
      }
      return { success: true, error: null, referee };
    } catch (error) {
      console.error(`Failed to get referee with device ID ${deviceId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get referee with device ID ${deviceId}`, 
        referee: null 
      };
    }
  }, []);

  /**
   * Get active bouts for a referee
   */
  const getActiveBouts = useCallback(async (refereeId: number): Promise<{ success: boolean; error: string | null; bouts: Bout[] | null }> => {
    try {
      const bouts = await refereeRepository.findActiveBoutsByRefereeId(refereeId);
      return { success: true, error: null, bouts };
    } catch (error) {
      console.error(`Failed to get active bouts for referee ${refereeId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get active bouts for referee ${refereeId}`, 
        bouts: null 
      };
    }
  }, []);

  /**
   * Update scores for a bout
   */
  const updateBoutScores = useCallback(
    async (
      boutId: number, 
      fencer1Id: number, 
      fencer1Score: number, 
      fencer2Id: number, 
      fencer2Score: number
    ): Promise<{ success: boolean; error: string | null }> => {
      try {
        await refereeRepository.updateBoutScores(
          boutId, 
          fencer1Id, 
          fencer1Score, 
          fencer2Id, 
          fencer2Score
        );
        return { success: true, error: null };
      } catch (error) {
        console.error(`Failed to update scores for bout ${boutId}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : `Failed to update scores for bout ${boutId}`
        };
      }
    }, []);

  /**
   * Set the victor for a bout
   */
  const setBoutVictor = useCallback(async (boutId: number, victorId: number): Promise<{ success: boolean; error: string | null }> => {
    try {
      await refereeRepository.setBoutVictor(boutId, victorId);
      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to set victor for bout ${boutId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to set victor for bout ${boutId}`
      };
    }
  }, []);

  /**
   * Get a bout with its scores
   */
  const getBoutWithScores = useCallback(async (boutId: number): Promise<BoutWithScoresResult> => {
    try {
      const result = await refereeRepository.getBoutWithScores(boutId);
      if (!result) {
        return { 
          success: false, 
          error: `Bout with ID ${boutId} not found`, 
          bout: null, 
          scores: null 
        };
      }
      return { 
        success: true, 
        error: null, 
        bout: result.bout, 
        scores: result.scores 
      };
    } catch (error) {
      console.error(`Failed to get bout with scores for bout ${boutId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get bout with scores for bout ${boutId}`, 
        bout: null, 
        scores: null 
      };
    }
  }, []);

  /**
   * Create a new referee
   */
  const createReferee = useCallback(async (data: RefereeInsert): Promise<RefereeResult> => {
    try {
      const referee = await refereeRepository.create(data);
      return { success: true, error: null, referee };
    } catch (error) {
      console.error('Failed to create referee:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create referee', 
        referee: null 
      };
    }
  }, []);

  /**
   * Update a referee
   */
  const updateReferee = useCallback(
    async (id: number, data: Partial<Referee>): Promise<RefereeResult> => {
      try {
        const referee = await refereeRepository.update(id, data);
        if (!referee) {
          return { success: false, error: `Referee with ID ${id} not found`, referee: null };
        }
        return { success: true, error: null, referee };
      } catch (error) {
        console.error(`Failed to update referee with ID ${id}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : `Failed to update referee with ID ${id}`, 
          referee: null 
        };
      }
    }, []);

  /**
   * Delete a referee
   */
  const deleteReferee = useCallback(async (id: number): Promise<{ success: boolean; error: string | null }> => {
    try {
      const result = await refereeRepository.delete(id);
      if (!result) {
        return { success: false, error: `Referee with ID ${id} not found` };
      }
      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to delete referee with ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to delete referee with ID ${id}` 
      };
    }
  }, []);

  return {
    getAll,
    getById,
    getByName,
    getByDeviceId,
    getActiveBouts,
    updateBoutScores,
    setBoutVictor,
    getBoutWithScores,
    createReferee,
    updateReferee,
    deleteReferee,
  };
};

export default useRefereeRepository;