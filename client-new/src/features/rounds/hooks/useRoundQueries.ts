/**
 * Round query hooks
 * React Query hooks for round data with live query support
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Round, RoundType, PoolsOption, DEFormat } from '../../../core/types';
import { createQueryKeys } from '../../../infrastructure/query/utils';
import roundRepository, { RoundInsert } from '../repository';
import { useRoundRepository } from './useRoundRepository';

// Query key factory for rounds
export const roundKeys = createQueryKeys('rounds');

/**
 * Hook for round queries and mutations
 */
export const useRoundQueries = () => {
  const queryClient = useQueryClient();
  const roundRepo = useRoundRepository();

  /**
   * Query for getting all rounds
   */
  const useGetAll = () => {
    return useQuery({
      queryKey: roundKeys.lists(),
      queryFn: async () => {
        const result = await roundRepo.getAll();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.rounds;
      },
    });
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
        const result = await roundRepo.getById(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.round;
      },
      enabled: !!id,
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
        const result = await roundRepo.getByEventId(eventId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.rounds;
      },
      enabled: !!eventId,
    });
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
        const result = await roundRepo.getByEventIdAndType(eventId, type);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.rounds;
      },
      enabled: !!eventId && !!type,
    });
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
        const result = await roundRepo.getCurrentRound(eventId);
        if (!result.success) {
          return null; // It's OK to not have a current round
        }
        return result.round;
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
        const result = await roundRepo.createPoolRound(eventId, rorder, poolCount, poolSize, options);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.round;
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
        const result = await roundRepo.createDERound(eventId, rorder, deFormat, deTableSize);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.round;
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
        const result = await roundRepo.createRound(data);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.round;
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
        const result = await roundRepo.updateRound(id, data);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.round;
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
        const round = await roundRepository.findById(id);
        const result = await roundRepo.deleteRound(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return { id, eventId: round?.eventId };
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
        const result = await roundRepo.markAsStarted(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.round;
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
        const result = await roundRepo.markAsComplete(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.round;
      },
      onSuccess: (round) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: roundKeys.detail(round.id) });
        queryClient.invalidateQueries({ queryKey: roundKeys.filter({ eventId: round.eventId, current: true }) });
      },
    });
  };

  return {
    // Queries
    useGetAll,
    useGetById,
    useGetByEventId,
    useGetByEventIdAndType,
    useGetCurrentRound,
    
    // Mutations
    useCreatePoolRound,
    useCreateDERound,
    useCreate,
    useUpdate,
    useDelete,
    useMarkAsStarted,
    useMarkAsComplete,
  };
};

export default useRoundQueries;