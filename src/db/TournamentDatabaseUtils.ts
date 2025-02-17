// dbBackend.ts
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'tf.db';

async function openDB(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
}

export async function initDB(): Promise<SQLite.SQLiteDatabase> {
  const db = await openDB();
  // Create Tournaments table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Tournaments (
      name TEXT PRIMARY KEY
    );
  `);
  // Create Events table if it doesn't exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Events (
      id INTEGER PRIMARY KEY NOT NULL,
      tname TEXT,
      weapon TEXT,
      gender TEXT,
      age TEXT,
      class TEXT,
      seeding TEXT
    );
  `);
  return db;
}

export async function dbCreateTournament(tournamentName: string): Promise<void> {
  try {
    const db = await openDB();
    await db.runAsync('INSERT INTO Tournaments (name) VALUES (?)', [tournamentName]);
    console.log(`Tournament "${tournamentName}" created successfully.`);
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

export async function dbDeleteTournament(tournamentName: string): Promise<void> {
  try {
    const db = await openDB();
    await db.runAsync('DELETE FROM Tournaments WHERE name = ?', [tournamentName]);
    console.log(`Tournament "${tournamentName}" deleted successfully.`);
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}

export async function dbListTournaments(): Promise<Array<{ name: string }>> {
  try {
    const db = await openDB();
    const tournaments = await db.getAllAsync<{ name: string }>('SELECT * FROM Tournaments');
    console.log(`[${tournaments.length}] tournaments listed successfully.`);
    return tournaments;
  } catch (error) {
    console.error('Error listing tournaments:', error);
    throw error;
  }
}


export async function dbListEvents(tournamentName: string): Promise<any[]> {
  try {
    const db = await openDB();
    const events = await db.getAllAsync('SELECT * FROM Events WHERE tname = ?', [tournamentName]);
    return events;
  } catch (error) {
    console.error('Error listing events:', error);
    throw error;
  }
}

export async function dbCreateEvent(tournamentName: string, event: any): Promise<void> {
  try {
    const db = await openDB();
    const age = event.age || 'senior';
    const eventClass = event.class || 'N/A';
    const seeding = event.seeding || 'N/A';
    await db.runAsync(
        `INSERT INTO Events (id, tname, weapon, gender, age, class, seeding)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [event.id, tournamentName, event.weapon, event.gender, age, eventClass, seeding]
    );
    console.log('Event created successfully.');
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function dbDeleteEvent(eventId: number): Promise<void> {
  try {
    const db = await initDB();
    await db.runAsync('DELETE FROM Events WHERE id = ?', [eventId]);
    console.log('Event deleted successfully.');
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

