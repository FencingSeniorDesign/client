/**
 * Pool Bouts Hooks
 * React hooks for accessing and manipulating pool bout data with optimized Tanstack Query usage
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as poolBoutService from '../services/poolBoutService';
import { createQueryKeys } from '../../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../../infrastructure/database/live-query';
import db from '../../../../infrastructure/database/client';
import { bouts, fencerBouts } from '../../../../infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';
import { PoolBout, BatchScoreUpdate } from '../services/poolBoutService';

// Query key factory for pool bouts
export const poolBoutKeys = createQueryKeys('poolBouts');

/**
 * Hook for getting all bouts for a specific pool with optimized configuration
 */
export function useGetBoutsForPool(roundId: number | undefined, poolId: number | undefined) {
  return useQuery({
    queryKey: poolBoutKeys.filter({ roundId, poolId }),
    queryFn: async () => {
      if (!roundId || !poolId) {
        throw new Error('Round ID and Pool ID are required');
      }
      return poolBoutService.getBoutsForPool(roundId, poolId);
    },
    enabled: !!roundId && !!poolId,
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
    // Longer staleTime to reduce unnecessary fetches
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Live query version of getting pool bouts
 * Automatically updates when underlying data changes
 */
export function useLiveBoutsForPool(roundId: number | undefined, poolId: number | undefined) {
  return useLiveQuery(
    async () => {
      if (!roundId || !poolId) return [];
      return poolBoutService.getBoutsForPool(roundId, poolId);
    },
    [roundId, poolId],
    { enabled: !!roundId && !!poolId }
  );
}

/**
 * Hook for updating bout scores with optimistic updates
 */
export function useUpdateBoutScores() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      boutId, 
      scoreA, 
      scoreB, 
      roundId,
      poolId,
    }: { 
      boutId: number; 
      scoreA: number; 
      scoreB: number;
      fencerAId?: number;
      fencerBId?: number;
      roundId: number;
      poolId: number;
    }) => {
      return poolBoutService.updateBoutScores(boutId, scoreA, scoreB);
    },
    // Implement optimistic updates for better UX
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ 
        queryKey: poolBoutKeys.filter({ 
          roundId: variables.roundId, 
          poolId: variables.poolId 
        })
      });
      
      // Get current data
      const previousBouts = queryClient.getQueryData<PoolBout[]>(
        poolBoutKeys.filter({ 
          roundId: variables.roundId, 
          poolId: variables.poolId 
        })
      );
      
      // Optimistically update the UI
      if (previousBouts) {
        queryClient.setQueryData<PoolBout[]>(
          poolBoutKeys.filter({ 
            roundId: variables.roundId, 
            poolId: variables.poolId 
          }),
          (old) => {
            if (!old) return [];
            return old.map(bout => {
              if (bout.id === variables.boutId) {
                return {
                  ...bout,
                  leftScore: variables.scoreA,
                  rightScore: variables.scoreB
                };
              }
              return bout;
            });
          }
        );
      }
      
      // Return context with the previous data
      return { previousBouts };
    },
    // If the mutation fails, roll back to the previous state
    onError: (error, variables, context) => {
      if (context?.previousBouts) {
        queryClient.setQueryData(
          poolBoutKeys.filter({ 
            roundId: variables.roundId, 
            poolId: variables.poolId 
          }),
          context.previousBouts
        );
      }
    },
    // After success or error, refetch to ensure consistency
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: poolBoutKeys.filter({ 
          roundId: variables.roundId, 
          poolId: variables.poolId 
        }) 
      });
      
      // Also invalidate any related queries
      queryClient.invalidateQueries({
        queryKey: ['pools']
      });
    },
  });
}

/**
 * Hook for batch updating multiple bout scores
 * More efficient than updating one at a time
 */
export function useBatchUpdateBoutScores() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { 
      updates: BatchScoreUpdate[],
      roundId: number,
      poolId: number
    }) => {
      return poolBoutService.batchUpdateBoutScores(updates.updates);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: poolBoutKeys.filter({ 
          roundId: variables.roundId, 
          poolId: variables.poolId 
        }) 
      });
      
      // Also invalidate pool completion status
      queryClient.invalidateQueries({
        queryKey: poolBoutKeys.filter({
          roundId: variables.roundId,
          poolId: variables.poolId,
          completion: true
        })
      });
    },
  });
}

/**
 * Hook for checking if all bouts in a pool are complete
 * Uses optimized COUNT query implementation
 */
export function useCheckPoolCompletion(roundId: number | undefined, poolId: number | undefined) {
  return useQuery({
    queryKey: poolBoutKeys.filter({ roundId, poolId, completion: true }),
    queryFn: async () => {
      if (!roundId || !poolId) {
        throw new Error('Round ID and Pool ID are required');
      }
      return poolBoutService.checkBoutsCompletion(roundId, poolId);
    },
    enabled: !!roundId && !!poolId,
    // Shorter staleTime for competition status as it changes frequently
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Live query version of pool completion check
 */
export function useLivePoolCompletion(roundId: number | undefined, poolId: number | undefined) {
  return useLiveQuery(
    async () => {
      if (!roundId || !poolId) return false;
      return poolBoutService.checkBoutsCompletion(roundId, poolId);
    },
    [roundId, poolId],
    { enabled: !!roundId && !!poolId }
  );
}

/**
 * Hook for getting seeding for a round
 */
export function useGetSeedingForRound(roundId: number | undefined) {
  return useQuery({
    queryKey: poolBoutKeys.filter({ roundId, seeding: true }),
    queryFn: async () => {
      if (!roundId) {
        throw new Error('Round ID is required');
      }
      return poolBoutService.getSeedingForRound(roundId);
    },
    enabled: !!roundId,
    // Seeding doesn't change often, so we can cache it longer
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Main hook for pool bouts functionality
 * Aggregates all the individual hooks for convenience
 */
export function usePoolBouts() {
  return {
    // Standard query hooks
    useGetBoutsForPool,
    useUpdateBoutScores,
    useBatchUpdateBoutScores,
    useCheckPoolCompletion,
    useGetSeedingForRound,
    
    // Live query hooks for real-time updates
    useLiveBoutsForPool,
    useLivePoolCompletion,
    
    // Export query keys for external use (like invalidation)
    poolBoutKeys,
  };
}

export default usePoolBouts;