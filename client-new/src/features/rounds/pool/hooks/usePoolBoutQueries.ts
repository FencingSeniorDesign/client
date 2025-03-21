/**
 * Pool bout query hooks
 * React Query hooks for pool bouts with caching and real-time updates
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Fencer } from '../../../../core/types';
import { createQueryKeys } from '../../../../infrastructure/query/utils';
import { usePoolBoutRepository, PoolBout } from './usePoolBoutRepository';

// Query key factory for pool bouts
export const poolBoutKeys = createQueryKeys('poolBouts');

/**
 * Hook for managing pool bout queries and mutations
 */
export const usePoolBoutQueries = () => {
  const queryClient = useQueryClient();
  const poolBoutRepo = usePoolBoutRepository();

  /**
   * Get all bouts for a specific pool
   */
  const useGetBoutsForPool = (roundId: number | undefined, poolId: number | undefined) => {
    return useQuery({
      queryKey: poolBoutKeys.filter({ roundId, poolId }),
      queryFn: async () => {
        if (!roundId || !poolId) {
          throw new Error('Round ID and Pool ID are required');
        }
        const result = await poolBoutRepo.getBoutsForPool(roundId, poolId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.bouts;
      },
      enabled: !!roundId && !!poolId,
    });
  };

  /**
   * Update bout scores
   */
  const useUpdateBoutScores = () => {
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
        const result = await poolBoutRepo.updateBoutScores(boutId, scoreA, scoreB);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.bout;
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
  };

  /**
   * Check completion status for all bouts in a pool
   */
  const useCheckPoolCompletion = (roundId: number | undefined, poolId: number | undefined) => {
    return useQuery({
      queryKey: poolBoutKeys.filter({ roundId, poolId, completion: true }),
      queryFn: async () => {
        if (!roundId || !poolId) {
          throw new Error('Round ID and Pool ID are required');
        }
        const result = await poolBoutRepo.checkBoutsCompletion(roundId, poolId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.isComplete;
      },
      enabled: !!roundId && !!poolId,
    });
  };

  /**
   * Get seeding for a round
   */
  const useGetSeedingForRound = (roundId: number | undefined) => {
    return useQuery({
      queryKey: poolBoutKeys.filter({ roundId, seeding: true }),
      queryFn: async () => {
        if (!roundId) {
          throw new Error('Round ID is required');
        }
        const result = await poolBoutRepo.getSeedingForRound(roundId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.seeding;
      },
      enabled: !!roundId,
    });
  };

  return {
    useGetBoutsForPool,
    useUpdateBoutScores,
    useCheckPoolCompletion,
    useGetSeedingForRound,
    
    // Export query keys for external use (like invalidation)
    poolBoutKeys,
  };
};

export default usePoolBoutQueries;