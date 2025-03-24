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

// Export hooks with optimized implementation
export { default as useTournaments } from './hooks/useTournaments';

// Export the tournament types and service functions
export * from './services/tournamentService';

// Export API
export { default as tournamentApi } from './api';
