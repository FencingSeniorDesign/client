/**
 * Fencer repository hook
 * Provides methods for managing fencers and their event relationships
 */
import { useCallback } from 'react';
import { Fencer, Event } from '../../../core/types';
import fencerRepository from '../repository';
import { fencerEvents } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, and } from 'drizzle-orm';

// Response type definitions
type FencerResponse<T = Fencer> = {
  success: true;
  error: null;
  fencer: T;
};

type FencerErrorResponse = {
  success: false;
  error: string;
  fencer: null;
};

type FencerResult<T = Fencer> = FencerResponse<T> | FencerErrorResponse;

type FencersResponse = {
  success: true;
  error: null;
  fencers: Fencer[];
};

type FencersErrorResponse = {
  success: false;
  error: string;
  fencers: null;
};

type FencersResult = FencersResponse | FencersErrorResponse;

export const useFencerRepository = () => {
  /**
   * Get all fencers
   */
  const getAll = useCallback(async (): Promise<FencersResult> => {
    try {
      const fencers = await fencerRepository.findAll();
      return { success: true, error: null, fencers };
    } catch (error) {
      console.error('Failed to get all fencers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all fencers',
        fencers: null,
      };
    }
  }, []);

  /**
   * Get a fencer by ID
   */
  const getById = useCallback(async (id: number): Promise<FencerResult> => {
    try {
      const fencer = await fencerRepository.findById(id);
      if (!fencer) {
        return { success: false, error: `Fencer with ID ${id} not found`, fencer: null };
      }
      return { success: true, error: null, fencer };
    } catch (error) {
      console.error(`Failed to get fencer with ID ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to get fencer with ID ${id}`,
        fencer: null,
      };
    }
  }, []);

  /**
   * Search fencers by name
   */
  const searchByName = useCallback(async (query: string): Promise<FencersResult> => {
    try {
      if (!query || query.length < 3) {
        return { success: true, error: null, fencers: [] };
      }
      const fencers = await fencerRepository.searchByName(query);
      return { success: true, error: null, fencers };
    } catch (error) {
      console.error(`Failed to search fencers by name "${query}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to search fencers by name`,
        fencers: null,
      };
    }
  }, []);

  /**
   * Get fencers by event
   */
  const getFencersByEvent = useCallback(async (eventId: number): Promise<FencersResult> => {
    try {
      // Get all fencer IDs for this event from the junction table
      const fencerEventRecords = await db
        .select({ fencerId: fencerEvents.fencerId })
        .from(fencerEvents)
        .where(eq(fencerEvents.eventId, eventId));

      if (fencerEventRecords.length === 0) {
        return { success: true, error: null, fencers: [] };
      }

      // Get all fencers by IDs
      const fencerIds = fencerEventRecords.map(record => record.fencerId);
      const fencers: Fencer[] = [];

      // Fetch each fencer individually
      for (const fencerId of fencerIds) {
        const fencer = await fencerRepository.findById(fencerId);
        if (fencer) {
          fencers.push(fencer);
        }
      }

      return { success: true, error: null, fencers };
    } catch (error) {
      console.error(`Failed to get fencers for event ${eventId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to get fencers for event`,
        fencers: null,
      };
    }
  }, []);

  /**
   * Add a fencer to an event
   */
  const addFencerToEvent = useCallback(async (fencer: Fencer, event: Event): Promise<{ success: boolean; error: string | null }> => {
    try {
      // Check if the relationship already exists
      const existing = await db
        .select()
        .from(fencerEvents)
        .where(
          and(
            eq(fencerEvents.fencerId, fencer.id),
            eq(fencerEvents.eventId, event.id)
          )
        );

      if (existing.length > 0) {
        return { success: true, error: null }; // Already exists, so we're good
      }

      // Add the relationship
      await db.insert(fencerEvents).values({
        fencerId: fencer.id,
        eventId: event.id,
      });

      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to add fencer ${fencer.id} to event ${event.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add fencer to event',
      };
    }
  }, []);

  /**
   * Remove a fencer from an event
   */
  const removeFencerFromEvent = useCallback(async (fencer: Fencer, event: Event): Promise<{ success: boolean; error: string | null }> => {
    try {
      await db
        .delete(fencerEvents)
        .where(
          and(
            eq(fencerEvents.fencerId, fencer.id),
            eq(fencerEvents.eventId, event.id)
          )
        );

      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to remove fencer ${fencer.id} from event ${event.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove fencer from event',
      };
    }
  }, []);

  /**
   * Create a new fencer and optionally add to an event
   */
  const createFencer = useCallback(async (
    fencerData: Omit<Fencer, 'id'>,
    event?: Event
  ): Promise<FencerResult> => {
    try {
      const fencer = await fencerRepository.create(fencerData);

      // If an event is provided, add the fencer to the event
      if (event) {
        await addFencerToEvent(fencer, event);
      }

      return { success: true, error: null, fencer };
    } catch (error) {
      console.error('Failed to create fencer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create fencer',
        fencer: null,
      };
    }
  }, [addFencerToEvent]);

  return {
    getAll,
    getById,
    searchByName,
    getFencersByEvent,
    addFencerToEvent,
    removeFencerFromEvent,
    createFencer,
  };
};

export default useFencerRepository;