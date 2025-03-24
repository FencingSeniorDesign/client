/**
 * Initial Database Schema Migration
 * Creates all core tables for the application
 */
import { type Migration } from './migrator';
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import * as schema from '../schema';
import { relations } from '../schema';

/**
 * Initial schema migration
 * Creates all the base tables and relationships
 */
export const migration: Migration = {
  name: '0000_initial_schema',
  hash: 'bb849e47f9a6e85c6c66c5c22b75997b3d60c56a69699de53be89c4f06d64f93',
  
  async up(db) {
    console.log('Running migration: Initial Schema');
    
    // Create Tournaments table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "Tournaments" (
        "name" TEXT PRIMARY KEY,
        "iscomplete" INTEGER DEFAULT 0
      );
    `);
    
    // Create Fencers table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "Fencers" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "fname" TEXT NOT NULL,
        "lname" TEXT NOT NULL,
        "nickname" TEXT,
        "gender" TEXT,
        "club" TEXT,
        "erating" TEXT DEFAULT 'U',
        "eyear" INTEGER DEFAULT 0,
        "frating" TEXT DEFAULT 'U',
        "fyear" INTEGER DEFAULT 0,
        "srating" TEXT DEFAULT 'U',
        "syear" INTEGER DEFAULT 0,
        UNIQUE("fname", "lname")
      );
    `);
    
    // Create Referees table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "Referees" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "fname" TEXT NOT NULL,
        "lname" TEXT NOT NULL,
        "nickname" TEXT,
        "device_id" TEXT
      );
    `);
    
    // Create Officials table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "Officials" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "fname" TEXT NOT NULL,
        "lname" TEXT NOT NULL,
        "nickname" TEXT,
        "device_id" TEXT
      );
    `);
    
    // Create Events table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "Events" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "tname" TEXT NOT NULL,
        "weapon" TEXT NOT NULL,
        "gender" TEXT NOT NULL,
        "age" TEXT NOT NULL,
        "class" TEXT NOT NULL,
        "seeding" TEXT,
        FOREIGN KEY ("tname") REFERENCES "Tournaments" ("name")
      );
    `);
    
    // Create OfficialEvents table (many-to-many)
    await db.run(`
      CREATE TABLE IF NOT EXISTS "OfficialEvents" (
        "officialid" INTEGER,
        "eventid" INTEGER,
        PRIMARY KEY ("officialid", "eventid"),
        FOREIGN KEY ("officialid") REFERENCES "Officials" ("id"),
        FOREIGN KEY ("eventid") REFERENCES "Events" ("id")
      );
    `);
    
    // Create RefereeEvents table (many-to-many)
    await db.run(`
      CREATE TABLE IF NOT EXISTS "RefereeEvents" (
        "refereeid" INTEGER,
        "eventid" INTEGER,
        PRIMARY KEY ("refereeid", "eventid"),
        FOREIGN KEY ("refereeid") REFERENCES "Referees" ("id"),
        FOREIGN KEY ("eventid") REFERENCES "Events" ("id")
      );
    `);
    
    // Create FencerEvents table (many-to-many)
    await db.run(`
      CREATE TABLE IF NOT EXISTS "FencerEvents" (
        "fencerid" INTEGER,
        "eventid" INTEGER,
        PRIMARY KEY ("fencerid", "eventid"),
        FOREIGN KEY ("fencerid") REFERENCES "Fencers" ("id"),
        FOREIGN KEY ("eventid") REFERENCES "Events" ("id")
      );
    `);
    
    // Create Rounds table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "Rounds" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "eventid" INTEGER,
        "type" TEXT NOT NULL,
        "rorder" INTEGER NOT NULL,
        "poolcount" INTEGER,
        "poolsize" INTEGER,
        "poolsoption" TEXT DEFAULT 'promotion',
        "promotionpercent" INTEGER DEFAULT 100,
        "targetbracket" INTEGER,
        "usetargetbracket" INTEGER DEFAULT 0,
        "deformat" TEXT,
        "detablesize" INTEGER,
        "isstarted" INTEGER DEFAULT 0,
        "iscomplete" INTEGER DEFAULT 0,
        FOREIGN KEY ("eventid") REFERENCES "Events" ("id")
      );
    `);
    
    // Create FencerPoolAssignment table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "FencerPoolAssignment" (
        "roundid" INTEGER NOT NULL,
        "poolid" INTEGER NOT NULL,
        "fencerid" INTEGER NOT NULL,
        "fenceridinpool" INTEGER,
        PRIMARY KEY ("roundid", "poolid", "fencerid"),
        FOREIGN KEY ("roundid") REFERENCES "Rounds" ("id"),
        FOREIGN KEY ("fencerid") REFERENCES "Fencers" ("id")
      );
    `);
    
    // Create Bouts table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "Bouts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "lfencer" INTEGER,
        "rfencer" INTEGER,
        "victor" INTEGER,
        "referee" INTEGER,
        "eventid" INTEGER,
        "roundid" INTEGER,
        "tableof" INTEGER,
        FOREIGN KEY ("lfencer") REFERENCES "Fencers" ("id"),
        FOREIGN KEY ("rfencer") REFERENCES "Fencers" ("id"),
        FOREIGN KEY ("victor") REFERENCES "Fencers" ("id"),
        FOREIGN KEY ("referee") REFERENCES "Referees" ("id"),
        FOREIGN KEY ("eventid") REFERENCES "Events" ("id"),
        FOREIGN KEY ("roundid") REFERENCES "Rounds" ("id")
      );
    `);
    
    // Create DEBracketBouts table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "DEBracketBouts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "roundid" INTEGER,
        "bout_id" INTEGER,
        "bracket_type" TEXT,
        "bracket_round" INTEGER,
        "bout_order" INTEGER,
        "next_bout_id" INTEGER,
        "loser_next_bout_id" INTEGER,
        FOREIGN KEY ("roundid") REFERENCES "Rounds" ("id"),
        FOREIGN KEY ("bout_id") REFERENCES "Bouts" ("id")
      );
    `);
    
    // Create DETable table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "DETable" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "roundid" INTEGER,
        "tableof" INTEGER,
        FOREIGN KEY ("roundid") REFERENCES "Rounds" ("id")
      );
    `);
    
    // Create FencerBouts table
    await db.run(`
      CREATE TABLE IF NOT EXISTS "FencerBouts" (
        "boutid" INTEGER,
        "fencerid" INTEGER,
        "score" INTEGER,
        PRIMARY KEY ("boutid", "fencerid"),
        FOREIGN KEY ("boutid") REFERENCES "Bouts" ("id"),
        FOREIGN KEY ("fencerid") REFERENCES "Fencers" ("id")
      );
    `);
    
    // Success message
    console.log('Initial schema migration completed successfully');
  },
  
  async down(db) {
    console.log('Reversing migration: Initial Schema');
    
    // Drop tables in reverse order to handle foreign key constraints
    const tables = [
      "FencerBouts",
      "DETable",
      "DEBracketBouts",
      "Bouts",
      "FencerPoolAssignment",
      "Rounds",
      "FencerEvents",
      "RefereeEvents",
      "OfficialEvents",
      "Events",
      "Officials",
      "Referees",
      "Fencers",
      "Tournaments"
    ];
    
    for (const table of tables) {
      await db.run(`DROP TABLE IF EXISTS "${table}";`);
    }
    
    // Success message
    console.log('Initial schema rollback completed successfully');
  }
};