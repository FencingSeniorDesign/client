/**
 * Database Schema Views
 * Defines SQL views for optimizing complex queries
 */
import { sqliteView } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { 
  events, 
  rounds, 
  fencers, 
  fencerEvents,
  bouts,
  fencerBouts,
  deBracketBouts,
  fencerPoolAssignment,
  pools
} from './schema';
import { eq, and, asc, desc } from 'drizzle-orm';

/**
 * EventFencersView
 * Provides a denormalized view of fencers registered for each event
 */
export const eventFencersView = sqliteView('EventFencersView')
  .as((qb) => {
    return qb
      .select({
        eventId: events.id,
        fencerId: fencers.id,
        tname: events.tname,
        weapon: events.weapon,
        gender: events.gender,
        age: events.age,
        class: events.class,
        fname: fencers.fname,
        lname: fencers.lname,
        club: fencers.club,
        rating: fencers.erating
      })
      .from(fencerEvents)
      .innerJoin(events, eq(events.id, fencerEvents.eventId))
      .innerJoin(fencers, eq(fencers.id, fencerEvents.fencerId));
  });

/**
 * EventRoundsView
 * Provides a denormalized view of all rounds for each event with their status
 */
export const eventRoundsView = sqliteView('EventRoundsView')
  .as((qb) => {
    return qb
      .select({
        eventId: events.id,
        roundId: rounds.id,
        tname: events.tname,
        roundType: rounds.type,
        roundOrder: rounds.rorder,
        isStarted: rounds.isStarted,
        isComplete: rounds.isComplete,
        weapon: events.weapon,
        gender: events.gender,
        age: events.age,
        class: events.class
      })
      .from(rounds)
      .innerJoin(events, eq(events.id, rounds.eventId));
  });

/**
 * FencerResultsView
 * Provides aggregated results for fencers across their bouts
 */
export const fencerResultsView = sqliteView('FencerResultsView')
  .as((qb) => {
    return qb
      .select({
        fencerId: fencers.id,
        eventId: bouts.eventId,
        roundId: bouts.roundId,
        fname: fencers.fname,
        lname: fencers.lname,
        totalBouts: sql<number>`COUNT(${fencerBouts.boutId})`,
        totalVictories: sql<number>`SUM(CASE WHEN ${bouts.victor} = ${fencers.id} THEN 1 ELSE 0 END)`,
        totalTouches: sql<number>`SUM(${fencerBouts.score})`,
        victoryPercentage: sql<number>`CAST(SUM(CASE WHEN ${bouts.victor} = ${fencers.id} THEN 1 ELSE 0 END) AS FLOAT) / COUNT(${fencerBouts.boutId})`
      })
      .from(fencerBouts)
      .innerJoin(bouts, eq(bouts.id, fencerBouts.boutId))
      .innerJoin(fencers, eq(fencers.id, fencerBouts.fencerId))
      .groupBy(fencers.id, bouts.eventId, bouts.roundId);
  });

/**
 * DEBracketView
 * Provides a denormalized view of the DE bracket structure
 */
export const deBracketView = sqliteView('DEBracketView')
  .as((qb) => {
    return qb
      .select({
        roundId: deBracketBouts.roundId,
        boutId: deBracketBouts.boutId,
        bracketType: deBracketBouts.bracketType,
        bracketRound: deBracketBouts.bracketRound,
        boutOrder: deBracketBouts.boutOrder,
        nextBoutId: deBracketBouts.nextBoutId,
        loserNextBoutId: deBracketBouts.loserNextBoutId,
        leftFencerId: bouts.lFencer,
        rightFencerId: bouts.rFencer,
        victorId: bouts.victor,
        leftScore: sql<number>`(SELECT fb.score FROM ${fencerBouts} AS fb WHERE fb.boutId = ${bouts.id} AND fb.fencerId = ${bouts.lFencer})`,
        rightScore: sql<number>`(SELECT fb.score FROM ${fencerBouts} AS fb WHERE fb.boutId = ${bouts.id} AND fb.fencerId = ${bouts.rFencer})`,
        leftFencerName: sql<string>`(SELECT f.fname || ' ' || f.lname FROM ${fencers} AS f WHERE f.id = ${bouts.lFencer})`,
        rightFencerName: sql<string>`(SELECT f.fname || ' ' || f.lname FROM ${fencers} AS f WHERE f.id = ${bouts.rFencer})`,
        refereeId: bouts.referee
      })
      .from(deBracketBouts)
      .leftJoin(bouts, eq(bouts.id, deBracketBouts.boutId));
  });

/**
 * PoolStandingsView
 * Provides a denormalized view of pool standings with computed metrics
 */
export const poolStandingsView = sqliteView('PoolStandingsView')
  .as((qb) => {
    const subquery = qb
      .select({
        fencerId: fencerPoolAssignment.fencerId,
        poolId: fencerPoolAssignment.poolId,
        roundId: fencerPoolAssignment.roundId,
        victories: sql<number>`SUM(CASE WHEN ${bouts.victor} = ${fencerPoolAssignment.fencerId} THEN 1 ELSE 0 END)`.as('victories'),
        bouts: sql<number>`COUNT(${bouts.id})`.as('bouts'),
        touchesScored: sql<number>`SUM(CASE WHEN ${fencerBouts.fencerId} = ${fencerPoolAssignment.fencerId} THEN ${fencerBouts.score} ELSE 0 END)`.as('touchesScored'),
        touchesReceived: sql<number>`SUM(CASE WHEN ${fencerBouts.fencerId} != ${fencerPoolAssignment.fencerId} THEN ${fencerBouts.score} ELSE 0 END)`.as('touchesReceived')
      })
      .from(fencerPoolAssignment)
      .leftJoin(
        bouts,
        and(
          eq(bouts.roundId, fencerPoolAssignment.roundId),
          sql`(${bouts.lFencer} = ${fencerPoolAssignment.fencerId} OR ${bouts.rFencer} = ${fencerPoolAssignment.fencerId})`
        )
      )
      .leftJoin(
        fencerBouts,
        and(
          eq(fencerBouts.boutId, bouts.id),
          sql`${fencerBouts.fencerId} IN (${bouts.lFencer}, ${bouts.rFencer})`
        )
      )
      .groupBy(fencerPoolAssignment.fencerId, fencerPoolAssignment.poolId, fencerPoolAssignment.roundId)
      .as('pool_stats');

    return qb
      .select({
        fencerId: sql<number>`${subquery}.fencerId`,
        poolId: sql<number>`${subquery}.poolId`,
        roundId: sql<number>`${subquery}.roundId`,
        victories: sql<number>`${subquery}.victories`,
        bouts: sql<number>`${subquery}.bouts`,
        victoryPercent: sql<number>`CAST(${subquery}.victories AS FLOAT) / NULLIF(${subquery}.bouts, 0)`,
        touchesScored: sql<number>`${subquery}.touchesScored`,
        touchesReceived: sql<number>`${subquery}.touchesReceived`,
        touchDifferential: sql<number>`${subquery}.touchesScored - ${subquery}.touchesReceived`,
        indicatorValue: sql<number>`CAST(${subquery}.touchesScored - ${subquery}.touchesReceived AS FLOAT) / NULLIF(${subquery}.bouts, 0)`,
        fname: fencers.fname,
        lname: fencers.lname,
        club: fencers.club,
        rating: fencers.erating
      })
      .from(subquery)
      .innerJoin(fencers, eq(fencers.id, subquery.fencerId));
  });

/**
 * Combined array of all views for easy export
 */
export const allViews = [
  eventFencersView,
  eventRoundsView,
  fencerResultsView,
  deBracketView,
  poolStandingsView
];