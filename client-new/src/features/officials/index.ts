/**
 * Officials management feature
 */

// export * from './components';
export * from './screens';
// export * from './services';
// export * from './api';
export * from './repository';

// Hooks exports
export { useOfficialRepository } from './hooks/useOfficialRepository';
export { useOfficialQueries, officialKeys } from './hooks/useOfficialQueries';

// Re-export convenience functions
import officialRepository from './repository';
export const officialRepo = officialRepository;
