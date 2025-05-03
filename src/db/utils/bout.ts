// bout.ts - Bout-related database functions
import { and, count, eq, asc, desc, isNull, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../DrizzleClient';
import * as schema from '../schema';
import type { Bout } from '../../navigation/navigation/types';
import { dbGetDEFormat } from './round';
import { sql } from 'drizzle-orm';

/**
 * Updates a bout's score
 */
export async function dbUpdateBoutScore(boutId: number, fencerId: number, score: number): Promise<void> {
    try {
        await db
            .update(schema.fencerBouts)
            .set({ score })
            .where(and(eq(schema.fencerBouts.boutid, boutId), eq(schema.fencerBouts.fencerid, fencerId)));
    } catch (error) {
        console.error('Error updating bout score:', error);
        throw error;
    }
}

/**
 * Updates both fencers' scores in a bout
 */
export async function dbUpdateBoutScores(
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number,
    winnerId?: number
): Promise<void> {
    // Update individual fencer scores
    await dbUpdateBoutScore(boutId, fencerAId, scoreA);
    await dbUpdateBoutScore(boutId, fencerBId, scoreB);

    // Update the victor field in the bouts table if winner ID is provided
    if (winnerId !== undefined) {
        try {
            await db.update(schema.bouts).set({ victor: winnerId }).where(eq(schema.bouts.id, boutId));
            console.log(`Updated victor for bout ${boutId} to fencer ${winnerId}`);
        } catch (error) {
            console.error('Error updating bout victor:', error);
            throw error;
        }
    }
}

/**
 * Gets all bouts for a round
 */
export async function dbGetBoutsForRound(roundId: number): Promise<any[]> {
    try {
        // First, get the round type to determine approach
        const round = await db
            .select({
                type: schema.rounds.type,
                deformat: schema.rounds.deformat,
            })
            .from(schema.rounds)
            .where(eq(schema.rounds.id, roundId))
            .limit(1);

        if (!round.length) {
            console.error(`Round with ID ${roundId} not found`);
            return [];
        }

        if (round[0].type === 'pool') {
            // For pool rounds, get all bouts with pool info
            const fpa1 = alias(schema.fencerPoolAssignment, 'FPA1');
            const fpa2 = alias(schema.fencerPoolAssignment, 'FPA2');
            const leftFencer = alias(schema.fencers, 'leftF');
            const rightFencer = alias(schema.fencers, 'rightF');
            const leftFencerBout = alias(schema.fencerBouts, 'fb1');
            const rightFencerBout = alias(schema.fencerBouts, 'fb2');

            const bouts = await db
                .select({
                    bout: {
                        id: schema.bouts.id,
                        lfencer: schema.bouts.lfencer,
                        rfencer: schema.bouts.rfencer,
                        victor: schema.bouts.victor,
                        eventid: schema.bouts.eventid,
                        roundid: schema.bouts.roundid,
                    },
                    pool: {
                        poolid: fpa1.poolid,
                    },
                    leftFencer: {
                        fname: leftFencer.fname,
                        lname: leftFencer.lname,
                    },
                    rightFencer: {
                        fname: rightFencer.fname,
                        lname: rightFencer.lname,
                    },
                    scores: {
                        left_score: leftFencerBout.score,
                        right_score: rightFencerBout.score,
                    },
                })
                .from(schema.bouts)
                .innerJoin(fpa1, and(eq(schema.bouts.lfencer, fpa1.fencerid), eq(schema.bouts.roundid, fpa1.roundid)))
                .innerJoin(
                    fpa2,
                    and(
                        eq(schema.bouts.rfencer, fpa2.fencerid),
                        eq(schema.bouts.roundid, fpa2.roundid),
                        eq(fpa1.poolid, fpa2.poolid)
                    )
                )
                .leftJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
                .leftJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
                .leftJoin(
                    leftFencerBout,
                    and(eq(leftFencerBout.boutid, schema.bouts.id), eq(leftFencerBout.fencerid, schema.bouts.lfencer))
                )
                .leftJoin(
                    rightFencerBout,
                    and(eq(rightFencerBout.boutid, schema.bouts.id), eq(rightFencerBout.fencerid, schema.bouts.rfencer))
                )
                .where(eq(schema.bouts.roundid, roundId))
                .orderBy(asc(fpa1.poolid), asc(schema.bouts.id));

            // Transform the nested structure to the flat structure expected by the application
            return bouts.map(bout => ({
                id: bout.bout.id,
                lfencer: bout.bout.lfencer,
                rfencer: bout.bout.rfencer,
                victor: bout.bout.victor,
                eventid: bout.bout.eventid,
                roundid: bout.bout.roundid,
                left_fname: bout.leftFencer.fname,
                left_lname: bout.leftFencer.lname,
                right_fname: bout.rightFencer.fname,
                right_lname: bout.rightFencer.lname,
                left_score: bout.scores.left_score,
                right_score: bout.scores.right_score,
                poolid: bout.pool.poolid,
            }));
        } else if (round[0].type === 'de') {
            // For DE rounds, choose appropriate query based on format
            if (round[0].deformat === 'single') {
                return await dbGetDEBouts(roundId);
            } else {
                return []; // We only support single elimination in this version
            }
        }

        // Default empty array if round type is unrecognized
        return [];
    } catch (error) {
        console.error('Error getting bouts for round:', error);
        throw error;
    }
}

/**
 * Gets all DE bouts for a round
 */
export async function dbGetDEBouts(roundId: number): Promise<any[]> {
    try {
        console.log(`Fetching DE bouts for round ${roundId}`);

        // First check if there are any bouts for this round
        const boutCount = await db
            .select({ count: count() })
            .from(schema.bouts)
            .where(eq(schema.bouts.roundid, roundId));

        console.log(`Found ${boutCount[0]?.count || 0} bouts for round ${roundId}`);

        if (boutCount[0]?.count === 0) {
            console.log('No bouts found for this round, returning empty array');
            return [];
        }

        // Create aliases for the joined tables to handle multiple joins on the same table
        const leftFencer = alias(schema.fencers, 'leftF');
        const rightFencer = alias(schema.fencers, 'rightF');
        const leftFencerBout = alias(schema.fencerBouts, 'fb1');
        const rightFencerBout = alias(schema.fencerBouts, 'fb2');
        const leftSeeding = alias(schema.seedingFromRoundResults, 'LEFT_SEEDING');
        const rightSeeding = alias(schema.seedingFromRoundResults, 'RIGHT_SEEDING');

        // Using Drizzle's structured join API with table aliases
        console.log('Executing bout query with careful null handling...');

        // First get a simple list of bouts to ensure we have data
        const basicBouts = await db
            .select({
                id: schema.bouts.id,
                lfencer: schema.bouts.lfencer,
                rfencer: schema.bouts.rfencer,
            })
            .from(schema.bouts)
            .where(eq(schema.bouts.roundid, roundId));

        if (basicBouts.length === 0) {
            console.log('No bouts found in basic query');
            return [];
        }

        console.log(`Basic query found ${basicBouts.length} bouts. Sample: ${JSON.stringify(basicBouts[0])}`);

        // Continue with the detailed query now that we know bouts exist
        const bouts = await db
            .select({
                bout: {
                    id: schema.bouts.id,
                    lfencer: schema.bouts.lfencer,
                    rfencer: schema.bouts.rfencer,
                    victor: schema.bouts.victor,
                    eventid: schema.bouts.eventid,
                    roundid: schema.bouts.roundid,
                    tableof: schema.bouts.tableof,
                },
                // Use coalesce to handle null fields
                leftFencer: {
                    fname: sql`COALESCE(${leftFencer.fname}, '')`,
                    lname: sql`COALESCE(${leftFencer.lname}, '')`,
                },
                rightFencer: {
                    fname: sql`COALESCE(${rightFencer.fname}, '')`,
                    lname: sql`COALESCE(${rightFencer.lname}, '')`,
                },
                scores: {
                    left_score: leftFencerBout.score,
                    right_score: rightFencerBout.score,
                },
                seeding: {
                    seed_left: leftSeeding.seed,
                    seed_right: rightSeeding.seed,
                },
            })
            .from(schema.bouts)
            .leftJoin(leftFencer, eq(schema.bouts.lfencer, leftFencer.id))
            .leftJoin(rightFencer, eq(schema.bouts.rfencer, rightFencer.id))
            .leftJoin(
                leftFencerBout,
                and(eq(leftFencerBout.boutid, schema.bouts.id), eq(leftFencerBout.fencerid, schema.bouts.lfencer))
            )
            .leftJoin(
                rightFencerBout,
                and(eq(rightFencerBout.boutid, schema.bouts.id), eq(rightFencerBout.fencerid, schema.bouts.rfencer))
            )
            .leftJoin(
                leftSeeding,
                and(eq(leftSeeding.fencerid, schema.bouts.lfencer), eq(leftSeeding.roundid, schema.bouts.roundid))
            )
            .leftJoin(
                rightSeeding,
                and(eq(rightSeeding.fencerid, schema.bouts.rfencer), eq(rightSeeding.roundid, schema.bouts.roundid))
            )
            .where(eq(schema.bouts.roundid, roundId))
            .orderBy(desc(schema.bouts.tableof), asc(schema.bouts.id));

        // Transform the results to the expected flat format with careful null checking
        const transformedBouts = bouts.map(bout => {
            // Debug output for troubleshooting
            console.log(
                `Processing bout ID ${bout.bout.id}: leftFencer=${JSON.stringify(bout.leftFencer)}, rightFencer=${JSON.stringify(bout.rightFencer)}`
            );

            return {
                id: bout.bout.id,
                lfencer: bout.bout.lfencer,
                rfencer: bout.bout.rfencer,
                victor: bout.bout.victor,
                eventid: bout.bout.eventid,
                roundid: bout.bout.roundid,
                tableof: bout.bout.tableof,
                // Handle null/undefined fencer data safely
                left_fname: bout.leftFencer && bout.leftFencer.fname !== undefined ? bout.leftFencer.fname : '',
                left_lname: bout.leftFencer && bout.leftFencer.lname !== undefined ? bout.leftFencer.lname : '',
                right_fname: bout.rightFencer && bout.rightFencer.fname !== undefined ? bout.rightFencer.fname : '',
                right_lname: bout.rightFencer && bout.rightFencer.lname !== undefined ? bout.rightFencer.lname : '',
                // Handle null/undefined scores safely
                left_score: bout.scores && bout.scores.left_score !== undefined ? bout.scores.left_score : null,
                right_score: bout.scores && bout.scores.right_score !== undefined ? bout.scores.right_score : null,
                // Handle null/undefined seeding data safely
                seed_left: bout.seeding && bout.seeding.seed_left !== undefined ? bout.seeding.seed_left : null,
                seed_right: bout.seeding && bout.seeding.seed_right !== undefined ? bout.seeding.seed_right : null,
            };
        });

        console.log(`Returning ${transformedBouts.length} transformed DE bouts`);
        if (transformedBouts.length > 0) {
            console.log('Sample bout:', JSON.stringify(transformedBouts[0]));
        } else {
            console.log('No bouts found for this round');

            // Additional check to see if any bouts exist at all for this round
            const simpleBoutCheck = await db
                .select({
                    count: count(),
                })
                .from(schema.bouts)
                .where(eq(schema.bouts.roundid, roundId));

            console.log(`Simple count check: ${simpleBoutCheck[0]?.count || 0} bouts exist for round ${roundId}`);
        }

        return transformedBouts;
    } catch (error) {
        console.error('Error getting DE bouts:', error);
        throw error;
    }
}

/**
 * Updates a DE bout with scores and advances the winner to the next round
 * (Single elimination only)
 */
/**
 * Updates a DE bout with scores and advances the winner to the next round
 * using the DEBracketBouts table structure
 */
export async function dbUpdateDEBoutAndAdvanceWinner(
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number
): Promise<void> {
    try {
        // Update the scores
        await dbUpdateBoutScores(boutId, scoreA, scoreB, fencerAId, fencerBId);

        // Determine the winner
        const victorId = scoreA > scoreB ? fencerAId : fencerBId;

        // Update the bout with the victor
        await db.update(schema.bouts).set({ victor: victorId }).where(eq(schema.bouts.id, boutId));

        console.log(`Updated bout ${boutId} with scores A:${scoreA}-B:${scoreB}, victor: ${victorId}`);

        // Get the bracket information for this bout to determine next steps
        const bracketBout = await db
            .select({
                next_bout_id: schema.deBracketBouts.next_bout_id,
                bout_order: schema.deBracketBouts.bout_order,
            })
            .from(schema.deBracketBouts)
            .where(eq(schema.deBracketBouts.bout_id, boutId))
            .limit(1);

        if (!bracketBout.length || !bracketBout[0].next_bout_id) {
            console.log(`No next bout found for bout ${boutId} (possibly the final)`);
            return;
        }

        const nextBoutId = bracketBout[0].next_bout_id;
        const boutOrder = bracketBout[0].bout_order;

        // Determine if the winner should go to the left or right side of the next bout
        // Even bout_order goes to left, odd goes to right
        if (boutOrder % 2 === 0) {
            // Even positions go to left side of next bout
            console.log(`Placing winner ${victorId} in left position of next bout ${nextBoutId}`);
            await db.update(schema.bouts).set({ lfencer: victorId }).where(eq(schema.bouts.id, nextBoutId));
        } else {
            // Odd positions go to right side of next bout
            console.log(`Placing winner ${victorId} in right position of next bout ${nextBoutId}`);
            await db.update(schema.bouts).set({ rfencer: victorId }).where(eq(schema.bouts.id, nextBoutId));
        }

        console.log(`Advanced winner ${victorId} to next round bout ${nextBoutId}`);
    } catch (error) {
        console.error('Error updating bout and advancing winner:', error);
        throw error;
    }
}
