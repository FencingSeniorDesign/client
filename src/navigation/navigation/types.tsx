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
    rounds: RoundData[];
    name: string;
    fencers: Fencer[];
    poolCount: number;
    fencersPerPool: number;
};

// Import DEBracketData from your RoundAlgorithms (if needed)
import { DEBracketData } from '../utils/RoundAlgorithms';

export type RootStackParamList = {
    HomeTabs: undefined;
    EventManagment: { tournamentName: string };
    EventSettings: { event: Event; onSave: (updatedEvent: Event) => void };
    // RefereeModule now receives additional parameters (including the callback)
    RefereeModule: {
        boutIndex: number;
        fencer1Name: string;
        fencer2Name: string;
        currentScore1: number;
        currentScore2: number;
        onSaveScores?: (score1: number, score2: number) => void;
    };
    PoolsPage: {
        event: Event;
        currentRoundIndex: number;
        fencers: Fencer[];
        poolCount: number;
        fencersPerPool: number;
    };
    // BoutOrderPage now can receive an optional updatedBout parameter
    BoutOrderPage: {
        poolFencers: Fencer[];
        updatedBout?: { boutIndex: number; score1: number; score2: number };
    };
    DEBracketPage: { event: Event; currentRoundIndex: number; bracketData: DEBracketData };
    HostTournament: undefined;
    JoinTournament: undefined;
};
