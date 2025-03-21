import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Event } from '../../../core/types';
import { eventRepository, EventInsert } from '../repository';
import { createQueryKeys, useInvalidateQueries, RepositoryQueryHooks } from '../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import { events } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq } from 'drizzle-orm';

// Create query keys for events
export const eventKeys = createQueryKeys('events');

/**
 * Custom hook for event queries
 * Provides React Query hooks for event data operations
 */
export const useEventQueries = (): RepositoryQueryHooks<Event, EventInsert> & {
  useGetByTournament: (tournamentName: string, options?: UseQueryOptions<Event[], unknown, Event[], unknown[]>) => ReturnType<typeof useQuery>;
  useLiveEvents: () => { data: Event[] | undefined, error: unknown };
  useLiveEventById: (id: number) => { data: Event | undefined, error: unknown };
  useLiveEventsByTournament: (tournamentName: string) => { data: Event[] | undefined, error: unknown };
} => {
  const queryClient = useQueryClient();
  const { invalidateByPrefix } = useInvalidateQueries();

  // Get all events
  const useGetAll = (
    options?: UseQueryOptions<Event[], unknown, Event[], unknown[]>
  ) => {
    return useQuery({
      queryKey: eventKeys.lists(),
      queryFn: () => eventRepository.findAll(),
      ...options,
    });
  };

  // Live query for all events
  const useLiveEvents = () => {
    const result = useLiveQuery(db.select().from(events));
    return {
      data: result.data as Event[] | undefined,
      error: result.error
    };
  };

  // Get event by id
  const useGetById = (
    id: number,
    options?: UseQueryOptions<Event | undefined, unknown, Event | undefined, unknown[]>
  ) => {
    return useQuery({
      queryKey: eventKeys.detail(id),
      queryFn: () => eventRepository.findById(id),
      enabled: !!id,
      ...options,
    });
  };

  // Live query for a specific event
  const useLiveEventById = (id: number) => {
    const result = useLiveQuery(
      db.select().from(events).where(eq(events.id, id))
    );
    return {
      data: result.data?.[0] as Event | undefined,
      error: result.error
    };
  };

  // Get events by tournament
  const useGetByTournament = (
    tournamentName: string,
    options?: UseQueryOptions<Event[], unknown, Event[], unknown[]>
  ) => {
    return useQuery({
      queryKey: [...eventKeys.lists(), 'tournament', tournamentName],
      queryFn: () => eventRepository.findByTournament(tournamentName),
      enabled: !!tournamentName,
      ...options,
    });
  };

  // Live query for events by tournament
  const useLiveEventsByTournament = (tournamentName: string) => {
    const result = useLiveQuery(
      db.select().from(events).where(eq(events.tname, tournamentName))
    );
    return {
      data: result.data as Event[] | undefined,
      error: result.error
    };
  };

  // Create event
  const useCreate = (options?: any) => {
    return useMutation({
      mutationFn: (data: EventInsert) => eventRepository.create(data),
      onSuccess: (_, variables) => {
        // Invalidate event lists and tournament-specific event lists
        invalidateByPrefix('events');
        
        // Also invalidate the tournament detail since events are related to tournaments
        queryClient.invalidateQueries({ 
          queryKey: ['tournaments', 'detail', variables.tname] 
        });
      },
      ...options,
    });
  };

  // Update event
  const useUpdate = (options?: any) => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number, data: Partial<Event> }) => {
        return eventRepository.update(id, data);
      },
      onSuccess: (data, variables) => {
        // Invalidate specific event and all lists
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
        
        // Also invalidate tournament-specific event lists if the tournament name is in the data
        if (data && 'tname' in data) {
          queryClient.invalidateQueries({ 
            queryKey: [...eventKeys.lists(), 'tournament', data.tname] 
          });
        }
      },
      ...options,
    });
  };

  // Delete event
  const useDelete = (options?: any) => {
    return useMutation({
      mutationFn: (id: number) => eventRepository.delete(id),
      onSuccess: (_, id) => {
        // Invalidate specific event and all lists
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
        
        // We could also invalidate tournament-specific events
        // but we don't know the tournament name here, so we'll just invalidate all events
        invalidateByPrefix('events');
      },
      ...options,
    });
  };

  return {
    useGetAll,
    useGetById,
    useGetByTournament,
    useCreate,
    useUpdate,
    useDelete,
    useLiveEvents,
    useLiveEventById,
    useLiveEventsByTournament,
  };
};

export default useEventQueries;