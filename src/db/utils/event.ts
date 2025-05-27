// event.ts - Event-related database functions
import { count, eq, sql } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Event } from '../../navigation/navigation/types';

/**
 * Lists all events for a tournament
 */
export async function dbListEvents(tournamentName: string): Promise<Event[]> {
    try {
        // Create a subquery for counting started rounds per event
        const events = await db
            .select({
                ...schema.events,
                startedCount: sql<number>`COALESCE(
        (SELECT COUNT(*) FROM ${schema.rounds} 
         WHERE ${schema.rounds.eventid} = ${schema.events.id} 
         AND ${schema.rounds.isstarted} = true), 0)`,
            })
            .from(schema.events)
            .where(eq(schema.events.tname, tournamentName));

        return events as Event[];
    } catch (error) {
        console.error('Error listing events:', error);
        throw error;
    }
}

/**
 * Creates a new event in the database
 */
export async function dbCreateEvent(tournamentName: string, event: Event): Promise<void> {
    try {
        const age = event.age || 'senior';
        const eventClass = event.class || 'N/A';
        const seeding = event.seeding || 'N/A';
        const eventType = event.event_type || 'individual';
        const teamFormat = event.team_format || null;

        await db.insert(schema.events).values({
            id: event.id,
            tname: tournamentName,
            weapon: event.weapon,
            gender: event.gender,
            age: age,
            class: eventClass,
            seeding: seeding,
            event_type: eventType,
            team_format: teamFormat,
        });

        console.log('Event created successfully.');
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
}

/**
 * Deletes an event from the database
 */
export async function dbDeleteEvent(eventId: number): Promise<void> {
    try {
        await db.delete(schema.events).where(eq(schema.events.id, eventId));

        console.log('Event deleted successfully.');
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

/**
 * Gets an event by ID
 */
export async function dbGetEventById(eventId: number): Promise<Event> {
    try {
        const events = await db.select().from(schema.events).where(eq(schema.events.id, eventId)).limit(1);

        if (!events.length) {
            throw new Error(`Event with ID ${eventId} not found`);
        }

        return events[0] as Event;
    } catch (error) {
        console.error('Error fetching event by ID:', error);
        throw error;
    }
}

/**
 * Gets the event name for a round
 */
export async function dbGetEventNameForRound(roundId: number): Promise<string> {
    try {
        const result = await db
            .select({
                weapon: schema.events.weapon,
                gender: schema.events.gender,
                age: schema.events.age,
            })
            .from(schema.events)
            .innerJoin(schema.rounds, eq(schema.events.id, schema.rounds.eventid))
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!result.length) {
            return 'Unknown Event';
        }

        return `${result[0].gender} ${result[0].age} ${result[0].weapon}`;
    } catch (error) {
        console.error('Error getting event name:', error);
        return 'Unknown Event';
    }
}
