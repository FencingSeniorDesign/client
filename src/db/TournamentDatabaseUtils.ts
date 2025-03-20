// TournamentDatabaseUtils.ts
import * as SQLite from 'expo-sqlite';
import {Fencer, Event, Tournament, Round, Bout} from "../navigation/navigation/types";
import { buildPools } from "../navigation/utils/RoundAlgorithms";

const DATABASE_NAME = 'tf.db';

initDB();

async function openDB(): Promise<SQLite.SQLiteDatabase> {
    return SQLite.openDatabaseAsync(DATABASE_NAME);
}

export async function initDB(): Promise<void> {
    const db = await openDB();
    console.log("Database initializing");

    // Tournaments
    try {
        await db.execAsync(`
            create table IF NOT EXISTS Tournaments
            (
                name PRIMARY KEY,
                iscomplete integer default 0
            );
        `);
        console.log("Tournaments table initialized");
    } catch (error) {
        console.log(error);
    }

    // Fencers
    try {
        await db.execAsync(`
            create table if not exists Fencers
            (
                id       integer primary key,
                fname    text,
                lname    text,
                nickname text,
                gender   text,
                club text,

                erating  text CHECK (erating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
                eyear    integer default 0,
                frating  text CHECK (frating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
                fyear    integer default 0,
                srating  text CHECK (srating IN ('U', 'E', 'D', 'C', 'B', 'A')) default 'U',
                syear    integer default 0,

                UNIQUE (fname, lname)
                );
        `);
        console.log("Fencer table initialized");
    } catch (error) {
        console.log(error);
    }

    // Referees
    try {
        await db.execAsync(`
            create table if not exists Referees
            (
                id       integer PRIMARY KEY,
                fname    text,
                lname    text,
                nickname text default null,
                device_id text default null
            );
        `);
        console.log("Referee table initialized");
    } catch (error) {
        console.log(error);
    }

    // Officials
    try {
        await db.execAsync(`
            create table if not exists Officials
            (
                id       integer PRIMARY KEY,
                fname    text,
                lname    text,
                nickname text default null,
                device_id text default null
            );
        `);
        console.log("Officials table initialized");
    } catch (error) {
        console.log(error);
    }

    // OfficialEvents
    try {
        await db.execAsync(`
            create table if not exists OfficialEvents
            (
                officialid integer,
                eventid    integer,
                FOREIGN KEY (officialid) REFERENCES Officials (id),
                FOREIGN KEY (eventid) REFERENCES Events (id)
            );
        `);
        console.log("OfficialEvents table initialized");
    } catch (error) {
        console.log(error);
    }

    // RefereeEvents
    try {
        await db.execAsync(`
            create table if not exists RefereeEvents
            (
                refereeid integer,
                eventid   integer,
                FOREIGN KEY (refereeid) REFERENCES Referees (id),
                FOREIGN KEY (eventid) REFERENCES Events (id)
            );
        `);
        console.log("RefereeEvents table initialized");
    } catch (error) {
        console.log(error);
    }

    // Events
    try {
        await db.execAsync(`
            create table if not exists Events
            (
                id      integer PRIMARY KEY,
                tname   text NOT NULL,
                weapon  text NOT NULL,
                gender  text NOT NULL,
                age     text NOT NULL,
                class   text NOT NULL,
                seeding text,
                FOREIGN KEY (tname) references Tournaments (name)
                );
        `);
        console.log("Events table initialized");
    } catch (error) {
        console.log(error);
    }

    // FencerEvents
    try {
        await db.execAsync(`
            create table if not exists FencerEvents
            (
                fencerid integer,
                eventid  integer,
                FOREIGN KEY (fencerid) REFERENCES Fencers (id),
                FOREIGN KEY (eventid) REFERENCES Events (id)
                );
        `);
    } catch (error) {
        console.log(error);
    }

    // Rounds
    try {
        await db.execAsync(`
            create table IF NOT EXISTS Rounds
            (
                id          integer PRIMARY KEY,
                eventid     integer,
                type        text check (type in ('pool', 'de')),
                rorder      integer, -- round 1 is fenced first, then round 2, etc

                -- Pool Settings
                poolcount integer,
                poolsize integer, -- When setting in the UI, use the higher of the two numbers

                poolsoption TEXT DEFAULT 'promotion' check (poolsoption in ('promotion', 'target')),
                promotionpercent integer default 100,
                targetbracket integer,
                usetargetbracket integer default 0, -- If we're using promotion % (default) or target bracket

                -- DE settings
                deformat    TEXT,    -- only used for DE rounds (e.g. 'single', 'double', 'compass')
                detablesize INTEGER, -- only used for DE rounds

                isstarted integer check (iscomplete in (0, 1)) default 0, -- prevent edits when the round starts
                iscomplete  integer check (iscomplete in (0, 1)) default 0,

                FOREIGN KEY (eventid) references Events (id)
            );
        `);
    } catch (error) {
        console.log(error);
    }

    // FencerPoolAssignment
    try {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS FencerPoolAssignment
            (
                roundid INTEGER NOT NULL,
                poolid   INTEGER NOT NULL,
                fencerid INTEGER NOT NULL,
                fenceridinpool integer,
                PRIMARY KEY (roundid, poolid, fencerid),
                FOREIGN KEY (roundid) REFERENCES Rounds (id),
                FOREIGN KEY (fencerid) REFERENCES Fencers (id)
                );
        `);
    } catch (error) {
        console.log(error);
    }

    // Bouts
    try {
        await db.execAsync(`
            create table if not exists Bouts
            (
                id        integer PRIMARY KEY,
                lfencer   integer,
                rfencer   integer,
                victor    integer,
                referee   integer,
                eventid   integer,
                roundid   integer,
                tableof integer check ( tableof in (2,4,8,16,32,64,128,256)),
                FOREIGN KEY (lfencer) REFERENCES Fencers (id),
                FOREIGN KEY (rfencer) REFERENCES Fencers (id),
                FOREIGN KEY (victor) REFERENCES Fencers (id),
                FOREIGN KEY (referee) REFERENCES Referees (id),
                FOREIGN KEY (eventid) REFERENCES Events (id),
                FOREIGN KEY (roundid) REFERENCES Rounds (id)
                );
        `);
    } catch (error) {
        console.log(error);
    }

    // DEBracketBouts
    try {
        await db.execAsync(`
        CREATE TABLE IF NOT EXISTS DEBracketBouts (
            id INTEGER PRIMARY KEY,
            roundid INTEGER,
            bout_id INTEGER,
            bracket_type TEXT CHECK (bracket_type IN ('winners', 'losers', 'finals', 'east', 'north', 'west', 'south')),
            bracket_round INTEGER,
            bout_order INTEGER,
            next_bout_id INTEGER,
            loser_next_bout_id INTEGER,
            FOREIGN KEY (roundid) REFERENCES Rounds (id),
            FOREIGN KEY (bout_id) REFERENCES Bouts (id)
        );
    `);
        console.log("DEBracketBouts table initialized");
    } catch (error) {
        console.log(error);
    }

    // DETable
    try {
        await db.execAsync(`
            create table if not exists DETable
            (
                id integer PRIMARY KEY,
                roundid integer,
                tableof integer check ( tableof in (2,4,8,16,32,64,128,256)),
                FOREIGN KEY (roundid) REFERENCES Rounds(id)
                );
        `);
    } catch (error) {
        console.log(error);
    }

    // FencerBouts
    try {
        await db.execAsync(`
            create table if not exists FencerBouts
            (
                boutid   integer,
                fencerid integer,
                score    integer,
                PRIMARY KEY (boutid, fencerid),
                FOREIGN KEY (boutid) REFERENCES Bouts (id),
                FOREIGN KEY (fencerid) REFERENCES Fencers (id)
                );
        `);
    } catch (error) {
        console.log(error);
    }

    // CreateFencerBoutsTrigger
    try {
        await db.execAsync(`
      CREATE TRIGGER create_fencer_bouts_after_bout_insert
          AFTER INSERT
          ON Bouts
      BEGIN
          INSERT INTO FencerBouts (boutid, fencerid)
          VALUES (NEW.id, NEW.lfencer);
          INSERT INTO FencerBouts (boutid, fencerid)
          VALUES (NEW.id, NEW.rfencer);
      END;
    `);
    } catch (error) {
        console.log(error);
    }

    // SeedingFromRoundResults
    try {
        await db.execAsync(`
            create table if not exists SeedingFromRoundResults
            (
                id       integer PRIMARY KEY,
                fencerid integer,
                eventid  integer,
                roundid  integer,
                seed     integer,
                FOREIGN KEY (fencerid) REFERENCES FencerEvents (fencerid),
                FOREIGN KEY (roundid) REFERENCES Rounds (id),
                FOREIGN KEY (eventid) REFERENCES Events (id)
                );
        `);
    } catch (error) {
        console.log(error);
    }

    console.log("Database initialized");
    await dbInsertExampleData();
}

export async function dbInsertExampleData(): Promise<void> {
    await dbCreateTournament("Completed Tournament 1", 1);
    await dbCreateTournament("Completed Tournament 2", 1);

    const Guy1 = <Fencer>{
        fname: "Rasta",
        lname: "popoulos",
        srating: "A",
        syear: 2025,
        frating: "B",
        fyear: 2024,
    };

    const Guy2 = <Fencer>{
        fname: "Prof.",
        lname: "Calculus",
        frating: "C",
        fyear: 2025,
        erating: "C",
        eyear: 2023,
    };

    const Guy3 = <Fencer>{
        fname: "Thomson",
        lname: "Thompson",
    };

    const Guy4 = <Fencer>{
        fname: "Captain",
        lname: "Haddock",
        srating: "A",
        syear: 2025,
    };

    const Guy5 = <Fencer>{
        fname: "Cate",
        lname: "L",
        srating: "A",
        syear: 2025,
    };

    const Guy6 = <Fencer>{
        fname: "Jack",
        lname: "D",
    };

    const Guy7 = <Fencer>{
        fname: "Tim",
        lname: "B",
        srating: "C",
        syear: 2025,
    };

    await dbCreateFencerByName(Guy1);
    await dbCreateFencerByName(Guy2);
    await dbCreateFencerByName(Guy3);
    await dbCreateFencerByName(Guy4);
    await dbCreateFencerByName(Guy5);
    await dbCreateFencerByName(Guy6);
    await dbCreateFencerByName(Guy7);


    console.log("Sample data loaded");
}

// Tournament Functions
export async function dbCreateTournament(tournamentName: string, iscomplete?: number | 0): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync('INSERT INTO Tournaments (name, iscomplete) VALUES (?, ?)', [tournamentName, iscomplete ?? 0]);
        console.log(`Tournament "${tournamentName}" created successfully.`);
    } catch (error) {
        throw error;
    }
}

export async function dbDeleteTournament(tournamentName: string): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync('DELETE FROM Tournaments WHERE name = ?', [tournamentName]);
        console.log(`Tournament "${tournamentName}" deleted successfully.`);
    } catch (error) {
        console.error('Error deleting tournament:', error);
        throw error;
    }
}

export async function dbListOngoingTournaments(): Promise<Tournament[]> {
    try {
        const db = await openDB();
        const tournaments: Tournament[] = await db.getAllAsync('SELECT * FROM Tournaments WHERE iscomplete = 0');
        console.log(`[${tournaments.length}] ongoing tournaments listed successfully.`);
        return tournaments;
    } catch (error) {
        console.error('Error listing ongoing tournaments:', error);
        throw error;
    }
}

export async function dbListCompletedTournaments(): Promise<Tournament[]> {
    try {
        const db = await openDB();
        const tournaments: Tournament[] = await db.getAllAsync('SELECT * FROM Tournaments WHERE iscomplete = 1');
        console.log(`[${tournaments.length}] completed tournaments listed successfully.`);
        return tournaments;
    } catch (error) {
        console.error('Error listing completed tournaments:', error);
        throw error;
    }
}

// Event Functions
export async function dbListEvents(tournamentName: string): Promise<Event[]> {
    try {
        const db = await openDB();
        // Return all event fields and a computed field "startedCount"
        return await db.getAllAsync(
            `SELECT E.*, 
              (SELECT COUNT(*) FROM Rounds WHERE eventid = E.id AND isstarted = 1) as startedCount 
       FROM Events E 
       WHERE tname = ?`,
            [tournamentName]
        );
    } catch (error) {
        console.error('Error listing events:', error);
        throw error;
    }
}

export async function dbCreateEvent(tournamentName: string, event: Event): Promise<void> {
    try {
        const db = await openDB();
        const age = event.age || 'senior';
        const eventClass = event.class || 'N/A';
        const seeding = event.seeding || 'N/A';
        await db.runAsync(
            `INSERT INTO Events (id, tname, weapon, gender, age, class, seeding)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [event.id, tournamentName, event.weapon, event.gender, age, eventClass, seeding]
        );
        console.log('Event created successfully.');
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
}

export async function dbDeleteEvent(eventId: number): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync('DELETE FROM Events WHERE id = ?', [eventId]);
        console.log('Event deleted successfully.');
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
}

// Fencer Functions
export async function dbCreateFencerByName(fencer: Fencer, event?: Event, insertOnCreate?: boolean | false): Promise<void> {
    try {
        const db = await openDB();
        const result: SQLite.SQLiteRunResult = await db.runAsync(
            'INSERT INTO Fencers (fname, lname, erating, eyear, frating, fyear, srating, syear) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [fencer.fname, fencer.lname, fencer.erating ?? 'U', fencer.eyear ?? 0, fencer.frating ?? 'U', fencer.fyear ?? 0, fencer.srating ?? 'U', fencer.eyear ?? 0]
        );
        const newFencerId = result.lastInsertRowId;
        fencer.id = newFencerId;
        console.log(`Fencer "${fencer.fname} ${fencer.lname}" created with id ${fencer.id}.`, JSON.stringify(fencer, null, "\t"));
        if (event && insertOnCreate) {
            await dbAddFencerToEventById(fencer, event);
        }
    } catch (error) {
        console.error('Error creating fencer:', error);
    }
}

export async function dbListAllFencers(): Promise<void> {
    const db = await openDB();
    await db.runAsync('SELECT * FROM Fencers');
}

export async function dbDeleteFencerById(Fencer: Fencer): Promise<void> {
    // TODO
}

export async function dbSearchFencers(query: string): Promise<Fencer[]> {
    const db = await openDB();
    const result: Fencer[] = await db.getAllAsync(
        'SELECT * FROM Fencers WHERE fname LIKE ? OR lname LIKE ?',
        [`%${query}%`, `%${query}%`]
    );
    console.log(`Search returned ${result.length} results`);
    return result;
}

export async function dbGetFencersInEventById(event: Event): Promise<Fencer[]> {
    const db = await openDB();
    const result: Fencer[] = await db.getAllAsync(`
        SELECT Fencers.id, Fencers.fname, Fencers.lname, Fencers.erating, Fencers.eyear, Fencers.frating, Fencers.fyear, Fencers.srating, Fencers.syear
        FROM FencerEvents
                 JOIN Fencers ON FencerEvents.fencerid = Fencers.id
        WHERE FencerEvents.eventid = ?`, [event.id]);
    console.log(`Fencers associated with Event ID [${event.id}]: ${result.length}`);
    return result;
}

export async function dbAddFencerToEventById(fencer: Fencer, event: Event): Promise<void> {
    const db = await openDB();
    try {
        await db.runAsync('INSERT INTO FencerEvents (fencerid, eventid) VALUES (?, ?)', [fencer.id || null, event.id]);
        console.log(`"${fencer.fname} ${fencer.lname}" added to "${event.gender} ${event.age} ${event.weapon}"`);
    } catch (error) {
        console.error(`Error adding fencer ${fencer.id} to event ${event.id} `, error);
    }
}

export async function dbDeleteFencerFromEventById(fencer: Fencer, event: Event): Promise<void> {
    const db = await openDB();
    await db.runAsync('DELETE FROM FencerEvents WHERE fencerid = ? AND eventid = ?', [fencer.id || null, event.id]);
}

export async function dbMarkRoundAsComplete(roundId: number): Promise<void> {
    try {
        const db = await openDB();
        
        // First, get the round and event info
        const round = await db.getFirstAsync('SELECT * FROM Rounds WHERE id = ?', [roundId]);
        if (!round) {
            throw new Error(`Round with id ${roundId} not found`);
        }
        
        // Calculate and save seeding from the round results
        await dbCalculateAndSaveSeedingFromRoundResults(round.eventid, roundId);
        
        // Then mark the round as complete
        await db.runAsync('UPDATE Rounds SET iscomplete = 1 WHERE id = ?', [roundId]);
        console.log(`Round ${roundId} marked as complete`);
    } catch (error) {
        console.error('Error marking round complete', error);
    }
}

export async function dbGetRoundsForEvent(eventId: number): Promise<Round[]> {
    try {
        const db = await openDB();
        const rounds: Round[] = await db.getAllAsync(
            'SELECT * FROM Rounds WHERE eventid = ? ORDER BY rorder',
            [eventId]
        );
        console.log(`Fetched ${rounds.length} rounds for event ${eventId}`);
        return rounds;
    } catch (error) {
        console.error('Error fetching rounds:', error);
        throw error;
    }
}

export async function dbAddRound(round: {
    eventid: number;
    rorder: number;
    type: "pool" | "de";
    promotionpercent: number;
    targetbracket: number;
    usetargetbracket: number;
    deformat: string;
    detablesize: number;
    iscomplete: number;
    poolcount: number | null;
    poolsize: number | null;
    poolsoption: string | undefined
}): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync(
            `INSERT INTO Rounds
             (eventid, rorder, type, promotionpercent, targetbracket, usetargetbracket, deformat, detablesize, iscomplete, poolcount, poolsize, poolsoption)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                round.eventid,
                round.rorder,
                round.type,
                round.promotionpercent,
                round.targetbracket,
                round.usetargetbracket,
                round.deformat,
                round.detablesize,
                round.iscomplete,
                round.poolcount,
                round.poolsize,
                round.poolsoption,
            ]
        );


        console.log('Round added successfully.');
    } catch (error) {
        console.error('Error adding round:', error);
        throw error;
    }
}

export async function dbUpdateRound(round: Round): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync(
            `UPDATE Rounds
             SET rorder = ?,
                 type = ?,
                 promotionpercent = ?,
                 targetbracket = ?,
                 usetargetbracket = ?,
                 deformat = ?,
                 detablesize = ?,
                 iscomplete = ?,
                 poolcount = ?,
                 poolsize = ?,
                 poolsoption = ?
             WHERE id = ?`,
            [
                round.rorder,
                round.type,
                round.promotionpercent,
                round.targetbracket,
                round.usetargetbracket,
                round.deformat,
                round.detablesize,
                round.iscomplete,
                round.poolcount,
                round.poolsize,
                round.poolsoption,
                round.id,
            ]
        );

        console.log('Round updated successfully.');
    } catch (error) {
        console.error('Error updating round:', error);
        throw error;
    }
}


export async function dbDeleteRound(roundId: number): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync('DELETE FROM Rounds WHERE id = ?', [roundId]);
        console.log(`Round ${roundId} deleted successfully.`);
    } catch (error) {
        console.error('Error deleting round:', error);
        throw error;
    }
}

export async function dbMarkRoundAsStarted(roundId: number): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync('UPDATE Rounds SET isstarted = 1 WHERE id = ?', [roundId]);
        console.log(`Round ${roundId} marked as started.`);
    } catch (error) {
        console.error('Error marking round as started:', error);
        throw error;
    }
}

/**
 * Creates pool assignments and round-robin bout orders for a pool round.
 * Inserts assignments into FencerPoolAssignment and bouts into Bouts.
 */
export async function dbCreatePoolAssignmentsAndBoutOrders(
    event: Event,
    round: Round,
    fencers: Fencer[],
    poolCount: number,
    fencersPerPool: number,
    seeding?: any[]
): Promise<void> {
    const pools: Fencer[][] = buildPools(fencers, poolCount, fencersPerPool, seeding);
    const db = await openDB();

    for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
        const pool = pools[poolIndex];
        // Insert each fencer's pool assignment.
        for (let i = 0; i < pool.length; i++) {
            const fencer = pool[i];
            await db.runAsync(
                'INSERT INTO FencerPoolAssignment (roundid, poolid, fencerid, fenceridinpool) VALUES (?, ?, ?, ?)',
                [round.id, poolIndex, fencer.id, i + 1]
            );
        }
        // Create round-robin bouts for the pool (each pair plays once).
        for (let i = 0; i < pool.length; i++) {
            for (let j = i + 1; j < pool.length; j++) {
                const fencerA = pool[i];
                const fencerB = pool[j];
                // Using a default value (2) for tableof that satisfies your check constraint.
                await db.runAsync(
                    'INSERT INTO Bouts (lfencer, rfencer, eventid, roundid, tableof) VALUES (?, ?, ?, ?, ?)',
                    [fencerA.id, fencerB.id, event.id, round.id, 2]
                );
            }
        }
    }
}

/**
 * Inserts the first round of DE bouts into the Bouts table based on the bracket.
 */
// TODO - Untested placeholder
export async function dbCreateDEBouts(
    event: Event,
    round: Round,
    bracketData: DEBracketData
): Promise<void> {
    const db = await openDB();
    // We assume the first round is at index 0.
    const firstRound = bracketData.rounds[0];
    for (const match of firstRound.matches) {
        // Only insert a bout if at least one competitor is present.
        if (match.fencerA || match.fencerB) {
            await db.runAsync(
                'INSERT INTO Bouts (lfencer, rfencer, eventid, roundid, tableof) VALUES (?, ?, ?, ?, ?)',
                [
                    match.fencerA ? match.fencerA.id : null,
                    match.fencerB ? match.fencerB.id : null,
                    event.id,
                    round.id,
                    round.detablesize // use the DE round's detablesize value
                ]
            );
        }
    }
}

export async function dbGetPoolsForRound(roundId: number): Promise<{ poolid: number; fencers: Fencer[] }[]> {
    const db = await openDB();
    const results = await db.getAllAsync(
        `SELECT poolid, fencers.id, fencers.fname, fencers.lname, fencers.erating, fencers.eyear, fencers.frating, fencers.fyear, fencers.srating, fencers.syear
     FROM FencerPoolAssignment
     JOIN Fencers ON FencerPoolAssignment.fencerid = Fencers.id
     WHERE roundid = ?
     ORDER BY poolid, fenceridinpool`,
        [roundId]
    );

    // Group rows by poolid
    const poolsMap = new Map<number, Fencer[]>();
    results.forEach(row => {
        const poolid = row.poolid;
        if (!poolsMap.has(poolid)) {
            poolsMap.set(poolid, []);
        }
        poolsMap.get(poolid)?.push({
            id: row.id,
            fname: row.fname,
            lname: row.lname,
            erating: row.erating,
            eyear: row.eyear,
            frating: row.frating,
            fyear: row.fyear,
            srating: row.srating,
            syear: row.syear,
        });
    });

    const pools: { poolid: number; fencers: Fencer[] }[] = [];
    poolsMap.forEach((fencers, poolid) => {
        pools.push({ poolid, fencers });
    });
    pools.sort((a, b) => a.poolid - b.poolid);
    return pools;
}

/**
 * Gets all bouts for a round
 */
export async function dbGetBoutsForRound(roundId: number): Promise<any[]> {
    try {
        const db = await openDB();

        // Get round type to determine query approach
        const round = await db.getFirstAsync<{ type: string, deformat: string }>(
            'SELECT type, deformat FROM Rounds WHERE id = ?',
            [roundId]
        );

        if (!round) {
            console.error(`Round with ID ${roundId} not found`);
            return [];
        }

        if (round.type === 'pool') {
            // For pool rounds, get all bouts with pool info
            return await db.getAllAsync(`
                SELECT 
                    B.id, B.lfencer, B.rfencer, B.victor, B.eventid, B.roundid,
                    leftF.fname AS left_fname, leftF.lname AS left_lname,
                    rightF.fname AS right_fname, rightF.lname AS right_lname,
                    fb1.score AS left_score, fb2.score AS right_score,
                    FPA1.poolid AS poolid
                FROM Bouts B
                JOIN FencerPoolAssignment FPA1 ON B.lfencer = FPA1.fencerid AND B.roundid = FPA1.roundid
                JOIN FencerPoolAssignment FPA2 ON B.rfencer = FPA2.fencerid AND B.roundid = FPA2.roundid
                LEFT JOIN Fencers AS leftF ON B.lfencer = leftF.id
                LEFT JOIN Fencers AS rightF ON B.rfencer = rightF.id
                LEFT JOIN FencerBouts AS fb1 ON fb1.boutid = B.id AND fb1.fencerid = B.lfencer
                LEFT JOIN FencerBouts AS fb2 ON fb2.boutid = B.id AND fb2.fencerid = B.rfencer
                WHERE B.roundid = ? AND FPA1.poolid = FPA2.poolid
                ORDER BY FPA1.poolid, B.id
            `, [roundId]);
        } else if (round.type === 'de') {
            // For DE rounds, choose the appropriate query based on format
            if (round.deformat === 'single') {
                return await db.getAllAsync(`
                    SELECT 
                        B.id, B.lfencer, B.rfencer, B.victor, B.eventid, B.roundid, B.tableof,
                        leftF.fname AS left_fname, leftF.lname AS left_lname,
                        rightF.fname AS right_fname, rightF.lname AS right_lname,
                        fb1.score AS left_score, fb2.score AS right_score,
                        LEFT_SEEDING.seed AS seed_left, RIGHT_SEEDING.seed AS seed_right
                    FROM Bouts AS B
                    LEFT JOIN Fencers AS leftF ON B.lfencer = leftF.id
                    LEFT JOIN Fencers AS rightF ON B.rfencer = rightF.id
                    LEFT JOIN FencerBouts AS fb1 ON fb1.boutid = B.id AND fb1.fencerid = B.lfencer
                    LEFT JOIN FencerBouts AS fb2 ON fb2.boutid = B.id AND fb2.fencerid = B.rfencer
                    LEFT JOIN SeedingFromRoundResults AS LEFT_SEEDING 
                            ON LEFT_SEEDING.fencerid = B.lfencer AND LEFT_SEEDING.roundid = B.roundid
                    LEFT JOIN SeedingFromRoundResults AS RIGHT_SEEDING 
                            ON RIGHT_SEEDING.fencerid = B.rfencer AND RIGHT_SEEDING.roundid = B.roundid
                    WHERE B.roundid = ?
                    ORDER BY B.tableof DESC, B.id
                `, [roundId]);
            } else {
                // For double elimination or compass draw, include bracket info
                return await db.getAllAsync(`
                    SELECT 
                        B.id, B.lfencer, B.rfencer, B.victor, B.tableof, B.eventid, B.roundid,
                        leftF.fname AS left_fname, leftF.lname AS left_lname,
                        rightF.fname AS right_fname, rightF.lname AS right_lname,
                        fb1.score AS left_score, fb2.score AS right_score,
                        DEB.bracket_type, DEB.bracket_round, DEB.bout_order,
                        LEFT_SEEDING.seed AS seed_left, RIGHT_SEEDING.seed AS seed_right
                    FROM Bouts B
                    JOIN DEBracketBouts DEB ON B.id = DEB.bout_id
                    LEFT JOIN Fencers leftF ON B.lfencer = leftF.id
                    LEFT JOIN Fencers rightF ON B.rfencer = rightF.id
                    LEFT JOIN FencerBouts fb1 ON fb1.boutid = B.id AND fb1.fencerid = B.lfencer
                    LEFT JOIN FencerBouts fb2 ON fb2.boutid = B.id AND fb2.fencerid = B.rfencer
                    LEFT JOIN SeedingFromRoundResults LEFT_SEEDING 
                            ON LEFT_SEEDING.fencerid = B.lfencer AND LEFT_SEEDING.roundid = B.roundid
                    LEFT JOIN SeedingFromRoundResults RIGHT_SEEDING 
                            ON RIGHT_SEEDING.fencerid = B.rfencer AND RIGHT_SEEDING.roundid = B.roundid
                    WHERE B.roundid = ?
                    ORDER BY DEB.bracket_type, DEB.bracket_round, DEB.bout_order
                `, [roundId]);
            }
        }

        // Default empty array if round type is unrecognized
        return [];
    } catch (error) {
        console.error('Error getting bouts for round:', error);
        throw error;
    }
}

export async function dbGetBoutsForPool(roundId: number, poolId: number): Promise<Bout[]> {
    const db = await openDB();
    const rows = (await db.getAllAsync(
        `SELECT
             B.id,
             fpa1.fencerid AS left_fencerid,
             fpa2.fencerid AS right_fencerid,
             fpa1.fenceridinpool AS left_poolposition,
             fpa2.fenceridinpool AS right_poolposition,
             leftF.fname AS left_fname,
             leftF.lname AS left_lname,
             rightF.fname AS right_fname,
             rightF.lname AS right_lname,
             fb1.score AS left_score,
             fb2.score AS right_score,
             victor
         FROM Bouts AS B
                  JOIN FencerPoolAssignment AS fpa1
                       ON B.lfencer = fpa1.fencerid
                           AND B.roundid = fpa1.roundid
                  JOIN FencerPoolAssignment AS fpa2
                       ON B.rfencer = fpa2.fencerid
                           AND B.roundid = fpa2.roundid
                  JOIN Fencers AS leftF
                       ON B.lfencer = leftF.id
                  JOIN Fencers AS rightF
                       ON B.rfencer = rightF.id
                  LEFT JOIN FencerBouts AS fb1
                            ON fb1.boutid = B.id AND fb1.fencerid = fpa1.fencerid
                  LEFT JOIN FencerBouts AS fb2
                            ON fb2.boutid = B.id AND fb2.fencerid = fpa2.fencerid
         WHERE B.roundid = ?
           AND fpa1.poolid = ?
           AND fpa2.poolid = ?;`,
        [roundId, poolId, poolId]
    )) as any[];
    return rows;
}


export async function dbUpdateBoutScore(boutId: number, fencerId: number, score: number): Promise<void> {
    const db = await openDB();
    await db.runAsync(
        'UPDATE FencerBouts SET score = ? WHERE boutid = ? AND fencerid = ?',
        [score, boutId, fencerId]
    );
}

export async function dbUpdateBoutScores(
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number
): Promise<void> {
    await dbUpdateBoutScore(boutId, fencerAId, scoreA);
    await dbUpdateBoutScore(boutId, fencerBId, scoreB);
}

/**
 * Save seeding data to the database for a specific round
 */
export async function dbSaveSeeding(eventId: number, roundId: number, seeding: any[]): Promise<void> {
    try {
        const db = await openDB();
        
        // Delete any existing seeding for this round
        await db.runAsync('DELETE FROM SeedingFromRoundResults WHERE roundid = ?', [roundId]);
        
        // Insert new seeding data
        for (const seedingItem of seeding) {
            await db.runAsync(
                'INSERT INTO SeedingFromRoundResults (fencerid, eventid, roundid, seed) VALUES (?, ?, ?, ?)',
                [seedingItem.fencer.id, eventId, roundId, seedingItem.seed]
            );
        }
        
        console.log(`Saved seeding for round ${roundId}`);
    } catch (error) {
        console.error('Error saving seeding:', error);
        throw error;
    }
}

/**
 * Retrieve seeding data from the database for a specific round
 */
export async function dbGetSeedingForRound(roundId: number): Promise<any[]> {
    try {
        const db = await openDB();
        
        // Get seeding data joined with fencer information
        const seedingData = await db.getAllAsync(
            `SELECT s.seed, f.id, f.fname, f.lname, f.erating, f.eyear, f.frating, f.fyear, f.srating, f.syear
             FROM SeedingFromRoundResults s
             JOIN Fencers f ON s.fencerid = f.id
             WHERE s.roundid = ?
             ORDER BY s.seed`,
            [roundId]
        );
        
        // Transform to the format expected by the buildPools function
        return seedingData.map(row => ({
            seed: row.seed,
            fencer: {
                id: row.id,
                fname: row.fname,
                lname: row.lname,
                erating: row.erating,
                eyear: row.eyear,
                frating: row.frating,
                fyear: row.fyear,
                srating: row.srating,
                syear: row.syear
            }
        }));
    } catch (error) {
        console.error('Error getting seeding:', error);
        return [];
    }
}

/**
 * Calculate seeding from round results and save it to the database
 */
export async function dbCalculateAndSaveSeedingFromRoundResults(eventId: number, roundId: number): Promise<void> {
    try {
        const db = await openDB();
        
        // First, get all pools for the round
        const pools = await dbGetPoolsForRound(roundId);
        
        // For each pool, calculate stats for each fencer
        const poolResults = [];
        
        for (const pool of pools) {
            // Get all bouts for this pool
            const bouts = await dbGetBoutsForPool(roundId, pool.poolid);
            
            // Initialize stats for each fencer
            const fencerStats = new Map();
            pool.fencers.forEach(fencer => {
                if (fencer.id !== undefined) {
                    fencerStats.set(fencer.id, {
                        fencer,
                        boutsCount: 0,
                        wins: 0,
                        touchesScored: 0,
                        touchesReceived: 0,
                        winRate: 0,
                        indicator: 0
                    });
                }
            });
            
            // Process each bout to update fencer stats
            bouts.forEach((bout: any) => {
                const leftId = bout.left_fencerid;
                const rightId = bout.right_fencerid;
                const leftScore = bout.left_score ?? 0;
                const rightScore = bout.right_score ?? 0;
                
                // Update left fencer stats
                if (fencerStats.has(leftId)) {
                    const stats = fencerStats.get(leftId);
                    stats.boutsCount += 1;
                    stats.touchesScored += leftScore;
                    stats.touchesReceived += rightScore;
                    if (leftScore > rightScore) {
                        stats.wins += 1;
                    }
                }
                
                // Update right fencer stats
                if (fencerStats.has(rightId)) {
                    const stats = fencerStats.get(rightId);
                    stats.boutsCount += 1;
                    stats.touchesScored += rightScore;
                    stats.touchesReceived += leftScore;
                    if (rightScore > leftScore) {
                        stats.wins += 1;
                    }
                }
            });
            
            // Calculate win rates and indicators
            fencerStats.forEach(stats => {
                if (stats.boutsCount > 0) {
                    stats.winRate = (stats.wins / stats.boutsCount) * 100;
                }
                stats.indicator = stats.touchesScored - stats.touchesReceived;
            });
            
            // Add to pool results
            poolResults.push({
                poolid: pool.poolid,
                stats: Array.from(fencerStats.values())
            });
        }
        
        // Calculate seeding based on pool results
        const { calculateSeedingFromResults } = require('../navigation/utils/RoundAlgorithms');
        const seeding = calculateSeedingFromResults(poolResults);
        
        // Save the seeding to the database
        await dbSaveSeeding(eventId, roundId, seeding);
        
        console.log(`Calculated and saved seeding from results of round ${roundId}`);
    } catch (error) {
        console.error('Error calculating seeding from round results:', error);
        throw error;
    }
}

// These functions should be added to src/db/TournamentDatabaseUtils.ts

/**
 * Gets all bouts for a DE round
 */
export async function dbGetDEBouts(roundId: number): Promise<any[]> {
    try {
        const db = await openDB();
        return await db.getAllAsync(
            `SELECT 
                B.id, B.lfencer, B.rfencer, B.victor, B.eventid, B.roundid, B.tableof,
                leftF.fname AS left_fname, leftF.lname AS left_lname,
                rightF.fname AS right_fname, rightF.lname AS right_lname,
                fb1.score AS left_score, fb2.score AS right_score,
                LEFT_SEEDING.seed AS seed_left, RIGHT_SEEDING.seed AS seed_right
             FROM Bouts AS B
             LEFT JOIN Fencers AS leftF ON B.lfencer = leftF.id
             LEFT JOIN Fencers AS rightF ON B.rfencer = rightF.id
             LEFT JOIN FencerBouts AS fb1 ON fb1.boutid = B.id AND fb1.fencerid = B.lfencer
             LEFT JOIN FencerBouts AS fb2 ON fb2.boutid = B.id AND fb2.fencerid = B.rfencer
             LEFT JOIN SeedingFromRoundResults AS LEFT_SEEDING 
                    ON LEFT_SEEDING.fencerid = B.lfencer AND LEFT_SEEDING.roundid = B.roundid
             LEFT JOIN SeedingFromRoundResults AS RIGHT_SEEDING 
                    ON RIGHT_SEEDING.fencerid = B.rfencer AND RIGHT_SEEDING.roundid = B.roundid
             WHERE B.roundid = ?
             ORDER BY B.tableof DESC, B.id`,
            [roundId]
        );
    } catch (error) {
        console.error('Error getting DE bouts:', error);
        throw error;
    }
}

/**
 * Creates the first round of DE bouts based on seeding and table size
 */
async function createFirstRoundDEBouts(
    event: Event,
    round: Round,
    fencers: Fencer[],
    seeding: any[]
): Promise<void> {
    try {
        const db = await openDB();

        // Determine the appropriate table size based on number of fencers
        const fencerCount = fencers.length;
        let tableSize = 2;
        while (tableSize < fencerCount) {
            tableSize *= 2;
        }

        // Update the round with the DE table size
        await db.runAsync(
            'UPDATE Rounds SET detablesize = ? WHERE id = ?',
            [tableSize, round.id]
        );

        // Sort fencers by seed
        const sortedFencers = [...seeding].sort((a, b) => a.seed - b.seed);

        // Generate standard bracket positions
        const positions = generateBracketPositions(tableSize);

        // Place fencers according to seeding
        for (let i = 0; i < positions.length; i++) {
            const [posA, posB] = positions[i];

            // Get fencers for this bout (or null for byes)
            const fencerA = posA <= sortedFencers.length ? sortedFencers[posA - 1].fencer : null;
            const fencerB = posB <= sortedFencers.length ? sortedFencers[posB - 1].fencer : null;

            // If both fencers are null, skip this bout
            if (!fencerA && !fencerB) continue;

            // If only one fencer, it's a bye
            const isBye = !fencerA || !fencerB;

            // If it's a bye, the present fencer automatically advances
            const victor = isBye ? (fencerA ? fencerA.id : fencerB!.id) : null;

            await db.runAsync(
                'INSERT INTO Bouts (lfencer, rfencer, victor, eventid, roundid, tableof) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    fencerA ? fencerA.id : null,
                    fencerB ? fencerB.id : null,
                    victor,
                    event.id,
                    round.id,
                    tableSize
                ]
            );

            // If it's a bye, automatically create the score (15-0 for victor)
            if (isBye && victor) {
                const boutId = await db.getFirstAsync<{ id: number }>(
                    'SELECT id FROM Bouts WHERE roundid = ? AND tableof = ? AND (lfencer = ? OR rfencer = ?)',
                    [round.id, tableSize, victor, victor]
                );

                if (boutId) {
                    if (fencerA) {
                        await db.runAsync(
                            'UPDATE FencerBouts SET score = ? WHERE boutid = ? AND fencerid = ?',
                            [15, boutId.id, fencerA.id]
                        );
                    } else if (fencerB) {
                        await db.runAsync(
                            'UPDATE FencerBouts SET score = ? WHERE boutid = ? AND fencerid = ?',
                            [15, boutId.id, fencerB.id]
                        );
                    }
                }
            }
        }

        // For byes, also create the next round bouts for advancing fencers
        if (fencers.length < tableSize) {
            await createNextRoundBouts(round.id, tableSize / 2);
        }

        console.log(`Created ${Math.ceil(tableSize / 2)} first round DE bouts`);
    } catch (error) {
        console.error('Error creating first round DE bouts:', error);
        throw error;
    }
}

/**
 * Generates the standard bracket positions for a given table size
 * @param tableSize The size of the DE table (must be a power of 2)
 * @returns An array of pairs [seedA, seedB] for each first round match
 */
function generateBracketPositions(tableSize: number): [number, number][] {
    const positions: [number, number][] = [];

    // For a table of size N, the first round has N/2 bouts
    for (let i = 0; i < tableSize / 2; i++) {
        // Standard bracket pairing: 1 vs N, 2 vs N-1, etc.
        const seedA = i + 1;
        const seedB = tableSize - i;
        positions.push([seedA, seedB]);
    }

    return positions;
}

/**
 * Creates bouts for the next DE round after all bouts in the current round are complete
 */
export async function createNextRoundBouts(roundId: number, tableOf: number): Promise<void> {
    try {
        const db = await openDB();

        // Get the round and event info
        const round = await db.getFirstAsync<Round>('SELECT * FROM Rounds WHERE id = ?', [roundId]);
        if (!round) throw new Error(`Round with id ${roundId} not found`);

        // Get all completed bouts from the previous round (higher tableOf)
        const prevTableOf = tableOf * 2;
        const prevBouts = await db.getAllAsync(
            `SELECT * FROM Bouts 
             WHERE roundid = ? AND tableof = ? AND victor IS NOT NULL
             ORDER BY id`,
            [roundId, prevTableOf]
        );

        // Create bouts for the next round
        for (let i = 0; i < prevBouts.length; i += 2) {
            const boutA = prevBouts[i];

            // If we don't have enough bouts, break
            if (i + 1 >= prevBouts.length) break;

            const boutB = prevBouts[i + 1];

            // Create a new bout with the winners from boutA and boutB
            await db.runAsync(
                'INSERT INTO Bouts (lfencer, rfencer, eventid, roundid, tableof) VALUES (?, ?, ?, ?, ?)',
                [
                    boutA.victor,
                    boutB.victor,
                    round.eventid,
                    roundId,
                    tableOf
                ]
            );
        }

        console.log(`Created ${Math.floor(prevBouts.length / 2)} bouts for table of ${tableOf}`);

        // If tableOf is 2, we've reached the final
        if (tableOf === 2) {
            console.log('Reached the final bout');
        }
    } catch (error) {
        console.error('Error creating next round bouts:', error);
        throw error;
    }
}

/**
 * Updates a bout with scores and advances the winner to the next round
 */
export async function dbUpdateDEBoutAndAdvanceWinner(
    boutId: number,
    scoreA: number,
    scoreB: number,
    fencerAId: number,
    fencerBId: number
): Promise<void> {
    try {
        const db = await openDB();

        // Update the scores
        await dbUpdateBoutScores(boutId, scoreA, scoreB, fencerAId, fencerBId);

        // Determine the winner
        const victorId = scoreA > scoreB ? fencerAId : fencerBId;

        // Update the bout with the victor
        await db.runAsync(
            'UPDATE Bouts SET victor = ? WHERE id = ?',
            [victorId, boutId]
        );

        // Get the bout details to determine next steps
        const bout = await db.getFirstAsync(
            'SELECT roundid, tableof FROM Bouts WHERE id = ?',
            [boutId]
        );

        if (!bout) throw new Error(`Bout with id ${boutId} not found`);

        // Get all bouts in the same round and table
        const boutsInSameTable = await db.getAllAsync(
            'SELECT id, victor FROM Bouts WHERE roundid = ? AND tableof = ?',
            [bout.roundid, bout.tableof]
        );

        // Check if all bouts in the current table have victors
        const allComplete = boutsInSameTable.every(b => b.victor !== null);

        // If all complete and not the final (tableof > 2), create next round bouts
        if (allComplete && bout.tableof > 2) {
            await createNextRoundBouts(bout.roundid, bout.tableof / 2);
        }

        console.log(`Updated bout ${boutId} and advanced winner ${victorId}`);
    } catch (error) {
        console.error('Error updating bout and advancing winner:', error);
        throw error;
    }
}

// Additional database functions for advanced DE formats

/**
 * Gets bouts for a double elimination format
 */
export async function dbGetDoubleBracketBouts(
    roundId: number
): Promise<{ winners: any[], losers: any[], finals: any[] }> {
    try {
        const db = await openDB();

        // Get all bouts categorized by bracket type
        const allBouts = await db.getAllAsync(`
            SELECT 
                B.id, B.lfencer, B.rfencer, B.victor, B.tableof, B.eventid,
                leftF.fname AS left_fname, leftF.lname AS left_lname,
                rightF.fname AS right_fname, rightF.lname AS right_lname,
                fb1.score AS left_score, fb2.score AS right_score,
                DEB.bracket_type, DEB.bracket_round, DEB.bout_order,
                LEFT_SEEDING.seed AS seed_left, RIGHT_SEEDING.seed AS seed_right
            FROM Bouts B
            JOIN DEBracketBouts DEB ON B.id = DEB.bout_id
            LEFT JOIN Fencers leftF ON B.lfencer = leftF.id
            LEFT JOIN Fencers rightF ON B.rfencer = rightF.id
            LEFT JOIN FencerBouts fb1 ON fb1.boutid = B.id AND fb1.fencerid = B.lfencer
            LEFT JOIN FencerBouts fb2 ON fb2.boutid = B.id AND fb2.fencerid = B.rfencer
            LEFT JOIN SeedingFromRoundResults LEFT_SEEDING 
                   ON LEFT_SEEDING.fencerid = B.lfencer AND LEFT_SEEDING.roundid = B.roundid
            LEFT JOIN SeedingFromRoundResults RIGHT_SEEDING 
                   ON RIGHT_SEEDING.fencerid = B.rfencer AND RIGHT_SEEDING.roundid = B.roundid
            WHERE B.roundid = ?
            ORDER BY DEB.bracket_type, DEB.bracket_round, DEB.bout_order
        `, [roundId]);

        // Separate into different brackets
        const winners = allBouts.filter(bout => bout.bracket_type === 'winners');
        const losers = allBouts.filter(bout => bout.bracket_type === 'losers');
        const finals = allBouts.filter(bout => bout.bracket_type === 'finals');

        return { winners, losers, finals };
    } catch (error) {
        console.error('Error getting double elimination bouts:', error);
        throw error;
    }
}

/**
 * Gets bouts for a compass draw format
 */
export async function dbGetCompassBracketBouts(
    roundId: number
): Promise<{ east: any[], north: any[], west: any[], south: any[] }> {
    try {
        const db = await openDB();

        // Get all bouts categorized by bracket type
        const allBouts = await db.getAllAsync(`
            SELECT 
                B.id, B.lfencer, B.rfencer, B.victor, B.tableof, B.eventid,
                leftF.fname AS left_fname, leftF.lname AS left_lname,
                rightF.fname AS right_fname, rightF.lname AS right_lname,
                fb1.score AS left_score, fb2.score AS right_score,
                DEB.bracket_type, DEB.bracket_round, DEB.bout_order,
                LEFT_SEEDING.seed AS seed_left, RIGHT_SEEDING.seed AS seed_right
            FROM Bouts B
            JOIN DEBracketBouts DEB ON B.id = DEB.bout_id
            LEFT JOIN Fencers leftF ON B.lfencer = leftF.id
            LEFT JOIN Fencers rightF ON B.rfencer = rightF.id
            LEFT JOIN FencerBouts fb1 ON fb1.boutid = B.id AND fb1.fencerid = B.lfencer
            LEFT JOIN FencerBouts fb2 ON fb2.boutid = B.id AND fb2.fencerid = B.rfencer
            LEFT JOIN SeedingFromRoundResults LEFT_SEEDING 
                   ON LEFT_SEEDING.fencerid = B.lfencer AND LEFT_SEEDING.roundid = B.roundid
            LEFT JOIN SeedingFromRoundResults RIGHT_SEEDING 
                   ON RIGHT_SEEDING.fencerid = B.rfencer AND RIGHT_SEEDING.roundid = B.roundid
            WHERE B.roundid = ?
            ORDER BY DEB.bracket_type, DEB.bracket_round, DEB.bout_order
        `, [roundId]);

        // Separate into different brackets
        const east = allBouts.filter(bout => bout.bracket_type === 'east');
        const north = allBouts.filter(bout => bout.bracket_type === 'north');
        const west = allBouts.filter(bout => bout.bracket_type === 'west');
        const south = allBouts.filter(bout => bout.bracket_type === 'south');

        return { east, north, west, south };
    } catch (error) {
        console.error('Error getting compass draw bouts:', error);
        throw error;
    }
}

/**
 * Creates a double elimination bracket structure in the database.
 */
export async function dbCreateDoubleEliminationBracket(
    roundId: number,
    tableSize: number,
    seededFencers: { fencer: any, seed: number }[]
): Promise<void> {
    try {
        const db = await openDB();

        // Get round information
        const round = await db.getFirstAsync<{ id: number, eventid: number }>(
            'SELECT id, eventid FROM Rounds WHERE id = ?',
            [roundId]
        );

        if (!round) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Generate the bracket structure
        const { generateDoubleEliminationStructure, placeFencersInDoubleElimination } = require('../navigation/utils/DoubleEliminationUtils');

        // Create the structure
        const brackets = generateDoubleEliminationStructure(seededFencers.length);

        // Place fencers in the brackets
        const populatedBrackets = placeFencersInDoubleElimination(brackets, seededFencers);

        // Insert all bouts into the database
        const { winnersBracket, losersBracket, finalsBracket } = populatedBrackets;
        const allBrackets = [
            ...winnersBracket.map(bout => ({ ...bout, bracketType: 'winners' })),
            ...losersBracket.map(bout => ({ ...bout, bracketType: 'losers' })),
            ...finalsBracket.map(bout => ({ ...bout, bracketType: 'finals' }))
        ];

        // Create bouts first
        for (const bout of allBrackets) {
            const boutResult = await db.runAsync(
                `INSERT INTO Bouts (lfencer, rfencer, victor, eventid, roundid, tableof)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    bout.fencerA || null,
                    bout.fencerB || null,
                    bout.winner || null,
                    round.eventid,
                    roundId,
                    tableSize
                ]
            );

            const boutId = boutResult.lastInsertRowId;

            // Then add bracket information
            await db.runAsync(
                `INSERT INTO DEBracketBouts (
                    roundid, bout_id, bracket_type, bracket_round,
                    bout_order, next_bout_id, loser_next_bout_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    roundId,
                    boutId,
                    bout.bracketType,
                    bout.round,
                    bout.position,
                    bout.nextBoutId || null,
                    bout.loserNextBoutId || null
                ]
            );

            // If it's a bye, automatically update scores properly
            if ((bout.fencerA === null && bout.fencerB !== null) ||
                (bout.fencerA !== null && bout.fencerB === null)) {

                const winningFencer = bout.fencerA || bout.fencerB;

                if (winningFencer) {
                    // Set the victor in Bouts table
                    await db.runAsync(
                        'UPDATE Bouts SET victor = ? WHERE id = ?',
                        [winningFencer, boutId]
                    );

                    // Set scores in FencerBouts (15-0 for winner)
                    await db.runAsync(
                        'UPDATE FencerBouts SET score = ? WHERE boutid = ? AND fencerid = ?',
                        [15, boutId, winningFencer]
                    );
                }
            }
        }

        console.log(`Created double elimination bracket for round ${roundId}`);
    } catch (error) {
        console.error('Error creating double elimination bracket:', error);
        throw error;
    }
}

/**
 * Creates a compass draw bracket structure in the database.
 */
export async function dbCreateCompassDrawBracket(
    roundId: number,
    tableSize: number,
    seededFencers: { fencer: any, seed: number }[]
): Promise<void> {
    try {
        const db = await openDB();

        // Get round information
        const round = await db.getFirstAsync<{ id: number, eventid: number }>(
            'SELECT id, eventid FROM Rounds WHERE id = ?',
            [roundId]
        );

        if (!round) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Generate the bracket structure
        const { generateCompassDrawStructure, placeFencersInCompassDraw } = require('../navigation/utils/CompassDrawUtils');

        // Create the structure
        const brackets = generateCompassDrawStructure(seededFencers.length);

        // Place fencers in the brackets
        const populatedBrackets = placeFencersInCompassDraw(brackets, seededFencers);

        // Insert all bouts into the database
        const { eastBracket, northBracket, westBracket, southBracket } = populatedBrackets;
        const allBrackets = [
            ...eastBracket.map(bout => ({ ...bout, bracketType: 'east' })),
            ...northBracket.map(bout => ({ ...bout, bracketType: 'north' })),
            ...westBracket.map(bout => ({ ...bout, bracketType: 'west' })),
            ...southBracket.map(bout => ({ ...bout, bracketType: 'south' }))
        ];

        // Create bouts first
        for (const bout of allBrackets) {
            const boutResult = await db.runAsync(
                `INSERT INTO Bouts (lfencer, rfencer, victor, eventid, roundid, tableof)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    bout.fencerA || null,
                    bout.fencerB || null,
                    bout.winner || null,
                    round.eventid,
                    roundId,
                    tableSize
                ]
            );

            const boutId = boutResult.lastInsertRowId;

            // Then add bracket information
            await db.runAsync(
                `INSERT INTO DEBracketBouts (
                    roundid, bout_id, bracket_type, bracket_round,
                    bout_order, next_bout_id, loser_next_bout_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    roundId,
                    boutId,
                    bout.bracketType,
                    bout.round,
                    bout.position,
                    bout.nextBoutId || null,
                    bout.loserNextBoutId || null
                ]
            );

            // If it's a bye, automatically update scores properly
            if ((bout.fencerA === null && bout.fencerB !== null) ||
                (bout.fencerA !== null && bout.fencerB === null)) {

                const winningFencer = bout.fencerA || bout.fencerB;

                if (winningFencer) {
                    // Set the victor in Bouts table
                    await db.runAsync(
                        'UPDATE Bouts SET victor = ? WHERE id = ?',
                        [winningFencer, boutId]
                    );

                    // Set scores in FencerBouts (15-0 for winner)
                    await db.runAsync(
                        'UPDATE FencerBouts SET score = ? WHERE boutid = ? AND fencerid = ?',
                        [15, boutId, winningFencer]
                    );
                }
            }
        }

        console.log(`Created compass draw bracket for round ${roundId}`);
    } catch (error) {
        console.error('Error creating compass draw bracket:', error);
        throw error;
    }
}

/**
 * Updates the initializeRound function to handle different DE formats
 */
export async function dbInitializeRound(
    event: Event,
    round: Round,
    fencers: Fencer[]
): Promise<void> {
    try {
        // Get seeding for this round
        let seeding;

        // If this is the first round, calculate preliminary seeding
        if (round.rorder === 1) {
            const { calculatePreliminarySeeding } = require("../navigation/utils/RoundAlgorithms");
            seeding = calculatePreliminarySeeding(fencers);
            // Save the preliminary seeding to the database
            await dbSaveSeeding(event.id, round.id, seeding);
        } else {
            // Get the results-based seeding from the previous round
            const previousRounds = await dbGetRoundsForEvent(event.id);
            const previousRound = previousRounds.find(r => r.rorder === round.rorder - 1);

            if (previousRound) {
                // Explicitly use the previous round's results to determine seeding
                seeding = await dbGetSeedingForRound(previousRound.id);

                // If no seeding found, we need to calculate it from the previous round's results
                if (!seeding || seeding.length === 0) {
                    await dbCalculateAndSaveSeedingFromRoundResults(event.id, previousRound.id);
                    seeding = await dbGetSeedingForRound(previousRound.id);
                }
            }

            // If still no seeding found (unlikely), use preliminary seeding as a last resort
            if (!seeding || seeding.length === 0) {
                console.warn("No previous round results found, using preliminary seeding as fallback");
                const { calculatePreliminarySeeding } = require("../navigation/utils/RoundAlgorithms");
                seeding = calculatePreliminarySeeding(fencers);
            }

            // Save this seeding for the current round too
            await dbSaveSeeding(event.id, round.id, seeding);
        }

        if (round.type === 'pool') {
            await dbCreatePoolAssignmentsAndBoutOrders(
                event,
                round,
                fencers,
                round.poolcount,
                round.poolsize,
                seeding
            );
        } else if (round.type === 'de') {
            // Automatically determine the appropriate bracket size
            let tableSize = 2;
            while (tableSize < fencers.length) {
                tableSize *= 2;
            }

            // Update the round with the automatically calculated table size
            const db = await openDB();
            await db.runAsync(
                'UPDATE Rounds SET detablesize = ? WHERE id = ?',
                [tableSize, round.id]
            );

            console.log(`Automatically set DE table size to ${tableSize} for ${fencers.length} fencers`);

            // Initialize based on DE format
            if (round.deformat === 'single') {
                await createFirstRoundDEBouts(event, round, fencers, seeding);
            } else if (round.deformat === 'double') {
                await dbCreateDoubleEliminationBracket(round.id, tableSize, seeding);
            } else if (round.deformat === 'compass') {
                await dbCreateCompassDrawBracket(round.id, tableSize, seeding);
            }
        }

        // Mark the round as started
        await dbMarkRoundAsStarted(round.id);
    } catch (error) {
        console.error('Error initializing round:', error);
        throw error;
    }
}
/**
 * Gets summary statistics for a DE round
 */
export async function dbGetDESummary(roundId: number): Promise<{
    totalFencers: number;
    tableSize: number;
    remainingFencers: number;
    currentRound: number;
    totalRounds: number;
    topSeeds: any[];
}> {
    try {
        const db = await openDB();

        // Get the round information
        const round = await db.getFirstAsync<{
            id: number;
            eventid: number;
            detablesize: number;
        }>('SELECT id, eventid, detablesize FROM Rounds WHERE id = ?', [roundId]);

        if (!round) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Get the total number of fencers in the event
        const fencersResult = await db.getFirstAsync<{count: number}>(
            'SELECT COUNT(*) as count FROM FencerEvents WHERE eventid = ?',
            [round.eventid]
        );
        const totalFencers = fencersResult?.count || 0;

        // Get the table size
        const tableSize = round.detablesize || 0;

        // Get the number of remaining fencers (those who have not been eliminated yet)
        const remainingResult = await db.getFirstAsync<{count: number}>(
            `SELECT COUNT(DISTINCT fencerid) as count 
             FROM FencerBouts fb
             JOIN Bouts b ON fb.boutid = b.id
             WHERE b.roundid = ? AND b.victor IS NULL`,
            [roundId]
        );
        const remainingFencers = remainingResult?.count || 0;

        // Calculate the current round and total rounds based on table size
        const totalRounds = Math.log2(tableSize);

        // Get the most advanced round that has any bouts
        const currentRoundResult = await db.getFirstAsync<{max_round: number}>(
            `SELECT MAX(bracket_round) as max_round 
             FROM DEBracketBouts 
             WHERE roundid = ?`,
            [roundId]
        );
        const currentRound = (currentRoundResult?.max_round || 1) + 1;

        // Get the top 4 seeds
        const topSeeds = await db.getAllAsync(
            `SELECT s.seed, f.id, f.fname, f.lname, f.erating, f.eyear, f.frating, f.fyear, f.srating, f.syear
             FROM SeedingFromRoundResults s
             JOIN Fencers f ON s.fencerid = f.id
             WHERE s.roundid = ?
             ORDER BY s.seed
             LIMIT 4`,
            [roundId]
        );

        return {
            totalFencers,
            tableSize,
            remainingFencers,
            currentRound,
            totalRounds,
            topSeeds: topSeeds.map(row => ({
                seed: row.seed,
                fencer: {
                    id: row.id,
                    fname: row.fname,
                    lname: row.lname,
                    erating: row.erating,
                    eyear: row.eyear,
                    frating: row.frating,
                    fyear: row.fyear,
                    srating: row.srating,
                    syear: row.syear
                }
            }))
        };
    } catch (error) {
        console.error('Error getting DE summary:', error);
        throw error;
    }
}

/**
 * Gets the DE format for a round
 */
export async function dbGetDEFormat(roundId: number): Promise<'single' | 'double' | 'compass'> {
    try {
        const db = await openDB();

        const round = await db.getFirstAsync<{ deformat: string }>(
            'SELECT deformat FROM Rounds WHERE id = ?',
            [roundId]
        );

        if (!round) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        // Default to single elimination if no format is specified
        return (round.deformat as 'single' | 'double' | 'compass') || 'single';
    } catch (error) {
        console.error('Error getting DE format:', error);
        return 'single'; // Default to single elimination
    }
}

/**
 * Checks if a DE round has completed (final bout has a winner)
 */
export async function dbIsDERoundComplete(roundId: number): Promise<boolean> {
    try {
        const db = await openDB();

        // Get information about the round format first
        const round = await db.getFirstAsync<{ deformat: string, type: string }>(
            'SELECT deformat, type FROM Rounds WHERE id = ?',
            [roundId]
        );

        // If it's not a DE round, return false
        if (!round || round.type !== 'de') return false;

        let isComplete = false;

        // Check completion based on the DE format
        if (round.deformat === 'single') {
            // For single elimination, check if the finals bout has a winner
            const finalBoutResult = await db.getFirstAsync<{ has_victor: number }>(
                `SELECT COUNT(*) as has_victor 
                 FROM Bouts
                 WHERE roundid = ? AND tableof = 2 AND victor IS NOT NULL`,
                [roundId]
            );

            isComplete = finalBoutResult?.has_victor > 0;
        }
        else if (round.deformat === 'double') {
            // For double elimination, check if the finals bracket has a winner
            const finalBoutResult = await db.getFirstAsync<{ has_victor: number }>(
                `SELECT COUNT(*) as has_victor 
                 FROM Bouts B
                 JOIN DEBracketBouts DBB ON B.id = DBB.bout_id
                 WHERE B.roundid = ? AND DBB.bracket_type = 'finals' 
                       AND B.victor IS NOT NULL`,
                [roundId]
            );

            isComplete = finalBoutResult?.has_victor > 0;
        }
        else if (round.deformat === 'compass') {
            // For compass draw, check if all four finals have winners
            // We'll consider it complete if the east bracket final is complete
            const eastFinalResult = await db.getFirstAsync<{ has_victor: number }>(
                `SELECT COUNT(*) as has_victor 
                 FROM Bouts B
                 JOIN DEBracketBouts DBB ON B.id = DBB.bout_id
                 WHERE B.roundid = ? AND DBB.bracket_type = 'east' 
                       AND DBB.bracket_round = 1
                       AND B.victor IS NOT NULL`,
                [roundId]
            );

            isComplete = eastFinalResult?.has_victor > 0;
        }

        return isComplete;
    } catch (error) {
        console.error('Error checking if DE round is complete:', error);
        return false;
    }
}

// Official Functions
export async function dbCreateOfficial(official: {
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
}): Promise<number> {
    try {
        const db = await openDB();
        const result: SQLite.SQLiteRunResult = await db.runAsync(
            'INSERT INTO Officials (fname, lname, nickname, device_id) VALUES (?, ?, ?, ?)',
            [official.fname, official.lname, official.nickname || null, official.device_id || null]
        );
        const newOfficialId = result.lastInsertRowId;
        console.log(`Official "${official.fname} ${official.lname}" created with id ${newOfficialId}.`);
        return newOfficialId;
    } catch (error) {
        console.error('Error creating official:', error);
        throw error;
    }
}

export async function dbGetOfficialByDeviceId(deviceId: string): Promise<any | null> {
    try {
        const db = await openDB();
        const official = await db.getFirstAsync(
            'SELECT * FROM Officials WHERE device_id = ?',
            [deviceId]
        );
        return official;
    } catch (error) {
        console.error('Error getting official by device ID:', error);
        return null;
    }
}

export async function dbAddOfficialToEvent(officialId: number, eventId: number): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync(
            'INSERT INTO OfficialEvents (officialid, eventid) VALUES (?, ?)',
            [officialId, eventId]
        );
        console.log(`Official ID ${officialId} added to event ID ${eventId}`);
    } catch (error) {
        console.error('Error adding official to event:', error);
        throw error;
    }
}

export async function dbGetOfficialsForEvent(eventId: number): Promise<any[]> {
    try {
        const db = await openDB();
        const officials = await db.getAllAsync(
            `SELECT o.* 
             FROM Officials o
             JOIN OfficialEvents oe ON o.id = oe.officialid
             WHERE oe.eventid = ?`,
            [eventId]
        );
        return officials;
    } catch (error) {
        console.error('Error getting officials for event:', error);
        return [];
    }
}

export async function dbListOfficials(): Promise<any[]> {
    try {
        const db = await openDB();
        const officials = await db.getAllAsync('SELECT * FROM Officials');
        return officials;
    } catch (error) {
        console.error('Error listing officials:', error);
        return [];
    }
}

// Referee Functions with device_id support
export async function dbCreateReferee(referee: {
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
}): Promise<number> {
    try {
        const db = await openDB();
        const result: SQLite.SQLiteRunResult = await db.runAsync(
            'INSERT INTO Referees (fname, lname, nickname, device_id) VALUES (?, ?, ?, ?)',
            [referee.fname, referee.lname, referee.nickname || null, referee.device_id || null]
        );
        const newRefereeId = result.lastInsertRowId;
        console.log(`Referee "${referee.fname} ${referee.lname}" created with id ${newRefereeId}.`);
        return newRefereeId;
    } catch (error) {
        console.error('Error creating referee:', error);
        throw error;
    }
}

export async function dbGetRefereeByDeviceId(deviceId: string): Promise<any | null> {
    try {
        const db = await openDB();
        const referee = await db.getFirstAsync(
            'SELECT * FROM Referees WHERE device_id = ?',
            [deviceId]
        );
        return referee;
    } catch (error) {
        console.error('Error getting referee by device ID:', error);
        return null;
    }
}

export async function dbAddRefereeToEvent(refereeId: number, eventId: number): Promise<void> {
    try {
        const db = await openDB();
        await db.runAsync(
            'INSERT INTO RefereeEvents (refereeid, eventid) VALUES (?, ?)',
            [refereeId, eventId]
        );
        console.log(`Referee ID ${refereeId} added to event ID ${eventId}`);
    } catch (error) {
        console.error('Error adding referee to event:', error);
        throw error;
    }
}

export async function dbGetRefereesForEvent(eventId: number): Promise<any[]> {
    try {
        const db = await openDB();
        const referees = await db.getAllAsync(
            `SELECT r.* 
             FROM Referees r
             JOIN RefereeEvents re ON r.id = re.refereeid
             WHERE re.eventid = ?`,
            [eventId]
        );
        return referees;
    } catch (error) {
        console.error('Error getting referees for event:', error);
        return [];
    }
}

export async function dbListReferees(): Promise<any[]> {
    try {
        const db = await openDB();
        const referees = await db.getAllAsync('SELECT * FROM Referees');
        return referees;
    } catch (error) {
        console.error('Error listing referees:', error);
        return [];
    }
}

/**
 * Gets the event name for a DE round
 */
export async function dbGetEventNameForRound(roundId: number): Promise<string> {
    try {
        const db = await openDB();

        const result = await db.getFirstAsync<{
            weapon: string;
            gender: string;
            age: string;
        }>(
            `SELECT e.weapon, e.gender, e.age
             FROM Events e
             JOIN Rounds r ON e.id = r.eventid
             WHERE r.id = ?`,
            [roundId]
        );

        if (!result) {
            return "Unknown Event";
        }

        return `${result.gender} ${result.age} ${result.weapon}`;
    } catch (error) {
        console.error('Error getting event name:', error);
        return "Unknown Event";
    }
}

/**
 * Gets the table size for a DE round
 * @param roundId ID of the round
 * @returns The configured table size for the DE bracket
 */
export async function dbGetDETableSize(roundId: number): Promise<number> {
    try {
        const db = await openDB();

        const result = await db.getFirstAsync<{ detablesize: number }>(
            'SELECT detablesize FROM Rounds WHERE id = ?',
            [roundId]
        );

        if (!result) {
            throw new Error(`Round with ID ${roundId} not found`);
        }

        return result.detablesize || 0;
    } catch (error) {
        console.error('Error getting DE table size:', error);
        return 0; // Default to 0 if there's an error
    }
}

/**
 * Gets an event by ID
 * @param eventId ID of the event to retrieve
 * @returns The event object
 */
export async function dbGetEventById(eventId: number): Promise<Event> {
    try {
        const db = await openDB();
        const event = await db.getFirstAsync<Event>(
            'SELECT * FROM Events WHERE id = ?',
            [eventId]
        );
        
        if (!event) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
        
        return event;
    } catch (error) {
        console.error('Error fetching event by ID:', error);
        throw error;
    }
}

/**
 * Gets a round by ID
 * @param roundId ID of the round to retrieve
 * @returns The round object
 */
export async function dbGetRoundById(roundId: number): Promise<Round> {
    try {
        const db = await openDB();
        const round = await db.getFirstAsync<Round>(
            'SELECT * FROM Rounds WHERE id = ?',
            [roundId]
        );
        
        if (!round) {
            throw new Error(`Round with ID ${roundId} not found`);
        }
        
        return round;
    } catch (error) {
        console.error('Error fetching round by ID:', error);
        throw error;
    }
}

/**
 * Delete a referee from the database
 * @param refereeId ID of the referee to delete
 */
export async function dbDeleteReferee(refereeId: number): Promise<void> {
    try {
        const db = await openDB();
        
        // First, remove the referee from all events they may be associated with
        await db.runAsync(
            'DELETE FROM RefereeEvents WHERE refereeid = ?',
            [refereeId]
        );
        
        // Then, delete the referee record
        await db.runAsync(
            'DELETE FROM Referees WHERE id = ?',
            [refereeId]
        );
        
        console.log(`Deleted referee with ID: ${refereeId}`);
    } catch (error) {
        console.error(`Error deleting referee: ${error}`);
        throw error;
    }
}

/**
 * Delete an official from the database
 * @param officialId ID of the official to delete
 */
export async function dbDeleteOfficial(officialId: number): Promise<void> {
    try {
        const db = await openDB();
        
        // First, remove the official from all events they may be associated with
        await db.runAsync(
            'DELETE FROM OfficialEvents WHERE officialid = ?',
            [officialId]
        );
        
        // Then, delete the official record
        await db.runAsync(
            'DELETE FROM Officials WHERE id = ?',
            [officialId]
        );
        
        console.log(`Deleted official with ID: ${officialId}`);
    } catch (error) {
        console.error(`Error deleting official: ${error}`);
        throw error;
    }
}