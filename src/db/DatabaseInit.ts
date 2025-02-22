import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as SQLite from 'expo-sqlite';
const DB_NAME = 'identifier.sqlite';

// We copy the DB file into "[documentDirectory]/SQLite/" so expo-sqlite can access it
export async function copyDatabaseIfNotExists() {
  // The path where the SQLite DB should be stored
  const dbDir = FileSystem.documentDirectory + 'SQLite';
  const dbFilePath = `${dbDir}/${DB_NAME}`;

  // Check if the file is already copied
  const { exists } = await FileSystem.getInfoAsync(dbFilePath);
  if (exists) {
    console.log(`Database file ${DB_NAME} already exists, skipping copy.`);
    return;
  }

  // Ensure the "SQLite" folder exists
  await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });

  // Load the asset from the bundle
  // Adjust the path if your .sqlite file is in a different folder
  const asset = Asset.fromModule(require('./assets/identifier.sqlite'));
  // Download it to the local cache if it’s not already
  await asset.downloadAsync();

  // Finally, copy the .sqlite file into the "SQLite" directory
  await FileSystem.copyAsync({
    from: asset.localUri!,
    to: dbFilePath,
  });

  console.log(`Copied ${DB_NAME} to ${dbFilePath}`);
}

// Optionally, return a handle to the opened DB:
export function openDatabase() {
  return SQLite.openDatabaseSync(DB_NAME);
}
