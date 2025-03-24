/**
 * Tournament Hooks
 * React hooks for accessing and manipulating tournament data with optimized Tanstack Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tournamentService from '../services/tournamentService';
import { createQueryKeys } from '../../../infrastructure/query/utils';
import { useLiveQuery } from '../../../infrastructure/database/live-query';
import { tournaments } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq } from 'drizzle-orm';
import { Tournament } from '../../../core/types';
import { TournamentInsert, TournamentWithEvents, BatchTournamentUpdate } from '../services/tournamentService';

// Query key factory for tournaments
export const tournamentKeys = createQueryKeys('tournaments');

/**
 * Hook for getting all tournaments with optimized configuration
 */
export function useGetAllTournaments() {
  return useQuery({
    queryKey: tournamentKeys.lists(),
    queryFn: tournamentService.getAllTournaments,
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
    // Tournaments don't change very frequently
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Live query version of getting all tournaments
 * Automatically updates when underlying data changes
 */
export function useLiveTournaments() {
  return useLiveQuery(
    db.select().from(tournaments),
    [],
    { staleTime: 1000 } // 1 second stale time for live updates
  );
}

/**
 * Hook for getting tournament by name with optimized configuration
 */
export function useGetTournamentByName(name: string | undefined, includeEvents = false) {
  return useQuery({
    queryKey: [...tournamentKeys.detail(name || ''), { events: includeEvents }],
    queryFn: async () => {
      if (!name) {
        throw new Error('Tournament name is required');
      }
      return tournamentService.getTournamentByName(name, includeEvents);
    },
    enabled: !!name,
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
  });
}

/**
 * Live query version of getting tournament by name
 */
export function useLiveTournamentByName(name: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!name) return null;
      return db.select().from(tournaments).where(eq(tournaments.name, name));
    },
    [name],
    { enabled: !!name }
  );
}

/**
 * Hook for getting tournaments by status with optimized configuration
 */
export function useGetTournamentsByStatus(isComplete: boolean) {
  return useQuery({
    queryKey: [...tournamentKeys.lists(), 'status', isComplete],
    queryFn: () => tournamentService.getTournamentsByStatus(isComplete),
    // Keep previous data while fetching for smoother UI
    keepPreviousData: true,
  });
}

/**
 * Hook for getting active tournaments
 */
export function useGetActiveTournaments() {
  return useGetTournamentsByStatus(false);
}

/**
 * Hook for getting completed tournaments
 */
export function useGetCompletedTournaments() {
  return useGetTournamentsByStatus(true);
}

/**
 * Hook for creating a tournament with optimized invalidation
 */
export function useCreateTournament() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nameOrData: string | TournamentInsert) => 
      tournamentService.createTournament(nameOrData),
    onSuccess: (data) => {
      // Invalidate all tournament lists
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
      
      // Add the new tournament to the cache
      queryClient.setQueryData(
        tournamentKeys.detail(data.name),
        data
      );
    },
  });
}

/**
 * Hook for creating multiple tournaments in batch
 */
export function useCreateTournaments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tournamentsList: TournamentInsert[]) => 
      tournamentService.createTournaments(tournamentsList),
    onSuccess: (data) => {
      // Invalidate all tournament lists
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
      
      // Add each new tournament to the cache
      data.forEach(tournament => {
        queryClient.setQueryData(
          tournamentKeys.detail(tournament.name),
          tournament
        );
      });
    },
  });
}

/**
 * Hook for updating a tournament with optimistic updates
 */
export function useUpdateTournament() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, data }: { name: string, data: Partial<Tournament> }) => 
      tournamentService.updateTournament(name, data),
    
    // Implement optimistic updates for better UX
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: tournamentKeys.detail(variables.name) });
      
      // Get current data
      const previousTournament = queryClient.getQueryData<Tournament | TournamentWithEvents>(
        tournamentKeys.detail(variables.name)
      );
      
      // Optimistically update the UI
      if (previousTournament) {
        queryClient.setQueryData(
          tournamentKeys.detail(variables.name),
          {
            ...previousTournament,
            ...variables.data
          }
        );
      }
      
      // Return context with the previous data
      return { previousTournament };
    },
    
    // If the mutation fails, roll back to the previous state
    onError: (error, variables, context) => {
      if (context?.previousTournament) {
        queryClient.setQueryData(
          tournamentKeys.detail(variables.name),
          context.previousTournament
        );
      }
    },
    
    // After success or error, refetch to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate the specific tournament
      queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(variables.name) });
      
      // Also invalidate lists that might include this tournament
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
    },
  });
}

/**
 * Hook for setting tournament completion status
 */
export function useSetTournamentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, isComplete }: { name: string, isComplete: boolean }) => 
      tournamentService.setTournamentStatus(name, isComplete),
    
    // Implement optimistic updates for better UX
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: tournamentKeys.detail(variables.name) });
      
      // Get current data
      const previousTournament = queryClient.getQueryData<Tournament | TournamentWithEvents>(
        tournamentKeys.detail(variables.name)
      );
      
      // Optimistically update the UI
      if (previousTournament) {
        queryClient.setQueryData(
          tournamentKeys.detail(variables.name),
          {
            ...previousTournament,
            isComplete: variables.isComplete
          }
        );
      }
      
      // Return context with the previous data
      return { previousTournament };
    },
    
    // If the mutation fails, roll back
    onError: (error, variables, context) => {
      if (context?.previousTournament) {
        queryClient.setQueryData(
          tournamentKeys.detail(variables.name),
          context.previousTournament
        );
      }
    },
    
    // After success or error, refetch to ensure consistency
    onSettled: (data, error, variables) => {
      // Invalidate the specific tournament
      queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(variables.name) });
      
      // Also invalidate status-specific lists
      queryClient.invalidateQueries({ 
        queryKey: [...tournamentKeys.lists(), 'status', variables.isComplete] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [...tournamentKeys.lists(), 'status', !variables.isComplete] 
      });
    },
  });
}

/**
 * Hook for batch updating tournaments
 */
export function useBatchUpdateTournaments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: BatchTournamentUpdate[]) => 
      tournamentService.batchUpdateTournaments(updates),
    onSuccess: (data) => {
      // Invalidate specific tournaments
      data.forEach(tournament => {
        queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(tournament.name) });
      });
      
      // Invalidate all tournament lists
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
    },
  });
}

/**
 * Hook for deleting a tournament with optimistic updates
 */
export function useDeleteTournament() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (name: string) => tournamentService.deleteTournament(name),
    
    // Implement optimistic updates
    onMutate: async (name) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: tournamentKeys.detail(name) });
      await queryClient.cancelQueries({ queryKey: tournamentKeys.lists() });
      
      // Get current data
      const previousTournament = queryClient.getQueryData<Tournament>(
        tournamentKeys.detail(name)
      );
      
      // Get current lists data
      const previousTournamentList = queryClient.getQueryData<Tournament[]>(
        tournamentKeys.lists()
      );
      
      const previousActiveTournaments = queryClient.getQueryData<Tournament[]>(
        [...tournamentKeys.lists(), 'status', false]
      );
      
      const previousCompletedTournaments = queryClient.getQueryData<Tournament[]>(
        [...tournamentKeys.lists(), 'status', true]
      );
      
      // Optimistically update the lists
      if (previousTournamentList) {
        queryClient.setQueryData(
          tournamentKeys.lists(),
          previousTournamentList.filter(t => t.name !== name)
        );
      }
      
      if (previousActiveTournaments) {
        queryClient.setQueryData(
          [...tournamentKeys.lists(), 'status', false],
          previousActiveTournaments.filter(t => t.name !== name)
        );
      }
      
      if (previousCompletedTournaments) {
        queryClient.setQueryData(
          [...tournamentKeys.lists(), 'status', true],
          previousCompletedTournaments.filter(t => t.name !== name)
        );
      }
      
      // Return context with the previous data
      return { 
        previousTournament, 
        previousTournamentList,
        previousActiveTournaments,
        previousCompletedTournaments
      };
    },
    
    // If the mutation fails, roll back
    onError: (error, name, context) => {
      if (context?.previousTournament) {
        queryClient.setQueryData(
          tournamentKeys.detail(name),
          context.previousTournament
        );
      }
      
      if (context?.previousTournamentList) {
        queryClient.setQueryData(
          tournamentKeys.lists(),
          context.previousTournamentList
        );
      }
      
      if (context?.previousActiveTournaments) {
        queryClient.setQueryData(
          [...tournamentKeys.lists(), 'status', false],
          context.previousActiveTournaments
        );
      }
      
      if (context?.previousCompletedTournaments) {
        queryClient.setQueryData(
          [...tournamentKeys.lists(), 'status', true],
          context.previousCompletedTournaments
        );
      }
    },
    
    // After success or error, refetch to ensure consistency
    onSettled: (data, error, name) => {
      // Remove the tournament from the cache
      queryClient.removeQueries({ queryKey: tournamentKeys.detail(name) });
      
      // Invalidate all tournament lists
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
      
      // Also invalidate events related to this tournament
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'list', 'tournament', name] 
      });
    },
  });
}

/**
 * Hook for batch deleting tournaments
 */
export function useBatchDeleteTournaments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (names: string[]) => 
      tournamentService.batchDeleteTournaments(names),
    onSuccess: (_, names) => {
      // Remove specific tournaments from the cache
      names.forEach(name => {
        queryClient.removeQueries({ queryKey: tournamentKeys.detail(name) });
        
        // Also invalidate events related to this tournament
        queryClient.invalidateQueries({ 
          queryKey: ['events', 'list', 'tournament', name] 
        });
      });
      
      // Invalidate all tournament lists
      queryClient.invalidateQueries({ queryKey: tournamentKeys.lists() });
    },
  });
}

/**
 * Hook for getting tournament count
 */
export function useGetTournamentCount() {
  return useQuery({
    queryKey: [...tournamentKeys.lists(), 'count'],
    queryFn: tournamentService.getTournamentCount,
  });
}

/**
 * Main hook that provides all tournament-related hooks
 */
export function useTournaments() {
  return {
    // Query hooks
    useGetAllTournaments,
    useGetTournamentByName,
    useGetTournamentsByStatus,
    useGetActiveTournaments,
    useGetCompletedTournaments,
    useGetTournamentCount,
    
    // Live query hooks
    useLiveTournaments,
    useLiveTournamentByName,
    
    // Mutation hooks
    useCreateTournament,
    useCreateTournaments,
    useUpdateTournament,
    useSetTournamentStatus,
    useBatchUpdateTournaments,
    useDeleteTournament,
    useBatchDeleteTournaments,
    
    // Query keys for external use
    tournamentKeys,
  };
}

export default useTournaments;