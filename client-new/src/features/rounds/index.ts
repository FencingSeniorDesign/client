/**
 * Rounds management feature
 * Provides access to round data and operations, including pools and DE brackets
 */

// Export optimized service and hooks implementation
export * from './services/roundService';
export * from './hooks/useRounds';

// Export legacy repository functionality (for backward compatibility during migration)
// These will be removed once all modules are migrated to the new pattern
export * from './repository';
export { useRoundRepository } from './hooks/useRoundRepository';
export { useRoundQueries, roundKeys as legacyRoundKeys } from './hooks/useRoundQueries';

// Domain subdirectories
export * from './pool';
export * from './de';

// Export screens
export { default as RoundManagement } from './screens/RoundManagement';

// Re-export convenience functions (legacy, will be removed)
import roundRepository from './repository';
export const roundRepo = roundRepository;
