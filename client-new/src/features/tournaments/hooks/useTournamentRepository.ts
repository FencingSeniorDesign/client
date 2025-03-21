import { useCallback } from 'react';
import { tournamentRepository } from '../repository';

/**
 * Hook for accessing the tournament repository
 * Provides a consistent way to access the repository from components
 */
export function useTournamentRepository() {
  // Return the singleton instance of the repository
  return tournamentRepository;
}

/**
 * Hook for deleting a tournament with error handling
 */
export function useDeleteTournament() {
  const deleteTournament = useCallback(async (name: string) => {
    try {
      await tournamentRepository.delete(name);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete tournament:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, []);

  return deleteTournament;
}

/**
 * Hook for creating a new tournament with error handling
 */
export function useCreateTournament() {
  const createTournament = useCallback(async (name: string) => {
    try {
      const tournament = await tournamentRepository.createWithName(name);
      return { success: true, tournament };
    } catch (error) {
      console.error('Failed to create tournament:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, []);

  return createTournament;
}

export default useTournamentRepository;