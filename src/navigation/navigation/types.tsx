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
    rounds: RoundData[];
    name: string;
    fencers: Fencer[];
    poolCount: number;
    fencersPerPool: number;
};

/**
 * If you're using the DEBracketData from the RoundAlgorithms,
 * import it so we can use it in the route param below:
 */
import { DEBracketData } from '../utils/RoundAlgorithms';

export type RootStackParamList = {
    HomeTabs: undefined;
    EditTournament: { tournamentName: string };
    EventSettings: {
        event: Event;
        onSave: (updatedEvent: Event) => void;
    };
    RefereeModule: undefined;
    PoolsPage: {
        event: Event;
        currentRoundIndex: number;
        fencers: Fencer[];
        poolCount: number;
        fencersPerPool: number;
    };
    BoutOrderPage: {
        poolFencers: Fencer[];
    };

    /**
     * NEW ROUTE for DE bracket display:
     */
    DEBracketPage: {
        event: Event;
        currentRoundIndex: number;
        bracketData: DEBracketData;
    };
};
