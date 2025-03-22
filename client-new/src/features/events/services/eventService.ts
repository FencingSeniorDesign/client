/**
 * Event Service
 * Provides data access functions for events
 */
import { Event } from '../../../core/types';
import { events } from '../../../infrastructure/database/schema';
import db from '../../../infrastructure/database/client';
import { eq } from 'drizzle-orm';

// Define the event insert type - used for creating new events
export type EventInsert = {
  tname: string;      // Tournament name
  weapon: string;     // Weapon type (foil, epee, sabre)
  gender: string;     // Gender category
  age: string;        // Age category
  class: string;      // Classification
  seeding?: string;   // Seeding method
};

/**
 * Get all events
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    return await db.select().from(events);
  } catch (error) {
    console.error('Failed to get all events:', error);
    throw new Error(`Failed to get all events: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get an event by ID
 */
export async function getEventById(id: number): Promise<Event | undefined> {
  try {
    const result = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error(`Failed to get event with ID ${id}:`, error);
    throw new Error(`Failed to get event with ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get events by tournament name
 */
export async function getEventsByTournament(tournamentName: string): Promise<Event[]> {
  try {
    return await db
      .select()
      .from(events)
      .where(eq(events.tname, tournamentName));
  } catch (error) {
    console.error(`Failed to get events for tournament "${tournamentName}":`, error);
    throw new Error(`Failed to get events for tournament: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a new event
 */
export async function createEvent(eventData: EventInsert): Promise<Event> {
  try {
    const result = await db
      .insert(events)
      .values(eventData)
      .returning();
    
    if (!result.length) {
      throw new Error('Failed to create event: No result returned');
    }
    
    return result[0];
  } catch (error) {
    console.error('Failed to create event:', error);
    throw new Error(`Failed to create event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update an event
 */
export async function updateEvent(id: number, data: Partial<Event>): Promise<Event> {
  try {
    const result = await db
      .update(events)
      .set(data)
      .where(eq(events.id, id))
      .returning();
    
    if (!result.length) {
      throw new Error(`Event with ID ${id} not found`);
    }
    
    return result[0];
  } catch (error) {
    console.error(`Failed to update event with ID ${id}:`, error);
    throw new Error(`Failed to update event: ${error instanceof Error ? error.message : String(error)}`);
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
 * Get event with all related data (stub for now)
 * This will be implemented as we build out the relations
 */
export async function getEventWithRelations(eventId: number): Promise<Event> {
  try {
    const event = await getEventById(eventId);
    
    if (!event) {
      throw new Error(`Event with id ${eventId} not found`);
    }
    
    // TODO: Implement the relations loading when we have the fencer and referee domains
    // For now, just return the basic event data
    
    return event;
  } catch (error) {
    console.error(`Failed to get event with relations for ID ${eventId}:`, error);
    throw new Error(`Failed to get event with relations: ${error instanceof Error ? error.message : String(error)}`);
  }
}