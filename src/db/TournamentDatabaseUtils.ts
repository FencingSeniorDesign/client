// dbBackend.ts
import * as SQLite from 'expo-sqlite';
import { Fencer, Event, Tournament } from "../navigation/navigation/types";

const DATABASE_NAME = 'tf.db';

initDB()

async function openDB(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DATABASE_NAME);
}

export async function initDB(): Promise<void> {
  const db = await openDB();
  console.log("Database initializing");
  // Tournaments
  try {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Tournaments (
      name TEXT PRIMARY KEY,
      iscomplete integer default 0
    );
  `)
    console.log("Tournaments table initialized");
  } catch (error) {
    console.log(error);
  }

  // Fencers
  try {
    await db.execAsync(`
    create table if not exists Fencers (
      id       integer primary key,
      fname    text,
      lname    text,
      nickname text default null,
      gender   text, -- so we can filter for gendered events(?)

      -- Need ratings for seeding, assume null is unrated
      erating  text CHECK (erating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
      eyear    integer,
      frating  text CHECK (frating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
      fyear    integer,
      srating  text CHECK (srating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
      syear    integer,

      UNIQUE (fname, lname)
      );
  `);
    console.log("Fencer table initialized");
  } catch (error) {
    console.log(error);
  }

  // Referees
  try {
    await db.execAsync(`
    create table if not exists Referees (
      id    integer PRIMARY KEY,
      fname text,
      lname text,
      nickname text default null -- optional
    );
  `);
    console.log("Referee table initialized");
  } catch (error) {
    console.log(error);
  }

  // RoundTypes
  try {
    await db.execAsync(`
    create table IF NOT EXISTS RoundTypes (
      id         integer PRIMARY KEY,
      name       text
    );
  `);
  } catch (error) {
    console.log(error);
  }

  // Events
  try {
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
    console.log("Events table initialized");

  } catch (error) {
    console.log(error);
  }

  // Rounds
  try {
    await db.execAsync(`
    create table IF NOT EXISTS Rounds (
      id      integer PRIMARY KEY,
      eventid integer,
      type    integer,
      rorder  integer, -- round 1 is fenced first, then round 2, etc. Might be able to just use the id. Depends how annoying the update query is

      FOREIGN KEY (eventid) references Events (id),
      FOREIGN KEY (type) references RoundTypes (id)
      );
  `)
  } catch (error) {
    console.log(error);
  }

  // Bouts
  try {
    await db.execAsync(`
    create table if not exists Bouts (   -- Bouts are essentially just the connection of a bunch of existing data. Only new thing here should be the id
        id           integer PRIMARY KEY,
        lfencer      integer,
        rfencer      integer,
        referee      integer,
        eventid      integer,
        roundid      integer,
    
        FOREIGN KEY (lfencer) REFERENCES FencerPoolID (poolid),
        FOREIGN KEY (rfencer) REFERENCES FencerPoolID (poolid),
        FOREIGN KEY (referee) REFERENCES Referees (id),
        FOREIGN KEY (eventid) REFERENCES Events (id),
        FOREIGN KEY (roundid) REFERENCES Rounds (id)
    );
  `)
  } catch (error) {
    console.log(error);
  }

  // FencerPoolId
  try {
    await db.execAsync(`
    create table if not exists FencerPoolID (   -- We need this because many fencers can be in many pools while having different pool ids.
        fencerid integer,
        roundid integer,
        poolid integer, -- Is the number that refs call when saying who is fencing / up next. order doesn't matter
    
        PRIMARY KEY (fencerid, roundid),
        FOREIGN KEY (fencerid) REFERENCES Fencers (id),
        FOREIGN KEY (roundid) REFERENCES Rounds (id)
    );
  `)
  } catch (error) {
    console.log(error);
  }

  // FencerBouts
  try {
    await db.execAsync(`
    create table if not exists FencerBouts (
      boutid   integer,
      fencerid integer,
      score    integer,
  
      PRIMARY KEY (boutid, fencerid),
      FOREIGN KEY (boutid) REFERENCES Bouts (id),
      FOREIGN KEY (fencerid) REFERENCES Fencers (id)
    );
  `)
  } catch (error) {
    console.log(error);
  }
  // FencerEvents
  try {
    await db.execAsync(`
    create table if not exists FencerEvents (
      fencerid integer,
      eventid  integer,

      PRIMARY KEY (fencerid, eventid),
      FOREIGN KEY (fencerid) REFERENCES Fencers (id),
      FOREIGN KEY (eventid) REFERENCES Events (id)
      );
  `);
  } catch (error) {
    console.log(error);
  }

  // EventRounds
  try {
    await db.execAsync(`
    create table if not exists EventRounds (
      eventid integer,
      roundid integer,
      iscomplete integer,
  
      PRIMARY KEY (eventid, roundid),
      FOREIGN KEY (eventid) REFERENCES Events (id),
      FOREIGN KEY (roundid) REFERENCES Rounds (id)
    );
  `)
  } catch (error) {
    console.log(error);
  }

  console.log("Database initialized")

  dbInsertExampleData()
  console.log("Sample data loaded")

}

export async function dbInsertExampleData(): Promise<void> {
  dbCreateTournament("Completed Tournament 1", 1)
  dbCreateTournament("Completed Tournament 2", 1)

  const Guy1 = <Fencer> {
    fname: "Rasta",
    lname: "popoulos",
    srating: "A",
    syear: 2025,
    frating: "B",
    fyear: 2024,
  }

  const Guy2 = <Fencer> {
    fname: "Prof.",
    lname: "Calculus",
    frating: "C",
    fyear: 2025,
    erating: "C",
    eyear: 2023,
  }

  const Guy3 = <Fencer> {
    fname: "Thomson",
    lname: "Thompson",
  }

  const Guy4 = <Fencer> {
    fname: "Captain",
    lname: "Haddock",
    srating: "A",
    syear: 2025,
  }

  dbCreateFencerByName(Guy1)
  dbCreateFencerByName(Guy2)
  dbCreateFencerByName(Guy3)
  dbCreateFencerByName(Guy4)
}

// TODO - Pass tournament object from Types instead
// Tournament Functions. iscomplete shenanigans is just so we can use this to make example data
export async function dbCreateTournament(tournamentName: string, iscomplete?: number | 0): Promise<void> {
  try {
    const db = await openDB();
    await db.runAsync('INSERT INTO Tournaments (name, iscomplete) VALUES (?, ?)', [tournamentName, iscomplete ?? 0]);
    console.log(`Tournament "${tournamentName}" created successfully.`);
  } catch (error) {
    // console.error(`Error creating tournament [${tournamentName}]:`, error); TODO - this is just while we're using dbInsertExampleData. Creates errors due to duplicates
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

export async function dbListOngoingTournaments(): Promise<Tournament[]> {
  try {
    const db = await openDB();
    const tournaments: Tournament[]  = await db.getAllAsync('SELECT * FROM Tournaments WHERE iscomplete = 0');
    console.log(`[${tournaments.length}] ongoing tournaments listed successfully.`);
    return tournaments;
  } catch (error) {
    console.error('Error listing ongoing tournaments:', error);
    throw error;
  }
}

export async function dbListCompletedTournaments(): Promise<Tournament[]> {
  try {
    const db = await openDB();
    const tournaments: Tournament[]  = await db.getAllAsync('SELECT * FROM Tournaments WHERE iscomplete = 1');
    console.log(`[${tournaments.length}] completed tournaments listed successfully.`);
    return tournaments;
  } catch (error) {
    console.error('Error listing completed tournaments:', error);
    throw error;
  }
}

// Event Functions
export async function dbListEvents(tournamentName: string): Promise<Event[]> {
  try {
    const db = await openDB();
    return await db.getAllAsync('SELECT * FROM Events WHERE tname = ?', [tournamentName]);
  } catch (error) {
    console.error('Error listing events:', error);
    throw error;
  }
}

export async function dbCreateEvent(tournamentName: string, event: Event): Promise<void> {
  try {
    const db = await openDB();
    const age = event.age || 'senior';
    const eventClass = event.class || 'N/A'; // TODO - this is only optional until the seeding logic is implemented
    const seeding = event.seeding || 'N/A'; // TODO - same as above
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
    const db = await openDB();
    await db.runAsync('DELETE FROM Events WHERE id = ?', [eventId]);
    console.log('Event deleted successfully.');
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// Fencer Functions
// TODO support weapon-specific ratings / years
export async function dbCreateFencerByName(fencer: Fencer, event?: Event, insertOnCreate?: boolean | false): Promise<void> {
  try {
    const db = await openDB();
    // Execute the insert query and extract the new fencer id
    const result: SQLite.SQLiteRunResult = await db.runAsync(
        'INSERT INTO Fencers (fname, lname, erating, eyear, frating, fyear, srating, syear) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [fencer.fname, fencer.lname, fencer.erating ?? 'U', fencer.eyear ?? 0, fencer.frating ?? 'U', fencer.fyear ?? 0, fencer.srating ?? 'U', fencer.fyear ?? 0]
    );
    const newFencerId = result.lastInsertRowId;

    fencer.id = newFencerId;
    console.log(`Fencer "${fencer.fname} ${fencer.lname}" created with id ${fencer.id}.`, JSON.stringify(fencer, null, "\t"));

    // If we create a fencer inside an event, we should add them to the FencerEvent table
    if (event && insertOnCreate) {
      await dbAddFencerToEventById(fencer, event);
    }
  } catch (error) {
    console.error('Error creating fencer:', error);
  }
}

export async function dbListFencers(): Promise<void> {
  const db = await openDB();
  await db.runAsync('SELECT * FROM Fencers')
}

export async function dbDeleteFencerById(Fencer: Fencer): Promise<void> {
  // TODO
}

export async function dbSearchFencers(query: string): Promise<Fencer[]> {
  const db = await openDB();
  const result: Fencer[] = await db.getAllAsync(
      'SELECT * FROM Fencers WHERE fname LIKE ? OR lname LIKE ?',
      [`%${query}%`, `%${query}%`]
  );
  console.log(`Search returned ${result.length} results`);
  return result;
}

export async function dbGetFencersInEventById(event: Event): Promise<Fencer[]> {
  const db = await openDB();
  const result: Fencer[] = await db.getAllAsync(`
    SELECT Fencers.id, Fencers.fname, Fencers.lname, Fencers.erating, Fencers.eyear, Fencers.frating, Fencers.fyear, Fencers.srating, Fencers.syear
    FROM FencerEvents
    JOIN Fencers ON FencerEvents.fencerid = Fencers.id
    WHERE FencerEvents.eventid = ?`, [event.id]);

  console.log(`Fencers associated with Event ID [${event.id}]: ${result.length}`);
  return result;
}

export async function dbAddFencerToEventById(fencer: Fencer, event: Event): Promise<void> {
  const db = await openDB();
  try {
    await db.runAsync('INSERT INTO FencerEvents (fencerid, eventid) VALUES (?, ?)', [fencer.id || null, event.id]); // || TODO null should never be needed, but just to shut it up
    console.log(`"${fencer.fname} ${fencer.lname}" added to "${event.gender} ${event.age} ${event.weapon}"`);
  } catch (error) {
    console.error(`Error adding fencer ${fencer.id} to event ${event.id} `, error);
  }
}

export async function dbDeleteFencerFromEventById(fencer: Fencer, event: Event): Promise<void> {
  const db = await openDB();
  await db.runAsync('DELETE FROM FencerEvents WHERE fencerid = ? AND eventid = ?', [fencer.id || null, event.id]); // || TODO null should never be needed, but just to shut it up
}
