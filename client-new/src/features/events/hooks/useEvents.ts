/**
 * Event Hooks
 * React hooks for accessing and manipulating event data with optimized Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as eventService from '../services/eventService';
import { createQueryKeys } from '../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import { events } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq } from 'drizzle-orm';
import { Event } from '../../../core/types';
import { EventInsert, EventWithParticipants, BatchEventUpdate } from '../services/eventService';

// Query key factory for events
export const eventKeys = createQueryKeys('events');

/**
 * Hook for getting all events with optimized configuration
 */
export function useGetAllEvents() {
  return useQuery({
    queryKey: eventKeys.lists(),
    queryFn: eventService.getAllEvents,
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
    // Events don't change frequently
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Live query version of getting all events
 * Automatically updates when underlying data changes
 */
export function useLiveEvents() {
  return useLiveQuery(
    db.select().from(events),
    [],
    { staleTime: 1000 } // 1 second stale time for live updates
  );
}

/**
 * Hook for getting event by ID with optimized configuration
 */
export function useGetEventById(id: number | undefined, includeRelations = false) {
  return useQuery({
    queryKey: [...eventKeys.detail(id || 0), { relations: includeRelations }],
    queryFn: async () => {
      if (!id) {
        throw new Error('Event ID is required');
      }
      return eventService.getEventById(id, includeRelations);
    },
    enabled: !!id,
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
  });
}

/**
 * Live query version of getting event by ID
 */
export function useLiveEventById(id: number | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return null;
      return db.select().from(events).where(eq(events.id, id));
    },
    [id],
    { enabled: !!id }
  );
}

/**
 * Hook for getting events by tournament with optimized configuration
 */
export function useGetEventsByTournament(tournamentName: string | undefined) {
  return useQuery({
    queryKey: [...eventKeys.lists(), 'tournament', tournamentName],
    queryFn: async () => {
      if (!tournamentName) {
        throw new Error('Tournament name is required');
      }
      return eventService.getEventsByTournament(tournamentName);
    },
    enabled: !!tournamentName,
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
  });
}

/**
 * Live query version of getting events by tournament
 */
export function useLiveEventsByTournament(tournamentName: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!tournamentName) return [];
      return db.select().from(events).where(eq(events.tname, tournamentName));
    },
    [tournamentName],
    { enabled: !!tournamentName }
  );
}

/**
 * Hook for creating an event with optimized invalidation
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: EventInsert) => eventService.createEvent(data),
    onSuccess: (data) => {
      // Invalidate specific queries based on the created event
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      
      // Also invalidate tournament-specific event lists
      if (data?.tname) {
        queryClient.invalidateQueries({ 
          queryKey: [...eventKeys.lists(), 'tournament', data.tname] 
        });
        
        // Also invalidate the tournament detail
        queryClient.invalidateQueries({ 
          queryKey: ['tournaments', 'detail', data.tname] 
        });
      }
    },
  });
}

/**
 * Hook for creating multiple events in batch
 */
export function useCreateEvents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { events: EventInsert[], tournamentName: string }) => 
      eventService.createEvents(params.events),
    onSuccess: (_, variables) => {
      // Invalidate specific queries based on the batch operation
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      
      // Also invalidate tournament-specific event lists
      queryClient.invalidateQueries({ 
        queryKey: [...eventKeys.lists(), 'tournament', variables.tournamentName] 
      });
      
      // Also invalidate the tournament detail
      queryClient.invalidateQueries({ 
        queryKey: ['tournaments', 'detail', variables.tournamentName] 
      });
    },
  });
}

/**
 * Hook for updating an event with optimistic updates
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Event> }) => 
      eventService.updateEvent(id, data),
    
    // Implement optimistic updates for better UX
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(variables.id) });
      
      // Get current data
      const previousEvent = queryClient.getQueryData<Event | EventWithParticipants>(
        eventKeys.detail(variables.id)
      );
      
      // Optimistically update the UI
      if (previousEvent) {
        queryClient.setQueryData(
          eventKeys.detail(variables.id),
          {
            ...previousEvent,
            ...variables.data
          }
        );
      }
      
      // Return context with the previous data
      return { previousEvent };
    },
    
    // If the mutation fails, roll back to the previous state
    onError: (error, variables, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(
          eventKeys.detail(variables.id),
          context.previousEvent
        );
      }
    },
    
    // After success or error, refetch to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate the specific event
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
      
      // Also invalidate lists that might include this event
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      
      // If the tournament name is in the data or the updated event, invalidate those lists too
      if (data?.tname || (variables.data && 'tname' in variables.data)) {
        const tournamentName = data?.tname || 
          (variables.data && 'tname' in variables.data ? variables.data.tname as string : undefined);
        
        if (tournamentName) {
          queryClient.invalidateQueries({ 
            queryKey: [...eventKeys.lists(), 'tournament', tournamentName] 
          });
        }
      }
    },
  });
}

/**
 * Hook for batch updating events
 */
export function useBatchUpdateEvents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: { updates: BatchEventUpdate[], tournamentName?: string }) => 
      eventService.batchUpdateEvents(updates.updates),
    onSuccess: (data, variables) => {
      // Invalidate specific events
      data.forEach(event => {
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) });
      });
      
      // Invalidate all event lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      
      // If a tournament name was provided, invalidate those lists too
      if (variables.tournamentName) {
        queryClient.invalidateQueries({ 
          queryKey: [...eventKeys.lists(), 'tournament', variables.tournamentName] 
        });
      }
    },
  });
}

/**
 * Hook for deleting an event with optimistic updates
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { id: number, tournamentName?: string }) => {
      const success = await eventService.deleteEvent(params.id);
      return { success, id: params.id, tournamentName: params.tournamentName };
    },
    
    // Implement optimistic updates
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: eventKeys.detail(variables.id) });
      await queryClient.cancelQueries({ queryKey: eventKeys.lists() });
      
      // Get current data
      const previousEvent = queryClient.getQueryData<Event>(
        eventKeys.detail(variables.id)
      );
      
      let previousEventsList = null;
      if (variables.tournamentName) {
        previousEventsList = queryClient.getQueryData<Event[]>(
          [...eventKeys.lists(), 'tournament', variables.tournamentName]
        );
        
        // Optimistically update the tournament events list
        if (previousEventsList) {
          queryClient.setQueryData(
            [...eventKeys.lists(), 'tournament', variables.tournamentName],
            previousEventsList.filter(event => event.id !== variables.id)
          );
        }
      }
      
      // Return context with the previous data
      return { previousEvent, previousEventsList, tournamentName: variables.tournamentName };
    },
    
    // If the mutation fails, roll back
    onError: (error, variables, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(
          eventKeys.detail(variables.id),
          context.previousEvent
        );
      }
      
      if (context?.previousEventsList && context.tournamentName) {
        queryClient.setQueryData(
          [...eventKeys.lists(), 'tournament', context.tournamentName],
          context.previousEventsList
        );
      }
    },
    
    // After success or error, refetch to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate the specific event
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
      
      // Invalidate all event lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      
      // If a tournament name was provided, invalidate those lists too
      if (variables.tournamentName) {
        queryClient.invalidateQueries({ 
          queryKey: [...eventKeys.lists(), 'tournament', variables.tournamentName] 
        });
        
        // Also invalidate the tournament detail
        queryClient.invalidateQueries({ 
          queryKey: ['tournaments', 'detail', variables.tournamentName] 
        });
      }
    },
  });
}

/**
 * Hook for batch deleting events
 */
export function useBatchDeleteEvents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { ids: number[], tournamentName?: string }) => 
      eventService.batchDeleteEvents(params.ids),
    onSuccess: (_, variables) => {
      // Invalidate specific events
      variables.ids.forEach(id => {
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      });
      
      // Invalidate all event lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      
      // If a tournament name was provided, invalidate those lists too
      if (variables.tournamentName) {
        queryClient.invalidateQueries({ 
          queryKey: [...eventKeys.lists(), 'tournament', variables.tournamentName] 
        });
        
        // Also invalidate the tournament detail
        queryClient.invalidateQueries({ 
          queryKey: ['tournaments', 'detail', variables.tournamentName] 
        });
      }
    },
  });
}

/**
 * Hook for getting event count
 */
export function useGetEventCount() {
  return useQuery({
    queryKey: [...eventKeys.lists(), 'count'],
    queryFn: eventService.getEventCount,
  });
}

/**
 * Hook for getting event count by tournament
 */
export function useGetEventCountByTournament(tournamentName: string | undefined) {
  return useQuery({
    queryKey: [...eventKeys.lists(), 'count', 'tournament', tournamentName],
    queryFn: async () => {
      if (!tournamentName) {
        throw new Error('Tournament name is required');
      }
      return eventService.getEventCountByTournament(tournamentName);
    },
    enabled: !!tournamentName,
  });
}

/**
 * Hook for getting tournament event summary
 */
export function useGetTournamentEventSummary(tournamentName: string | undefined) {
  return useQuery({
    queryKey: [...eventKeys.lists(), 'summary', 'tournament', tournamentName],
    queryFn: async () => {
      if (!tournamentName) {
        throw new Error('Tournament name is required');
      }
      return eventService.getTournamentEventSummary(tournamentName);
    },
    enabled: !!tournamentName,
  });
}

/**
 * Main hook that provides all event-related hooks
 */
export function useEvents() {
  return {
    // Query hooks
    useGetAllEvents,
    useGetEventById,
    useGetEventsByTournament,
    useGetEventCount,
    useGetEventCountByTournament,
    useGetTournamentEventSummary,
    
    // Live query hooks
    useLiveEvents,
    useLiveEventById,
    useLiveEventsByTournament,
    
    // Mutation hooks
    useCreateEvent,
    useCreateEvents,
    useUpdateEvent,
    useBatchUpdateEvents,
    useDeleteEvent,
    useBatchDeleteEvents,
    
    // Query keys for external use
    eventKeys,
  };
}

export default useEvents;