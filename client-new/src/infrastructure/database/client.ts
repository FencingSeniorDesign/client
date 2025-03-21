import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite/next';
import * as schema from './schema';

// Database name
const DATABASE_NAME = 'tf.db';

// Create the database connection with change listener enabled for live queries
const expoDb = openDatabaseSync(DATABASE_NAME, { 
  enableChangeListener: true 
});

// Initialize Drizzle with the connection
export const db = drizzle(expoDb, { schema });

// Function to initialize the database
export async function initializeDatabase() {
  console.log("Initializing database...");
  
  try {
    // Apply migrations if needed (future use)
    // Currently uses auto-create tables in the schema
    
    console.log("Database initialized successfully");
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