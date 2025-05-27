// referee.ts - Referee-related database functions
import { eq } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';

/**
 * Creates a new referee in the database
 */
export async function dbCreateReferee(referee: {
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
}): Promise<number> {
    try {
        const result = await db
            .insert(schema.referees)
            .values({
                fname: referee.fname,
                lname: referee.lname,
                nickname: referee.nickname,
                device_id: referee.device_id,
            })
            .returning({ id: schema.referees.id });

        const newRefereeId = result[0]?.id;
        if (!newRefereeId) {
            throw new Error('Failed to get new referee ID');
        }

        console.log(`Referee "${referee.fname} ${referee.lname}" created with id ${newRefereeId}.`);
        return newRefereeId;
    } catch (error) {
        console.error('Error creating referee:', error);
        throw error;
    }
}

/**
 * Gets a referee by device ID
 */
export async function dbGetRefereeByDeviceId(deviceId: string): Promise<any | null> {
    try {
        const referees = await db
            .select()
            .from(schema.referees)
            .where(eq(schema.referees.device_id, deviceId))
            .limit(1);

        return referees.length > 0 ? referees[0] : null;
    } catch (error) {
        console.error('Error getting referee by device ID:', error);
        return null;
    }
}

/**
 * Adds a referee to an event
 */
export async function dbAddRefereeToEvent(refereeId: number, eventId: number): Promise<void> {
    try {
        await db
            .insert(schema.refereeEvents)
            .values({
                refereeid: refereeId,
                eventid: eventId,
            })
            .onConflictDoNothing();

        console.log(`Referee ID ${refereeId} added to event ID ${eventId}`);
    } catch (error) {
        console.error('Error adding referee to event:', error);
        throw error;
    }
}

/**
 * Gets all referees for an event
 */
export async function dbGetRefereesForEvent(eventId: number): Promise<any[]> {
    try {
        const result = await db
            .select()
            .from(schema.referees)
            .innerJoin(schema.refereeEvents, eq(schema.referees.id, schema.refereeEvents.refereeid))
            .where(eq(schema.refereeEvents.eventid, eventId));

        // Extract just the referee data from the joined result
        const referees = result.map(({ referees }) => referees);

        return referees;
    } catch (error) {
        console.error('Error getting referees for event:', error);
        return [];
    }
}

/**
 * Lists all referees
 */
export async function dbListReferees(): Promise<any[]> {
    try {
        return await db.select().from(schema.referees);
    } catch (error) {
        console.error('Error listing referees:', error);
        return [];
    }
}

/**
 * Updates a referee in the database
 */
export async function dbUpdateReferee(referee: {
    id: number;
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
}): Promise<void> {
    try {
        await db
            .update(schema.referees)
            .set({
                fname: referee.fname,
                lname: referee.lname,
                nickname: referee.nickname,
                device_id: referee.device_id,
            })
            .where(eq(schema.referees.id, referee.id));

        console.log(`Updated referee with ID: ${referee.id}`);
    } catch (error) {
        console.error(`Error updating referee: ${error}`);
        throw error;
    }
}

/**
 * Deletes a referee from the database
 */
export async function dbDeleteReferee(refereeId: number): Promise<void> {
    try {
        // First, remove the referee from all events they may be associated with
        await db.delete(schema.refereeEvents).where(eq(schema.refereeEvents.refereeid, refereeId));

        // Then, delete the referee record
        await db.delete(schema.referees).where(eq(schema.referees.id, refereeId));

        console.log(`Deleted referee with ID: ${refereeId}`);
    } catch (error) {
        console.error(`Error deleting referee: ${error}`);
        throw error;
    }
}
