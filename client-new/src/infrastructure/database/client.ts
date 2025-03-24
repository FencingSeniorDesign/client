import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import { allIndexes } from './schema_indexes';
import { allViews } from './schema_views';

// Database name
const DATABASE_NAME = 'tf.db';

// Create the database connection with change listener enabled for live queries
const expoDb = openDatabaseSync(DATABASE_NAME, { 
  enableChangeListener: true 
});

// Initialize Drizzle with the connection, indexes, and views
export const db = drizzle(expoDb, { 
  schema: {
    ...schema,
    // Add indexes to the schema
    indexes: allIndexes,
    // Add views to the schema
    views: allViews
  }
});

// Import migrator
import { Migrator } from './migrations/migrator';

// Function to initialize the database
export async function initializeDatabase() {
  console.log("Initializing database...");
  
  try {
    // Initialize the migration system and apply migrations
    const migrator = new Migrator(db);
    
    // Initialize migration system (creates metadata tables)
    await migrator.initialize();
    
    // Apply pending migrations (this will create schema, indexes, and views)
    await migrator.applyMigrations();
    
    // Get current schema version
    const schemaVersion = await migrator.getCurrentVersion();
    console.log(`Database initialized with schema version: ${schemaVersion}`);
    
    return true;
  } catch (error) {
    console.error("Error initializing database:", error);
    return false;
  }
}

// Function to migrate data from the old database structure if needed
export async function migrateFromOldDatabase() {
  console.log("Migrating data from old database structure...");
  
  // This function will be implemented when needed to migrate data
  // from the old database structure to the new Drizzle ORM format
  
  return true;
}

// Export a singleton instance of the database
export default db;