/**
 * Tournament feature module
 * Export all components, hooks, and utilities related to tournaments
 */

// Export screens
export { default as HomeScreen } from './screens/Home';

// Export components
export { default as TournamentList } from './components/TournamentList';
export { default as TournamentListContainer } from './components/TournamentListContainer';
export { default as CreateTournamentModal } from './components/CreateTournamentModal';
export { default as JoinTournamentModal } from './components/JoinTournamentModal';

// Export hooks
export { useTournamentQueries } from './hooks/useTournamentQueries';
export { useTournamentRepository } from './hooks/useTournamentRepository';

// Export repository and types
export { 
  tournamentRepository,
  type TournamentInsert,
  type ITournamentRepository,
  getAllTournaments,
  getTournamentByName,
  createTournament,
  deleteTournament,
  getActiveTournaments,
  getCompletedTournaments
} from './repository';

// Export API
export { default as tournamentApi } from './api';
