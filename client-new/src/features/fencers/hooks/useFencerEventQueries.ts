/**
 * Hook for managing fencer-event relationships using React Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Fencer, Event } from '../../../core/types';
import { useFencerRepository } from './useFencerRepository';
import { createQueryKeys } from '../../../infrastructure/query/utils';

// Create query keys for fencer-event relationships
export const fencerEventKeys = createQueryKeys('fencerEvents');

/**
 * Custom hook for fencer-event relationship queries
 */
export const useFencerEventQueries = () => {
  const queryClient = useQueryClient();
  const fencerRepo = useFencerRepository();

  /**
   * Query for getting fencers by event
   */
  const useGetFencersByEvent = (eventId: number | undefined) => {
    return useQuery({
      queryKey: fencerEventKeys.filter({ eventId }),
      queryFn: async () => {
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        const result = await fencerRepo.getFencersByEvent(eventId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.fencers;
      },
      enabled: !!eventId,
    });
  };

  /**
   * Mutation for adding a fencer to an event
   */
  const useAddFencerToEvent = () => {
    return useMutation({
      mutationFn: async ({ fencer, event }: { fencer: Fencer; event: Event }) => {
        const result = await fencerRepo.addFencerToEvent(fencer, event);
        if (!result.success) {
          throw new Error(result.error || 'Failed to add fencer to event');
        }
        return { fencer, event };
      },
      onSuccess: (data) => {
        // Invalidate queries for this specific event's fencers
        queryClient.invalidateQueries({ 
          queryKey: fencerEventKeys.filter({ eventId: data.event.id }) 
        });
      },
    });
  };

  /**
   * Mutation for removing a fencer from an event
   */
  const useRemoveFencerFromEvent = () => {
    return useMutation({
      mutationFn: async ({ fencer, event }: { fencer: Fencer; event: Event }) => {
        const result = await fencerRepo.removeFencerFromEvent(fencer, event);
        if (!result.success) {
          throw new Error(result.error || 'Failed to remove fencer from event');
        }
        return { fencer, event };
      },
      onSuccess: (data) => {
        // Invalidate queries for this specific event's fencers
        queryClient.invalidateQueries({ 
          queryKey: fencerEventKeys.filter({ eventId: data.event.id }) 
        });
      },
    });
  };

  /**
   * Mutation for creating a new fencer and adding it to an event
   */
  const useCreateFencerAndAddToEvent = () => {
    return useMutation({
      mutationFn: async ({ 
        fencer, 
        event 
      }: { 
        fencer: Omit<Fencer, 'id'>; 
        event: Event;
      }) => {
        const result = await fencerRepo.createFencer(fencer, event);
        if (!result.success) {
          throw new Error(result.error);
        }
        return { fencer: result.fencer, event };
      },
      onSuccess: (data) => {
        // Invalidate both fencer lists and the specific event's fencers
        queryClient.invalidateQueries({ queryKey: ['fencers'] });
        queryClient.invalidateQueries({ 
          queryKey: fencerEventKeys.filter({ eventId: data.event.id }) 
        });
      },
    });
  };

  return {
    useGetFencersByEvent,
    useAddFencerToEvent,
    useRemoveFencerFromEvent,
    useCreateFencerAndAddToEvent,
  };
};

export default useFencerEventQueries;