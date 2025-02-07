// dbBackend.ts
import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

// Database configuration
const DATABASE_NAME = 'tf.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAYNAME = 'Tournaments Database';
const DATABASE_SIZE = 200000;

// Open the database connection
async function openDB(): Promise<SQLiteDatabase> {
  return SQLite.openDatabase({
    name: DATABASE_NAME,
    location: 'default',
  });
}

// Initialize the database by creating the Tournaments table if it doesn't exist
export async function initDB(): Promise<SQLiteDatabase> {
  const db = await openDB();
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS Tournaments (
      name TEXT PRIMARY KEY
    );`
  );
  return db;
}

// Create a new tournament using its name
export async function dbCreateTournament(tournamentName: string): Promise<void> {
  try {
    const db = await initDB();
    await db.executeSql(
      'INSERT INTO Tournaments (name) VALUES (?);',
      [tournamentName]
    );
    console.log(`Tournament "${tournamentName}" created successfully.`);
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

// Delete an existing tournament by its name
export async function dbDeleteTournament(tournamentName: string): Promise<void> {
  try {
    const db = await initDB();
    await db.executeSql(
      'DELETE FROM Tournaments WHERE name = ?;',
      [tournamentName]
    );
    console.log(`Tournament "${tournamentName}" deleted successfully.`);
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}

// Create a new tournament using its name
// In TournamentDatabaseUtils.ts
export async function dbListTournaments(): Promise<Array<{ id: number, name: string }>> {
  try {
    const db = await initDB();
    const [results] = await db.executeSql('SELECT * FROM Tournaments;');
    const tournaments = [];
    for (let i = 0; i < results.rows.length; i++) {
      tournaments.push(results.rows.item(i));
    }
    console.log(`[${results.rows.length}] tournaments listed successfully.`);
    return tournaments;
  } catch (error) {
    console.error('Error listing tournaments:', error);
    throw error;
  }
}