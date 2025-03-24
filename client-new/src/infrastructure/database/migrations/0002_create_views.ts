/**
 * Database Migration - Create Views
 * Creates SQL views for optimizing complex queries
 */
import { type Migration } from './migrator';
import { 
  eventFencersView, 
  eventRoundsView, 
  fencerResultsView, 
  deBracketView,
  poolStandingsView 
} from '../schema_views';

/**
 * Create views migration
 * Creates database views for complex query optimization
 */
export const migration: Migration = {
  name: '0002_create_views',
  hash: 'd1e9c7a5b3f2e8d6c4a2b0e8f6d4c2a0b8e6f4d2c0a8e6f4d2c0a8e6f4d2c0a',
  
  async up(db) {
    console.log('Running migration: Create Views');
    
    // Event Fencers View
    await db.run(`
      CREATE VIEW IF NOT EXISTS "EventFencersView" AS
      SELECT 
        e.id AS eventId,
        f.id AS fencerId,
        e.tname,
        e.weapon,
        e.gender,
        e.age,
        e.class,
        f.fname,
        f.lname,
        f.club,
        f.erating AS rating
      FROM "FencerEvents" fe
      INNER JOIN "Events" e ON e.id = fe.eventid
      INNER JOIN "Fencers" f ON f.id = fe.fencerid;
    `);
    
    // Event Rounds View
    await db.run(`
      CREATE VIEW IF NOT EXISTS "EventRoundsView" AS
      SELECT 
        e.id AS eventId,
        r.id AS roundId,
        e.tname,
        r.type AS roundType,
        r.rorder AS roundOrder,
        r.isstarted AS isStarted,
        r.iscomplete AS isComplete,
        e.weapon,
        e.gender,
        e.age,
        e.class
      FROM "Rounds" r
      INNER JOIN "Events" e ON e.id = r.eventid;
    `);
    
    // Fencer Results View
    await db.run(`
      CREATE VIEW IF NOT EXISTS "FencerResultsView" AS
      SELECT 
        f.id AS fencerId,
        b.eventid AS eventId,
        b.roundid AS roundId,
        f.fname,
        f.lname,
        COUNT(fb.boutid) AS totalBouts,
        SUM(CASE WHEN b.victor = f.id THEN 1 ELSE 0 END) AS totalVictories,
        SUM(fb.score) AS totalTouches,
        CAST(SUM(CASE WHEN b.victor = f.id THEN 1 ELSE 0 END) AS FLOAT) / COUNT(fb.boutid) AS victoryPercentage
      FROM "FencerBouts" fb
      INNER JOIN "Bouts" b ON b.id = fb.boutid
      INNER JOIN "Fencers" f ON f.id = fb.fencerid
      GROUP BY f.id, b.eventid, b.roundid;
    `);
    
    // DE Bracket View
    await db.run(`
      CREATE VIEW IF NOT EXISTS "DEBracketView" AS
      SELECT 
        d.roundid AS roundId,
        d.bout_id AS boutId,
        d.bracket_type AS bracketType,
        d.bracket_round AS bracketRound,
        d.bout_order AS boutOrder,
        d.next_bout_id AS nextBoutId,
        d.loser_next_bout_id AS loserNextBoutId,
        b.lfencer AS leftFencerId,
        b.rfencer AS rightFencerId,
        b.victor AS victorId,
        (SELECT fb.score FROM "FencerBouts" AS fb WHERE fb.boutid = b.id AND fb.fencerid = b.lfencer) AS leftScore,
        (SELECT fb.score FROM "FencerBouts" AS fb WHERE fb.boutid = b.id AND fb.fencerid = b.rfencer) AS rightScore,
        (SELECT f.fname || ' ' || f.lname FROM "Fencers" AS f WHERE f.id = b.lfencer) AS leftFencerName,
        (SELECT f.fname || ' ' || f.lname FROM "Fencers" AS f WHERE f.id = b.rfencer) AS rightFencerName,
        b.referee AS refereeId
      FROM "DEBracketBouts" d
      LEFT JOIN "Bouts" b ON b.id = d.bout_id;
    `);
    
    // Pool Standings View (this is more complex and may require a different approach)
    await db.run(`
      CREATE VIEW IF NOT EXISTS "PoolStandingsView" AS
      WITH pool_stats AS (
        SELECT
          fpa.fencerid,
          fpa.poolid,
          fpa.roundid,
          SUM(CASE WHEN b.victor = fpa.fencerid THEN 1 ELSE 0 END) AS victories,
          COUNT(b.id) AS bouts,
          SUM(CASE WHEN fb.fencerid = fpa.fencerid THEN fb.score ELSE 0 END) AS touchesScored,
          SUM(CASE WHEN fb.fencerid != fpa.fencerid THEN fb.score ELSE 0 END) AS touchesReceived
        FROM "FencerPoolAssignment" fpa
        LEFT JOIN "Bouts" b ON b.roundid = fpa.roundid AND (b.lfencer = fpa.fencerid OR b.rfencer = fpa.fencerid)
        LEFT JOIN "FencerBouts" fb ON fb.boutid = b.id AND fb.fencerid IN (b.lfencer, b.rfencer)
        GROUP BY fpa.fencerid, fpa.poolid, fpa.roundid
      )
      SELECT 
        ps.fencerid AS fencerId,
        ps.poolid AS poolId,
        ps.roundid AS roundId,
        ps.victories,
        ps.bouts,
        CAST(ps.victories AS FLOAT) / NULLIF(ps.bouts, 0) AS victoryPercent,
        ps.touchesScored,
        ps.touchesReceived,
        ps.touchesScored - ps.touchesReceived AS touchDifferential,
        CAST(ps.touchesScored - ps.touchesReceived AS FLOAT) / NULLIF(ps.bouts, 0) AS indicatorValue,
        f.fname,
        f.lname,
        f.club,
        f.erating AS rating
      FROM pool_stats ps
      INNER JOIN "Fencers" f ON f.id = ps.fencerid;
    `);
    
    // Success message
    console.log('Create views migration completed successfully');
  },
  
  async down(db) {
    console.log('Reversing migration: Create Views');
    
    // Drop views in reverse order to handle dependencies
    const views = [
      "PoolStandingsView",
      "DEBracketView",
      "FencerResultsView",
      "EventRoundsView",
      "EventFencersView"
    ];
    
    for (const view of views) {
      await db.run(`DROP VIEW IF EXISTS "${view}";`);
    }
    
    // Success message
    console.log('Create views rollback completed successfully');
  }
};