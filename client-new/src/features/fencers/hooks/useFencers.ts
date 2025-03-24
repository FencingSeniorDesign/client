/**
 * Fencer Hooks
 * Optimized React hooks for accessing and manipulating fencer data
 * Provides standard and live queries with optimistic updates
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Fencer, Event } from '../../../core/types';
import * as fencerService from '../services/fencerService';
import { 
  FencerInsert, 
  FencerWithEvents, 
  BatchFencerUpdate 
} from '../services/fencerService';
import { createQueryKeys, useInvalidateQueries } from '../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import { fencers, fencerEvents } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, like, and, or, inArray } from 'drizzle-orm';
import { createOptimisticUpdate } from '../../../infrastructure/query/advanced';

// Query key factory for fencers
export const fencerKeys = createQueryKeys('fencers');

/**
 * Hook for getting all fencers with optional caching configuration
 */
export function useGetAllFencers(
  options?: UseQueryOptions<Fencer[], Error, Fencer[], unknown[]>
) {
  return useQuery({
    queryKey: fencerKeys.lists(),
    queryFn: () => fencerService.getAllFencers(),
    staleTime: 1000 * 60 * 5, // 5 minute stale time for better performance
    ...options,
  });
}

/**
 * Live query hook for real-time fencer updates
 */
export function useLiveAllFencers() {
  const result = useLiveQuery(db.select().from(fencers));
  
  return {
    data: result.data as Fencer[] | undefined,
    error: result.error
  };
}

/**
 * Hook for getting a fencer by ID with optional events data
 */
export function useGetFencerById(
  id: number | undefined,
  includeEvents: boolean = false,
  options?: UseQueryOptions<Fencer | FencerWithEvents | null, Error, Fencer | FencerWithEvents | null, unknown[]>
) {
  return useQuery({
    queryKey: includeEvents 
      ? [...fencerKeys.detail(id), 'withEvents'] 
      : fencerKeys.detail(id),
    queryFn: () => id ? fencerService.getFencerById(id, includeEvents) : null,
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minute stale time
    ...options,
  });
}

/**
 * Live query hook for a specific fencer with real-time updates
 */
export function useLiveFencerById(id: number | undefined) {
  const result = useLiveQuery(
    id ? db.select().from(fencers).where(eq(fencers.id, id)) : null,
    { enabled: !!id }
  );
  
  return {
    data: result.data?.[0] as Fencer | undefined,
    error: result.error
  };
}

/**
 * Hook for searching fencers by name with optimized performance
 */
export function useSearchFencersByName(
  query: string,
  options?: UseQueryOptions<Fencer[], Error, Fencer[], unknown[]>
) {
  return useQuery({
    queryKey: [...fencerKeys.lists(), 'search', query],
    queryFn: () => fencerService.searchFencersByName(query),
    enabled: !!query && query.length >= 3, // Only search when query is at least 3 characters
    staleTime: 1000 * 60 * 1, // 1 minute stale time for search results
    keepPreviousData: true, // Keep previous results while loading new ones
    ...options,
  });
}

/**
 * Hook for getting fencers by club with caching
 */
export function useGetFencersByClub(
  club: string,
  options?: UseQueryOptions<Fencer[], Error, Fencer[], unknown[]>
) {
  return useQuery({
    queryKey: [...fencerKeys.lists(), 'club', club],
    queryFn: () => fencerService.getFencersByClub(club),
    enabled: !!club,
    staleTime: 1000 * 60 * 5, // 5 minute stale time
    ...options,
  });
}

/**
 * Live query hook for fencers by club with real-time updates
 */
export function useLiveFencersByClub(club: string) {
  const result = useLiveQuery(
    club ? db.select().from(fencers).where(eq(fencers.club, club)) : null,
    { enabled: !!club }
  );
  
  return {
    data: result.data as Fencer[] | undefined,
    error: result.error
  };
}

/**
 * Hook for getting fencers by event with caching
 */
export function useGetFencersByEvent(
  eventId: number | undefined,
  options?: UseQueryOptions<Fencer[], Error, Fencer[], unknown[]>
) {
  return useQuery({
    queryKey: [...fencerKeys.lists(), 'event', eventId],
    queryFn: () => eventId ? fencerService.getFencersByEvent(eventId) : [],
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minute stale time
    ...options,
  });
}

/**
 * Live query hook for fencers by event with real-time updates
 */
export function useLiveFencersByEvent(eventId: number | undefined) {
  const result = useLiveQuery(
    eventId 
      ? db.select({
          id: fencers.id,
          fname: fencers.fname,
          lname: fencers.lname,
          nickname: fencers.nickname,
          gender: fencers.gender,
          club: fencers.club,
          erating: fencers.erating,
          eyear: fencers.eyear,
          frating: fencers.frating,
          fyear: fencers.fyear,
          srating: fencers.srating,
          syear: fencers.syear,
        })
        .from(fencerEvents)
        .leftJoin(fencers, eq(fencerEvents.fencerId, fencers.id))
        .where(eq(fencerEvents.eventId, eventId))
      : null,
    { enabled: !!eventId }
  );
  
  return {
    data: result.data as Fencer[] | undefined,
    error: result.error
  };
}

/**
 * Hook for getting fencer count
 */
export function useGetFencerCount(
  options?: UseQueryOptions<number, Error, number, unknown[]>
) {
  return useQuery({
    queryKey: [...fencerKeys.lists(), 'count'],
    queryFn: () => fencerService.getFencerCount(),
    staleTime: 1000 * 60 * 5, // 5 minute stale time
    ...options,
  });
}

/**
 * Hook for creating a new fencer with optimistic updates
 */
export function useCreateFencer() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: (data: FencerInsert) => fencerService.createFencer(data),
    // Use optimistic updates for better UX
    onMutate: async (newFencerData) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: fencerKeys.lists() });
      
      // Get the current fencer list
      const previousFencers = queryClient.getQueryData<Fencer[]>(fencerKeys.lists()) || [];
      
      // Create an optimistic fencer (with a temporary negative ID)
      const optimisticFencer: Fencer = {
        id: (Math.random() * -1000000) | 0, // Temporary negative ID
        fname: newFencerData.fname,
        lname: newFencerData.lname,
        nickname: newFencerData.nickname || '',
        gender: newFencerData.gender || '',
        club: newFencerData.club || '',
        erating: newFencerData.erating || 'U',
        eyear: newFencerData.eyear || 0,
        frating: newFencerData.frating || 'U',
        fyear: newFencerData.fyear || 0,
        srating: newFencerData.srating || 'U',
        syear: newFencerData.syear || 0,
      };
      
      // Add the optimistic fencer to the list
      queryClient.setQueryData(fencerKeys.lists(), [...previousFencers, optimisticFencer]);
      
      // Return the previous state for rollback in case of error
      return { previousFencers };
    },
    onError: (_, __, context) => {
      // If there was an error, roll back to the previous state
      if (context?.previousFencers) {
        queryClient.setQueryData(fencerKeys.lists(), context.previousFencers);
      }
    },
    onSuccess: (newFencer) => {
      // Properly invalidate all related queries
      invalidateEntity('fencers', newFencer.id);
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for creating multiple fencers in batch
 */
export function useCreateFencers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: FencerInsert[]) => fencerService.createFencers(data),
    onSuccess: () => {
      // Invalidate all fencer lists
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for updating a fencer with optimistic updates
 */
export function useUpdateFencer() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Fencer> }) => 
      fencerService.updateFencer(id, data),
    // Use optimistic updates for better UX
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: fencerKeys.detail(id) });
      
      // Get the current fencer
      const previousFencer = queryClient.getQueryData<Fencer>(fencerKeys.detail(id));
      
      if (previousFencer) {
        // Apply the update optimistically
        queryClient.setQueryData(fencerKeys.detail(id), {
          ...previousFencer,
          ...data,
        });
        
        // Also update in the list if present
        const previousFencers = queryClient.getQueryData<Fencer[]>(fencerKeys.lists());
        if (previousFencers) {
          queryClient.setQueryData(
            fencerKeys.lists(),
            previousFencers.map(f => f.id === id ? { ...f, ...data } : f)
          );
        }
      }
      
      return { previousFencer };
    },
    onError: (_, variables, context) => {
      // Roll back on error
      if (context?.previousFencer) {
        queryClient.setQueryData(fencerKeys.detail(variables.id), context.previousFencer);
      }
    },
    onSuccess: (updatedFencer) => {
      // Properly invalidate related queries
      if (updatedFencer) {
        invalidateEntity('fencers', updatedFencer.id);
      }
    },
    onSettled: (_, __, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: fencerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for batch updating multiple fencers
 */
export function useBatchUpdateFencers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: BatchFencerUpdate[]) => fencerService.batchUpdateFencers(updates),
    onSuccess: (updatedFencers) => {
      // Invalidate each updated fencer
      updatedFencers.forEach(fencer => {
        queryClient.invalidateQueries({ queryKey: fencerKeys.detail(fencer.id) });
      });
      
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a fencer with optimistic updates
 */
export function useDeleteFencer() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: (id: number) => fencerService.deleteFencer(id),
    // Use optimistic updates for better UX
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: fencerKeys.lists() });
      
      // Get the current fencer lists
      const previousFencers = queryClient.getQueryData<Fencer[]>(fencerKeys.lists());
      
      if (previousFencers) {
        // Remove the fencer optimistically
        queryClient.setQueryData(
          fencerKeys.lists(),
          previousFencers.filter(f => f.id !== id)
        );
      }
      
      return { previousFencers };
    },
    onError: (_, __, context) => {
      // Roll back on error
      if (context?.previousFencers) {
        queryClient.setQueryData(fencerKeys.lists(), context.previousFencers);
      }
    },
    onSuccess: (_, id) => {
      // Update related lists
      invalidateEntity('fencers', id);
      
      // Remove the fencer detail from cache
      queryClient.removeQueries({ queryKey: fencerKeys.detail(id) });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for batch deleting multiple fencers
 */
export function useBatchDeleteFencers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (ids: number[]) => fencerService.batchDeleteFencers(ids),
    onSuccess: (_, ids) => {
      // Remove each deleted fencer from cache
      ids.forEach(id => {
        queryClient.removeQueries({ queryKey: fencerKeys.detail(id) });
      });
      
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for adding a fencer to an event with optimistic updates
 */
export function useAddFencerToEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fencerId, eventId }: { fencerId: number, eventId: number }) => 
      fencerService.addFencerToEvent(fencerId, eventId),
    onSuccess: (_, variables) => {
      // Invalidate the event's fencer list
      queryClient.invalidateQueries({ 
        queryKey: [...fencerKeys.lists(), 'event', variables.eventId] 
      });
      
      // Also invalidate the fencer if it's loaded with events
      queryClient.invalidateQueries({ 
        queryKey: [...fencerKeys.detail(variables.fencerId), 'withEvents'] 
      });
    },
  });
}

/**
 * Hook for removing a fencer from an event with optimistic updates
 */
export function useRemoveFencerFromEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fencerId, eventId }: { fencerId: number, eventId: number }) => 
      fencerService.removeFencerFromEvent(fencerId, eventId),
    // Use optimistic updates for better UX
    onMutate: async ({ fencerId, eventId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: [...fencerKeys.lists(), 'event', eventId] 
      });
      
      // Get the current fencers for this event
      const previousFencers = queryClient.getQueryData<Fencer[]>(
        [...fencerKeys.lists(), 'event', eventId]
      );
      
      if (previousFencers) {
        // Remove the fencer optimistically
        queryClient.setQueryData(
          [...fencerKeys.lists(), 'event', eventId],
          previousFencers.filter(f => f.id !== fencerId)
        );
      }
      
      return { previousFencers };
    },
    onError: (_, variables, context) => {
      // Roll back on error
      if (context?.previousFencers) {
        queryClient.setQueryData(
          [...fencerKeys.lists(), 'event', variables.eventId],
          context.previousFencers
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate the event's fencer list
      queryClient.invalidateQueries({ 
        queryKey: [...fencerKeys.lists(), 'event', variables.eventId] 
      });
      
      // Also invalidate the fencer if it's loaded with events
      queryClient.invalidateQueries({ 
        queryKey: [...fencerKeys.detail(variables.fencerId), 'withEvents'] 
      });
    },
  });
}

/**
 * Hook for creating a fencer and adding them to an event
 */
export function useCreateFencerAndAddToEvent() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: ({ 
      fencerData, 
      eventId 
    }: { 
      fencerData: FencerInsert, 
      eventId?: number 
    }) => 
      fencerService.createFencerAndAddToEvent(fencerData, eventId),
    onSuccess: (newFencer, variables) => {
      // Invalidate all fencer lists
      invalidateEntity('fencers', newFencer.id);
      
      // If an event ID was provided, invalidate that event's fencer list
      if (variables.eventId) {
        queryClient.invalidateQueries({ 
          queryKey: [...fencerKeys.lists(), 'event', variables.eventId] 
        });
        
        // Also invalidate the events entity
        invalidateEntity('events', variables.eventId);
      }
    },
  });
}

/**
 * Main hook for fencers functionality
 * Aggregates all the individual hooks for convenience
 */
export function useFencers() {
  return {
    // Standard query hooks
    useGetAllFencers,
    useGetFencerById,
    useSearchFencersByName,
    useGetFencersByClub,
    useGetFencersByEvent,
    useGetFencerCount,
    
    // Live query hooks
    useLiveAllFencers,
    useLiveFencerById,
    useLiveFencersByClub,
    useLiveFencersByEvent,
    
    // Mutation hooks
    useCreateFencer,
    useCreateFencers,
    useUpdateFencer,
    useBatchUpdateFencers,
    useDeleteFencer,
    useBatchDeleteFencers,
    useAddFencerToEvent,
    useRemoveFencerFromEvent,
    useCreateFencerAndAddToEvent,
    
    // Export query keys for external use (like invalidation)
    fencerKeys,
  };
}

export default useFencers;