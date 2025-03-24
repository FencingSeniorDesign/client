/**
 * useRounds hook
 * Provides reactive data access for rounds using Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as roundService from '../services/roundService';
import { Round, RoundWithDetails } from '../../../core/types';

// Query keys for cache invalidation
export const ROUND_KEYS = {
  all: ['rounds'] as const,
  lists: () => [...ROUND_KEYS.all, 'list'] as const,
  list: (filters: any) => [...ROUND_KEYS.lists(), { filters }] as const,
  details: () => [...ROUND_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...ROUND_KEYS.details(), id] as const,
  byEvent: (eventId: number) => [...ROUND_KEYS.lists(), { event: eventId }] as const,
  pools: (roundId: number) => [...ROUND_KEYS.detail(roundId), 'pools'] as const,
  pool: (roundId: number, poolId: number) => [...ROUND_KEYS.pools(roundId), poolId] as const,
  bouts: (roundId: number, poolId?: number) => 
    poolId 
      ? [...ROUND_KEYS.pool(roundId, poolId), 'bouts']
      : [...ROUND_KEYS.detail(roundId), 'bouts'],
  bout: (boutId: number) => [...ROUND_KEYS.all, 'bout', boutId] as const,
};

/**
 * Hook to access rounds data
 */
export default function useRounds() {
  const queryClient = useQueryClient();

  // Get all rounds
  const useAllRounds = () => {
    return useQuery({
      queryKey: ROUND_KEYS.lists(),
      queryFn: roundService.getAllRounds,
    });
  };

  // Get round by ID
  const useRoundById = (id: number, includeDetails = false) => {
    return useQuery({
      queryKey: ROUND_KEYS.detail(id),
      queryFn: () => roundService.getRoundById(id, includeDetails),
      enabled: !!id,
    });
  };

  // Get rounds by event
  const useRoundsByEvent = (eventId: number) => {
    return useQuery({
      queryKey: ROUND_KEYS.byEvent(eventId),
      queryFn: () => roundService.getRoundsByEvent(eventId),
      enabled: !!eventId,
    });
  };

  // Create round mutation
  const useCreateRound = () => {
    return useMutation({
      mutationFn: roundService.createRound,
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.lists() });
        if (data.eventId) {
          queryClient.invalidateQueries({ queryKey: ROUND_KEYS.byEvent(data.eventId) });
        }
      },
    });
  };

  // Update round mutation
  const useUpdateRound = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Round> }) =>
        roundService.updateRound(id, data),
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.lists() });
        if (data?.eventId) {
          queryClient.invalidateQueries({ queryKey: ROUND_KEYS.byEvent(data.eventId) });
        }
      },
    });
  };

  // Delete round mutation
  const useDeleteRound = () => {
    return useMutation({
      mutationFn: roundService.deleteRound,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.lists() });
      },
    });
  };

  // Get pools for a round
  const usePoolsByRound = (roundId: number) => {
    return useQuery({
      queryKey: ROUND_KEYS.pools(roundId),
      queryFn: () => roundService.getPoolsByRound(roundId),
      enabled: !!roundId,
    });
  };

  // Get pool details
  const usePoolDetails = (roundId: number, poolId: number) => {
    return useQuery({
      queryKey: ROUND_KEYS.pool(roundId, poolId),
      queryFn: () => roundService.getPoolDetails(roundId, poolId),
      enabled: !!roundId && !!poolId,
    });
  };

  // Get bouts for a pool
  const usePoolBouts = (roundId: number, poolId: number) => {
    return useQuery({
      queryKey: ROUND_KEYS.bouts(roundId, poolId),
      queryFn: () => roundService.getPoolBouts(roundId, poolId),
      enabled: !!roundId && !!poolId,
    });
  };

  // Get all bouts for a round
  const useRoundBouts = (roundId: number) => {
    return useQuery({
      queryKey: ROUND_KEYS.bouts(roundId),
      queryFn: () => roundService.getRoundBouts(roundId),
      enabled: !!roundId,
    });
  };

  // Update bout score mutation
  const useUpdateBoutScore = () => {
    return useMutation({
      mutationFn: ({ 
        boutId, 
        scoreA, 
        scoreB 
      }: { 
        boutId: number; 
        scoreA: number; 
        scoreB: number;
      }) => roundService.updateBoutScore(boutId, scoreA, scoreB),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.bout(data.id) });
        if (data.roundId) {
          queryClient.invalidateQueries({ queryKey: ROUND_KEYS.bouts(data.roundId) });
          if (data.poolId) {
            queryClient.invalidateQueries({ queryKey: ROUND_KEYS.bouts(data.roundId, data.poolId) });
          }
        }
      },
    });
  };

  // Complete round mutation
  const useCompleteRound = () => {
    return useMutation({
      mutationFn: (roundId: number) => roundService.completeRound(roundId),
      onSuccess: (_, roundId) => {
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.detail(roundId) });
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.lists() });
      },
    });
  };

  // Get round results
  const useRoundResults = (roundId: number) => {
    return useQuery({
      queryKey: [...ROUND_KEYS.detail(roundId), 'results'],
      queryFn: () => roundService.getRoundResults(roundId),
      enabled: !!roundId,
    });
  };

  // Create pool assignment mutation
  const useCreatePoolAssignment = () => {
    return useMutation({
      mutationFn: ({ 
        roundId, 
        fencerIds
      }: { 
        roundId: number; 
        fencerIds: number[];
      }) => roundService.createPoolAssignment(roundId, fencerIds),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.detail(variables.roundId) });
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.pools(variables.roundId) });
      },
    });
  };

  // Create direct elimination bracket mutation
  const useCreateDEBracket = () => {
    return useMutation({
      mutationFn: ({ 
        roundId, 
        fencerIds,
        format
      }: { 
        roundId: number; 
        fencerIds: number[];
        format: string;
      }) => roundService.createDEBracket(roundId, fencerIds, format),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.detail(variables.roundId) });
        queryClient.invalidateQueries({ queryKey: ROUND_KEYS.bouts(variables.roundId) });
      },
    });
  };

  return {
    useAllRounds,
    useRoundById,
    useRoundsByEvent,
    useCreateRound,
    useUpdateRound,
    useDeleteRound,
    usePoolsByRound,
    usePoolDetails,
    usePoolBouts,
    useRoundBouts,
    useUpdateBoutScore,
    useCompleteRound,
    useRoundResults,
    useCreatePoolAssignment,
    useCreateDEBracket,
  };
}