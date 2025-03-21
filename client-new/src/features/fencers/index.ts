/**
 * Fencers management feature
 */

// Export repository functionality
export * from './repository';

// Export hooks for accessing fencer data
export * from './hooks/useFencerRepository';
export * from './hooks/useFencerQueries';
export { default as useFencerEventQueries } from './hooks/useFencerEventQueries';

// Component exports
export { default as FencerSelector } from './components/FencerSelector';

// These exports will be added as they are implemented
// export * from './screens';
// export * from './services';
// export * from './api';