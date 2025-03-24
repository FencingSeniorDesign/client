/**
 * Database Migrations Module
 * Exports migration system components
 */

// Export the migrator and migration types
export * from './migrator';

// Export migrations metadata schema
export * from './meta';

// Export all migrations
export { migration as initialSchemaMigration } from './0000_initial_schema';
export { migration as addIndexesMigration } from './0001_add_indexes';
export { migration as createViewsMigration } from './0002_create_views';