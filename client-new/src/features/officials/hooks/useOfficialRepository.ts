/**
 * Official repository hooks
 * React hooks for accessing official repository functionality
 */
import { useCallback } from 'react';
import { Official } from '../../../core/types';
import officialRepository, { OfficialInsert } from '../repository';

/**
 * Type for successful official response
 */
type OfficialResponse<T = Official> = {
  success: true;
  error: null;
  official: T;
};

/**
 * Type for failed official response
 */
type OfficialErrorResponse = {
  success: false;
  error: string;
  official: null;
};

/**
 * Union type for all possible official responses
 */
type OfficialResult<T = Official> = OfficialResponse<T> | OfficialErrorResponse;

/**
 * Type for successful officials response
 */
type OfficialsResponse = {
  success: true;
  error: null;
  officials: Official[];
};

/**
 * Type for failed officials response
 */
type OfficialsErrorResponse = {
  success: false;
  error: string;
  officials: null;
};

/**
 * Union type for all possible officials responses
 */
type OfficialsResult = OfficialsResponse | OfficialsErrorResponse;

/**
 * Hook for accessing official repository functionality
 */
export const useOfficialRepository = () => {
  /**
   * Get all officials
   */
  const getAll = useCallback(async (): Promise<OfficialsResult> => {
    try {
      const officials = await officialRepository.findAll();
      return { success: true, error: null, officials };
    } catch (error) {
      console.error('Failed to get all officials:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get all officials', 
        officials: null 
      };
    }
  }, []);

  /**
   * Get an official by ID
   */
  const getById = useCallback(async (id: number): Promise<OfficialResult> => {
    try {
      const official = await officialRepository.findById(id);
      if (!official) {
        return { success: false, error: `Official with ID ${id} not found`, official: null };
      }
      return { success: true, error: null, official };
    } catch (error) {
      console.error(`Failed to get official with ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get official with ID ${id}`, 
        official: null 
      };
    }
  }, []);

  /**
   * Find an official by name
   */
  const findByName = useCallback(async (firstName: string, lastName: string): Promise<OfficialResult> => {
    try {
      const official = await officialRepository.findByName(firstName, lastName);
      if (!official) {
        return { 
          success: false, 
          error: `Official with name ${firstName} ${lastName} not found`, 
          official: null 
        };
      }
      return { success: true, error: null, official };
    } catch (error) {
      console.error(`Failed to find official with name ${firstName} ${lastName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to find official with name ${firstName} ${lastName}`, 
        official: null 
      };
    }
  }, []);

  /**
   * Search officials by name
   */
  const searchByName = useCallback(async (query: string): Promise<OfficialsResult> => {
    try {
      const officials = await officialRepository.searchByName(query);
      return { success: true, error: null, officials };
    } catch (error) {
      console.error(`Failed to search officials with query "${query}":`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to search officials with query "${query}"`, 
        officials: null 
      };
    }
  }, []);

  /**
   * Create a new official
   */
  const createOfficial = useCallback(async (data: OfficialInsert): Promise<OfficialResult> => {
    try {
      const official = await officialRepository.create(data);
      return { success: true, error: null, official };
    } catch (error) {
      console.error('Failed to create official:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create official', 
        official: null 
      };
    }
  }, []);

  /**
   * Update an official
   */
  const updateOfficial = useCallback(
    async (id: number, data: Partial<Official>): Promise<OfficialResult> => {
      try {
        const official = await officialRepository.update(id, data);
        if (!official) {
          return { success: false, error: `Official with ID ${id} not found`, official: null };
        }
        return { success: true, error: null, official };
      } catch (error) {
        console.error(`Failed to update official with ID ${id}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : `Failed to update official with ID ${id}`, 
          official: null 
        };
      }
    }, []);

  /**
   * Delete an official
   */
  const deleteOfficial = useCallback(async (id: number): Promise<{ success: boolean; error: string | null }> => {
    try {
      const result = await officialRepository.delete(id);
      if (!result) {
        return { success: false, error: `Official with ID ${id} not found` };
      }
      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to delete official with ID ${id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to delete official with ID ${id}` 
      };
    }
  }, []);

  /**
   * Assign an official to an event
   */
  const assignToEvent = useCallback(async (
    officialId: number, 
    eventId: number
  ): Promise<{ success: boolean; error: string | null }> => {
    try {
      await officialRepository.assignToEvent(officialId, eventId);
      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to assign official ${officialId} to event ${eventId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to assign official ${officialId} to event ${eventId}` 
      };
    }
  }, []);

  /**
   * Remove an official from an event
   */
  const removeFromEvent = useCallback(async (
    officialId: number, 
    eventId: number
  ): Promise<{ success: boolean; error: string | null }> => {
    try {
      await officialRepository.removeFromEvent(officialId, eventId);
      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to remove official ${officialId} from event ${eventId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to remove official ${officialId} from event ${eventId}` 
      };
    }
  }, []);

  /**
   * Get officials by event
   */
  const getOfficialsByEvent = useCallback(async (eventId: number): Promise<OfficialsResult> => {
    try {
      const officials = await officialRepository.getOfficialsByEvent(eventId);
      return { success: true, error: null, officials };
    } catch (error) {
      console.error(`Failed to get officials for event ${eventId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get officials for event ${eventId}`, 
        officials: null 
      };
    }
  }, []);

  /**
   * Get events by official
   */
  const getEventsByOfficial = useCallback(async (
    officialId: number
  ): Promise<{ success: boolean; error: string | null; eventIds: number[] | null }> => {
    try {
      const eventIds = await officialRepository.getEventsByOfficial(officialId);
      return { success: true, error: null, eventIds };
    } catch (error) {
      console.error(`Failed to get events for official ${officialId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : `Failed to get events for official ${officialId}`, 
        eventIds: null 
      };
    }
  }, []);

  return {
    getAll,
    getById,
    findByName,
    searchByName,
    createOfficial,
    updateOfficial,
    deleteOfficial,
    assignToEvent,
    removeFromEvent,
    getOfficialsByEvent,
    getEventsByOfficial,
  };
};

export default useOfficialRepository;