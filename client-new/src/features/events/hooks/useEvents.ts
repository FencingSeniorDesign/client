/**
 * useEvents hook
 * Provides reactive data access for events using Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as eventService from '../services/eventService';
import { Event, EventWithParticipants } from '../../../core/types';
import { BatchEventUpdate } from '../services/eventService';

// Query keys for cache invalidation
export const EVENT_KEYS = {
  all: ['events'] as const,
  lists: () => [...EVENT_KEYS.all, 'list'] as const,
  list: (filters: string) => [...EVENT_KEYS.lists(), { filters }] as const,
  details: () => [...EVENT_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...EVENT_KEYS.details(), id] as const,
  byTournament: (tournamentName: string) => [...EVENT_KEYS.lists(), { tournament: tournamentName }] as const,
};

/**
 * Hook to access events data
 */
export default function useEvents() {
  const queryClient = useQueryClient();

  // Get all events
  const useAllEvents = () => {
    return useQuery({
      queryKey: EVENT_KEYS.lists(),
      queryFn: eventService.getAllEvents,
    });
  };

  // Get event by ID
  const useEventById = (id: number, includeRelations = false) => {
    return useQuery({
      queryKey: EVENT_KEYS.detail(id),
      queryFn: () => eventService.getEventById(id, includeRelations),
      enabled: !!id,
    });
  };

  // Get events by tournament
  const useEventsByTournament = (tournamentName: string) => {
    return useQuery({
      queryKey: EVENT_KEYS.byTournament(tournamentName),
      queryFn: () => eventService.getEventsByTournament(tournamentName),
      enabled: !!tournamentName,
    });
  };

  // Create event mutation
  const useCreateEvent = () => {
    return useMutation({
      mutationFn: eventService.createEvent,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      },
    });
  };

  // Update event mutation
  const useUpdateEvent = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Event> }) =>
        eventService.updateEvent(id, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: EVENT_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      },
    });
  };

  // Delete event mutation
  const useDeleteEvent = () => {
    return useMutation({
      mutationFn: eventService.deleteEvent,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      },
    });
  };

  // Batch update events mutation
  const useBatchUpdateEvents = () => {
    return useMutation({
      mutationFn: (updates: BatchEventUpdate[]) => eventService.batchUpdateEvents(updates),
      onSuccess: (_, variables) => {
        // Invalidate affected event details
        variables.forEach(update => {
          queryClient.invalidateQueries({ queryKey: EVENT_KEYS.detail(update.id) });
        });
        // Invalidate lists
        queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      },
    });
  };

  // Batch delete events mutation
  const useBatchDeleteEvents = () => {
    return useMutation({
      mutationFn: (ids: number[]) => eventService.batchDeleteEvents(ids),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: EVENT_KEYS.lists() });
      },
    });
  };

  // Get tournament event summary
  const useTournamentEventSummary = (tournamentName: string) => {
    return useQuery({
      queryKey: [...EVENT_KEYS.byTournament(tournamentName), 'summary'],
      queryFn: () => eventService.getTournamentEventSummary(tournamentName),
      enabled: !!tournamentName,
    });
  };

  // Get event count
  const useEventCount = () => {
    return useQuery({
      queryKey: [...EVENT_KEYS.lists(), 'count'],
      queryFn: eventService.getEventCount,
    });
  };

  // Get event count by tournament
  const useEventCountByTournament = (tournamentName: string) => {
    return useQuery({
      queryKey: [...EVENT_KEYS.byTournament(tournamentName), 'count'],
      queryFn: () => eventService.getEventCountByTournament(tournamentName),
      enabled: !!tournamentName,
    });
  };

  return {
    useAllEvents,
    useEventById,
    useEventsByTournament,
    useCreateEvent,
    useUpdateEvent,
    useDeleteEvent,
    useBatchUpdateEvents,
    useBatchDeleteEvents,
    useTournamentEventSummary,
    useEventCount,
    useEventCountByTournament,
  };
}