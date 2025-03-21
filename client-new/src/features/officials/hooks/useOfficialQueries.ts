/**
 * Official query hooks
 * React Query hooks for official data with live query support
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Official } from '../../../core/types';
import { createQueryKeys } from '../../../infrastructure/query/utils';
import officialRepository, { OfficialInsert } from '../repository';
import { useOfficialRepository } from './useOfficialRepository';

// Query key factory for officials
export const officialKeys = createQueryKeys('officials');

/**
 * Hook for official queries and mutations
 */
export const useOfficialQueries = () => {
  const queryClient = useQueryClient();
  const officialRepo = useOfficialRepository();

  /**
   * Query for getting all officials
   */
  const useGetAll = () => {
    return useQuery({
      queryKey: officialKeys.lists(),
      queryFn: async () => {
        const result = await officialRepo.getAll();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.officials;
      },
    });
  };

  /**
   * Query for getting an official by ID
   */
  const useGetById = (id: number | undefined) => {
    return useQuery({
      queryKey: officialKeys.detail(id),
      queryFn: async () => {
        if (!id) {
          throw new Error('Official ID is required');
        }
        const result = await officialRepo.getById(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.official;
      },
      enabled: !!id,
    });
  };

  /**
   * Query for searching officials by name
   */
  const useSearchByName = (query: string | undefined) => {
    return useQuery({
      queryKey: officialKeys.filter({ query }),
      queryFn: async () => {
        if (!query || query.trim() === '') {
          return [];
        }
        const result = await officialRepo.searchByName(query);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.officials;
      },
      enabled: !!query && query.trim() !== '',
    });
  };

  /**
   * Query for getting officials by event
   */
  const useGetByEvent = (eventId: number | undefined) => {
    return useQuery({
      queryKey: officialKeys.filter({ eventId }),
      queryFn: async () => {
        if (!eventId) {
          throw new Error('Event ID is required');
        }
        const result = await officialRepo.getOfficialsByEvent(eventId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.officials;
      },
      enabled: !!eventId,
    });
  };

  /**
   * Query for getting events by official
   */
  const useGetEventsByOfficial = (officialId: number | undefined) => {
    return useQuery({
      queryKey: officialKeys.filter({ officialId, events: true }),
      queryFn: async () => {
        if (!officialId) {
          throw new Error('Official ID is required');
        }
        const result = await officialRepo.getEventsByOfficial(officialId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.eventIds;
      },
      enabled: !!officialId,
    });
  };

  /**
   * Mutation for creating an official
   */
  const useCreate = () => {
    return useMutation({
      mutationFn: async (data: OfficialInsert) => {
        const result = await officialRepo.createOfficial(data);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.official;
      },
      onSuccess: (official) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
        queryClient.invalidateQueries({ queryKey: officialKeys.detail(official.id) });
      },
    });
  };

  /**
   * Mutation for updating an official
   */
  const useUpdate = () => {
    return useMutation({
      mutationFn: async ({ id, data }: { id: number; data: Partial<Official> }) => {
        const result = await officialRepo.updateOfficial(id, data);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.official;
      },
      onSuccess: (official) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: officialKeys.detail(official.id) });
        queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
        queryClient.invalidateQueries({ queryKey: officialKeys.filter({ officialId: official.id }) });
      },
    });
  };

  /**
   * Mutation for deleting an official
   */
  const useDelete = () => {
    return useMutation({
      mutationFn: async (id: number) => {
        const result = await officialRepo.deleteOfficial(id);
        if (!result.success) {
          throw new Error(result.error);
        }
        return id;
      },
      onSuccess: (id) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: officialKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: officialKeys.lists() });
        queryClient.invalidateQueries({ queryKey: officialKeys.filter({ officialId: id }) });
      },
    });
  };

  /**
   * Mutation for assigning an official to an event
   */
  const useAssignToEvent = () => {
    return useMutation({
      mutationFn: async ({ officialId, eventId }: { officialId: number; eventId: number }) => {
        const result = await officialRepo.assignToEvent(officialId, eventId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return { officialId, eventId };
      },
      onSuccess: ({ officialId, eventId }) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: officialKeys.filter({ eventId }) });
        queryClient.invalidateQueries({ queryKey: officialKeys.filter({ officialId, events: true }) });
      },
    });
  };

  /**
   * Mutation for removing an official from an event
   */
  const useRemoveFromEvent = () => {
    return useMutation({
      mutationFn: async ({ officialId, eventId }: { officialId: number; eventId: number }) => {
        const result = await officialRepo.removeFromEvent(officialId, eventId);
        if (!result.success) {
          throw new Error(result.error);
        }
        return { officialId, eventId };
      },
      onSuccess: ({ officialId, eventId }) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: officialKeys.filter({ eventId }) });
        queryClient.invalidateQueries({ queryKey: officialKeys.filter({ officialId, events: true }) });
      },
    });
  };

  return {
    // Queries
    useGetAll,
    useGetById,
    useSearchByName,
    useGetByEvent,
    useGetEventsByOfficial,
    
    // Mutations
    useCreate,
    useUpdate,
    useDelete,
    useAssignToEvent,
    useRemoveFromEvent,
  };
};

export default useOfficialQueries;