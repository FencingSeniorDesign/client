// fencer.ts - Fencer-related database functions
import { and, eq, like, or } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Fencer, Event } from '../../navigation/navigation/types';
import { dbSearchClubs, dbCreateClub } from './club';

/**
 * Creates a new fencer in the database by name
 */
export async function dbCreateFencerByName(
    fencer: Fencer,
    event?: Event,
    insertOnCreate: boolean = false
): Promise<void> {
    try {
        // Handle club creation/assignment if needed
        if (fencer.club && !fencer.clubid) {
            // Check if club already exists
            const existingClubs = await dbSearchClubs(fencer.club);
            const exactMatch = existingClubs.find(c => c.name.toLowerCase() === fencer.club?.toLowerCase());

            if (exactMatch) {
                fencer.clubid = exactMatch.id;
            } else {
                // Create new club
                const clubId = await dbCreateClub({ name: fencer.club });
                fencer.clubid = clubId;
            }
        }

        const result = await db
            .insert(schema.fencers)
            .values({
                fname: fencer.fname,
                lname: fencer.lname,
                club: fencer.club || null,
                clubid: fencer.clubid || null,
                erating: fencer.erating ?? 'U',
                eyear: fencer.eyear ?? 0,
                frating: fencer.frating ?? 'U',
                fyear: fencer.fyear ?? 0,
                srating: fencer.srating ?? 'U',
                syear: fencer.syear ?? 0,
            })
            .returning({ id: schema.fencers.id });

        const newFencerId = result[0]?.id;
        fencer.id = newFencerId;

        console.log(
            `Fencer "${fencer.fname} ${fencer.lname}" created with id ${fencer.id}.`,
            JSON.stringify(fencer, null, '\t')
        );

        if (event && insertOnCreate && fencer.id) {
            await dbAddFencerToEventById(fencer, event);
        }
    } catch (error) {
        console.error('Error creating fencer:', error);
    }
}

/**
 * Searches for fencers by name
 */
export async function dbSearchFencers(query: string): Promise<Fencer[]> {
    try {
        const fencers = await db
            .select({
                id: schema.fencers.id,
                fname: schema.fencers.fname,
                lname: schema.fencers.lname,
                club: schema.fencers.club,
                clubid: schema.fencers.clubid,
                clubName: schema.clubs.name,
                clubAbbreviation: schema.clubs.abbreviation,
                erating: schema.fencers.erating,
                eyear: schema.fencers.eyear,
                frating: schema.fencers.frating,
                fyear: schema.fencers.fyear,
                srating: schema.fencers.srating,
                syear: schema.fencers.syear,
            })
            .from(schema.fencers)
            .leftJoin(schema.clubs, eq(schema.fencers.clubid, schema.clubs.id))
            .where(or(like(schema.fencers.fname, `%${query}%`), like(schema.fencers.lname, `%${query}%`)));

        console.log(`Search returned ${fencers.length} results`);
        return fencers as Fencer[];
    } catch (error) {
        console.error('Error searching fencers:', error);
        return [];
    }
}

/**
 * Gets all fencers in an event
 */
export async function dbGetFencersInEventById(event: Event): Promise<Fencer[]> {
    try {
        const fencersWithEvents = await db
            .select({
                id: schema.fencers.id,
                fname: schema.fencers.fname,
                lname: schema.fencers.lname,
                club: schema.fencers.club,
                clubid: schema.fencers.clubid,
                clubName: schema.clubs.name,
                clubAbbreviation: schema.clubs.abbreviation,
                erating: schema.fencers.erating,
                eyear: schema.fencers.eyear,
                frating: schema.fencers.frating,
                fyear: schema.fencers.fyear,
                srating: schema.fencers.srating,
                syear: schema.fencers.syear,
            })
            .from(schema.fencers)
            .innerJoin(schema.fencerEvents, eq(schema.fencers.id, schema.fencerEvents.fencerid))
            .leftJoin(schema.clubs, eq(schema.fencers.clubid, schema.clubs.id))
            .where(eq(schema.fencerEvents.eventid, event.id));

        console.log(`Fencers associated with Event ID [${event.id}]: ${fencersWithEvents.length}`);
        return fencersWithEvents as Fencer[];
    } catch (error) {
        console.error('Error getting fencers in event:', error);
        return [];
    }
}

/**
 * Adds a fencer to an event
 */
export async function dbAddFencerToEventById(fencer: Fencer, event: Event): Promise<void> {
    try {
        if (!fencer.id) {
            throw new Error('Fencer ID is required');
        }

        await db
            .insert(schema.fencerEvents)
            .values({
                fencerid: fencer.id,
                eventid: event.id,
            })
            .onConflictDoNothing();

        console.log(`"${fencer.fname} ${fencer.lname}" added to "${event.gender} ${event.age} ${event.weapon}"`);
    } catch (error) {
        console.error(`Error adding fencer ${fencer.id} to event ${event.id}:`, error);
    }
}

/**
 * Deletes a fencer from an event
 */
export async function dbDeleteFencerFromEventById(fencer: Fencer, event: Event): Promise<void> {
    try {
        if (!fencer.id) {
            throw new Error('Fencer ID is required');
        }

        await db
            .delete(schema.fencerEvents)
            .where(and(eq(schema.fencerEvents.fencerid, fencer.id), eq(schema.fencerEvents.eventid, event.id)));
    } catch (error) {
        console.error('Error deleting fencer from event:', error);
        throw error;
    }
}
