import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Fencer } from '../../../core/types';
import { fencerRepository, FencerInsert } from '../repository';
import { createQueryKeys, useInvalidateQueries, RepositoryQueryHooks } from '../../../infrastructure/query/utils';

// Create query keys for fencers
export const fencerKeys = createQueryKeys('fencers');

/**
 * Custom hook for fencer queries
 * Provides React Query hooks for fencer data operations
 */
export const useFencerQueries = (): RepositoryQueryHooks<Fencer, FencerInsert> & {
  useSearchByName: (query: string) => ReturnType<typeof useQuery<Fencer[]>>;
  useFencersByClub: (club: string) => ReturnType<typeof useQuery<Fencer[]>>;
} => {
  const queryClient = useQueryClient();
  const { invalidateByPrefix } = useInvalidateQueries();

  // Get all fencers
  const useGetAll = (
    options?: UseQueryOptions<Fencer[], unknown, Fencer[], unknown[]>
  ) => {
    return useQuery({
      queryKey: fencerKeys.lists(),
      queryFn: () => fencerRepository.findAll(),
      ...options,
    });
  };

  // Get fencer by ID
  const useGetById = (
    id: number,
    options?: UseQueryOptions<Fencer | undefined, unknown, Fencer | undefined, unknown[]>
  ) => {
    return useQuery({
      queryKey: fencerKeys.detail(id),
      queryFn: () => fencerRepository.findById(id),
      enabled: !!id,
      ...options,
    });
  };

  // Search fencers by name
  const useSearchByName = (query: string) => {
    return useQuery({
      queryKey: [...fencerKeys.lists(), 'search', query],
      queryFn: () => fencerRepository.searchByName(query),
      enabled: !!query && query.length > 2, // Only search when query is at least 3 characters
    });
  };

  // Get fencers by club
  const useFencersByClub = (club: string) => {
    return useQuery({
      queryKey: [...fencerKeys.lists(), 'club', club],
      queryFn: () => fencerRepository.findByClub(club),
      enabled: !!club,
    });
  };

  // Create fencer
  const useCreate = (options?: any) => {
    return useMutation({
      mutationFn: (data: FencerInsert) => fencerRepository.create(data),
      onSuccess: () => {
        // Invalidate all fencer queries when a new fencer is created
        invalidateByPrefix('fencers');
      },
      ...options,
    });
  };

  // Update fencer
  const useUpdate = (options?: any) => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number, data: Partial<Fencer> }) => {
        return fencerRepository.update(id, data);
      },
      onSuccess: (_, variables) => {
        // Invalidate the specific fencer and all lists
        queryClient.invalidateQueries({ queryKey: fencerKeys.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
      },
      ...options,
    });
  };

  // Delete fencer
  const useDelete = (options?: any) => {
    return useMutation({
      mutationFn: (id: number) => fencerRepository.delete(id),
      onSuccess: (_, id) => {
        // Invalidate the specific fencer and all lists
        queryClient.invalidateQueries({ queryKey: fencerKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: fencerKeys.lists() });
      },
      ...options,
    });
  };

  return {
    useGetAll,
    useGetById,
    useCreate,
    useUpdate,
    useDelete,
    useSearchByName,
    useFencersByClub,
  };
};

export default useFencerQueries;