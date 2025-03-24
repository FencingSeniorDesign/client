/**
 * Database Migration System
 * Handles schema versioning and migrations
 */
import { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrations, schemaVersion } from './meta';
import { migration as initialSchemaMigration } from './0000_initial_schema';
import { migration as addIndexesMigration } from './0001_add_indexes';
import { migration as createViewsMigration } from './0002_create_views';

/**
 * Migration interface
 * Defines the structure of a migration
 */
export interface Migration {
  name: string;
  hash: string;
  up: (db: ExpoSQLiteDatabase['_database']['default']) => Promise<void>;
  down: (db: ExpoSQLiteDatabase['_database']['default']) => Promise<void>;
}

/**
 * List of all migrations in order
 * New migrations should be added to the end of this array
 */
export const allMigrations: Migration[] = [
  initialSchemaMigration,
  addIndexesMigration,
  createViewsMigration
];

/**
 * Migrator class
 * Handles applying and rolling back migrations
 */
export class Migrator {
  constructor(private db: ExpoSQLiteDatabase) {}
  
  /**
   * Initialize the migration system
   * Creates the migrations metadata table if it doesn't exist
   */
  async initialize(): Promise<void> {
    console.log('Initializing migration system...');
    
    // Get the raw SQLite database
    const sqliteDb = this.db._database?.default;
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    
    // Create migrations metadata table if it doesn't exist
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "hash" TEXT NOT NULL,
        "applied_at" INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    
    // Create schema version table if it doesn't exist
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS "__schema_version" (
        "version" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL DEFAULT (unixepoch())
      );
      
      -- Initialize schema version if empty
      INSERT INTO "__schema_version" ("version", "updated_at")
      SELECT 0, unixepoch()
      WHERE NOT EXISTS (SELECT 1 FROM "__schema_version");
    `);
    
    console.log('Migration system initialized');
  }
  
  /**
   * Get applied migrations
   * Returns the list of migrations that have been applied to the database
   */
  async getAppliedMigrations(): Promise<{ name: string; hash: string }[]> {
    const results = await this.db.select({
      name: migrations.name,
      hash: migrations.hash
    }).from(migrations).orderBy(migrations.id);
    
    return results;
  }
  
  /**
   * Get current schema version
   * Returns the current version number of the schema
   */
  async getCurrentVersion(): Promise<number> {
    const result = await this.db.select({
      version: schemaVersion.version
    }).from(schemaVersion);
    
    return result[0]?.version || 0;
  }
  
  /**
   * Update schema version
   * Sets the schema version to the specified value
   */
  async updateVersion(version: number): Promise<void> {
    // Get the raw SQLite database
    const sqliteDb = this.db._database?.default;
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    
    await sqliteDb.execAsync(`
      UPDATE "__schema_version"
      SET "version" = ${version}, "updated_at" = unixepoch();
    `);
  }
  
  /**
   * Apply pending migrations
   * Runs all migrations that haven't been applied yet
   */
  async applyMigrations(): Promise<void> {
    console.log('Checking for pending migrations...');
    
    // Get the raw SQLite database
    const sqliteDb = this.db._database?.default;
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    
    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedMigrationNames = new Set(appliedMigrations.map(m => m.name));
    
    // Get current version
    const currentVersion = await this.getCurrentVersion();
    
    // Find pending migrations
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrationNames.has(migration.name)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    // Start a transaction for all migrations
    await sqliteDb.execAsync('BEGIN TRANSACTION;');
    
    try {
      // Apply each pending migration
      for (const migration of pendingMigrations) {
        console.log(`Applying migration: ${migration.name}`);
        
        // Run the migration
        await migration.up(sqliteDb);
        
        // Record the migration
        await sqliteDb.execAsync(`
          INSERT INTO "__drizzle_migrations" ("name", "hash", "applied_at")
          VALUES ('${migration.name}', '${migration.hash}', unixepoch());
        `);
        
        console.log(`Migration ${migration.name} applied successfully`);
      }
      
      // Update schema version
      const newVersion = currentVersion + pendingMigrations.length;
      await this.updateVersion(newVersion);
      
      // Commit the transaction
      await sqliteDb.execAsync('COMMIT;');
      
      console.log(`All ${pendingMigrations.length} migrations applied successfully`);
      console.log(`Schema version updated from ${currentVersion} to ${newVersion}`);
    } catch (error) {
      // Roll back the transaction on error
      await sqliteDb.execAsync('ROLLBACK;');
      console.error('Error applying migrations:', error);
      throw error;
    }
  }
  
  /**
   * Roll back the most recent migration
   * Undoes the last migration that was applied
   */
  async rollbackLastMigration(): Promise<void> {
    console.log('Rolling back the most recent migration...');
    
    // Get the raw SQLite database
    const sqliteDb = this.db._database?.default;
    if (!sqliteDb) {
      throw new Error('Database not initialized');
    }
    
    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations to roll back');
      return;
    }
    
    // Get current version
    const currentVersion = await this.getCurrentVersion();
    
    // Get the last applied migration
    const lastAppliedMigration = appliedMigrations[appliedMigrations.length - 1];
    
    // Find the migration in our list
    const migrationToRollback = allMigrations.find(
      m => m.name === lastAppliedMigration.name
    );
    
    if (!migrationToRollback) {
      throw new Error(`Could not find migration ${lastAppliedMigration.name} to roll back`);
    }
    
    // Start a transaction
    await sqliteDb.execAsync('BEGIN TRANSACTION;');
    
    try {
      // Run the down migration
      console.log(`Rolling back migration: ${migrationToRollback.name}`);
      await migrationToRollback.down(sqliteDb);
      
      // Remove the migration from the record
      await sqliteDb.execAsync(`
        DELETE FROM "__drizzle_migrations"
        WHERE "name" = '${migrationToRollback.name}';
      `);
      
      // Update schema version
      const newVersion = currentVersion - 1;
      await this.updateVersion(newVersion);
      
      // Commit the transaction
      await sqliteDb.execAsync('COMMIT;');
      
      console.log(`Migration ${migrationToRollback.name} rolled back successfully`);
      console.log(`Schema version updated from ${currentVersion} to ${newVersion}`);
    } catch (error) {
      // Roll back the transaction on error
      await sqliteDb.execAsync('ROLLBACK;');
      console.error('Error rolling back migration:', error);
      throw error;
    }
  }
  
  /**
   * Roll back to a specific version
   * Undoes all migrations after the specified version
   */
  async rollbackToVersion(targetVersion: number): Promise<void> {
    console.log(`Rolling back to version ${targetVersion}...`);
    
    // Get current version
    const currentVersion = await this.getCurrentVersion();
    
    if (targetVersion >= currentVersion) {
      console.log(`Current version ${currentVersion} is already <= target version ${targetVersion}`);
      return;
    }
    
    // Calculate how many migrations to roll back
    const migrationsToRollback = currentVersion - targetVersion;
    
    // Roll back one at a time
    for (let i = 0; i < migrationsToRollback; i++) {
      await this.rollbackLastMigration();
    }
    
    console.log(`Successfully rolled back to version ${targetVersion}`);
  }
}