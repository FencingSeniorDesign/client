/**
 * Database Schema Indexes
 * Strategic indexes for improving query performance
 */
import { index } from 'drizzle-orm/sqlite-core';
import {
  events,
  rounds,
  bouts,
  deBracketBouts,
  fencerEvents,
  officialEvents,
  refereeEvents,
  fencerPoolAssignment,
  pools,
  poolBouts,
  fencerBouts
} from './schema';

/**
 * Event Indexes - Optimizes tournament event lookups
 */
export const eventIndexes = [
  index('idx_events_tname', events.tname),
  index('idx_events_weapon_gender_age', [events.weapon, events.gender, events.age])
];

/**
 * Round Indexes - Optimizes round queries by event and type
 */
export const roundIndexes = [
  index('idx_rounds_eventid', rounds.eventId),
  index('idx_rounds_eventid_type', [rounds.eventId, rounds.type]),
  index('idx_rounds_eventid_rorder', [rounds.eventId, rounds.rorder])
];

/**
 * Bout Indexes - Optimizes bout queries by round, event, and fencers
 */
export const boutIndexes = [
  index('idx_bouts_roundid', bouts.roundId),
  index('idx_bouts_eventid', bouts.eventId),
  index('idx_bouts_lfencer', bouts.lFencer),
  index('idx_bouts_rfencer', bouts.rFencer),
  index('idx_bouts_victor', bouts.victor),
  index('idx_bouts_referee', bouts.referee)
];

/**
 * DE Bracket Bout Indexes - Optimizes bracket navigation and lookup
 */
export const deBracketBoutIndexes = [
  index('idx_debracketbouts_roundid', deBracketBouts.roundId),
  index('idx_debracketbouts_boutid', deBracketBouts.boutId),
  index('idx_debracketbouts_brackettype', deBracketBouts.bracketType),
  index('idx_debracketbouts_nextboutid', deBracketBouts.nextBoutId),
  index('idx_debracketbouts_roundid_brackettype', [deBracketBouts.roundId, deBracketBouts.bracketType])
];

/**
 * FencerEvents Indexes - Optimizes lookups of fencers in events
 */
export const fencerEventIndexes = [
  index('idx_fencerevents_eventid', fencerEvents.eventId),
  index('idx_fencerevents_fencerid', fencerEvents.fencerId)
];

/**
 * OfficialEvents Indexes - Optimizes lookups of officials in events
 */
export const officialEventIndexes = [
  index('idx_officialevents_eventid', officialEvents.eventId),
  index('idx_officialevents_officialid', officialEvents.officialId)
];

/**
 * RefereeEvents Indexes - Optimizes lookups of referees in events
 */
export const refereeEventIndexes = [
  index('idx_refereeevents_eventid', refereeEvents.eventId),
  index('idx_refereeevents_refereeid', refereeEvents.refereeId)
];

/**
 * FencerPoolAssignment Indexes - Optimizes pool lookups
 */
export const fencerPoolAssignmentIndexes = [
  index('idx_fencerpoolassignment_roundid_poolid', [fencerPoolAssignment.roundId, fencerPoolAssignment.poolId]),
  index('idx_fencerpoolassignment_fencerid', fencerPoolAssignment.fencerId)
];

/**
 * Pool Indexes - Optimizes pool queries
 * Note: pools table will be added in a future migration
 */
export const poolIndexes = [
  // index('idx_pools_roundid', pools.roundId),
  // index('idx_pools_eventid', pools.eventId)
];

/**
 * PoolBout Indexes - Optimizes pool bout queries
 * Note: poolBouts table will be added in a future migration
 */
export const poolBoutIndexes = [
  // index('idx_poolbouts_poolid', poolBouts.poolId),
  // index('idx_poolbouts_boutid', poolBouts.boutId),
  // index('idx_poolbouts_roundid', poolBouts.roundId)
];

/**
 * FencerBout Indexes - Optimizes fencer score queries
 */
export const fencerBoutIndexes = [
  index('idx_fencerbouts_boutid', fencerBouts.boutId),
  index('idx_fencerbouts_fencerid', fencerBouts.fencerId)
];

/**
 * Combined array of all indexes for easy export
 */
export const allIndexes = [
  ...eventIndexes,
  ...roundIndexes,
  ...boutIndexes,
  ...deBracketBoutIndexes,
  ...fencerEventIndexes,
  ...officialEventIndexes,
  ...refereeEventIndexes,
  ...fencerPoolAssignmentIndexes,
  ...poolIndexes,
  ...poolBoutIndexes,
  ...fencerBoutIndexes
];