/**
 * Database infrastructure
 * Exports all database-related components and utilities
 */

// Export the Drizzle schema
export * from './schema';
export * from './schema_indexes';
export * from './schema_views';

// Export the database client and initialization functions
export { db, initializeDatabase, migrateFromOldDatabase } from './client';
export { default as dbClient } from './client';

// Export live query hooks
export * from './live-query';

// Export database view services and hooks
export * from './views';
export * from './view-hooks';

// Export migration system
export * from './migrations';

// Export database persistence utilities
export {
  exportDatabaseState,
  importDatabaseState,
  getBackupInfo,
  clearBackup,
  scheduleBackups,
  optimizeDatabase,
  analyzeDatabase
} from './persist';