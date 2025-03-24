/**
 * DE Bouts Hooks
 * Optimized React hooks for accessing and manipulating DE bout data
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import * as deBoutService from '../services/deBoutService';
import { 
  DEBout, 
  DESortedBouts, 
  DEBracketType,
  DEBoutUpdate
} from '../services/deBoutService';
import { createQueryKeys, useInvalidateQueries } from '../../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../../infrastructure/database/live-query';
import { 
  bouts, 
  deBracketBouts, 
  fencers, 
  fencerBouts 
} from '../../../../infrastructure/database/schema';
import db from '../../../../infrastructure/database/client';
import { eq, and, asc } from 'drizzle-orm';

// Query key factory for DE bouts
export const deBoutKeys = createQueryKeys('de-bouts');

/**
 * Hook for getting a DE bout by ID
 */
export function useGetDEBoutById(
  boutId: number | undefined,
  options?: UseQueryOptions<DEBout | null, Error, DEBout | null, unknown[]>
) {
  return useQuery({
    queryKey: deBoutKeys.detail(boutId),
    queryFn: () => boutId ? deBoutService.getDEBoutById(boutId) : null,
    enabled: !!boutId,
    staleTime: 1000 * 60, // 1 minute stale time
    ...options,
  });
}

/**
 * Live query hook for a DE bout with real-time updates
 */
export function useLiveDEBoutById(boutId: number | undefined) {
  const result = useLiveQuery(
    boutId ? 
    db.select({
      bout: bouts,
      bracket: deBracketBouts,
      fencerA: fencers.as('fencerA'),
      fencerB: fencers.as('fencerB'),
      scoreA: fencerBouts.as('scoreA'),
      scoreB: fencerBouts.as('scoreB')
    })
    .from(bouts)
    .leftJoin(deBracketBouts, eq(deBracketBouts.boutId, bouts.id))
    .leftJoin(fencers.as('fencerA'), eq(bouts.lFencer, fencers.as('fencerA').id))
    .leftJoin(fencers.as('fencerB'), eq(bouts.rFencer, fencers.as('fencerB').id))
    .leftJoin(fencerBouts.as('scoreA'), and(
      eq(fencerBouts.as('scoreA').boutId, bouts.id),
      eq(fencerBouts.as('scoreA').fencerId, bouts.lFencer)
    ))
    .leftJoin(fencerBouts.as('scoreB'), and(
      eq(fencerBouts.as('scoreB').boutId, bouts.id),
      eq(fencerBouts.as('scoreB').fencerId, bouts.rFencer)
    ))
    .where(eq(bouts.id, boutId)) : null,
    { enabled: !!boutId }
  );
  
  // Map the result to the DEBout type
  const mappedData = result.data?.[0] ? 
    deBoutService.mapToDEBout(result.data[0]) : 
    undefined;
  
  return {
    data: mappedData,
    error: result.error
  };
}

/**
 * Hook for getting all DE bouts by round ID
 */
export function useGetDEBoutsByRoundId(
  roundId: number | undefined,
  options?: UseQueryOptions<DEBout[], Error, DEBout[], unknown[]>
) {
  return useQuery({
    queryKey: [...deBoutKeys.lists(), 'round', roundId],
    queryFn: () => roundId ? deBoutService.getDEBoutsByRoundId(roundId) : [],
    enabled: !!roundId,
    staleTime: 1000 * 30, // 30 seconds stale time
    ...options,
  });
}

/**
 * Live query hook for DE bouts by round ID with real-time updates
 */
export function useLiveDEBoutsByRoundId(roundId: number | undefined) {
  const result = useLiveQuery(
    roundId ?
    db.select({
      bout: bouts,
      bracket: deBracketBouts,
      fencerA: fencers.as('fencerA'),
      fencerB: fencers.as('fencerB'),
      scoreA: fencerBouts.as('scoreA'),
      scoreB: fencerBouts.as('scoreB')
    })
    .from(bouts)
    .leftJoin(deBracketBouts, eq(deBracketBouts.boutId, bouts.id))
    .leftJoin(fencers.as('fencerA'), eq(bouts.lFencer, fencers.as('fencerA').id))
    .leftJoin(fencers.as('fencerB'), eq(bouts.rFencer, fencers.as('fencerB').id))
    .leftJoin(fencerBouts.as('scoreA'), and(
      eq(fencerBouts.as('scoreA').boutId, bouts.id),
      eq(fencerBouts.as('scoreA').fencerId, bouts.lFencer)
    ))
    .leftJoin(fencerBouts.as('scoreB'), and(
      eq(fencerBouts.as('scoreB').boutId, bouts.id),
      eq(fencerBouts.as('scoreB').fencerId, bouts.rFencer)
    ))
    .where(eq(bouts.roundId, roundId))
    .orderBy(
      asc(deBracketBouts.bracketRound),
      asc(deBracketBouts.boutOrder)
    ) : null,
    { enabled: !!roundId }
  );
  
  // Map the results to the DEBout type
  const mappedData = result.data?.map(row => deBoutService.mapToDEBout(row));
  
  return {
    data: mappedData,
    error: result.error
  };
}

/**
 * Hook for getting DE bouts by bracket type
 */
export function useGetDEBoutsByBracketType(
  roundId: number | undefined,
  bracketType: DEBracketType | undefined,
  options?: UseQueryOptions<DEBout[], Error, DEBout[], unknown[]>
) {
  return useQuery({
    queryKey: [...deBoutKeys.lists(), 'round', roundId, 'bracket', bracketType],
    queryFn: () => (roundId && bracketType) 
      ? deBoutService.getDEBoutsByBracketType(roundId, bracketType)
      : [],
    enabled: !!roundId && !!bracketType,
    staleTime: 1000 * 30, // 30 seconds stale time
    ...options,
  });
}

/**
 * Live query hook for DE bouts by bracket type with real-time updates
 */
export function useLiveDEBoutsByBracketType(
  roundId: number | undefined,
  bracketType: DEBracketType | undefined
) {
  const result = useLiveQuery(
    (roundId && bracketType) ?
    db.select({
      bout: bouts,
      bracket: deBracketBouts,
      fencerA: fencers.as('fencerA'),
      fencerB: fencers.as('fencerB'),
      scoreA: fencerBouts.as('scoreA'),
      scoreB: fencerBouts.as('scoreB')
    })
    .from(bouts)
    .leftJoin(deBracketBouts, eq(deBracketBouts.boutId, bouts.id))
    .leftJoin(fencers.as('fencerA'), eq(bouts.lFencer, fencers.as('fencerA').id))
    .leftJoin(fencers.as('fencerB'), eq(bouts.rFencer, fencers.as('fencerB').id))
    .leftJoin(fencerBouts.as('scoreA'), and(
      eq(fencerBouts.as('scoreA').boutId, bouts.id),
      eq(fencerBouts.as('scoreA').fencerId, bouts.lFencer)
    ))
    .leftJoin(fencerBouts.as('scoreB'), and(
      eq(fencerBouts.as('scoreB').boutId, bouts.id),
      eq(fencerBouts.as('scoreB').fencerId, bouts.rFencer)
    ))
    .where(and(
      eq(bouts.roundId, roundId),
      eq(deBracketBouts.bracketType, bracketType)
    ))
    .orderBy(
      asc(deBracketBouts.bracketRound),
      asc(deBracketBouts.boutOrder)
    ) : null,
    { enabled: !!roundId && !!bracketType }
  );
  
  // Map the results to the DEBout type
  const mappedData = result.data?.map(row => deBoutService.mapToDEBout(row));
  
  return {
    data: mappedData,
    error: result.error
  };
}

/**
 * Hook for getting all DE bouts organized by bracket type
 */
export function useGetDEBoutsByBracketTypes(
  roundId: number | undefined,
  options?: UseQueryOptions<DESortedBouts, Error, DESortedBouts, unknown[]>
) {
  return useQuery({
    queryKey: [...deBoutKeys.lists(), 'round', roundId, 'brackets'],
    queryFn: () => roundId ? deBoutService.getDEBoutsByBracketTypes(roundId) : { 
      winners: [], 
      losers: [], 
      finals: [] 
    },
    enabled: !!roundId,
    staleTime: 1000 * 30, // 30 seconds stale time
    ...options,
  });
}

/**
 * Hook for checking if a DE round is complete
 */
export function useIsDERoundComplete(
  roundId: number | undefined,
  options?: UseQueryOptions<boolean, Error, boolean, unknown[]>
) {
  return useQuery({
    queryKey: [...deBoutKeys.lists(), 'round', roundId, 'complete'],
    queryFn: () => roundId ? deBoutService.isDERoundComplete(roundId) : false,
    enabled: !!roundId,
    staleTime: 1000 * 30, // 30 seconds stale time
    ...options,
  });
}

/**
 * Hook for getting the DE table size
 */
export function useGetDETableSize(
  roundId: number | undefined,
  options?: UseQueryOptions<number, Error, number, unknown[]>
) {
  return useQuery({
    queryKey: [...deBoutKeys.lists(), 'round', roundId, 'tableSize'],
    queryFn: () => roundId ? deBoutService.getDETableSize(roundId) : 0,
    enabled: !!roundId,
    staleTime: 1000 * 60 * 5, // 5 minute stale time - table size doesn't change often
    ...options,
  });
}

/**
 * Hook for updating DE bout scores with optimistic updates
 */
export function useUpdateDEBoutScores() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: ({ 
      boutId, 
      scoreA, 
      scoreB, 
      winnerId 
    }: { 
      boutId: number; 
      scoreA: number; 
      scoreB: number; 
      winnerId: number;
    }) => deBoutService.updateDEBoutScores(boutId, scoreA, scoreB, winnerId),
    
    // Use optimistic updates for better UX
    onMutate: async ({ boutId, scoreA, scoreB, winnerId }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: deBoutKeys.detail(boutId) });
      
      // Get the current bout
      const previousBout = queryClient.getQueryData<DEBout>(deBoutKeys.detail(boutId));
      
      if (previousBout) {
        // Create the optimistic update
        const optimisticBout: DEBout = {
          ...previousBout,
          scoreA,
          scoreB,
          winnerId,
        };
        
        // Set the optimistic data
        queryClient.setQueryData(deBoutKeys.detail(boutId), optimisticBout);
      }
      
      return { previousBout };
    },
    
    onError: (_, variables, context) => {
      // Roll back to the previous value if the mutation fails
      if (context?.previousBout) {
        queryClient.setQueryData(deBoutKeys.detail(variables.boutId), context.previousBout);
      }
    },
    
    onSuccess: (updatedBout) => {
      // Update the cache with the updated bout
      queryClient.setQueryData(deBoutKeys.detail(updatedBout.id), updatedBout);
      
      // Invalidate related queries that show collections of bouts
      queryClient.invalidateQueries({ 
        queryKey: [...deBoutKeys.lists(), 'round', updatedBout.roundId] 
      });
      
      // Also invalidate the round completion status
      queryClient.invalidateQueries({ 
        queryKey: [...deBoutKeys.lists(), 'round', updatedBout.roundId, 'complete'] 
      });
      
      // Also invalidate the round entity
      invalidateEntity('rounds', updatedBout.roundId);
    },
  });
}

/**
 * Hook for batch updating DE bout scores
 */
export function useBatchUpdateDEBoutScores() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: DEBoutUpdate[]) => deBoutService.batchUpdateDEBoutScores(updates),
    onSuccess: (updatedBouts) => {
      // Get unique round IDs from the updated bouts
      const roundIds = [...new Set(updatedBouts.map(bout => bout.roundId))];
      
      // Update the cache with the updated bouts
      updatedBouts.forEach(bout => {
        queryClient.setQueryData(deBoutKeys.detail(bout.id), bout);
      });
      
      // Invalidate lists for all affected rounds
      roundIds.forEach(roundId => {
        queryClient.invalidateQueries({ 
          queryKey: [...deBoutKeys.lists(), 'round', roundId] 
        });
        
        // Also invalidate the round completion status
        queryClient.invalidateQueries({ 
          queryKey: [...deBoutKeys.lists(), 'round', roundId, 'complete'] 
        });
        
        // Also invalidate the round entity
        queryClient.invalidateQueries({ 
          queryKey: ['rounds', 'detail', roundId] 
        });
      });
    },
  });
}

/**
 * Hook for updating a DE bout and advancing the winner
 */
export function useUpdateDEBoutAndAdvanceWinner() {
  const queryClient = useQueryClient();
  const { invalidateEntity } = useInvalidateQueries();
  
  return useMutation({
    mutationFn: ({ 
      boutId, 
      scoreA, 
      scoreB, 
      winnerId 
    }: { 
      boutId: number; 
      scoreA: number; 
      scoreB: number; 
      winnerId: number;
    }) => deBoutService.updateDEBoutAndAdvanceWinner(boutId, scoreA, scoreB, winnerId),
    onSuccess: (updatedBout) => {
      // This is a more complex update that affects multiple bouts, so we need to invalidate more queries
      
      // Since advancing affects next bouts, invalidate all bouts for this round
      queryClient.invalidateQueries({ 
        queryKey: [...deBoutKeys.lists(), 'round', updatedBout.roundId] 
      });
      
      // Also invalidate the round completion status
      queryClient.invalidateQueries({ 
        queryKey: [...deBoutKeys.lists(), 'round', updatedBout.roundId, 'complete'] 
      });
      
      // Also invalidate the round entity
      invalidateEntity('rounds', updatedBout.roundId);
    },
  });
}

/**
 * Hook for creating a new DE bout
 */
export function useCreateDEBout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      roundId, 
      bracketType, 
      bracketRound, 
      boutOrder, 
      tableOf, 
      fencerAId, 
      fencerBId, 
      nextBoutId, 
      loserNextBoutId 
    }: { 
      roundId: number; 
      bracketType: DEBracketType; 
      bracketRound: number; 
      boutOrder: number; 
      tableOf: number; 
      fencerAId?: number; 
      fencerBId?: number; 
      nextBoutId?: number; 
      loserNextBoutId?: number;
    }) => deBoutService.createDEBout(
      roundId, 
      bracketType, 
      bracketRound, 
      boutOrder, 
      tableOf, 
      fencerAId, 
      fencerBId, 
      nextBoutId, 
      loserNextBoutId
    ),
    onSuccess: (newBout) => {
      // Add the new bout to the cache
      queryClient.setQueryData(deBoutKeys.detail(newBout.id), newBout);
      
      // Invalidate lists for this round and bracket type
      queryClient.invalidateQueries({ 
        queryKey: [...deBoutKeys.lists(), 'round', newBout.roundId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: [...deBoutKeys.lists(), 'round', newBout.roundId, 'bracket', newBout.bracketType] 
      });
      
      // Also invalidate the round entity
      queryClient.invalidateQueries({ 
        queryKey: ['rounds', 'detail', newBout.roundId] 
      });
    },
  });
}

/**
 * Main hook for DE bouts functionality
 * Aggregates all the individual hooks for convenience
 */
export function useDEBouts() {
  return {
    // Standard query hooks
    useGetDEBoutById,
    useGetDEBoutsByRoundId,
    useGetDEBoutsByBracketType,
    useGetDEBoutsByBracketTypes,
    useIsDERoundComplete,
    useGetDETableSize,
    
    // Live query hooks
    useLiveDEBoutById,
    useLiveDEBoutsByRoundId,
    useLiveDEBoutsByBracketType,
    
    // Mutation hooks
    useUpdateDEBoutScores,
    useBatchUpdateDEBoutScores,
    useUpdateDEBoutAndAdvanceWinner,
    useCreateDEBout,
    
    // Export query keys for external use (like invalidation)
    deBoutKeys,
  };
}

export default useDEBouts;