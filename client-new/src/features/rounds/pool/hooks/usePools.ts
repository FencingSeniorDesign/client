/**
 * Pool Hooks
 * React hooks for accessing and manipulating pool data
 */
import { useQuery } from '@tanstack/react-query';
import * as poolService from '../services/poolService';
import { createQueryKeys } from '../../../../infrastructure/query/utils';

// Query key factory for pools
export const poolKeys = createQueryKeys('pools');

/**
 * Hook for getting all pools for a specific round with their assigned fencers
 */
export function useGetPoolsForRound(roundId: number | undefined) {
  return useQuery({
    queryKey: poolKeys.filter({ roundId }),
    queryFn: async () => {
      if (!roundId) {
        throw new Error('Round ID is required');
      }
      return poolService.getPoolsForRound(roundId);
    },
    enabled: !!roundId,
  });
}

/**
 * Main hook for pools functionality
 * Aggregates all the individual hooks for convenience
 */
export function usePools() {
  return {
    useGetPoolsForRound,
    
    // Export query keys for external use (like invalidation)
    poolKeys,
  };
}

export default usePools;