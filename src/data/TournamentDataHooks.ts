// src/data/TournamentDataHooks.ts
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, Fencer, Round } from '../navigation/navigation/types';
import dataProvider from './TournamentDataProvider';
import tournamentClient from '../networking/TournamentClient';

// Define query keys for consistent cache management
export const queryKeys = {
  tournaments: ['tournaments'] as const,
  tournament: (name: string) => ['tournament', name] as const,
  events: (tournamentName: string) => ['events', tournamentName] as const,
  event: (eventId: number) => ['event', eventId] as const,
  eventStatus: (eventId: number) => ['eventStatus', eventId] as const,
  eventStatuses: ['eventStatuses'] as const,
  fencers: (eventId: number) => ['fencers', eventId] as const,
  rounds: (eventId: number) => ['rounds', eventId] as const,
  fencerSearch: (query: string) => ['fencerSearch', query] as const,
};

// ===== READ HOOKS =====

/**
 * Hook to get events for a tournament
 */
export function useEvents(tournamentName: string) {
  return useQuery({
    queryKey: queryKeys.events(tournamentName),
    queryFn: () => dataProvider.getEvents(tournamentName),
    enabled: !!tournamentName,
    // Set appropriate caching and refetch strategies
    staleTime: dataProvider.isRemoteConnection() ? 30000 : 60000, // 30 seconds for remote, 1 minute for local
    refetchInterval: dataProvider.isRemoteConnection() ? 30000 : false, // Less frequent polling for remote connections
  });
}

/**
 * Hook to get rounds for an event
 */
export function useRounds(eventId: number) {
  return useQuery({
    queryKey: queryKeys.rounds(eventId),
    queryFn: () => dataProvider.getRounds(eventId),
    enabled: !!eventId,
    staleTime: dataProvider.isRemoteConnection() ? 10000 : 60000,
  });
}

/**
 * Hook to get fencers for an event
 */
export function useFencers(event: Event) {
  return useQuery({
    queryKey: queryKeys.fencers(event?.id),
    queryFn: () => dataProvider.getFencers(event),
    enabled: !!event?.id,
    staleTime: dataProvider.isRemoteConnection() ? 10000 : 60000,
  });
}

/**
 * Hook to get statuses for all events
 */
export function useEventStatuses(events: Event[]) {
  const queryClient = useQueryClient();
  
  // Extract just the event IDs for the query key
  const eventIds = React.useMemo(() => 
    Array.isArray(events) ? events.map(e => e?.id).filter(Boolean) : [], 
    [events]
  );
  
  return useQuery({
    queryKey: queryKeys.eventStatuses,
    queryFn: async () => {
      if (!events || !Array.isArray(events) || events.length === 0) {
        return {};
      }
      
      const statuses: { [key: number]: boolean } = {};
      
      // Process each event to determine its status
      await Promise.all(
        events.map(async (event) => {
          if (event?.id) {
            try {
              statuses[event.id] = await dataProvider.getEventStatus(event);
            } catch (error) {
              console.error(`Error getting status for event ${event.id}:`, error);
              statuses[event.id] = false;
            }
          }
        })
      );
      
      return statuses;
    },
    enabled: Array.isArray(events) && events.length > 0,
    staleTime: dataProvider.isRemoteConnection() ? 5000 : 30000,
    refetchInterval: dataProvider.isRemoteConnection() ? 5000 : false,
  });
}

/**
 * Hook to search for fencers
 */
export function useSearchFencers(query: string) {
  return useQuery({
    queryKey: queryKeys.fencerSearch(query),
    queryFn: () => dataProvider.searchFencers(query),
    enabled: query.trim().length > 0,
    staleTime: 30000,
  });
}

// ===== MUTATION HOOKS =====

/**
 * Hook to add a fencer to an event
 */
export function useAddFencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fencer, event }: { fencer: Fencer, event: Event }) => {
      return dataProvider.addFencer(fencer, event);
    },
    onSuccess: (_, { event }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fencers(event.id) });
    },
  });
}

/**
 * Hook to create a new fencer
 */
export function useCreateFencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fencer, event, addToEvent = true }: 
      { fencer: Fencer, event: Event, addToEvent?: boolean }) => {
      return dataProvider.createFencer(fencer, event, addToEvent);
    },
    onSuccess: (_, { event }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fencers(event.id) });
    },
  });
}

/**
 * Hook to remove a fencer from an event
 */
export function useRemoveFencer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fencer, event }: { fencer: Fencer, event: Event }) => {
      return dataProvider.removeFencer(fencer, event);
    },
    onSuccess: (_, { event }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fencers(event.id) });
    },
  });
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tournamentName, event }: { tournamentName: string, event: Event }) => {
      return dataProvider.createEvent(tournamentName, event);
    },
    onSuccess: (_, { tournamentName }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events(tournamentName) });
    },
  });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventId: number) => {
      return dataProvider.deleteEvent(eventId);
    },
    onSuccess: () => {
      // Since we don't know the tournament name here, invalidate all events queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to add a round to an event
 */
export function useAddRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (round: Partial<Round>) => {
      return dataProvider.addRound(round);
    },
    onSuccess: (_, variables) => {
      if (variables.eventid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.rounds(variables.eventid) });
        queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
      }
    },
  });
}

/**
 * Hook to update a round
 */
export function useUpdateRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (round: Round) => {
      return dataProvider.updateRound(round);
    },
    onSuccess: (_, variables) => {
      if (variables.eventid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.rounds(variables.eventid) });
        queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
      }
    },
  });
}

/**
 * Hook to delete a round
 */
export function useDeleteRound() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, eventId }: { roundId: number, eventId: number }) => {
      return dataProvider.deleteRound(roundId);
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rounds(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventStatuses });
    },
  });
}

// Setup sync between remote server and local cache
export function setupTournamentSync(queryClient: any) {
  // Handle events_list updates
  tournamentClient.on('events_list', (data: any) => {
    if (data.tournamentName && Array.isArray(data.events)) {
      queryClient.setQueryData(
        queryKeys.events(data.tournamentName),
        data.events
      );
      
      // Update rounds cache for each event if rounds are embedded
      data.events.forEach((event: any) => {
        if (event?.id && Array.isArray(event.rounds)) {
          queryClient.setQueryData(
            queryKeys.rounds(event.id),
            event.rounds
          );
        }
      });
      
      // Force a refresh of event statuses
      queryClient.invalidateQueries(queryKeys.eventStatuses);
    }
  });
  
  // Handle fencer updates
  tournamentClient.on('fencer_added', (data: any) => {
    if (data.eventId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fencers(data.eventId)
      });
    }
  });
  
  tournamentClient.on('fencer_removed', (data: any) => {
    if (data.eventId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fencers(data.eventId)
      });
    }
  });
  
  // Handle event updates
  tournamentClient.on('event_created', (data: any) => {
    if (data.tournamentName) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events(data.tournamentName)
      });
    }
  });
  
  tournamentClient.on('event_deleted', (data: any) => {
    // Invalidate all events queries since we don't know the tournament name
    queryClient.invalidateQueries({ queryKey: ['events'] });
  });
  
  // Handle event status updates
  tournamentClient.on('event_statuses', (data: any) => {
    if (data?.statuses) {
      // Merge with current statuses
      const currentStatuses = queryClient.getQueryData(queryKeys.eventStatuses) || {};
      queryClient.setQueryData(
        queryKeys.eventStatuses,
        { ...currentStatuses, ...data.statuses }
      );
    }
  });
  
  // Handle rounds updates
  tournamentClient.on('rounds_list', (data: any) => {
    if (data?.eventId && Array.isArray(data.rounds)) {
      // Update rounds cache
      queryClient.setQueryData(
        queryKeys.rounds(data.eventId),
        data.rounds
      );
      
      // Update event status if needed
      if (data.rounds.length > 0) {
        const isStarted = data.rounds[0].isstarted;
        const isStartedBool = isStarted === 1 || isStarted === true || 
                              isStarted === "1" || !!isStarted;
        
        const currentStatuses = queryClient.getQueryData(queryKeys.eventStatuses) || {};
        queryClient.setQueryData(
          queryKeys.eventStatuses,
          { ...currentStatuses, [data.eventId]: isStartedBool }
        );
      }
    }
  });
  
  // Handle individual round updates
  tournamentClient.on('round_added', (data: any) => {
    if (data.eventId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rounds(data.eventId)
      });
      queryClient.invalidateQueries(queryKeys.eventStatuses);
    }
  });
  
  tournamentClient.on('round_updated', (data: any) => {
    if (data.eventId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rounds(data.eventId)
      });
      queryClient.invalidateQueries(queryKeys.eventStatuses);
    }
  });
  
  tournamentClient.on('round_deleted', (data: any) => {
    if (data.eventId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rounds(data.eventId)
      });
      queryClient.invalidateQueries(queryKeys.eventStatuses);
    }
  });
}