import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

const DATABASE_NAME = 'tf.db';

// Open database synchronously
const expoDb = openDatabaseSync(DATABASE_NAME);

// Create drizzle instance
export const db = drizzle(expoDb, { schema });

// Initialize the database
export async function initializeDatabase() {
  try {
    console.log("Database initializing");

    // Apply the SQL migrations to create all tables
    // Create tables manually since we can't use dynamic imports in React Native
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Tournaments (
        name text PRIMARY KEY NOT NULL,
        iscomplete integer DEFAULT false
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Events (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        tname text NOT NULL,
        weapon text NOT NULL,
        gender text NOT NULL,
        age text NOT NULL,
        class text NOT NULL,
        seeding text,
        FOREIGN KEY (tname) REFERENCES Tournaments(name) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Fencers (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        fname text NOT NULL,
        lname text NOT NULL,
        nickname text,
        gender text,
        club text,
        erating text DEFAULT 'U',
        eyear integer DEFAULT 0,
        frating text DEFAULT 'U',
        fyear integer DEFAULT 0,
        srating text DEFAULT 'U',
        syear integer DEFAULT 0
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Rounds (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        eventid integer NOT NULL,
        type text NOT NULL,
        rorder integer NOT NULL,
        poolcount integer,
        poolsize integer,
        poolsoption text DEFAULT 'promotion',
        promotionpercent integer DEFAULT 100,
        targetbracket integer,
        usetargetbracket integer DEFAULT false,
        deformat text,
        detablesize integer,
        isstarted integer DEFAULT false,
        iscomplete integer DEFAULT false,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Bouts (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        lfencer integer,
        rfencer integer,
        victor integer,
        referee integer,
        eventid integer,
        roundid integer,
        tableof integer,
        FOREIGN KEY (lfencer) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (rfencer) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (victor) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS FencerBouts (
        boutid integer,
        fencerid integer,
        score integer,
        PRIMARY KEY(boutid, fencerid),
        FOREIGN KEY (boutid) REFERENCES Bouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (fencerid) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS FencerEvents (
        fencerid integer NOT NULL,
        eventid integer NOT NULL,
        PRIMARY KEY(fencerid, eventid),
        FOREIGN KEY (fencerid) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Officials (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        fname text NOT NULL,
        lname text NOT NULL,
        nickname text,
        device_id text
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS OfficialEvents (
        officialid integer NOT NULL,
        eventid integer NOT NULL,
        PRIMARY KEY(officialid, eventid),
        FOREIGN KEY (officialid) REFERENCES Officials(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Referees (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        fname text NOT NULL,
        lname text NOT NULL,
        nickname text,
        device_id text
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS RefereeEvents (
        refereeid integer NOT NULL,
        eventid integer NOT NULL,
        PRIMARY KEY(refereeid, eventid),
        FOREIGN KEY (refereeid) REFERENCES Referees(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS FencerPoolAssignment (
        roundid integer NOT NULL,
        poolid integer NOT NULL,
        fencerid integer NOT NULL,
        fenceridinpool integer NOT NULL,
        PRIMARY KEY(roundid, poolid, fencerid),
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (fencerid) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS SeedingFromRoundResults (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        fencerid integer,
        eventid integer,
        roundid integer,
        seed integer NOT NULL,
        FOREIGN KEY (fencerid) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS DEBracketBouts (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        roundid integer,
        bout_id integer,
        bracket_type text,
        bracket_round integer,
        bout_order integer,
        next_bout_id integer,
        loser_next_bout_id integer,
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (bout_id) REFERENCES Bouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (next_bout_id) REFERENCES Bouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (loser_next_bout_id) REFERENCES Bouts(id) ON UPDATE no action ON DELETE no action
      );
    `);
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS DETable (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        roundid integer,
        tableof integer,
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action
      );
    `);

    // Create triggers after tables exist
    await db.run(sql`
      CREATE TRIGGER IF NOT EXISTS create_fencer_bouts_after_bout_insert
      AFTER INSERT
      ON Bouts
      BEGIN
        INSERT INTO FencerBouts (boutid, fencerid)
        VALUES (NEW.id, NEW.lfencer);
        INSERT INTO FencerBouts (boutid, fencerid)
        VALUES (NEW.id, NEW.rfencer);
      END;
    `);
    
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}