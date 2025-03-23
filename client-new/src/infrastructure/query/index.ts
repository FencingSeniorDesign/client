/**
 * Query infrastructure
 * Exports all React Query related components and utilities
 */

// Export the QueryProvider component and query client
export { QueryProvider, queryClient } from './provider';

// Export utility functions and types for domain-specific query hooks
export * from './utils';

// Export advanced query utilities
export * from './advanced';

// Export persistence utilities
export { 
  PersistentQueryProvider, 
  clearPersistedQueries,
  createPersister
} from './persist';