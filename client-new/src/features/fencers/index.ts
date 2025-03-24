/**
 * Fencers management feature
 * Provides access to fencer data and operations
 */

// Export optimized service and hooks implementation
export * from './services/fencerService';
export * from './hooks/useFencers';

// Export legacy repository functionality (for backward compatibility during migration)
// These will be removed once all modules are migrated to the new pattern
export * from './repository';
export * from './hooks/useFencerRepository';
export * from './hooks/useFencerQueries';
export { default as useFencerEventQueries } from './hooks/useFencerEventQueries';

// Component exports
export { default as FencerSelector } from './components/FencerSelector';

// These exports will be added as they are implemented
// export * from './screens';
// export * from './api';