/**
 * Database infrastructure
 * Exports all database-related components
 */

// Export the Drizzle schema
export * from './schema';

// Export the database client and initialization functions
export { db, initializeDatabase, migrateFromOldDatabase } from './client';
export { default as dbClient } from './client';

// Export the base repository for domain-specific repositories
export * from './base-repository';

// Export live query hooks
export * from './live-query';