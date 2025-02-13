// types.ts
export type Fencer = {
    id: any;
    firstName: string;
    lastName: string;
    rating: string;
};

export type RoundData = {
    roundType: 'Pools' | 'DE';
    promotion?: number;
};

export type Event = {
    id: number;
    gender: string;
    weapon: string;
    age: string;
    rounds: RoundData[];
    name: string;
    fencers: Fencer[]; //todo - delete when not needed
    poolCount: number; //same
    fencersPerPool: number; //same
};


export type DEBracketMatch = {
    fencerA: Fencer | undefined;
    fencerB: Fencer | undefined;
    round: number;      // Round number (1 = first round, etc.)
    matchIndex: number; // The index within that round
    winner?: Fencer;
    scoreA?: number;
    scoreB?: number;
};

// Import DEBracketData from your RoundAlgorithms (if needed)
import { DEBracketData } from '../utils/RoundAlgorithms';

export type RootStackParamList = {
    HomeTabs: undefined;
    EventManagment: { tournamentName: string };
    EventSettings: { event: Event; onSave: (updatedEvent: Event) => void };
    RefereeModule: {
        boutIndex: number;
        fencer1Name: string;
        fencer2Name: string;
        currentScore1: number;
        currentScore2: number;
        onSaveScores: (score1: number, score2: number) => void;
    };
    PoolsPage: {
        event: Event;
        currentRoundIndex: number;
        fencers: Fencer[];
        poolCount: number;
        fencersPerPool: number;
    };
    BoutOrderPage: {
        poolFencers: Fencer[];
        updatedBout?: { boutIndex: number; score1: number; score2: number };
    };
    DEBracketPage: { event: Event; currentRoundIndex: number; bracketData: DEBracketData };
    HostTournament: undefined;
    JoinTournament: undefined;
    // New screen for viewing the full bracket
    BracketViewPage: { bracketData: DEBracketData; event: Event };
};

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList {}
    }
}
