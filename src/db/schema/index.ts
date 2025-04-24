import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
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
});

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
        bouts: {
            relationship: 'has-many',
            from: rounds.id,
            to: bouts.roundid,
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
