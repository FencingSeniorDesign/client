/**
 * Officials management feature
 */

// export * from './components';
export * from './screens';
export * from './services/officialService';
// export * from './api';
export * from './repository';

// Hooks exports
export { useOfficialRepository } from './hooks/useOfficialRepository';
export { useOfficialQueries, officialKeys as legacyOfficialKeys } from './hooks/useOfficialQueries';
export * from './hooks/useOfficials';

// Re-export convenience functions
import officialRepository from './repository';
export const officialRepo = officialRepository;
