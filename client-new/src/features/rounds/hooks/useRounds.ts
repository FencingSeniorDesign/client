/**
 * Rounds Hooks
 * Optimized React hooks for accessing and manipulating round data
 * Provides standard and live queries with optimistic updates
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Round, RoundType, PoolsOption, DEFormat } from '../../../core/types';
import * as roundService from '../services/roundService';
import { 
  RoundInsert,
  BatchRoundUpdate
} from '../services/roundService';
import { createQueryKeys, useInvalidateQueries } from '../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import { rounds } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, and, asc } from 'drizzle-orm';

// Query key factory for rounds
export const roundKeys = createQueryKeys('rounds');

/**
 * Hook for getting all rounds with optional caching configuration
 */
export function useGetAllRounds(
  options?: UseQueryOptions<Round[], Error, Round[], unknown[]>
) {
  return useQuery({
    queryKey: roundKeys.lists(),
    queryFn: () => roundService.getAllRounds(),
    staleTime: 1000 * 60 * 5, // 5 minute stale time for better performance
    ...options,
  });
}

/**
 * Live query hook for real-time round updates
 */
export function useLiveAllRounds() {
  const result = useLiveQuery(
    db.select().from(rounds).orderBy(asc(rounds.eventId), asc(rounds.rorder))
  );
  
  return {
    data: result.data as Round[] | undefined,
    error: result.error
  };
}

/**
 * Hook for getting a round by ID
 */
export function useGetRoundById(
  id: number | undefined,
  options?: UseQueryOptions<Round | null, Error, Round | null, unknown[]>
) {
  return useQuery({
    queryKey: roundKeys.detail(id),
    queryFn: () => id ? roundService.getRoundById(id) : null,
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minute stale time
    ...options,
  });
}

/**
 * Live query hook for a specific round with real-time updates
 */
export function useLiveRoundById(id: number | undefined) {
  const result = useLiveQuery(
    id ? db.select().from(rounds).where(eq(rounds.id, id)) : null,
    { enabled: !!id }
  );
  
  return {
    data: result.data?.[0] as Round | undefined,
    error: result.error
  };
}

/**
 * Hook for getting rounds by event ID
 */
export function useGetRoundsByEventId(
  eventId: number | undefined,
  options?: UseQueryOptions<Round[], Error, Round[], unknown[]>
) {
  return useQuery({
    queryKey: roundKeys.filter({ eventId }),
    queryFn: () => eventId ? roundService.getRoundsByEventId(eventId) : [],
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minute stale time
    ...options,
  });
}

/**
 * Live query hook for rounds by event ID with real-time updates
 */
export function useLiveRoundsByEventId(eventId: number | undefined) {
  const result = useLiveQuery(
    eventId 
      ? db.select().from(rounds)
          .where(eq(rounds.eventId, eventId))
          .orderBy(asc(rounds.rorder))
      : null,
    { enabled: !!eventId }
  );
  
  return {
    data: result.data as Round[] | undefined,
    error: result.error
  };
}

/**
 * Hook for getting rounds by event ID and type
 */
export function useGetRoundsByEventIdAndType(
  eventId: number | undefined,
  type: RoundType | undefined,
  options?: UseQueryOptions<Round[], Error, Round[], unknown[]>
) {
  return useQuery({
    queryKey: roundKeys.filter({ eventId, type }),
    queryFn: () => (eventId && type) 
      ? roundService.getRoundsByEventIdAndType(eventId, type) 
      : [],
    enabled: !!eventId && !!type,
    staleTime: 1000 * 60 * 2, // 2 minute stale time
    ...options,
  });
}

/**
 * Live query hook for rounds by event ID and type with real-time updates
 */
export function useLiveRoundsByEventIdAndType(
  eventId: number | undefined,
  type: RoundType | undefined
) {
  const result = useLiveQuery(
    (eventId && type)
      ? db.select().from(rounds)
          .where(and(
            eq(rounds.eventId, eventId),
            eq(rounds.type, type)
          ))
          .orderBy(asc(rounds.rorder))
      : null,
    { enabled: !!eventId && !!type }
  );
  
  return {
    data: result.data as Round[] | undefined,
    error: result.error
  };
}

/**
 * Hook for getting the current round for an event
 */
export function useGetCurrentRound(
  eventId: number | undefined,
  options?: UseQueryOptions<Round | null, Error, Round | null, unknown[]>
) {
  return useQuery({
    queryKey: roundKeys.filter({ eventId, current: true }),
    queryFn: () => eventId ? roundService.getCurrentRound(eventId) : null,
    enabled: !!eventId,
    staleTime: 1000 * 30, // 30 seconds stale time - current round can change frequently
    ...options,
  });
}

/**
 * Hook for creating a round with optimistic updates
 */
export function useCreateRound() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: (data: RoundInsert) => roundService.createRound(data),
    onSuccess: (newRound) => {
      // Invalidate all related queries
      invalidateEntity('rounds', newRound.id);
      
      // Also invalidate event-specific round lists
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId }) 
      });
      
      // And type-specific round lists
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId, type: newRound.type }) 
      });
      
      // Also invalidate the current round query
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId, current: true }) 
      });
      
      // Also invalidate the events entity
      invalidateEntity('events', newRound.eventId);
    },
  });
}

/**
 * Hook for creating a pool round
 */
export function useCreatePoolRound() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: (params: {
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
    onSuccess: (newRound) => {
      // Invalidate all related queries
      invalidateEntity('rounds', newRound.id);
      
      // Also invalidate event-specific round lists
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId }) 
      });
      
      // And pool-specific round lists
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId, type: 'pool' }) 
      });
      
      // Also invalidate the current round query
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId, current: true }) 
      });
      
      // Also invalidate the events entity
      invalidateEntity('events', newRound.eventId);
    },
  });
}

/**
 * Hook for creating a DE round
 */
export function useCreateDERound() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: (params: {
      eventId: number;
      rorder: number;
      deFormat: DEFormat;
      deTableSize: number;
    }) => {
      const { eventId, rorder, deFormat, deTableSize } = params;
      return roundService.createDERound(eventId, rorder, deFormat, deTableSize);
    },
    onSuccess: (newRound) => {
      // Invalidate all related queries
      invalidateEntity('rounds', newRound.id);
      
      // Also invalidate event-specific round lists
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId }) 
      });
      
      // And de-specific round lists
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId, type: 'de' }) 
      });
      
      // Also invalidate the current round query
      queryClient.invalidateQueries({ 
        queryKey: roundKeys.filter({ eventId: newRound.eventId, current: true }) 
      });
      
      // Also invalidate the events entity
      invalidateEntity('events', newRound.eventId);
    },
  });
}

/**
 * Hook for creating multiple rounds in batch
 */
export function useCreateRounds() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: RoundInsert[]) => roundService.createRounds(data),
    onSuccess: (newRounds) => {
      // Find all the unique event IDs
      const eventIds = [...new Set(newRounds.map(round => round.eventId))];
      
      // Invalidate all round lists
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      
      // Invalidate event-specific queries for each event
      eventIds.forEach(eventId => {
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId }) 
        });
        
        // Also invalidate the current round query
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId, current: true }) 
        });
        
        // Also invalidate the events entity
        queryClient.invalidateQueries({ 
          queryKey: ['events', 'detail', eventId] 
        });
      });
    },
  });
}

/**
 * Hook for updating a round with optimistic updates
 */
export function useUpdateRound() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<Round> }) => 
      roundService.updateRound(id, data),
    // Use optimistic updates for better UX
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: roundKeys.detail(id) });
      
      // Get the current round
      const previousRound = queryClient.getQueryData<Round>(roundKeys.detail(id));
      
      if (previousRound) {
        // Apply the update optimistically
        queryClient.setQueryData(roundKeys.detail(id), {
          ...previousRound,
          ...data,
        });
        
        // Also update in all lists if present
        const updateRoundInList = (queryKey: unknown[]) => {
          const previousRounds = queryClient.getQueryData<Round[]>(queryKey);
          if (previousRounds) {
            queryClient.setQueryData(
              queryKey,
              previousRounds.map(r => r.id === id ? { ...r, ...data } : r)
            );
          }
        };
        
        // Update in the general list
        updateRoundInList(roundKeys.lists());
        
        // Update in the event-specific list
        if (previousRound.eventId) {
          updateRoundInList(roundKeys.filter({ eventId: previousRound.eventId }));
          
          // Also update in the type-specific list
          updateRoundInList(roundKeys.filter({ 
            eventId: previousRound.eventId, 
            type: previousRound.type 
          }));
        }
      }
      
      return { previousRound };
    },
    onError: (_, variables, context) => {
      // Roll back on error
      if (context?.previousRound) {
        queryClient.setQueryData(roundKeys.detail(variables.id), context.previousRound);
        
        // Also roll back in the lists
        if (context.previousRound.eventId) {
          queryClient.invalidateQueries({ 
            queryKey: roundKeys.filter({ eventId: context.previousRound.eventId }) 
          });
        }
      }
    },
    onSuccess: (updatedRound) => {
      if (updatedRound) {
        // Properly invalidate related queries
        invalidateEntity('rounds', updatedRound.id);
        
        // Also invalidate the current round query if this might be the current round
        // (i.e., if we've updated the isStarted or isComplete fields)
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId: updatedRound.eventId, current: true }) 
        });
      }
    },
  });
}

/**
 * Hook for batch updating multiple rounds
 */
export function useBatchUpdateRounds() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: BatchRoundUpdate[]) => roundService.batchUpdateRounds(updates),
    onSuccess: (updatedRounds) => {
      // Find all unique event IDs
      const eventIds = [...new Set(updatedRounds.map(round => round.eventId))];
      
      // Invalidate each updated round
      updatedRounds.forEach(round => {
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
      });
      
      // Invalidate all lists for affected events
      eventIds.forEach(eventId => {
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId }) });
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId, current: true }) 
        });
      });
      
      // Invalidate all round lists
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a round with optimistic updates
 */
export function useDeleteRound() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: async (id: number) => {
      // Get the round first to capture eventId before deletion
      const round = await roundService.getRoundById(id);
      const success = await roundService.deleteRound(id);
      return { success, id, eventId: round?.eventId };
    },
    // Use optimistic updates for better UX
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: roundKeys.detail(id) });
      
      // Get the current round to know its eventId
      const previousRound = queryClient.getQueryData<Round>(roundKeys.detail(id));
      
      if (previousRound) {
        // Remove from all lists
        const removeRoundFromList = (queryKey: unknown[]) => {
          const previousRounds = queryClient.getQueryData<Round[]>(queryKey);
          if (previousRounds) {
            queryClient.setQueryData(
              queryKey,
              previousRounds.filter(r => r.id !== id)
            );
          }
        };
        
        // Remove from the general list
        removeRoundFromList(roundKeys.lists());
        
        // Remove from the event-specific list
        removeRoundFromList(roundKeys.filter({ eventId: previousRound.eventId }));
        
        // Remove from the type-specific list
        removeRoundFromList(roundKeys.filter({ 
          eventId: previousRound.eventId, 
          type: previousRound.type 
        }));
        
        // Remove the round detail from cache
        queryClient.removeQueries({ queryKey: roundKeys.detail(id) });
      }
      
      return { previousRound };
    },
    onError: (_, __, context) => {
      // Invalidate on error to refresh from server
      if (context?.previousRound) {
        queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId: context.previousRound.eventId }) 
        });
      }
    },
    onSuccess: (result) => {
      if (result.success && result.eventId) {
        // Update related lists
        invalidateEntity('rounds', result.id);
        
        // Also invalidate the events entity
        invalidateEntity('events', result.eventId);
        
        // Also invalidate the current round query
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId: result.eventId, current: true }) 
        });
        
        // Remove the round detail from cache
        queryClient.removeQueries({ queryKey: roundKeys.detail(result.id) });
      }
    },
  });
}

/**
 * Hook for batch deleting multiple rounds
 */
export function useBatchDeleteRounds() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: number[]) => {
      // Get all the rounds first to capture their eventIds
      const roundPromises = ids.map(id => roundService.getRoundById(id));
      const rounds = await Promise.all(roundPromises);
      const eventIds = [...new Set(rounds.filter(r => r !== null).map(r => r!.eventId))];
      
      const deletedCount = await roundService.batchDeleteRounds(ids);
      return { deletedCount, ids, eventIds };
    },
    onSuccess: (result) => {
      // Remove each deleted round from cache
      result.ids.forEach(id => {
        queryClient.removeQueries({ queryKey: roundKeys.detail(id) });
      });
      
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      
      // Invalidate event-specific queries
      result.eventIds.forEach(eventId => {
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId }) });
        
        // Also invalidate the current round query
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId, current: true }) 
        });
        
        // Also invalidate the events entity
        queryClient.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
      });
    },
  });
}

/**
 * Hook for marking a round as started
 */
export function useMarkRoundAsStarted() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => roundService.markRoundAsStarted(id),
    onSuccess: (round) => {
      if (round) {
        // Invalidate the specific round
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
        
        // Also invalidate the current round query
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) 
        });
      }
    },
  });
}

/**
 * Hook for marking a round as complete
 */
export function useMarkRoundAsComplete() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => roundService.markRoundAsComplete(id),
    onSuccess: (round) => {
      if (round) {
        // Invalidate the specific round
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
        
        // Also invalidate the current round query
        queryClient.invalidateQueries({ 
          queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) 
        });
      }
    },
  });
}

/**
 * Main hook for rounds functionality
 * Aggregates all the individual hooks for convenience
 */
export function useRounds() {
  return {
    // Standard query hooks
    useGetAllRounds,
    useGetRoundById,
    useGetRoundsByEventId,
    useGetRoundsByEventIdAndType,
    useGetCurrentRound,
    
    // Live query hooks
    useLiveAllRounds,
    useLiveRoundById,
    useLiveRoundsByEventId,
    useLiveRoundsByEventIdAndType,
    
    // Mutation hooks
    useCreateRound,
    useCreatePoolRound,
    useCreateDERound,
    useCreateRounds,
    useUpdateRound,
    useBatchUpdateRounds,
    useDeleteRound,
    useBatchDeleteRounds,
    useMarkRoundAsStarted,
    useMarkRoundAsComplete,
    
    // Export query keys for external use (like invalidation)
    roundKeys,
  };
}

export default useRounds;