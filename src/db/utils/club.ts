// club.ts - Club-related database functions
import { like } from 'drizzle-orm';
import { db } from '../DrizzleClient';
import * as schema from '../schema';

/**
 * Creates a new club in the database
 */
export async function dbCreateClub(club: { name: string; abbreviation?: string }): Promise<number> {
    try {
        // Auto-generate abbreviation if not provided
        if (!club.abbreviation && club.name) {
            club.abbreviation = generateClubAbbreviation(club.name);
        }

        const result = await db
            .insert(schema.clubs)
            .values({
                name: club.name,
                abbreviation: club.abbreviation,
            })
            .returning({ id: schema.clubs.id });

        console.log(`Club "${club.name}" created with id ${result[0]?.id}.`);
        return result[0]?.id || -1;
    } catch (error) {
        console.error('Error creating club:', error);
        throw error;
    }
}

/**
 * Searches for clubs by name
 */
export async function dbSearchClubs(query: string): Promise<any[]> {
    try {
        const clubs = await db
            .select()
            .from(schema.clubs)
            .where(like(schema.clubs.name, `%${query}%`));

        console.log(`Search returned ${clubs.length} clubs`);
        return clubs;
    } catch (error) {
        console.error('Error searching clubs:', error);
        return [];
    }
}

/**
 * Helper function to generate club abbreviation
 */
export function generateClubAbbreviation(name: string): string {
    if (!name) return '';

    // Take first letter of each word, uppercase
    const abbr = name
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase())
        .join('');

    // Ensure it's between 2-5 characters
    if (abbr.length < 2) {
        // If too short, add the second letter of the first word if available
        return name.length > 1 ? name.substring(0, 2).toUpperCase() : abbr;
    } else if (abbr.length > 5) {
        // If too long, truncate to 5 characters
        return abbr.substring(0, 5);
    }

    return abbr;
}
