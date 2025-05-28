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
        console.log('Database initializing');

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
        event_type text DEFAULT 'individual',
        team_format text,
        FOREIGN KEY (tname) REFERENCES Tournaments(name) ON UPDATE no action ON DELETE no action
      );
    `);

        // Create Clubs table if it doesn't exist
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS Clubs (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        name text NOT NULL UNIQUE,
        abbreviation text
      );
    `);

        // Create Fencers table with correct columns
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS Fencers (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        fname text NOT NULL,
        lname text NOT NULL,
        nickname text,
        gender text,
        club text,
        clubid integer,
        erating text DEFAULT 'U',
        eyear integer DEFAULT 0,
        frating text DEFAULT 'U',
        fyear integer DEFAULT 0,
        srating text DEFAULT 'U',
        syear integer DEFAULT 0,
        FOREIGN KEY (clubid) REFERENCES Clubs(id) ON UPDATE no action ON DELETE no action
      );
    `);

        // Create indexes for faster club lookups
        await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_fencers_clubid ON Fencers (clubid);
    `);

        await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_clubs_name ON Clubs (name);
    `);

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS Rounds (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        eventid integer NOT NULL,
        type text NOT NULL,
        round_format text DEFAULT 'individual_pools' NOT NULL,
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

        // Create trigger for bout updates (when fencers are assigned to later rounds)
        await db.run(sql`
      CREATE TRIGGER IF NOT EXISTS create_fencer_bouts_after_bout_update
      AFTER UPDATE OF lfencer, rfencer
      ON Bouts
      WHEN (OLD.lfencer IS NULL AND NEW.lfencer IS NOT NULL) OR (OLD.rfencer IS NULL AND NEW.rfencer IS NOT NULL)
      BEGIN
        -- Check if the left fencer has been newly assigned and create FencerBout if needed
        INSERT OR IGNORE INTO FencerBouts (boutid, fencerid)
        SELECT NEW.id, NEW.lfencer
        WHERE NEW.lfencer IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM FencerBouts WHERE boutid = NEW.id AND fencerid = NEW.lfencer);

        -- Check if the right fencer has been newly assigned and create FencerBout if needed
        INSERT OR IGNORE INTO FencerBouts (boutid, fencerid)
        SELECT NEW.id, NEW.rfencer
        WHERE NEW.rfencer IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM FencerBouts WHERE boutid = NEW.id AND fencerid = NEW.rfencer);
      END;
    `);
        // Add new columns to Events table if they don't exist
        try {
            await db.run(sql`ALTER TABLE Events ADD COLUMN event_type text DEFAULT 'individual'`);
        } catch (e) {
            // Column might already exist, ignore error
        }

        try {
            await db.run(sql`ALTER TABLE Events ADD COLUMN team_format text`);
        } catch (e) {
            // Column might already exist, ignore error
        }

        // Add new columns to Fencers table if they don't exist
        try {
            await db.run(sql`ALTER TABLE Fencers ADD COLUMN clubid integer REFERENCES Clubs(id)`);
        } catch (e) {
            // Column might already exist, ignore error
        }

        // Add round_format column to Rounds table if it doesn't exist
        try {
            await db.run(sql`ALTER TABLE Rounds ADD COLUMN round_format text DEFAULT 'individual_pools' NOT NULL`);

            // Update existing rounds to have correct round_format based on event type
            // First, update individual pool rounds
            await db.run(sql`
                UPDATE Rounds 
                SET round_format = 'individual_pools' 
                WHERE type = 'pool' 
                AND eventid IN (SELECT id FROM Events WHERE event_type = 'individual' OR event_type IS NULL)
            `);

            // Update team round robin rounds
            await db.run(sql`
                UPDATE Rounds 
                SET round_format = 'team_round_robin' 
                WHERE type = 'pool' 
                AND eventid IN (SELECT id FROM Events WHERE event_type = 'team')
            `);

            // Update individual DE rounds
            await db.run(sql`
                UPDATE Rounds 
                SET round_format = 'individual_de' 
                WHERE type = 'de' 
                AND eventid IN (SELECT id FROM Events WHERE event_type = 'individual' OR event_type IS NULL)
            `);

            // Update team DE rounds
            await db.run(sql`
                UPDATE Rounds 
                SET round_format = 'team_de' 
                WHERE type = 'de' 
                AND eventid IN (SELECT id FROM Events WHERE event_type = 'team')
            `);

            console.log('Updated existing rounds with round_format');
        } catch (e) {
            // Column might already exist, ignore error
            console.log('round_format column already exists or migration already applied');
        }

        // Add missing columns to TeamBouts table if they don't exist
        try {
            await db.run(
                sql`ALTER TABLE TeamBouts ADD COLUMN eventid integer NOT NULL DEFAULT 0 REFERENCES Events(id)`
            );
        } catch (e) {
            // Column might already exist, ignore error
        }

        try {
            await db.run(sql`ALTER TABLE TeamBouts ADD COLUMN team_format text DEFAULT 'NCAA'`);
        } catch (e) {
            // Column might already exist, ignore error
        }

        try {
            await db.run(sql`ALTER TABLE TeamBouts ADD COLUMN bout_type text DEFAULT 'pool'`);
        } catch (e) {
            // Column might already exist, ignore error
        }

        try {
            await db.run(sql`ALTER TABLE TeamBouts ADD COLUMN table_of integer`);
        } catch (e) {
            // Column might already exist, ignore error
        }

        // Create new team-related tables
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS Teams (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        name text NOT NULL,
        eventid integer NOT NULL,
        clubid integer,
        seed integer,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (clubid) REFERENCES Clubs(id) ON UPDATE no action ON DELETE no action
      );
    `);

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS TeamMembers (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        teamid integer NOT NULL,
        fencerid integer NOT NULL,
        role text DEFAULT 'starter' NOT NULL,
        position integer,
        FOREIGN KEY (teamid) REFERENCES Teams(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (fencerid) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action
      );
    `);

        // Create unique constraint on TeamMembers
        try {
            await db.run(
                sql`CREATE UNIQUE INDEX TeamMembers_teamid_fencerid_unique ON TeamMembers (teamid, fencerid);`
            );
        } catch (e) {
            // Index might already exist, ignore error
        }

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS TeamBouts (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        roundid integer NOT NULL,
        eventid integer NOT NULL,
        team_a_id integer,
        team_b_id integer,
        format text NOT NULL,
        team_format text DEFAULT 'NCAA',
        bout_type text DEFAULT 'pool',
        status text DEFAULT 'pending',
        winner_id integer,
        team_a_score integer DEFAULT 0,
        team_b_score integer DEFAULT 0,
        tableof integer,
        table_of integer,
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (eventid) REFERENCES Events(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (team_a_id) REFERENCES Teams(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (team_b_id) REFERENCES Teams(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (winner_id) REFERENCES Teams(id) ON UPDATE no action ON DELETE no action
      );
    `);

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS TeamBoutScores (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        team_bout_id integer NOT NULL,
        bout_number integer NOT NULL,
        fencer_a_id integer,
        fencer_b_id integer,
        fencer_a_score integer DEFAULT 0,
        fencer_b_score integer DEFAULT 0,
        winner_id integer,
        is_complete integer DEFAULT false,
        FOREIGN KEY (team_bout_id) REFERENCES TeamBouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (fencer_a_id) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (fencer_b_id) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (winner_id) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action
      );
    `);

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS RelayBoutState (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        team_bout_id integer NOT NULL UNIQUE,
        current_fencer_a_id integer,
        current_fencer_b_id integer,
        rotation_count_a integer DEFAULT 0,
        rotation_count_b integer DEFAULT 0,
        last_rotation_score_a integer DEFAULT 0,
        last_rotation_score_b integer DEFAULT 0,
        FOREIGN KEY (team_bout_id) REFERENCES TeamBouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (current_fencer_a_id) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (current_fencer_b_id) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action
      );
    `);

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS RelayLegHistory (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        team_bout_id integer NOT NULL,
        leg_number integer NOT NULL,
        fencer_a_id integer NOT NULL,
        fencer_b_id integer NOT NULL,
        score_a integer NOT NULL,
        score_b integer NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP,
        updated_at text DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_bout_id) REFERENCES TeamBouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (fencer_a_id) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (fencer_b_id) REFERENCES Fencers(id) ON UPDATE no action ON DELETE no action
      );
    `);

        // Create unique constraint for RelayLegHistory
        try {
            await db.run(
                sql`CREATE UNIQUE INDEX IF NOT EXISTS RelayLegHistory_team_bout_id_leg_number_unique ON RelayLegHistory (team_bout_id, leg_number);`
            );
        } catch (e) {
            // Index might already exist, ignore error
        }

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS TeamPoolAssignment (
        roundid integer NOT NULL,
        poolid integer NOT NULL,
        teamid integer NOT NULL,
        teamidinpool integer NOT NULL,
        PRIMARY KEY(roundid, poolid, teamid),
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (teamid) REFERENCES Teams(id) ON UPDATE no action ON DELETE no action
      );
    `);

        await db.run(sql`
      CREATE TABLE IF NOT EXISTS TeamDEBracketBouts (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        roundid integer,
        team_bout_id integer,
        bracket_type text,
        bracket_round integer,
        bout_order integer,
        next_bout_id integer,
        loser_next_bout_id integer,
        FOREIGN KEY (roundid) REFERENCES Rounds(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (team_bout_id) REFERENCES TeamBouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (next_bout_id) REFERENCES TeamBouts(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (loser_next_bout_id) REFERENCES TeamBouts(id) ON UPDATE no action ON DELETE no action
      );
    `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}
