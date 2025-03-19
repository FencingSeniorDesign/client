/**
 * Navigation type definitions
 */

import { Event } from '../core/types';

export type RootStackParamList = {
    Home: undefined;
    CreateTournament: undefined;
    JoinTournament: undefined;
    EventManagement: { tournamentName: string };
    EventSettings: { event: Event; onSave: (updatedEvent: Event) => void };
    RefereeModule: {
        boutIndex: number;
        fencer1Name: string;
        fencer2Name: string;
        currentScore1: number;
        currentScore2: number;
        onSaveScores?: (score1: number, score2: number) => void;
    };
    Pools: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    BoutOrder: {
        roundId: number;
        poolId: number;
        isRemote?: boolean;
    };
    RoundResults: {
        roundId: number;
        eventId: number;
        currentRoundIndex: number;
        isRemote?: boolean;
    };
    DEBracket: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    DoubleElimination: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    CompassDraw: {
        event: Event;
        currentRoundIndex: number;
        roundId: number;
        isRemote?: boolean;
    };
    ManageOfficials: {
        tournamentName: string;
        isRemote?: boolean;
    };
};