import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

// Tournament Schema
export const tournaments = sqliteTable('Tournaments', {
  name: text('name').primaryKey(),
  isComplete: integer('iscomplete', { mode: 'boolean' }).default(false),
});

// Fencer Schema
export const fencers = sqliteTable('Fencers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fname: text('fname').notNull(),
  lname: text('lname').notNull(),
  nickname: text('nickname'),
  gender: text('gender'),
  club: text('club'),
  erating: text('erating', { enum: ['U', 'E', 'D', 'C', 'B', 'A'] }).default('U'),
  eyear: integer('eyear').default(0),
  frating: text('frating', { enum: ['U', 'E', 'D', 'C', 'B', 'A'] }).default('U'),
  fyear: integer('fyear').default(0),
  srating: text('srating', { enum: ['U', 'E', 'D', 'C', 'B', 'A'] }).default('U'),
  syear: integer('syear').default(0),
}, (table) => {
  return {
    nameUnique: primaryKey({ columns: [table.fname, table.lname] }),
  };
});

// Referee Schema
export const referees = sqliteTable('Referees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fname: text('fname').notNull(),
  lname: text('lname').notNull(),
  nickname: text('nickname'),
  deviceId: text('device_id'),
});

// Officials Schema
export const officials = sqliteTable('Officials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fname: text('fname').notNull(),
  lname: text('lname').notNull(),
  nickname: text('nickname'),
  deviceId: text('device_id'),
});

// Events Schema
export const events = sqliteTable('Events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tname: text('tname').notNull().references(() => tournaments.name),
  weapon: text('weapon').notNull(),
  gender: text('gender').notNull(),
  age: text('age').notNull(),
  class: text('class').notNull(),
  seeding: text('seeding'),
});

// OfficialEvents Schema (Many-to-many relationship)
export const officialEvents = sqliteTable('OfficialEvents', {
  officialId: integer('officialid').references(() => officials.id),
  eventId: integer('eventid').references(() => events.id),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.officialId, table.eventId] }),
  };
});

// RefereeEvents Schema (Many-to-many relationship)
export const refereeEvents = sqliteTable('RefereeEvents', {
  refereeId: integer('refereeid').references(() => referees.id),
  eventId: integer('eventid').references(() => events.id),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.refereeId, table.eventId] }),
  };
});

// FencerEvents Schema (Many-to-many relationship)
export const fencerEvents = sqliteTable('FencerEvents', {
  fencerId: integer('fencerid').references(() => fencers.id),
  eventId: integer('eventid').references(() => events.id),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.fencerId, table.eventId] }),
  };
});

// Rounds Schema
export const rounds = sqliteTable('Rounds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('eventid').references(() => events.id),
  type: text('type', { enum: ['pool', 'de'] }).notNull(),
  rorder: integer('rorder').notNull(), // Round order
  
  // Pool Settings
  poolCount: integer('poolcount'),
  poolSize: integer('poolsize'),
  poolsOption: text('poolsoption', { enum: ['promotion', 'target'] }).default('promotion'),
  promotionPercent: integer('promotionpercent').default(100),
  targetBracket: integer('targetbracket'),
  useTargetBracket: integer('usetargetbracket', { mode: 'boolean' }).default(false),
  
  // DE Settings
  deFormat: text('deformat', { enum: ['single', 'double', 'compass'] }),
  deTableSize: integer('detablesize'),
  
  isStarted: integer('isstarted', { mode: 'boolean' }).default(false),
  isComplete: integer('iscomplete', { mode: 'boolean' }).default(false),
});

// FencerPoolAssignment Schema
export const fencerPoolAssignment = sqliteTable('FencerPoolAssignment', {
  roundId: integer('roundid').references(() => rounds.id).notNull(),
  poolId: integer('poolid').notNull(),
  fencerId: integer('fencerid').references(() => fencers.id).notNull(),
  fencerIdInPool: integer('fenceridinpool'),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roundId, table.poolId, table.fencerId] }),
  };
});

// Bouts Schema
export const bouts = sqliteTable('Bouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lFencer: integer('lfencer').references(() => fencers.id),
  rFencer: integer('rfencer').references(() => fencers.id),
  victor: integer('victor').references(() => fencers.id),
  referee: integer('referee').references(() => referees.id),
  eventId: integer('eventid').references(() => events.id),
  roundId: integer('roundid').references(() => rounds.id),
  tableOf: integer('tableof', { enum: [2, 4, 8, 16, 32, 64, 128, 256] }),
});

// DEBracketBouts Schema
export const deBracketBouts = sqliteTable('DEBracketBouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roundId: integer('roundid').references(() => rounds.id),
  boutId: integer('bout_id').references(() => bouts.id),
  bracketType: text('bracket_type', { enum: ['winners', 'losers', 'finals', 'east', 'north', 'west', 'south'] }),
  bracketRound: integer('bracket_round'),
  boutOrder: integer('bout_order'),
  nextBoutId: integer('next_bout_id'),
  loserNextBoutId: integer('loser_next_bout_id'),
});

// DETable Schema
export const deTable = sqliteTable('DETable', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roundId: integer('roundid').references(() => rounds.id),
  tableOf: integer('tableof', { enum: [2, 4, 8, 16, 32, 64, 128, 256] }),
});

// FencerBouts Schema
export const fencerBouts = sqliteTable('FencerBouts', {
  boutId: integer('boutid').references(() => bouts.id),
  fencerId: integer('fencerid').references(() => fencers.id),
  score: integer('score'),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.boutId, table.fencerId] }),
  };
});

// Define relationships for query purposes (these don't affect the database schema)
export const relations = {
  tournaments: {
    events: {
      relationship: 'one-to-many',
      target: events,
      fields: [tournaments.name],
      references: [events.tname],
    },
  },
  events: {
    tournament: {
      relationship: 'many-to-one',
      target: tournaments,
      fields: [events.tname],
      references: [tournaments.name],
    },
    rounds: {
      relationship: 'one-to-many',
      target: rounds,
      fields: [events.id],
      references: [rounds.eventId],
    },
    fencers: {
      relationship: 'many-to-many',
      target: fencers,
      fields: [events.id],
      references: [fencerEvents.eventId],
      through: {
        target: fencerEvents,
        fields: [fencerEvents.eventId, fencerEvents.fencerId],
        references: [fencerEvents.eventId, fencerEvents.fencerId],
      },
    },
    officials: {
      relationship: 'many-to-many',
      target: officials,
      fields: [events.id],
      references: [officialEvents.eventId],
      through: {
        target: officialEvents,
        fields: [officialEvents.eventId, officialEvents.officialId],
        references: [officialEvents.eventId, officialEvents.officialId],
      },
    },
    referees: {
      relationship: 'many-to-many',
      target: referees,
      fields: [events.id],
      references: [refereeEvents.eventId],
      through: {
        target: refereeEvents,
        fields: [refereeEvents.eventId, refereeEvents.refereeId],
        references: [refereeEvents.eventId, refereeEvents.refereeId],
      },
    },
  },
  rounds: {
    event: {
      relationship: 'many-to-one',
      target: events,
      fields: [rounds.eventId],
      references: [events.id],
    },
    poolAssignments: {
      relationship: 'one-to-many',
      target: fencerPoolAssignment,
      fields: [rounds.id],
      references: [fencerPoolAssignment.roundId],
    },
    bouts: {
      relationship: 'one-to-many',
      target: bouts,
      fields: [rounds.id],
      references: [bouts.roundId],
    },
    deBracketBouts: {
      relationship: 'one-to-many',
      target: deBracketBouts,
      fields: [rounds.id],
      references: [deBracketBouts.roundId],
    },
    deTable: {
      relationship: 'one-to-many',
      target: deTable,
      fields: [rounds.id],
      references: [deTable.roundId],
    },
  },
  bouts: {
    leftFencer: {
      relationship: 'many-to-one',
      target: fencers,
      fields: [bouts.lFencer],
      references: [fencers.id],
    },
    rightFencer: {
      relationship: 'many-to-one',
      target: fencers,
      fields: [bouts.rFencer],
      references: [fencers.id],
    },
    victoriousFencer: {
      relationship: 'many-to-one',
      target: fencers,
      fields: [bouts.victor],
      references: [fencers.id],
    },
    assignedReferee: {
      relationship: 'many-to-one',
      target: referees,
      fields: [bouts.referee],
      references: [referees.id],
    },
    round: {
      relationship: 'many-to-one',
      target: rounds,
      fields: [bouts.roundId],
      references: [rounds.id],
    },
    event: {
      relationship: 'many-to-one',
      target: events,
      fields: [bouts.eventId],
      references: [events.id],
    },
    fencerScores: {
      relationship: 'one-to-many',
      target: fencerBouts,
      fields: [bouts.id],
      references: [fencerBouts.boutId],
    },
    deBracket: {
      relationship: 'one-to-one',
      target: deBracketBouts,
      fields: [bouts.id],
      references: [deBracketBouts.boutId],
    },
  },
};