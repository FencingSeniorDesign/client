/**
 * useTournaments hook
 * Provides reactive data access for tournaments using Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tournamentService from '../services/tournamentService';
import { Tournament, TournamentWithEvents } from '../../../core/types';

// Query keys for cache invalidation
export const TOURNAMENT_KEYS = {
  all: ['tournaments'] as const,
  lists: () => [...TOURNAMENT_KEYS.all, 'list'] as const,
  list: (filters: string) => [...TOURNAMENT_KEYS.lists(), { filters }] as const,
  details: () => [...TOURNAMENT_KEYS.all, 'detail'] as const,
  detail: (name: string) => [...TOURNAMENT_KEYS.details(), name] as const,
};

/**
 * Hook to access tournaments data
 */
export default function useTournaments() {
  const queryClient = useQueryClient();

  // Get all tournaments
  const useAllTournaments = () => {
    return useQuery({
      queryKey: TOURNAMENT_KEYS.lists(),
      queryFn: tournamentService.getAllTournaments,
    });
  };

  // Get tournament by name
  const useTournamentByName = (name: string, includeEvents = false) => {
    return useQuery({
      queryKey: TOURNAMENT_KEYS.detail(name),
      queryFn: () => tournamentService.getTournamentByName(name, includeEvents),
      enabled: !!name,
    });
  };

  // Get active tournaments
  const useActiveTournaments = () => {
    return useQuery({
      queryKey: [...TOURNAMENT_KEYS.lists(), 'active'],
      queryFn: tournamentService.getActiveTournaments,
    });
  };

  // Get completed tournaments
  const useCompletedTournaments = () => {
    return useQuery({
      queryKey: [...TOURNAMENT_KEYS.lists(), 'completed'],
      queryFn: tournamentService.getCompletedTournaments,
    });
  };

  // Create tournament mutation
  const useCreateTournament = () => {
    return useMutation({
      mutationFn: tournamentService.createTournament,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: TOURNAMENT_KEYS.lists() });
      },
    });
  };

  // Update tournament mutation
  const useUpdateTournament = () => {
    return useMutation({
      mutationFn: ({ name, data }: { name: string; data: Partial<Tournament> }) =>
        tournamentService.updateTournament(name, data),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: TOURNAMENT_KEYS.detail(variables.name) });
        queryClient.invalidateQueries({ queryKey: TOURNAMENT_KEYS.lists() });
      },
    });
  };

  // Delete tournament mutation
  const useDeleteTournament = () => {
    return useMutation({
      mutationFn: tournamentService.deleteTournament,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: TOURNAMENT_KEYS.lists() });
      },
    });
  };

  // Update tournament status mutation
  const useUpdateTournamentStatus = () => {
    return useMutation({
      mutationFn: ({ name, isComplete }: { name: string; isComplete: boolean }) =>
        tournamentService.setTournamentStatus(name, isComplete),
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: TOURNAMENT_KEYS.detail(variables.name) });
        queryClient.invalidateQueries({ queryKey: TOURNAMENT_KEYS.lists() });
      },
    });
  };

  return {
    useAllTournaments,
    useTournamentByName,
    useActiveTournaments,
    useCompletedTournaments,
    useCreateTournament,
    useUpdateTournament,
    useDeleteTournament,
    useUpdateTournamentStatus,
  };
}