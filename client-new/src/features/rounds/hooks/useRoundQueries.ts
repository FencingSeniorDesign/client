/**
 * Round query hooks
 * React Query hooks for round data with live query support
 * Migrated to use service functions instead of repository pattern
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Round, RoundType, PoolsOption, DEFormat, Event } from '../../../core/types';
import { createQueryKeys } from '../../../infrastructure/query/utils';
import * as roundService from '../services/roundService';
import { RoundInsert, BatchRoundUpdate } from '../services/roundService';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import { rounds } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, and } from 'drizzle-orm';

// Query key factory for rounds
export const roundKeys = createQueryKeys('rounds');

/**
 * Hook for round queries and mutations
 * Uses the service pattern with pure functions instead of repositories
 */
export const useRoundQueries = () => {
  const queryClient = useQueryClient();

  /**
   * Query for getting all rounds
   * Uses the direct service function instead of repository
   */
  const useGetAll = () => {
    return useQuery({
      queryKey: roundKeys.lists(),
      queryFn: () => roundService.getAllRounds(),
    });
  };
  
  /**
   * Live query for getting all rounds with real-time updates
   */
  const useLiveAllRounds = () => {
    return useLiveQuery(
      db.select().from(rounds),
      [],
      { refetchInterval: false }
    );
  };

  /**
   * Query for getting a round by ID
   */
  const useGetById = (id: number | undefined) => {
    return useQuery({
      queryKey: roundKeys.detail(id),
      queryFn: async () => {
        if (!id) {
          throw new Error('Round ID is required');
        }
        const round = await roundService.getRoundById(id);
        if (!round) {
          throw new Error(`Round with ID ${id} not found`);
        }
        return round;
      },
      enabled: !!id,
    });
  };
  
  /**
   * Live query for getting a round by ID with real-time updates
   */
  const useLiveRoundById = (id: number | undefined) => {
    return useLiveQuery(
      id ? db.select().from(rounds).where(eq(rounds.id, id)) : null,
      [id],
      { enabled: !!id }
    );
  };
  
  /**
   * Alias for useGetById to match old API
   */
  const useGetRound = useGetById;

  /**
   * Query for getting an event by ID using service pattern
   */
  const useGetEventById = (eventId: number | undefined) => {
    return useQuery({
      queryKey: ['events', 'detail', eventId],
      queryFn: async () => {
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        // This would typically call the event service
        // Import from the events service directly
        const event = await import('../../events/services/eventService')
          .then(module => module.getEventById(eventId));
        
        if (!event) {
          throw new Error(`Event with ID ${eventId} not found`);
        }
        return event;
      },
      enabled: !!eventId,
    });
  };
  
  /**
   * Query for getting rounds by event ID
   */
  const useGetByEventId = (eventId: number | undefined) => {
    return useQuery({
      queryKey: roundKeys.filter({ eventId }),
      queryFn: async () => {
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        return roundService.getRoundsByEventId(eventId);
      },
      enabled: !!eventId,
    });
  };
  
  /**
   * Live query for getting rounds by event ID with real-time updates
   */
  const useLiveRoundsByEventId = (eventId: number | undefined) => {
    return useLiveQuery(
      eventId ? db.select().from(rounds).where(eq(rounds.eventId, eventId)) : null,
      [eventId],
      { enabled: !!eventId }
    );
  };

  /**
   * Query for getting rounds by event ID and type
   */
  const useGetByEventIdAndType = (eventId: number | undefined, type: RoundType | undefined) => {
    return useQuery({
      queryKey: roundKeys.filter({ eventId, type }),
      queryFn: async () => {
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        if (!type) {
          throw new Error('Round type is required');
        }
        return roundService.getRoundsByEventIdAndType(eventId, type);
      },
      enabled: !!eventId && !!type,
    });
  };
  
  /**
   * Live query for getting rounds by event ID and type with real-time updates
   */
  const useLiveRoundsByEventIdAndType = (eventId: number | undefined, type: RoundType | undefined) => {
    return useLiveQuery(
      eventId && type ? 
        db.select().from(rounds).where(
          and(
            eq(rounds.eventId, eventId),
            eq(rounds.type, type)
          )
        ) : null,
      [eventId, type],
      { enabled: !!eventId && !!type }
    );
  };

  /**
   * Query for getting the current round for an event
   */
  const useGetCurrentRound = (eventId: number | undefined) => {
    return useQuery({
      queryKey: roundKeys.filter({ eventId, current: true }),
      queryFn: async () => {
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        return roundService.getCurrentRound(eventId);
      },
      enabled: !!eventId,
    });
  };

  /**
   * Mutation for creating a pool round
   */
  const useCreatePoolRound = () => {
    return useMutation({
      mutationFn: async (params: {
        eventId: number;
        rorder: number;
        poolCount: number;
        poolSize: number;
        options?: {
          poolsOption?: PoolsOption;
          promotionPercent?: number;
          targetBracket?: number;
          useTargetBracket?: boolean;
        };
      }) => {
        const { eventId, rorder, poolCount, poolSize, options } = params;
        return roundService.createPoolRound(eventId, rorder, poolCount, poolSize, options);
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, type: 'pool' }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  /**
   * Mutation for creating a DE round
   */
  const useCreateDERound = () => {
    return useMutation({
      mutationFn: async (params: {
        eventId: number;
        rorder: number;
        deFormat: DEFormat;
        deTableSize: number;
      }) => {
        const { eventId, rorder, deFormat, deTableSize } = params;
        return roundService.createDERound(eventId, rorder, deFormat, deTableSize);
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, type: 'de' }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  /**
   * Mutation for creating a custom round
   */
  const useCreate = () => {
    return useMutation({
      mutationFn: async (data: RoundInsert) => {
        return roundService.createRound(data);
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, type: round.type }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  /**
   * Mutation for updating a round
   */
  const useUpdate = () => {
    return useMutation({
      mutationFn: async ({ id, data }: { id: number; data: Partial<Round> }) => {
        const updatedRound = await roundService.updateRound(id, data);
        if (!updatedRound) {
          throw new Error(`Round with ID ${id} not found`);
        }
        return updatedRound;
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
        queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, type: round.type }) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  /**
   * Mutation for deleting a round
   */
  const useDelete = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        // Get the round first to capture eventId before deletion
        const round = await roundService.getRoundById(id);
        if (!round) {
          throw new Error(`Round with ID ${id} not found`);
        }
        
        const success = await roundService.deleteRound(id);
        if (!success) {
          throw new Error(`Failed to delete round with ID ${id}`);
        }
        
        return { id, eventId: round.eventId };
      },
      onSuccess: (data) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(data.id) });
        queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
        if (data.eventId) {
          queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: data.eventId }) });
          queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: data.eventId, current: true }) });
        }
      },
    });
  };

  /**
   * Mutation for marking a round as started
   */
  const useMarkAsStarted = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        const updatedRound = await roundService.markRoundAsStarted(id);
        if (!updatedRound) {
          throw new Error(`Round with ID ${id} not found or could not be updated`);
        }
        return updatedRound;
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  /**
   * Mutation for marking a round as complete
   */
  const useMarkAsComplete = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        const updatedRound = await roundService.markRoundAsComplete(id);
        if (!updatedRound) {
          throw new Error(`Round with ID ${id} not found or could not be updated`);
        }
        return updatedRound;
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  /**
   * Mutation for initializing a round
   */
  const useInitializeRound = () => {
    return useMutation({
      mutationFn: async ({ roundId, eventId }: { roundId: number; eventId: number }) => {
        // This would call markAsStarted and any other initialization needed
        const updatedRound = await roundService.markRoundAsStarted(roundId);
        if (!updatedRound) {
          throw new Error(`Round with ID ${roundId} not found or could not be updated`);
        }
        return updatedRound;
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  /**
   * Alias for getting rounds by event ID to match old API
   */
  const useGetRoundsForEvent = useGetByEventId;

  return {
    // Queries
    useGetAll,
    useGetById,
    useGetRound,
    useGetEventById,
    useGetByEventId,
    useGetRoundsForEvent,
    useGetByEventIdAndType,
    useGetCurrentRound,
    
    // Live Queries
    useLiveAllRounds,
    useLiveRoundById,
    useLiveRoundsByEventId,
    useLiveRoundsByEventIdAndType,
    
    // Mutations
    useCreatePoolRound,
    useCreateDERound,
    useCreate,
    useUpdate,
    useDelete,
    useMarkAsStarted,
    useMarkAsComplete,
    useInitializeRound,
  };
};

export default useRoundQueries;