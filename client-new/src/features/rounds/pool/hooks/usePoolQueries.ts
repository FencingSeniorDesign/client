/**
 * Pool query hooks
 * React Query hooks for pools with caching and real-time updates
 */
import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '../../../../infrastructure/query/utils';
import { usePoolRepository, Pool } from './usePoolRepository';

// Query key factory for pools
export const poolKeys = createQueryKeys('pools');

/**
 * Hook for managing pool queries
 */
export const usePoolQueries = () => {
  const poolRepo = usePoolRepository();

  /**
   * Get all pools for a specific round with their assigned fencers
   */
  const useGetPoolsForRound = (roundId: number | undefined) => {
    return useQuery({
      queryKey: poolKeys.filter({ roundId }),
      queryFn: async () => {
        if (!roundId) {
          throw new Error('Round ID is required');
        }
        const result = await poolRepo.getPoolsForRound(roundId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.pools;
      },
      enabled: !!roundId,
    });
  };

  return {
    useGetPoolsForRound,
  };
};

export default usePoolQueries;