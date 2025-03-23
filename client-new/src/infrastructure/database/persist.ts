/**
 * Database Persistence Utilities
 * Provides tools for exporting and importing database state
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tables } from './schema';
import db from './client';
import { and, eq, sql } from 'drizzle-orm';
import { db as rawDb } from './client';

// Storage keys for database backups
const DB_BACKUP_KEY = 'FENCING_APP_DB_BACKUP';
const DB_BACKUP_TIMESTAMP_KEY = 'FENCING_APP_DB_BACKUP_TIMESTAMP';

// Type for table data
type TableData = Record<string, any[]>;

/**
 * Export the current state of the database to AsyncStorage
 * Used for backing up data for offline use
 */
export async function exportDatabaseState(): Promise<boolean> {
  try {
    const exportData: TableData = {};
    
    // Export each table's data
    for (const table of tables) {
      const tableName = table._.name;
      const data = await db.select().from(table);
      exportData[tableName] = data;
    }
    
    // Save the data to AsyncStorage
    await AsyncStorage.setItem(DB_BACKUP_KEY, JSON.stringify(exportData));
    await AsyncStorage.setItem(DB_BACKUP_TIMESTAMP_KEY, Date.now().toString());
    
    console.log('Database exported successfully');
    return true;
  } catch (error) {
    console.error('Failed to export database:', error);
    return false;
  }
}

/**
 * Import database state from AsyncStorage
 * Used for restoring data for offline use
 */
export async function importDatabaseState(
  options: { 
    clearExisting?: boolean;
    onProgress?: (tableName: string, current: number, total: number) => void;
  } = {}
): Promise<boolean> {
  const { clearExisting = false, onProgress } = options;
  
  try {
    // Get the backup data from AsyncStorage
    const backupJson = await AsyncStorage.getItem(DB_BACKUP_KEY);
    if (!backupJson) {
      console.log('No database backup found');
      return false;
    }
    
    const backupData: TableData = JSON.parse(backupJson);
    const tableNames = Object.keys(backupData);
    
    // Import each table's data
    await db.transaction(async (tx) => {
      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        const tableData = backupData[tableName];
        
        // Find the corresponding table schema
        const table = tables.find(t => t._.name === tableName);
        if (!table) {
          console.warn(`Table ${tableName} not found in schema`);
          continue;
        }
        
        // Clear existing data if requested
        if (clearExisting) {
          await tx.delete(table);
        }
        
        // Import the data
        if (tableData.length > 0) {
          // Insert data in batches of 100
          const batchSize = 100;
          for (let j = 0; j < tableData.length; j += batchSize) {
            const batch = tableData.slice(j, j + batchSize);
            await tx.insert(table).values(batch).onConflictDoUpdate({
              target: Object.keys(table.primaryKey || {}).map(pk => table[pk]),
              set: batch[0] // This assumes all columns in the first item are the ones to update
            });
          }
        }
        
        // Call the progress callback if provided
        if (onProgress) {
          onProgress(tableName, i + 1, tableNames.length);
        }
      }
    });
    
    console.log('Database imported successfully');
    return true;
  } catch (error) {
    console.error('Failed to import database:', error);
    return false;
  }
}

/**
 * Check if a database backup exists and when it was created
 */
export async function getBackupInfo(): Promise<{ exists: boolean; timestamp?: number }> {
  try {
    const timestampString = await AsyncStorage.getItem(DB_BACKUP_TIMESTAMP_KEY);
    if (!timestampString) {
      return { exists: false };
    }
    
    return {
      exists: true,
      timestamp: parseInt(timestampString, 10)
    };
  } catch (error) {
    console.error('Failed to get backup info:', error);
    return { exists: false };
  }
}

/**
 * Clear all database backup data
 */
export async function clearBackup(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(DB_BACKUP_KEY);
    await AsyncStorage.removeItem(DB_BACKUP_TIMESTAMP_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear backup:', error);
    return false;
  }
}

/**
 * Create a scheduled backup task that runs periodically
 * @param intervalMs How often to back up in milliseconds (default: 1 hour)
 * @returns A cleanup function to cancel the scheduled backup
 */
export function scheduleBackups(intervalMs = 1000 * 60 * 60): () => void {
  const intervalId = setInterval(async () => {
    console.log('Running scheduled database backup');
    await exportDatabaseState();
  }, intervalMs);
  
  // Return a cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Execute a SQL command directly (use with caution)
 * This is primarily for database maintenance operations
 */
export async function executeSql(sqlCommand: string): Promise<any> {
  try {
    // Get access to the raw SQLite database
    if (!rawDb) {
      throw new Error('Raw database not available');
    }
    
    // Execute the SQL command
    return await rawDb.run(sqlCommand);
  } catch (error) {
    console.error('Failed to execute SQL:', error);
    throw error;
  }
}

/**
 * Optimize the database by running VACUUM
 * This rebuilds the database file to reduce its size
 */
export async function optimizeDatabase(): Promise<boolean> {
  try {
    await executeSql('VACUUM;');
    return true;
  } catch (error) {
    console.error('Failed to optimize database:', error);
    return false;
  }
}

/**
 * Analyze the database to gather statistics for the query planner
 */
export async function analyzeDatabase(): Promise<boolean> {
  try {
    await executeSql('ANALYZE;');
    return true;
  } catch (error) {
    console.error('Failed to analyze database:', error);
    return false;
  }
}