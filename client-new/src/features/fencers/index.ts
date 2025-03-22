/**
 * Fencers management feature
 */

// Export service functionality (new service + hooks pattern)
export * from './services/fencerService';
export * from './hooks/useFencers';

// Export legacy repository functionality (for backward compatibility during migration)
export * from './repository';
export * from './hooks/useFencerRepository';
export * from './hooks/useFencerQueries';
export { default as useFencerEventQueries } from './hooks/useFencerEventQueries';

// Component exports
export { default as FencerSelector } from './components/FencerSelector';

// These exports will be added as they are implemented
// export * from './screens';
// export * from './api';