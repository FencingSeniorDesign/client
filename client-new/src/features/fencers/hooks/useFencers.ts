/**
 * Fencer Hooks
 * React hooks for accessing and manipulating fencer data
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Fencer } from '../../../core/types';
import * as fencerService from '../services/fencerService';
import { FencerInsert } from '../services/fencerService';
import { createQueryKeys } from '../../../infrastructure/query/utils';

// Query key factory for fencers
export const fencerKeys = createQueryKeys('fencers');

/**
 * Hook for getting all fencers
 */
export function useGetAllFencers(
  options?: UseQueryOptions<Fencer[], Error, Fencer[], unknown[]>
) {
  return useQuery({
    queryKey: fencerKeys.lists(),
    queryFn: () => fencerService.getAllFencers(),
    ...options,
  });
}

/**
 * Hook for getting a fencer by ID
 */
export function useGetFencerById(
  id: number | undefined,
  options?: UseQueryOptions<Fencer | undefined, Error, Fencer | undefined, unknown[]>
) {
  return useQuery({
    queryKey: fencerKeys.detail(id),
    queryFn: () => id ? fencerService.getFencerById(id) : undefined,
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook for searching fencers by name
 */
export function useSearchFencersByName(query: string) {
  return useQuery({
    queryKey: [...fencerKeys.lists(), 'search', query],
    queryFn: () => fencerService.searchFencersByName(query),
    enabled: !!query && query.length >= 3, // Only search when query is at least 3 characters
  });
}

/**
 * Hook for getting fencers by club
 */
export function useGetFencersByClub(club: string) {
  return useQuery({
    queryKey: [...fencerKeys.lists(), 'club', club],
    queryFn: () => fencerService.getFencersByClub(club),
    enabled: !!club,
  });
}

/**
 * Hook for getting fencers by event
 */
export function useGetFencersByEvent(eventId: number | undefined) {
  return useQuery({
    queryKey: [...fencerKeys.lists(), 'event', eventId],
    queryFn: () => eventId ? fencerService.getFencersByEvent(eventId) : [],
    enabled: !!eventId,
  });
}

/**
 * Hook for creating a new fencer
 */
export function useCreateFencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: FencerInsert) => fencerService.createFencer(data),
    onSuccess: () => {
      // Invalidate all fencer lists when a new fencer is created
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for updating a fencer
 */
export function useUpdateFencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Fencer> }) => 
      fencerService.updateFencer(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific fencer and all lists
      queryClient.invalidateQueries({ queryKey: fencerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a fencer
 */
export function useDeleteFencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => fencerService.deleteFencer(id),
    onSuccess: (_, id) => {
      // Invalidate the specific fencer and all lists
      queryClient.invalidateQueries({ queryKey: fencerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
    },
  });
}

/**
 * Hook for adding a fencer to an event
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
    },
  });
}

/**
 * Hook for removing a fencer from an event
 */
export function useRemoveFencerFromEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fencerId, eventId }: { fencerId: number, eventId: number }) => 
      fencerService.removeFencerFromEvent(fencerId, eventId),
    onSuccess: (_, variables) => {
      // Invalidate the event's fencer list
      queryClient.invalidateQueries({ 
        queryKey: [...fencerKeys.lists(), 'event', variables.eventId] 
      });
    },
  });
}

/**
 * Hook for creating a fencer and adding them to an event
 */
export function useCreateFencerAndAddToEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      fencerData, 
      eventId 
    }: { 
      fencerData: FencerInsert, 
      eventId?: number 
    }) => 
      fencerService.createFencerAndAddToEvent(fencerData, eventId),
    onSuccess: (_, variables) => {
      // Invalidate all fencer lists
      queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
      
      // If an event ID was provided, invalidate that event's fencer list
      if (variables.eventId) {
        queryClient.invalidateQueries({ 
          queryKey: [...fencerKeys.lists(), 'event', variables.eventId] 
        });
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
    useGetAllFencers,
    useGetFencerById,
    useSearchFencersByName,
    useGetFencersByClub,
    useGetFencersByEvent,
    useCreateFencer,
    useUpdateFencer,
    useDeleteFencer,
    useAddFencerToEvent,
    useRemoveFencerFromEvent,
    useCreateFencerAndAddToEvent,
    
    // Export query keys for external use (like invalidation)
    fencerKeys,
  };
}

export default useFencers;