/**
 * Database Migration - Add Indexes
 * Adds strategic indexes to improve query performance
 */
import { type Migration } from './migrator';
import { allIndexes } from '../schema_indexes';

/**
 * Add indexes migration
 * Creates strategic indexes for query optimization
 */
export const migration: Migration = {
  name: '0001_add_indexes',
  hash: 'a7b9c3e5f2d6a8c4b2d6e8f0a2c4d6e8f0a2c4d6e8f0a2c4d6e8f0a2c4d6e8',
  
  async up(db) {
    console.log('Running migration: Add Indexes');
    
    // Event Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_events_tname" ON "Events" ("tname");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_events_weapon_gender_age" ON "Events" ("weapon", "gender", "age");`);
    
    // Round Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_rounds_eventid" ON "Rounds" ("eventid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_rounds_eventid_type" ON "Rounds" ("eventid", "type");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_rounds_eventid_rorder" ON "Rounds" ("eventid", "rorder");`);
    
    // Bout Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_bouts_roundid" ON "Bouts" ("roundid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_bouts_eventid" ON "Bouts" ("eventid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_bouts_lfencer" ON "Bouts" ("lfencer");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_bouts_rfencer" ON "Bouts" ("rfencer");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_bouts_victor" ON "Bouts" ("victor");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_bouts_referee" ON "Bouts" ("referee");`);
    
    // DE Bracket Bout Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_debracketbouts_roundid" ON "DEBracketBouts" ("roundid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_debracketbouts_boutid" ON "DEBracketBouts" ("bout_id");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_debracketbouts_brackettype" ON "DEBracketBouts" ("bracket_type");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_debracketbouts_nextboutid" ON "DEBracketBouts" ("next_bout_id");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_debracketbouts_roundid_brackettype" ON "DEBracketBouts" ("roundid", "bracket_type");`);
    
    // FencerEvents Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_fencerevents_eventid" ON "FencerEvents" ("eventid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_fencerevents_fencerid" ON "FencerEvents" ("fencerid");`);
    
    // OfficialEvents Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_officialevents_eventid" ON "OfficialEvents" ("eventid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_officialevents_officialid" ON "OfficialEvents" ("officialid");`);
    
    // RefereeEvents Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_refereeevents_eventid" ON "RefereeEvents" ("eventid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_refereeevents_refereeid" ON "RefereeEvents" ("refereeid");`);
    
    // FencerPoolAssignment Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_fencerpoolassignment_roundid_poolid" ON "FencerPoolAssignment" ("roundid", "poolid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_fencerpoolassignment_fencerid" ON "FencerPoolAssignment" ("fencerid");`);
    
    // FencerBout Indexes
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_fencerbouts_boutid" ON "FencerBouts" ("boutid");`);
    await db.run(`CREATE INDEX IF NOT EXISTS "idx_fencerbouts_fencerid" ON "FencerBouts" ("fencerid");`);
    
    // Success message
    console.log('Add indexes migration completed successfully');
  },
  
  async down(db) {
    console.log('Reversing migration: Add Indexes');
    
    // Drop Event Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_events_tname";`);
    await db.run(`DROP INDEX IF EXISTS "idx_events_weapon_gender_age";`);
    
    // Drop Round Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_rounds_eventid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_rounds_eventid_type";`);
    await db.run(`DROP INDEX IF EXISTS "idx_rounds_eventid_rorder";`);
    
    // Drop Bout Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_bouts_roundid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_bouts_eventid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_bouts_lfencer";`);
    await db.run(`DROP INDEX IF EXISTS "idx_bouts_rfencer";`);
    await db.run(`DROP INDEX IF EXISTS "idx_bouts_victor";`);
    await db.run(`DROP INDEX IF EXISTS "idx_bouts_referee";`);
    
    // Drop DE Bracket Bout Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_debracketbouts_roundid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_debracketbouts_boutid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_debracketbouts_brackettype";`);
    await db.run(`DROP INDEX IF EXISTS "idx_debracketbouts_nextboutid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_debracketbouts_roundid_brackettype";`);
    
    // Drop FencerEvents Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_fencerevents_eventid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_fencerevents_fencerid";`);
    
    // Drop OfficialEvents Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_officialevents_eventid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_officialevents_officialid";`);
    
    // Drop RefereeEvents Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_refereeevents_eventid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_refereeevents_refereeid";`);
    
    // Drop FencerPoolAssignment Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_fencerpoolassignment_roundid_poolid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_fencerpoolassignment_fencerid";`);
    
    // Drop FencerBout Indexes
    await db.run(`DROP INDEX IF EXISTS "idx_fencerbouts_boutid";`);
    await db.run(`DROP INDEX IF EXISTS "idx_fencerbouts_fencerid";`);
    
    // Success message
    console.log('Add indexes rollback completed successfully');
  }
};