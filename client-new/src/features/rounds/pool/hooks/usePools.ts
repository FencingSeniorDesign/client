/**
 * Pool Hooks
 * React hooks for accessing and manipulating pool data with optimized Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as poolService from '../services/poolService';
import { createQueryKeys } from '../../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../../infrastructure/database/live-query';
import { Pool, PoolAssignment } from '../services/poolService';

// Query key factory for pools
export const poolKeys = createQueryKeys('pools');

/**
 * Hook for getting all pools for a specific round with their assigned fencers
 * Uses optimized query configuration
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
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
    // Pool structure doesn't change often once created
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Live query version of getting pools
 * Automatically updates when underlying data changes
 */
export function useLivePoolsForRound(roundId: number | undefined) {
  return useLiveQuery(
    async () => {
      if (!roundId) return [];
      return poolService.getPoolsForRound(roundId);
    },
    [roundId],
    { enabled: !!roundId }
  );
}

/**
 * Hook for creating pool assignments in batch
 */
export function useCreatePoolAssignments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      assignments, 
      roundId 
    }: { 
      assignments: PoolAssignment[], 
      roundId: number
    }) => {
      return poolService.createPoolAssignments(assignments);
    },
    onSuccess: (data, variables) => {
      // Invalidate pools for this round
      queryClient.invalidateQueries({
        queryKey: poolKeys.filter({ roundId: variables.roundId })
      });
      
      // Also invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['poolBouts', 'list']
      });
    },
  });
}

/**
 * Hook for updating pool assignments in batch
 */
export function useUpdatePoolAssignments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      assignments, 
      roundId 
    }: { 
      assignments: PoolAssignment[], 
      roundId: number
    }) => {
      return poolService.updatePoolAssignments(assignments);
    },
    // Implement optimistic updates
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: poolKeys.filter({ roundId: variables.roundId })
      });
      
      // Get current pools data
      const previousPools = queryClient.getQueryData<Pool[]>(
        poolKeys.filter({ roundId: variables.roundId })
      );
      
      // Create a map of assignments by pool and fencer ID
      const assignmentMap: Record<string, number> = {};
      variables.assignments.forEach(a => {
        const key = `${a.poolId}-${a.fencerId}`;
        assignmentMap[key] = a.fencerIdInPool;
      });
      
      // Optimistically update pools data
      if (previousPools) {
        queryClient.setQueryData<Pool[]>(
          poolKeys.filter({ roundId: variables.roundId }),
          (old) => {
            if (!old) return [];
            
            return old.map(pool => {
              return {
                ...pool,
                fencers: pool.fencers.map(fencer => {
                  const key = `${pool.poolid}-${fencer.id}`;
                  if (assignmentMap[key] !== undefined) {
                    return {
                      ...fencer,
                      poolNumber: assignmentMap[key]
                    };
                  }
                  return fencer;
                })
              };
            });
          }
        );
      }
      
      return { previousPools };
    },
    // If mutation fails, roll back
    onError: (error, variables, context) => {
      if (context?.previousPools) {
        queryClient.setQueryData(
          poolKeys.filter({ roundId: variables.roundId }),
          context.previousPools
        );
      }
    },
    // After success or error, refetch
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({
        queryKey: poolKeys.filter({ roundId: variables.roundId })
      });
    },
  });
}

/**
 * Hook for deleting pool assignments
 */
export function useDeletePoolAssignments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      roundId, 
      poolIds 
    }: { 
      roundId: number, 
      poolIds?: number[] 
    }) => {
      return poolService.deletePoolAssignments(roundId, poolIds);
    },
    onSuccess: (data, variables) => {
      // Invalidate pools for this round
      queryClient.invalidateQueries({
        queryKey: poolKeys.filter({ roundId: variables.roundId })
      });
      
      // Also invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['poolBouts', 'list']
      });
    },
  });
}

/**
 * Main hook for pools functionality
 * Aggregates all the individual hooks for convenience
 */
export function usePools() {
  return {
    // Standard query hooks
    useGetPoolsForRound,
    useCreatePoolAssignments,
    useUpdatePoolAssignments,
    useDeletePoolAssignments,
    
    // Live query hooks
    useLivePoolsForRound,
    
    // Export query keys for external use (like invalidation)
    poolKeys,
  };
}

export default usePools;