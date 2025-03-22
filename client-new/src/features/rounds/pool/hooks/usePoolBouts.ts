/**
 * Pool Bouts Hooks
 * React hooks for accessing and manipulating pool bout data
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as poolBoutService from '../services/poolBoutService';
import { createQueryKeys } from '../../../../infrastructure/query/utils';

// Query key factory for pool bouts
export const poolBoutKeys = createQueryKeys('poolBouts');

/**
 * Hook for getting all bouts for a specific pool
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
  });
}

/**
 * Hook for updating bout scores
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
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: poolBoutKeys.filter({ 
          roundId: variables.roundId, 
          poolId: variables.poolId 
        }) 
      });
      
      // Invalidate the specific bout
      queryClient.invalidateQueries({ 
        queryKey: poolBoutKeys.detail(variables.boutId) 
      });
    },
  });
}

/**
 * Hook for checking if all bouts in a pool are complete
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
  });
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
  });
}

/**
 * Main hook for pool bouts functionality
 * Aggregates all the individual hooks for convenience
 */
export function usePoolBouts() {
  return {
    useGetBoutsForPool,
    useUpdateBoutScores,
    useCheckPoolCompletion,
    useGetSeedingForRound,
    
    // Export query keys for external use (like invalidation)
    poolBoutKeys,
  };
}

export default usePoolBouts;