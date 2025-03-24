/**
 * Event Service
 * Provides optimized data access functions for the Events domain
 */
import db from '../../../infrastructure/database/client';
import { events, fencerEvents, fencers, refereeEvents, referees, officialEvents, officials, rounds } from '../../../infrastructure/database/schema';
import { eq, and, sql, inArray, count } from 'drizzle-orm';
import { Event, Fencer, Official, Referee } from '../../../core/types';

// Type definitions
export type EventInsert = {
  tname: string;
  weapon: string;
  gender: string;
  age: string;
  class: string;
  seeding?: string;
};

export type EventWithParticipants = Event & {
  fencers?: Fencer[];
  referees?: Referee[];
  officials?: Official[];
};

export type BatchEventUpdate = {
  id: number;
  data: Partial<Event>;
};

// Prepared statements for optimized queries
const getEventByIdStatement = db
  .select()
  .from(events)
  .where(eq(events.id, sql.placeholder('id')))
  .prepare();

const getEventsByTournamentStatement = db
  .select()
  .from(events)
  .where(eq(events.tname, sql.placeholder('tournamentName')))
  .prepare();

const getEventCountStatement = db
  .select({ count: count() })
  .from(events)
  .prepare();

const getEventCountByTournamentStatement = db
  .select({ count: count() })
  .from(events)
  .where(eq(events.tname, sql.placeholder('tournamentName')))
  .prepare();

/**
 * Get all events
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    return await db.select().from(events);
  } catch (error) {
    console.error('Failed to get all events:', error);
    throw new Error(`Failed to get events: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get event by ID with optional relations
 */
export async function getEventById(id: number, includeRelations = false): Promise<Event | EventWithParticipants | null> {
  try {
    const result = await getEventByIdStatement.execute({ id });
    
    if (!result.length) {
      return null;
    }
    
    if (!includeRelations) {
      return result[0];
    }
    
    // Get related fencers
    const eventFencers = await db
      .select({
        id: fencers.id,
        fname: fencers.fname,
        lname: fencers.lname,
        nickname: fencers.nickname,
        gender: fencers.gender,
        club: fencers.club,
        erating: fencers.erating,
        eyear: fencers.eyear,
        frating: fencers.frating,
        fyear: fencers.fyear,
        srating: fencers.srating,
        syear: fencers.syear,
      })
      .from(fencerEvents)
      .leftJoin(fencers, eq(fencerEvents.fencerId, fencers.id))
      .where(eq(fencerEvents.eventId, id));
    
    // Get related referees
    const eventReferees = await db
      .select({
        id: referees.id,
        fname: referees.fname,
        lname: referees.lname,
        nickname: referees.nickname,
        deviceId: referees.deviceId,
      })
      .from(refereeEvents)
      .leftJoin(referees, eq(refereeEvents.refereeId, referees.id))
      .where(eq(refereeEvents.eventId, id));
    
    // Get related officials
    const eventOfficials = await db
      .select({
        id: officials.id,
        fname: officials.fname,
        lname: officials.lname,
        nickname: officials.nickname,
        deviceId: officials.deviceId,
      })
      .from(officialEvents)
      .leftJoin(officials, eq(officialEvents.officialId, officials.id))
      .where(eq(officialEvents.eventId, id));
    
    // Combine everything
    return {
      ...result[0],
      fencers: eventFencers,
      referees: eventReferees,
      officials: eventOfficials,
    };
  } catch (error) {
    console.error(`Failed to get event with ID ${id}:`, error);
    throw new Error(`Failed to get event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get events by tournament name
 */
export async function getEventsByTournament(tournamentName: string): Promise<Event[]> {
  try {
    return await getEventsByTournamentStatement.execute({ tournamentName });
  } catch (error) {
    console.error(`Failed to get events for tournament ${tournamentName}:`, error);
    throw new Error(`Failed to get events for tournament: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new event
 */
export async function createEvent(data: EventInsert): Promise<Event> {
  try {
    const result = await db.insert(events).values(data).returning();
    
    if (!result.length) {
      throw new Error('Failed to create event');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create event:', error);
    throw new Error(`Failed to create event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create multiple events in a batch operation
 */
export async function createEvents(eventsList: EventInsert[]): Promise<Event[]> {
  try {
    if (eventsList.length === 0) {
      return [];
    }
    
    const result = await db.insert(events).values(eventsList).returning();
    return result;
  } catch (error) {
    console.error('Failed to create events in batch:', error);
    throw new Error(`Failed to create events: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update an event
 */
export async function updateEvent(id: number, data: Partial<Event>): Promise<Event | null> {
  try {
    const result = await db
      .update(events)
      .set(data)
      .where(eq(events.id, id))
      .returning();
    
    if (!result.length) {
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update event with ID ${id}:`, error);
    throw new Error(`Failed to update event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update multiple events in a single transaction
 */
export async function batchUpdateEvents(updates: BatchEventUpdate[]): Promise<Event[]> {
  try {
    if (updates.length === 0) {
      return [];
    }
    
    const updatedEvents: Event[] = [];
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      for (const update of updates) {
        const result = await tx
          .update(events)
          .set(update.data)
          .where(eq(events.id, update.id))
          .returning();
        
        if (result.length > 0) {
          updatedEvents.push(result[0]);
        }
      }
    });
    
    return updatedEvents;
  } catch (error) {
    console.error('Failed to batch update events:', error);
    throw new Error(`Failed to batch update events: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning();
    
    return result.length > 0;
  } catch (error) {
    console.error(`Failed to delete event with ID ${id}:`, error);
    throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete multiple events
 */
export async function batchDeleteEvents(ids: number[]): Promise<number> {
  try {
    if (ids.length === 0) {
      return 0;
    }
    
    // Use transaction to ensure all related records are deleted
    let deletedCount = 0;
    
    await db.transaction(async (tx) => {
      // First, delete related records
      await tx.delete(fencerEvents).where(inArray(fencerEvents.eventId, ids));
      await tx.delete(refereeEvents).where(inArray(refereeEvents.eventId, ids));
      await tx.delete(officialEvents).where(inArray(officialEvents.eventId, ids));
      await tx.delete(rounds).where(inArray(rounds.eventId, ids));
      
      // Then delete the events
      const result = await tx.delete(events).where(inArray(events.id, ids)).returning();
      deletedCount = result.length;
    });
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to batch delete events:', error);
    throw new Error(`Failed to batch delete events: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get count of events
 */
export async function getEventCount(): Promise<number> {
  try {
    const [result] = await getEventCountStatement.execute();
    return result.count;
  } catch (error) {
    console.error('Failed to get event count:', error);
    throw new Error(`Failed to get event count: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get count of events by tournament
 */
export async function getEventCountByTournament(tournamentName: string): Promise<number> {
  try {
    const [result] = await getEventCountByTournamentStatement.execute({ tournamentName });
    return result.count;
  } catch (error) {
    console.error(`Failed to get event count for tournament ${tournamentName}:`, error);
    throw new Error(`Failed to get event count: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get summary of tournament events
 */
export async function getTournamentEventSummary(tournamentName: string): Promise<{ [key: string]: number }> {
  try {
    // Get all events for the tournament
    const tournamentEvents = await getEventsByTournament(tournamentName);
    
    // Create summary by weapon and gender
    const summary: { [key: string]: number } = {};
    
    tournamentEvents.forEach(event => {
      const key = `${event.weapon}-${event.gender}`;
      summary[key] = (summary[key] || 0) + 1;
    });
    
    return summary;
  } catch (error) {
    console.error(`Failed to get event summary for tournament ${tournamentName}:`, error);
    throw new Error(`Failed to get event summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}