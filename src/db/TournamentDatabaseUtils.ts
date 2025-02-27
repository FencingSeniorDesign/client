// TournamentDatabaseUtils.ts
import * as SQLite from 'expo-sqlite';
import { Fencer, Event, Tournament, Round } from "../navigation/navigation/types";
import {buildPools, DEBracketData} from "../navigation/utils/RoundAlgorithms";

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
                nickname text default null
            );
        `);
        console.log("Referee table initialized");
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

    await dbCreateFencerByName(Guy1);
    await dbCreateFencerByName(Guy2);
    await dbCreateFencerByName(Guy3);
    await dbCreateFencerByName(Guy4);

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

export async function dbAddRound(round: Round): Promise<void> {
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
    fencersPerPool: number
): Promise<void> {
    const pools: Fencer[][] = buildPools(fencers, poolCount, fencersPerPool);
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

// In TournamentDatabaseUtils.ts, add this function:

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
