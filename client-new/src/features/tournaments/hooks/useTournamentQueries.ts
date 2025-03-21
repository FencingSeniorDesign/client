import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Tournament } from '../../../core/types';
import { tournamentRepository, TournamentInsert } from '../repository';
import { createQueryKeys, useInvalidateQueries, RepositoryQueryHooks } from '../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import { tournaments } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq } from 'drizzle-orm';

// Create query keys for tournaments
export const tournamentKeys = createQueryKeys('tournaments');

/**
 * Custom hook for tournament queries
 * Provides React Query hooks for tournament data operations
 */
export const useTournamentQueries = (): RepositoryQueryHooks<Tournament, TournamentInsert> & {
  useGetActive: (options?: UseQueryOptions<Tournament[], unknown, Tournament[], unknown[]>) => ReturnType<typeof useQuery>;
  useGetCompleted: (options?: UseQueryOptions<Tournament[], unknown, Tournament[], unknown[]>) => ReturnType<typeof useQuery>;
  useTournaments: (isComplete?: boolean) => ReturnType<typeof useQuery<Tournament[]>>;
  useTournamentByName: (name: string, options?: UseQueryOptions<Tournament | undefined, unknown, Tournament | undefined, unknown[]>) => ReturnType<typeof useQuery>;
} => {
  const queryClient = useQueryClient();
  const { invalidateByPrefix } = useInvalidateQueries();

  // Get all tournaments
  const useGetAll = (
    options?: UseQueryOptions<Tournament[], unknown, Tournament[], unknown[]>
  ) => {
    return useQuery({
      queryKey: tournamentKeys.lists(),
      queryFn: () => tournamentRepository.findAll(),
      ...options,
    });
  };

  // Query for all tournaments, with optional filter by completed status
  const useTournaments = (isComplete?: boolean) => {
    // If isComplete is undefined, get all tournaments, otherwise filter by status
    const queryKey = isComplete !== undefined 
      ? [...tournamentKeys.lists(), isComplete ? 'completed' : 'active']
      : tournamentKeys.lists();
      
    return useQuery({
      queryKey,
      queryFn: () => isComplete !== undefined 
        ? tournamentRepository.findByStatus(isComplete)
        : tournamentRepository.findAll(),
    });
  };

  // Query for a specific tournament by name
  const useTournamentByName = (name: string, options?: UseQueryOptions<Tournament | undefined, unknown, Tournament | undefined, unknown[]>) => {
    return useGetById(name, options);
  };

  // Get tournament by name (id)
  const useGetById = (
    name: string,
    options?: UseQueryOptions<Tournament | undefined, unknown, Tournament | undefined, unknown[]>
  ) => {
    return useQuery({
      queryKey: tournamentKeys.detail(name),
      queryFn: () => tournamentRepository.findById(name),
      enabled: !!name,
      ...options,
    });
  };

  // Get active tournaments
  const useGetActive = (
    options?: UseQueryOptions<Tournament[], unknown, Tournament[], unknown[]>
  ) => {
    return useQuery({
      queryKey: [...tournamentKeys.lists(), 'active'],
      queryFn: () => tournamentRepository.findByStatus(false),
      ...options,
    });
  };

  // Get completed tournaments
  const useGetCompleted = (
    options?: UseQueryOptions<Tournament[], unknown, Tournament[], unknown[]>
  ) => {
    return useQuery({
      queryKey: [...tournamentKeys.lists(), 'completed'],
      queryFn: () => tournamentRepository.findByStatus(true),
      ...options,
    });
  };

  // Create tournament
  const useCreate = (options?: any) => {
    return useMutation({
      mutationFn: (data: TournamentInsert) => tournamentRepository.create(data),
      onSuccess: () => {
        // Invalidate all tournament queries when a new tournament is created
        invalidateByPrefix('tournaments');
      },
      ...options,
    });
  };

  // Update tournament
  const useUpdate = (options?: any) => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string, data: Partial<Tournament> }) => {
        return tournamentRepository.update(id, data);
      },
      onSuccess: (_, variables) => {
        // Invalidate the specific tournament and all lists
        queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(variables.id) });
        queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
      },
      ...options,
    });
  };

  // Delete tournament
  const useDelete = (options?: any) => {
    return useMutation({
      mutationFn: (name: string) => tournamentRepository.delete(name),
      onSuccess: (_, name) => {
        // Invalidate the specific tournament and all lists
        queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(name) });
        queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
      },
      ...options,
    });
  };

  return {
    useGetAll,
    useGetById,
    useGetActive,
    useGetCompleted,
    useCreate,
    useUpdate,
    useDelete,
    useTournaments,
    useTournamentByName,
  };
};

export default useTournamentQueries;