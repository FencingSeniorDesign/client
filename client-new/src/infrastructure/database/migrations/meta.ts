/**
 * Database Migration Metadata
 * Stores information about applied migrations
 */
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

/**
 * Migrations metadata table
 * Tracks which migrations have been applied to the database
 */
export const migrations = sqliteTable('__drizzle_migrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  hash: text('hash').notNull(),
  appliedAt: integer('applied_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date()),
});

/**
 * Schema version tracking
 * Stores the current schema version number
 */
export const schemaVersion = sqliteTable('__schema_version', {
  version: integer('version').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date()),
});