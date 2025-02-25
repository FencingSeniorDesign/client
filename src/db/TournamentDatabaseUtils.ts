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
      create table IF NOT EXISTS Tournaments
      (
        name PRIMARY KEY,
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
      create table if not exists Fencers
      (
          id       integer primary key,
          fname    text,
          lname    text,
          nickname text,
          gender   text, -- so we can filter for genderd events(?)
          club text,
      
          -- Need ratings for seeding, assume null is unrated
          erating  text CHECK (erating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
          eyear    integer                                                default 0,
          frating  text CHECK (frating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
          fyear    integer                                                default 0,
          srating  text CHECK (srating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
          syear    integer                                                default 0,
      
      --     eradicate integer, (cate)
      
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
      create table if not exists Referees
      (
          id       integer PRIMARY KEY,
          fname    text,
          lname    text,
          nickname text default null
      );
  `);
    console.log("Referee table initialized");
  } catch (error) {
    console.log(error);
  }

  // RoundTypes
  try {
    await db.execAsync(`
      create table IF NOT EXISTS RoundTypes
      (
          id   integer PRIMARY KEY,
          name text check (name in ('pool', 'de'))
      );
  `);
  } catch (error) {
    console.log(error);
  }

  // Events
  try {
    await db.execAsync(`
      create table if not exists Events
      (
          id      integer PRIMARY KEY,
          tname   text NOT NULL,
          weapon  text NOT NULL, -- epee, foil, saber
          gender  text NOT NULL, -- mixed, male, female
      
          -- these should prob be turned into ints forign keyed to seperat etables
          age     text NOT NULL, -- massive list I aint putting here rn
          class   text NOT NULL, -- massive list I aint putting here rn
          seeding text,          -- medium list I aint putting here rn
          FOREIGN KEY (tname) references Tournaments (name)
      );
  `);
    console.log("Events table initialized");

  } catch (error) {
    console.log(error);
  }

  // FencerEvents
  try {
    await db.execAsync(`
      create table if not exists FencerEvents
      (
        fencerid integer,
        eventid  integer,

        FOREIGN KEY (fencerid) REFERENCES Fencers (id),
        FOREIGN KEY (eventid) REFERENCES Events (id)
        );
    `);
  } catch (error) {
    console.log(error);
  }

  // Rounds
  try {
    await db.execAsync(`
      create table IF NOT EXISTS Rounds
      (
          id          integer PRIMARY KEY,
          eventid     integer,
          type        integer,
          rorder      integer, -- round 1 is fenced first, then round 2, etc
      
      
          -- Pool Settings
          promotionpercent integer default 100,
          targetbracket integer,
      
          -- DE settings
          deformat    TEXT,    -- only used for DE rounds (e.g. 'single', 'double', 'compass')
          detablesize INTEGER, -- only used for DE rounds
      
          isstarted integer check (iscomplete in (0, 1)) default 0, -- prevent edits when the round starts
          iscomplete  integer check (iscomplete in (0, 1)) default 0,
      
          FOREIGN KEY (eventid) references Events (id),
          FOREIGN KEY (type) references RoundTypes (id)
      );
  `)
  } catch (error) {
    console.log(error);
  }

  // FencerPoolAssignment
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS FencerPoolAssignment
      (
        roundid INTEGER NOT NULL,
        poolid   INTEGER NOT NULL,
        fencerid INTEGER NOT NULL,
        fenceridinpool integer, -- The number refs call

        PRIMARY KEY (roundid, poolid, fencerid),
        FOREIGN KEY (roundid) REFERENCES Rounds (id),
        FOREIGN KEY (fencerid) REFERENCES Fencers (id)
        --     FOREIGN KEY (poolid) REFERENCES Pools (id)
        );
    `)
  } catch (error) {
    console.log(error);
  }

  // Bouts
  try {
    await db.execAsync(`
      create table if not exists Bouts
      (
          id        integer PRIMARY KEY,
          lfencer   integer,
          rfencer   integer,
          victor    integer,
          referee   integer,
          eventid   integer,
          roundid   integer,
      
          tableof integer check ( tableof in (2,4,8,16,32,64,128,256)), -- Only used for DEs. Specifies which table the fencer is in
      
          FOREIGN KEY (lfencer) REFERENCES Fencers (id),
          FOREIGN KEY (rfencer) REFERENCES Fencers (id),
          FOREIGN KEY (victor) REFERENCES Fencers (id),
          FOREIGN KEY (referee) REFERENCES Referees (id),
          FOREIGN KEY (eventid) REFERENCES Events (id),
          FOREIGN KEY (roundid) REFERENCES Rounds (id)
      );
  `)
  } catch (error) {
    console.log(error);
  }

  // DETable
  try {
    await db.execAsync(`
      create table if not exists DETable
      (
        id integer PRIMARY KEY,
        roundid integer,
        tableof integer check ( tableof in (2,4,8,16,32,64,128,256)),

        FOREIGN KEY (roundid) REFERENCES Rounds(id)
        );
    `)
  } catch (error) {
    console.log(error);
  }

  // FencerBouts
  try {
    await db.execAsync(`
      create table if not exists FencerBouts
      (
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

  // CreateFencerBoutsTrigger
  try {
    await db.execAsync(`
      CREATE TRIGGER create_fencer_bouts_after_bout_insert
          AFTER INSERT
          ON Bouts
      BEGIN
          -- Insert a FencerBouts row for the left fencer.
          INSERT INTO FencerBouts (boutid, fencerid)
          VALUES (NEW.id, NEW.lfencer);
      
          -- Insert a FencerBouts row for the right fencer.
          INSERT INTO FencerBouts (boutid, fencerid)
          VALUES (NEW.id, NEW.rfencer);
      END;
  `)

  } catch (error) {
    console.log(error);
  }

  // SeedingFromRoundResults
  try {
    await db.execAsync(`
      create table if not exists SeedingFromRoundResults
      (
          id       integer PRIMARY KEY,
          fencerid integer,
          eventid  integer,                                          --TODO do we need this if we use FencerEvents?
          roundid  integer,
          seed     integer,
      
          FOREIGN KEY (fencerid) REFERENCES FencerEvents (fencerid), -- Use FencerEvents so that seeding is limited to the round
          FOREIGN KEY (roundid) REFERENCES Rounds (id),
          FOREIGN KEY (eventid) REFERENCES Events (id)
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

  await dbCreateFencerByName(Guy1)
  await dbCreateFencerByName(Guy2)
  await dbCreateFencerByName(Guy3)
  await dbCreateFencerByName(Guy4)
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

export async function dbMarkRoundAsComplete(roundId: number): Promise<void> {
try {
  const db = await openDB();
  await db.runAsync('UPDATE Rounds SET iscomplete = 1 WHERE id = ?', [roundId]);
  console.log(`Round ${roundId} marked as complete`);
} catch (error) {
  console.error('Error marking round complete', error);
}

}