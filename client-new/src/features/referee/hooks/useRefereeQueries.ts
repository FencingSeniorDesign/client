/**
 * Referee query hooks
 * React Query hooks for referee data with live query support
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Referee, Bout, FencerBout } from '../../../core/types';
import { createQueryKeys, useInvalidateQueries } from '../../../infrastructure/query/utils';
import { bouts, fencerBouts, referees } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq, and, or } from 'drizzle-orm';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import refereeRepository, { RefereeInsert } from '../repository';

// Create query keys for referee operations
export const refereeKeys = createQueryKeys('referee');
export const boutKeys = createQueryKeys('bouts');

/**
 * Hook for referee queries and mutations
 */
export const useRefereeQueries = () => {
  const queryClient = useQueryClient();
  const { invalidateByPrefix } = useInvalidateQueries();
  
  /**
   * Query for getting all referees
   */
  const useGetAll = () => {
    return useQuery({
      queryKey: refereeKeys.lists(),
      queryFn: () => refereeRepository.findAll(),
    });
  };

  /**
   * Query for getting a referee by ID
   */
  const useGetById = (id: number | undefined) => {
    return useQuery({
      queryKey: refereeKeys.detail(id),
      queryFn: () => refereeRepository.findById(id),
      enabled: !!id,
    });
  };

  /**
   * Query for getting referees by name
   */
  const useGetByName = (name: string | undefined) => {
    return useQuery({
      queryKey: refereeKeys.filter({ name }),
      queryFn: () => refereeRepository.findByName(name || ''),
      enabled: !!name && name.length > 0,
    });
  };

  /**
   * Query for getting a referee by device ID
   */
  const useGetByDeviceId = (deviceId: string | undefined) => {
    return useQuery({
      queryKey: refereeKeys.filter({ deviceId }),
      queryFn: () => refereeRepository.findByDeviceId(deviceId || ''),
      enabled: !!deviceId,
    });
  };
  
  /**
   * Query for getting active bouts for a referee
   */
  const useGetActiveBouts = (refereeId: number | undefined) => {
    return useQuery({
      queryKey: [...refereeKeys.lists(), 'active', refereeId],
      queryFn: () => refereeRepository.findActiveBoutsByRefereeId(refereeId || 0),
      enabled: !!refereeId,
    });
  };
  
  /**
   * Query for getting a bout with its scores
   */
  const useGetBout = (boutId: number | undefined) => {
    return useQuery({
      queryKey: [...boutKeys.detail(boutId), 'complete'],
      queryFn: async () => {
        if (!boutId) {
          throw new Error('Bout ID is required');
        }
        const result = await refereeRepository.getBoutWithScores(boutId);
        if (!result) {
          throw new Error(`Bout with ID ${boutId} not found`);
        }
        return result;
      },
      enabled: !!boutId,
    });
  };
  
  /**
   * Live query for a bout with scores
   * This hook will automatically update when the bout or scores change
   */
  const useLiveBout = (boutId: number | undefined) => {
    // Query for the bout
    const boutQuery = useQuery({
      queryKey: boutKeys.detail(boutId),
      queryFn: async () => {
        if (!boutId) {
          throw new Error('Bout ID is required');
        }
        const result = await refereeRepository.getBoutWithScores(boutId);
        if (!result) {
          throw new Error(`Bout with ID ${boutId} not found`);
        }
        return result;
      },
      enabled: !!boutId,
    });

    // Set up live query for bout scores
    const liveBoutScoreQuery = useLiveQuery({
      queryKey: ['live', 'boutScores', boutId],
      queryFn: async () => {
        if (!boutId) return [];
        const scores = await db
          .select()
          .from(fencerBouts)
          .where(eq(fencerBouts.boutId, boutId));
        return scores;
      },
      enabled: !!boutId,
      table: 'fencerBouts',
      where: boutId ? `boutId = ${boutId}` : '',
    });

    // Set up live query for bout victor
    const liveBoutQuery = useLiveQuery({
      queryKey: ['live', 'bout', boutId],
      queryFn: async () => {
        if (!boutId) return null;
        const result = await db
          .select()
          .from(bouts)
          .where(eq(bouts.id, boutId))
          .limit(1);
        return result.length > 0 ? result[0] : null;
      },
      enabled: !!boutId,
      table: 'bouts',
      where: boutId ? `id = ${boutId}` : '',
    });

    // Combine the data from regular query and live queries
    const data = boutQuery.data;
    const liveScores = liveBoutScoreQuery.data;
    const liveBout = liveBoutQuery.data;

    // Return a combined result
    return {
      bout: liveBout || (data?.bout),
      scores: liveScores || (data?.scores || []),
      isLoading: boutQuery.isLoading || liveBoutScoreQuery.isLoading || liveBoutQuery.isLoading,
      error: boutQuery.error || liveBoutScoreQuery.error || liveBoutQuery.error,
    };
  };
  
  /**
   * Mutation for updating bout scores
   */
  const useUpdateBoutScores = () => {
    return useMutation({
      mutationFn: async ({ 
        boutId, 
        fencer1Id, 
        fencer1Score, 
        fencer2Id, 
        fencer2Score 
      }: { 
        boutId: number; 
        fencer1Id: number; 
        fencer1Score: number; 
        fencer2Id: number; 
        fencer2Score: number; 
      }) => {
        await refereeRepository.updateBoutScores(
          boutId,
          fencer1Id,
          fencer1Score,
          fencer2Id,
          fencer2Score
        );
        return { boutId, fencer1Id, fencer2Id };
      },
      onSuccess: (_, variables) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: boutKeys.detail(variables.boutId) });
        queryClient.invalidateQueries({ queryKey: ['live', 'boutScores', variables.boutId] });
      },
    });
  };
  
  /**
   * Mutation for setting a bout victor
   */
  const useSetBoutVictor = () => {
    return useMutation({
      mutationFn: async ({ boutId, victorId }: { boutId: number; victorId: number }) => {
        await refereeRepository.setBoutVictor(boutId, victorId);
        return { boutId, victorId };
      },
      onSuccess: (_, variables) => {
        // Invalidate bout details and referee's active bouts
        queryClient.invalidateQueries({ queryKey: boutKeys.detail(variables.boutId) });
        queryClient.invalidateQueries({ queryKey: ['live', 'bout', variables.boutId] });
        queryClient.invalidateQueries({ queryKey: boutKeys.filter({ active: true }) });
        invalidateByPrefix('referee');
      },
    });
  };
  
  /**
   * Mutation for creating a referee
   */
  const useCreate = () => {
    return useMutation({
      mutationFn: (data: RefereeInsert) => refereeRepository.create(data),
      onSuccess: () => {
        // Invalidate referee lists
        queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
      },
    });
  };

  /**
   * Mutation for updating a referee
   */
  const useUpdate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<Referee> }) => 
        refereeRepository.update(id, data),
      onSuccess: (referee) => {
        if (referee) {
          queryClient.invalidateQueries({ queryKey: refereeKeys.detail(referee.id) });
          queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
        }
      },
    });
  };

  /**
   * Mutation for deleting a referee
   */
  const useDelete = () => {
    return useMutation({
      mutationFn: (id: number) => refereeRepository.delete(id),
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: refereeKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: refereeKeys.lists() });
      },
    });
  };
  
  return {
    // Queries
    useGetAll,
    useGetById,
    useGetByName,
    useGetByDeviceId,
    useGetActiveBouts,
    useGetBout,
    useLiveBout,
    
    // Mutations
    useCreate,
    useUpdate,
    useDelete,
    useUpdateBoutScores,
    useSetBoutVictor,
  };
};

export default useRefereeQueries;