// official.ts - Official-related database functions
import { eq } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';

/**
 * Creates a new official in the database
 */
export async function dbCreateOfficial(official: {
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
}): Promise<number> {
    try {
        const result = await db
            .insert(schema.officials)
            .values({
                fname: official.fname,
                lname: official.lname,
                nickname: official.nickname,
                device_id: official.device_id,
            })
            .returning({ id: schema.officials.id });

        const newOfficialId = result[0]?.id;
        if (!newOfficialId) {
            throw new Error('Failed to get new official ID');
        }

        console.log(`Official "${official.fname} ${official.lname}" created with id ${newOfficialId}.`);
        return newOfficialId;
    } catch (error) {
        console.error('Error creating official:', error);
        throw error;
    }
}

/**
 * Gets an official by device ID
 */
export async function dbGetOfficialByDeviceId(deviceId: string): Promise<any | null> {
    try {
        const officials = await db
            .select()
            .from(schema.officials)
            .where(eq(schema.officials.device_id, deviceId))
            .limit(1);

        return officials.length > 0 ? officials[0] : null;
    } catch (error) {
        console.error('Error getting official by device ID:', error);
        return null;
    }
}

/**
 * Adds an official to an event
 */
export async function dbAddOfficialToEvent(officialId: number, eventId: number): Promise<void> {
    try {
        await db
            .insert(schema.officialEvents)
            .values({
                officialid: officialId,
                eventid: eventId,
            })
            .onConflictDoNothing();

        console.log(`Official ID ${officialId} added to event ID ${eventId}`);
    } catch (error) {
        console.error('Error adding official to event:', error);
        throw error;
    }
}

/**
 * Gets all officials for an event
 */
export async function dbGetOfficialsForEvent(eventId: number): Promise<any[]> {
    try {
        const result = await db
            .select()
            .from(schema.officials)
            .innerJoin(schema.officialEvents, eq(schema.officials.id, schema.officialEvents.officialid))
            .where(eq(schema.officialEvents.eventid, eventId));

        // Extract just the official data from the joined result
        const officials = result.map(({ officials }) => officials);

        return officials;
    } catch (error) {
        console.error('Error getting officials for event:', error);
        return [];
    }
}

/**
 * Lists all officials
 */
export async function dbListOfficials(): Promise<any[]> {
    try {
        return await db.select().from(schema.officials);
    } catch (error) {
        console.error('Error listing officials:', error);
        return [];
    }
}

/**
 * Deletes an official from the database
 */
export async function dbDeleteOfficial(officialId: number): Promise<void> {
    try {
        // First, remove the official from all events they may be associated with
        await db.delete(schema.officialEvents).where(eq(schema.officialEvents.officialid, officialId));

        // Then, delete the official record
        await db.delete(schema.officials).where(eq(schema.officials.id, officialId));

        console.log(`Deleted official with ID: ${officialId}`);
    } catch (error) {
        console.error(`Error deleting official: ${error}`);
        throw error;
    }
}
