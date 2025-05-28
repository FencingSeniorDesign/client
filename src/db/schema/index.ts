import { sqliteTable, text, integer, primaryKey, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Clubs table
export const clubs = sqliteTable('Clubs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    abbreviation: text('abbreviation'),
});

// Tournaments table
export const tournaments = sqliteTable('Tournaments', {
    name: text('name').primaryKey(),
    iscomplete: integer('iscomplete', { mode: 'boolean' }).default(false),
});

// Fencers table
export const fencers = sqliteTable(
    'Fencers',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        fname: text('fname').notNull(),
        lname: text('lname').notNull(),
        nickname: text('nickname'),
        gender: text('gender'),
        club: text('club'), // Keep for backward compatibility
        clubid: integer('clubid').references(() => clubs.id),
        erating: text('erating', { enum: ['U', 'E', 'D', 'C', 'B', 'A'] }).default('U'),
        eyear: integer('eyear').default(0),
        frating: text('frating', { enum: ['U', 'E', 'D', 'C', 'B', 'A'] }).default('U'),
        fyear: integer('fyear').default(0),
        srating: text('srating', { enum: ['U', 'E', 'D', 'C', 'B', 'A'] }).default('U'),
        syear: integer('syear').default(0),
    },
    table => {
        return {
            uniqueNameConstraint: primaryKey({ columns: [table.fname, table.lname] }),
        };
    }
);

// Referees table
export const referees = sqliteTable('Referees', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fname: text('fname').notNull(),
    lname: text('lname').notNull(),
    nickname: text('nickname'),
    device_id: text('device_id'),
});

// Officials table
export const officials = sqliteTable('Officials', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fname: text('fname').notNull(),
    lname: text('lname').notNull(),
    nickname: text('nickname'),
    device_id: text('device_id'),
});

// OfficialEvents table
export const officialEvents = sqliteTable(
    'OfficialEvents',
    {
        officialid: integer('officialid')
            .notNull()
            .references(() => officials.id),
        eventid: integer('eventid')
            .notNull()
            .references(() => events.id),
    },
    table => {
        return {
            pk: primaryKey({ columns: [table.officialid, table.eventid] }),
        };
    }
);

// RefereeEvents table
export const refereeEvents = sqliteTable(
    'RefereeEvents',
    {
        refereeid: integer('refereeid')
            .notNull()
            .references(() => referees.id),
        eventid: integer('eventid')
            .notNull()
            .references(() => events.id),
    },
    table => {
        return {
            pk: primaryKey({ columns: [table.refereeid, table.eventid] }),
        };
    }
);

// Events table
export const events = sqliteTable('Events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tname: text('tname')
        .notNull()
        .references(() => tournaments.name),
    weapon: text('weapon').notNull(),
    gender: text('gender').notNull(),
    age: text('age').notNull(),
    class: text('class').notNull(),
    seeding: text('seeding'),
    event_type: text('event_type', { enum: ['individual', 'team'] }).default('individual'),
    team_format: text('team_format', { enum: ['NCAA', '45-touch'] }),
});

// Teams table
export const teams = sqliteTable('Teams', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    eventid: integer('eventid')
        .notNull()
        .references(() => events.id),
    clubid: integer('clubid').references(() => clubs.id),
    seed: integer('seed'),
});

// TeamMembers table
export const teamMembers = sqliteTable(
    'TeamMembers',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        teamid: integer('teamid')
            .notNull()
            .references(() => teams.id),
        fencerid: integer('fencerid')
            .notNull()
            .references(() => fencers.id),
        role: text('role', { enum: ['starter', 'substitute'] }).notNull().default('starter'),
        position: integer('position'), // 1, 2, 3 for starters
    },
    table => {
        return {
            uniqueMemberConstraint: unique().on(table.teamid, table.fencerid),
        };
    }
);

// TeamBouts table - replaces individual bouts for team events
export const teamBouts = sqliteTable('TeamBouts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundid: integer('roundid')
        .notNull()
        .references(() => rounds.id),
    eventid: integer('eventid')
        .notNull()
        .references(() => events.id),
    team_a_id: integer('team_a_id').references(() => teams.id),
    team_b_id: integer('team_b_id').references(() => teams.id),
    format: text('format', { enum: ['NCAA', '45-touch'] }).notNull(),
    team_format: text('team_format', { enum: ['NCAA', '45-touch'] }).default('NCAA'),
    bout_type: text('bout_type', { enum: ['pool', 'de'] }).default('pool'),
    status: text('status', { enum: ['pending', 'in_progress', 'complete'] }).default('pending'),
    winner_id: integer('winner_id').references(() => teams.id),
    team_a_score: integer('team_a_score').default(0),
    team_b_score: integer('team_b_score').default(0),
    tableof: integer('tableof'),
    table_of: integer('table_of'),
});

// TeamBoutScores table - for NCAA format individual matchups
export const teamBoutScores = sqliteTable('TeamBoutScores', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    team_bout_id: integer('team_bout_id')
        .notNull()
        .references(() => teamBouts.id),
    bout_number: integer('bout_number').notNull(), // 1-9 for NCAA
    fencer_a_id: integer('fencer_a_id').references(() => fencers.id),
    fencer_b_id: integer('fencer_b_id').references(() => fencers.id),
    fencer_a_score: integer('fencer_a_score').default(0),
    fencer_b_score: integer('fencer_b_score').default(0),
    winner_id: integer('winner_id').references(() => fencers.id),
    is_complete: integer('is_complete', { mode: 'boolean' }).default(false),
});

// RelayBoutState table - for 45-touch relay format
export const relayBoutState = sqliteTable('RelayBoutState', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    team_bout_id: integer('team_bout_id')
        .notNull()
        .references(() => teamBouts.id)
        .unique(),
    current_fencer_a_id: integer('current_fencer_a_id').references(() => fencers.id),
    current_fencer_b_id: integer('current_fencer_b_id').references(() => fencers.id),
    rotation_count_a: integer('rotation_count_a').default(0),
    rotation_count_b: integer('rotation_count_b').default(0),
    last_rotation_score_a: integer('last_rotation_score_a').default(0),
    last_rotation_score_b: integer('last_rotation_score_b').default(0),
});

// RelayLegHistory table - tracks individual leg scores and fencer assignments
export const relayLegHistory = sqliteTable('RelayLegHistory', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    team_bout_id: integer('team_bout_id')
        .notNull()
        .references(() => teamBouts.id),
    leg_number: integer('leg_number').notNull(), // 1, 2, 3, etc.
    fencer_a_id: integer('fencer_a_id')
        .notNull()
        .references(() => fencers.id),
    fencer_b_id: integer('fencer_b_id')
        .notNull()
        .references(() => fencers.id),
    score_a: integer('score_a').notNull(), // Individual fencer A score for this leg
    score_b: integer('score_b').notNull(), // Individual fencer B score for this leg
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, table => {
    return {
        // Ensure only one record per leg per bout
        uniqueLegPerBout: unique().on(table.team_bout_id, table.leg_number),
    };
});

// TeamPoolAssignment table
export const teamPoolAssignment = sqliteTable(
    'TeamPoolAssignment',
    {
        roundid: integer('roundid')
            .notNull()
            .references(() => rounds.id),
        poolid: integer('poolid').notNull(),
        teamid: integer('teamid')
            .notNull()
            .references(() => teams.id),
        teamidinpool: integer('teamidinpool').notNull(),
    },
    table => {
        return {
            pk: primaryKey({ columns: [table.roundid, table.poolid, table.teamid] }),
        };
    }
);

// FencerEvents table
export const fencerEvents = sqliteTable(
    'FencerEvents',
    {
        fencerid: integer('fencerid')
            .notNull()
            .references(() => fencers.id),
        eventid: integer('eventid')
            .notNull()
            .references(() => events.id),
    },
    table => {
        return {
            pk: primaryKey({ columns: [table.fencerid, table.eventid] }),
        };
    }
);

// Rounds table
export const rounds = sqliteTable('Rounds', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    eventid: integer('eventid')
        .notNull()
        .references(() => events.id),
    type: text('type', { enum: ['pool', 'de'] }).notNull(),
    round_format: text('round_format', { 
        enum: ['individual_pools', 'team_round_robin', 'individual_de', 'team_de'] 
    }).notNull().default('individual_pools'),
    rorder: integer('rorder').notNull(), // round 1 is fenced first, then round 2, etc

    // Pool Settings
    poolcount: integer('poolcount'),
    poolsize: integer('poolsize'),

    poolsoption: text('poolsoption', { enum: ['promotion', 'target'] }).default('promotion'),
    promotionpercent: integer('promotionpercent').default(100),
    targetbracket: integer('targetbracket'),
    usetargetbracket: integer('usetargetbracket', { mode: 'boolean' }).default(false),

    // DE settings
    deformat: text('deformat'), // only used for DE rounds (e.g. 'single', 'double', 'compass')
    detablesize: integer('detablesize'), // only used for DE rounds

    isstarted: integer('isstarted', { mode: 'boolean' }).default(false),
    iscomplete: integer('iscomplete', { mode: 'boolean' }).default(false),
});

// FencerPoolAssignment table
export const fencerPoolAssignment = sqliteTable(
    'FencerPoolAssignment',
    {
        roundid: integer('roundid')
            .notNull()
            .references(() => rounds.id),
        poolid: integer('poolid').notNull(),
        fencerid: integer('fencerid')
            .notNull()
            .references(() => fencers.id),
        fenceridinpool: integer('fenceridinpool').notNull(),
    },
    table => {
        return {
            pk: primaryKey({ columns: [table.roundid, table.poolid, table.fencerid] }),
        };
    }
);

// Bouts table
export const bouts = sqliteTable(
    'Bouts',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        lfencer: integer('lfencer').references(() => fencers.id),
        rfencer: integer('rfencer').references(() => fencers.id),
        victor: integer('victor').references(() => fencers.id),
        referee: integer('referee').references(() => referees.id),
        eventid: integer('eventid').references(() => events.id),
        roundid: integer('roundid').references(() => rounds.id),
        tableof: integer('tableof'),
    },
    table => {
        return {
            // Add a unique constraint to prevent duplicate bouts in the same round
            uniqueBoutConstraint: primaryKey({ columns: [table.roundid, table.lfencer, table.rfencer] }),
        };
    }
);

// DEBracketBouts table
export const deBracketBouts = sqliteTable('DEBracketBouts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundid: integer('roundid').references(() => rounds.id),
    bout_id: integer('bout_id').references(() => bouts.id),
    bracket_type: text('bracket_type', { enum: ['winners', 'losers', 'finals', 'east', 'north', 'west', 'south'] }),
    bracket_round: integer('bracket_round'),
    bout_order: integer('bout_order'),
    next_bout_id: integer('next_bout_id').references(() => bouts.id),
    loser_next_bout_id: integer('loser_next_bout_id').references(() => bouts.id),
});

// TeamDEBracketBouts table for team bracket structure
export const teamDeBracketBouts = sqliteTable('TeamDEBracketBouts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundid: integer('roundid').references(() => rounds.id),
    team_bout_id: integer('team_bout_id').references(() => teamBouts.id),
    bracket_type: text('bracket_type', { enum: ['winners', 'losers', 'finals'] }),
    bracket_round: integer('bracket_round'),
    bout_order: integer('bout_order'),
    next_bout_id: integer('next_bout_id').references(() => teamBouts.id),
    loser_next_bout_id: integer('loser_next_bout_id').references(() => teamBouts.id),
});

// DETable table
export const deTable = sqliteTable('DETable', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roundid: integer('roundid').references(() => rounds.id),
    tableof: integer('tableof'),
});

// FencerBouts table
export const fencerBouts = sqliteTable(
    'FencerBouts',
    {
        boutid: integer('boutid').references(() => bouts.id),
        fencerid: integer('fencerid').references(() => fencers.id),
        score: integer('score'),
    },
    table => {
        return {
            pk: primaryKey({ columns: [table.boutid, table.fencerid] }),
        };
    }
);

// SeedingFromRoundResults table
export const seedingFromRoundResults = sqliteTable('SeedingFromRoundResults', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fencerid: integer('fencerid').references(() => fencers.id),
    eventid: integer('eventid').references(() => events.id),
    roundid: integer('roundid').references(() => rounds.id),
    seed: integer('seed').notNull(),
});

// Define relationships
// These are not part of the schema but help with type inference in TypeScript
export const relations = {
    clubs: {
        fencers: {
            relationship: 'has-many',
            from: clubs.id,
            to: fencers.clubid,
        },
        teams: {
            relationship: 'has-many',
            from: clubs.id,
            to: teams.clubid,
        },
    },
    tournaments: {
        events: {
            relationship: 'has-many',
            from: tournaments.name,
            to: events.tname,
        },
    },
    events: {
        tournament: {
            relationship: 'belongs-to',
            from: events.tname,
            to: tournaments.name,
        },
        fencerEvents: {
            relationship: 'has-many',
            from: events.id,
            to: fencerEvents.eventid,
        },
        teams: {
            relationship: 'has-many',
            from: events.id,
            to: teams.eventid,
        },
        rounds: {
            relationship: 'has-many',
            from: events.id,
            to: rounds.eventid,
        },
        officialEvents: {
            relationship: 'has-many',
            from: events.id,
            to: officialEvents.eventid,
        },
        refereeEvents: {
            relationship: 'has-many',
            from: events.id,
            to: refereeEvents.eventid,
        },
    },
    fencers: {
        club: {
            relationship: 'belongs-to',
            from: fencers.clubid,
            to: clubs.id,
        },
        fencerEvents: {
            relationship: 'has-many',
            from: fencers.id,
            to: fencerEvents.fencerid,
        },
        teamMemberships: {
            relationship: 'has-many',
            from: fencers.id,
            to: teamMembers.fencerid,
        },
        fencerPoolAssignments: {
            relationship: 'has-many',
            from: fencers.id,
            to: fencerPoolAssignment.fencerid,
        },
        fencerBouts: {
            relationship: 'has-many',
            from: fencers.id,
            to: fencerBouts.fencerid,
        },
        boutsAsLeftFencer: {
            relationship: 'has-many',
            from: fencers.id,
            to: bouts.lfencer,
        },
        boutsAsRightFencer: {
            relationship: 'has-many',
            from: fencers.id,
            to: bouts.rfencer,
        },
        boutsAsVictor: {
            relationship: 'has-many',
            from: fencers.id,
            to: bouts.victor,
        },
        seedingFromRoundResults: {
            relationship: 'has-many',
            from: fencers.id,
            to: seedingFromRoundResults.fencerid,
        },
    },
    officials: {
        officialEvents: {
            relationship: 'has-many',
            from: officials.id,
            to: officialEvents.officialid,
        },
    },
    referees: {
        refereeEvents: {
            relationship: 'has-many',
            from: referees.id,
            to: refereeEvents.refereeid,
        },
        bouts: {
            relationship: 'has-many',
            from: referees.id,
            to: bouts.referee,
        },
    },
    rounds: {
        fencerPoolAssignments: {
            relationship: 'has-many',
            from: rounds.id,
            to: fencerPoolAssignment.roundid,
        },
        teamPoolAssignments: {
            relationship: 'has-many',
            from: rounds.id,
            to: teamPoolAssignment.roundid,
        },
        bouts: {
            relationship: 'has-many',
            from: rounds.id,
            to: bouts.roundid,
        },
        teamBouts: {
            relationship: 'has-many',
            from: rounds.id,
            to: teamBouts.roundid,
        },
        deBracketBouts: {
            relationship: 'has-many',
            from: rounds.id,
            to: deBracketBouts.roundid,
        },
        deTables: {
            relationship: 'has-many',
            from: rounds.id,
            to: deTable.roundid,
        },
        seedingFromRoundResults: {
            relationship: 'has-many',
            from: rounds.id,
            to: seedingFromRoundResults.roundid,
        },
    },
    bouts: {
        leftFencer: {
            relationship: 'belongs-to',
            from: bouts.lfencer,
            to: fencers.id,
        },
        rightFencer: {
            relationship: 'belongs-to',
            from: bouts.rfencer,
            to: fencers.id,
        },
        victor: {
            relationship: 'belongs-to',
            from: bouts.victor,
            to: fencers.id,
        },
        referee: {
            relationship: 'belongs-to',
            from: bouts.referee,
            to: referees.id,
        },
        event: {
            relationship: 'belongs-to',
            from: bouts.eventid,
            to: events.id,
        },
        round: {
            relationship: 'belongs-to',
            from: bouts.roundid,
            to: rounds.id,
        },
        fencerBouts: {
            relationship: 'has-many',
            from: bouts.id,
            to: fencerBouts.boutid,
        },
        deBracketBout: {
            relationship: 'has-one',
            from: bouts.id,
            to: deBracketBouts.bout_id,
        },
    },
    teams: {
        event: {
            relationship: 'belongs-to',
            from: teams.eventid,
            to: events.id,
        },
        club: {
            relationship: 'belongs-to',
            from: teams.clubid,
            to: clubs.id,
        },
        members: {
            relationship: 'has-many',
            from: teams.id,
            to: teamMembers.teamid,
        },
        teamPoolAssignments: {
            relationship: 'has-many',
            from: teams.id,
            to: teamPoolAssignment.teamid,
        },
        teamBoutsAsTeamA: {
            relationship: 'has-many',
            from: teams.id,
            to: teamBouts.team_a_id,
        },
        teamBoutsAsTeamB: {
            relationship: 'has-many',
            from: teams.id,
            to: teamBouts.team_b_id,
        },
        teamBoutsAsWinner: {
            relationship: 'has-many',
            from: teams.id,
            to: teamBouts.winner_id,
        },
    },
    teamMembers: {
        team: {
            relationship: 'belongs-to',
            from: teamMembers.teamid,
            to: teams.id,
        },
        fencer: {
            relationship: 'belongs-to',
            from: teamMembers.fencerid,
            to: fencers.id,
        },
    },
    teamBouts: {
        round: {
            relationship: 'belongs-to',
            from: teamBouts.roundid,
            to: rounds.id,
        },
        teamA: {
            relationship: 'belongs-to',
            from: teamBouts.team_a_id,
            to: teams.id,
        },
        teamB: {
            relationship: 'belongs-to',
            from: teamBouts.team_b_id,
            to: teams.id,
        },
        winner: {
            relationship: 'belongs-to',
            from: teamBouts.winner_id,
            to: teams.id,
        },
        teamBoutScores: {
            relationship: 'has-many',
            from: teamBouts.id,
            to: teamBoutScores.team_bout_id,
        },
        relayBoutState: {
            relationship: 'has-one',
            from: teamBouts.id,
            to: relayBoutState.team_bout_id,
        },
        relayLegHistory: {
            relationship: 'has-many',
            from: teamBouts.id,
            to: relayLegHistory.team_bout_id,
        },
    },
    teamBoutScores: {
        teamBout: {
            relationship: 'belongs-to',
            from: teamBoutScores.team_bout_id,
            to: teamBouts.id,
        },
        fencerA: {
            relationship: 'belongs-to',
            from: teamBoutScores.fencer_a_id,
            to: fencers.id,
        },
        fencerB: {
            relationship: 'belongs-to',
            from: teamBoutScores.fencer_b_id,
            to: fencers.id,
        },
        winner: {
            relationship: 'belongs-to',
            from: teamBoutScores.winner_id,
            to: fencers.id,
        },
    },
    relayBoutState: {
        teamBout: {
            relationship: 'belongs-to',
            from: relayBoutState.team_bout_id,
            to: teamBouts.id,
        },
        currentFencerA: {
            relationship: 'belongs-to',
            from: relayBoutState.current_fencer_a_id,
            to: fencers.id,
        },
        currentFencerB: {
            relationship: 'belongs-to',
            from: relayBoutState.current_fencer_b_id,
            to: fencers.id,
        },
    },
    relayLegHistory: {
        teamBout: {
            relationship: 'belongs-to',
            from: relayLegHistory.team_bout_id,
            to: teamBouts.id,
        },
        fencerA: {
            relationship: 'belongs-to',
            from: relayLegHistory.fencer_a_id,
            to: fencers.id,
        },
        fencerB: {
            relationship: 'belongs-to',
            from: relayLegHistory.fencer_b_id,
            to: fencers.id,
        },
    },
};

// Create triggers for the database
export const createFencerBoutsTrigger = sql`
CREATE TRIGGER IF NOT EXISTS create_fencer_bouts_after_bout_insert
  AFTER INSERT
  ON Bouts
BEGIN
  INSERT INTO FencerBouts (boutid, fencerid)
  VALUES (NEW.id, NEW.lfencer);
  INSERT INTO FencerBouts (boutid, fencerid)
  VALUES (NEW.id, NEW.rfencer);
END;
`;

// Create trigger to handle updates to bouts (for when fencers are assigned to later rounds)
export const createFencerBoutsUpdateTrigger = sql`
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
`;
