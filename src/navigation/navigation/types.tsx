export type Tournament = {
    name: string;
    isComplete: boolean;
    isRemote?: boolean;
    hostIp?: string;
    port?: number;
};

export type Club = {
    id?: number;
    name: string;
    abbreviation?: string;
};

export type Fencer = {
    id?: number;
    fname: string;
    lname: string;
    nickname?: string;
    club?: string; // Keep for backward compatibility
    clubid?: number;
    clubName?: string; // For UI display purposes
    clubAbbreviation?: string; // For UI display purposes
    erating: string | 'U' | 'E' | 'D' | 'C' | 'B' | 'A';
    eyear: number;
    frating: string | 'U' | 'E' | 'D' | 'C' | 'B' | 'A';
    fyear: number;
    srating: string | 'U' | 'E' | 'D' | 'C' | 'B' | 'A';
    syear: number;
    poolNumber?: number; // new property for pool assignment order
};

export type Referee = {
    id: number;
    firstName: string;
    lastName: string;
    nickname?: string;
};

export type PoolConfiguration = {
    pools: number;
    baseSize: number;
    extraPools: number; // number of pools that get one extra fencer
};

export type Round = {
    id: number;
    eventid: number;
    rorder: number;
    type: 'pool' | 'de';
    poolcount?: number; // Made optional
    poolsize?: number; // Made optional
    promotionpercent: number;
    targetbracket: number;
    usetargetbracket: 0 | 1;
    deformat: 'single' | 'double' | 'compass';
    detablesize: number;
    isstarted: boolean;
    iscomplete: number;
    // UI-only properties (not persisted in the database)
    poolsoption?: 'promotion' | 'target'; // Made optional as it only applies to pool rounds
    poolConfiguration?: PoolConfiguration;
};

export type Event = {
    id: number;
    weapon: string;
    gender: string;
    age: string;
    class: string;
    seeding: string;
    startedCount?: number; // Used to make sure we don't re-init pool/de brackets

    // Optional properties potentially added by server/data provider logic
    rounds?: Round[];
    fencers?: Fencer[];
    isStarted?: boolean;
    has_started?: boolean;
    started?: boolean;
    isstarted?: boolean;
};

// Type for data returned by getPools
export type PoolData = {
    poolid: number;
    fencers: Fencer[];
    isComplete?: boolean; // Server-provided completion status
    // Add other properties returned by getPools if known
};

export type Bout = {
    id: number;
    fencerA: Fencer;
    fencerB: Fencer;
    scoreA: number;
    scoreB: number;
    status: 'pending' | 'active' | 'completed';
    boutOrderPosition?: number; // Position in the official bout order
    winnerId?: number; // ID of the fencer who won the bout
};

export type Official = {
    id?: number;
    fname: string;
    lname: string;
    nickname?: string;
    device_id?: string;
};

export type RootStackParamList = {
    HomeTabs: undefined;
    EventManagment: { tournamentName: string };
    EventSettings: { event: Event; onSave: (updatedEvent: Event) => void; isRemote?: boolean };
    RefereeModule: {
        boutIndex: number;
        fencer1Name: string;
        fencer2Name: string;
        currentScore1: number;
        currentScore2: number;
        onSaveScores?: (score1: number, score2: number) => void;
        isRemote?: boolean; // Add optional isRemote flag
        weapon?: string; // Add optional weapon type
    };
    PoolsPage: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    BoutOrderPage: {
        roundId: number;
        poolId: number;
        isRemote?: boolean;
        weapon?: string; // Add optional weapon type
    };
    RoundResults: {
        roundId: number;
        eventId: number;
        currentRoundIndex: number;
        isRemote?: boolean;
    };
    DEBracketPage: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    DoubleEliminationPage: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    CompassDrawPage: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    ManageOfficials: {
        tournamentName: string;
        isRemote?: boolean;
    };
    TournamentResultsPage: {
        eventId: number;
        isRemote?: boolean;
    };
};
