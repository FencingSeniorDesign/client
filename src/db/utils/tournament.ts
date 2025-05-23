// tournament.ts - Tournament-related database functions
import { eq } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Tournament } from '../../navigation/navigation/types';

/**
 * Creates a new tournament in the database
 */
export async function dbCreateTournament(tournamentName: string, iscomplete: number = 0): Promise<void> {
    try {
        await db.insert(schema.tournaments).values({
            name: tournamentName,
            iscomplete: iscomplete === 1,
        });
        console.log(`Tournament "${tournamentName}" created successfully.`);
    } catch (error) {
        console.error('Error creating tournament:', error);
        throw error;
    }
}

/**
 * Deletes a tournament from the database
 */
export async function dbDeleteTournament(tournamentName: string): Promise<void> {
    try {
        await db.delete(schema.tournaments).where(eq(schema.tournaments.name, tournamentName));
        console.log(`Tournament "${tournamentName}" deleted successfully.`);
    } catch (error) {
        console.error('Error deleting tournament:', error);
        throw error;
    }
}

/**
 * Lists all ongoing tournaments
 */
export async function dbListOngoingTournaments(): Promise<Tournament[]> {
    try {
        const tournaments = await db.select().from(schema.tournaments).where(eq(schema.tournaments.iscomplete, false));

        console.log(`[${tournaments.length}] ongoing tournaments listed successfully.`);
        return tournaments as Tournament[];
    } catch (error) {
        console.error('Error listing ongoing tournaments:', error);
        throw error;
    }
}

/**
 * Lists all completed tournaments
 */
export async function dbListCompletedTournaments(): Promise<Tournament[]> {
    try {
        const tournaments = await db.select().from(schema.tournaments).where(eq(schema.tournaments.iscomplete, true));

        console.log(`[${tournaments.length}] completed tournaments listed successfully.`);
        return tournaments as Tournament[];
    } catch (error) {
        console.error('Error listing completed tournaments:', error);
        throw error;
    }
}

/**
 * Marks a tournament as complete
 */
export async function dbMarkTournamentComplete(tournamentName: string): Promise<void> {
    try {
        await db.update(schema.tournaments)
            .set({ iscomplete: true })
            .where(eq(schema.tournaments.name, tournamentName));
        console.log(`Tournament "${tournamentName}" marked as complete.`);
    } catch (error) {
        console.error('Error marking tournament as complete:', error);
        throw error;
    }
}
