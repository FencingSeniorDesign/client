// types.ts

export type Fencer = {
    id: any;
    firstName: string;
    lastName: string;
    rating: string;
};

export type Event = {
    id: number;
    gender: string;
    weapon: string;
    round: string;
    name: string;
    fencers: Fencer[];
    poolCount: number;
    fencersPerPool: number;
};

export type RootStackParamList = {
    HomeTabs: undefined;
    EventManagement: { tournamentName: string };
    EventSettings: {
        event: Event;
        onSave: (updatedEvent: Event) => void;
    };
    RefereeModule: undefined;
    PoolsPage: {
        eventId: number;
        fencers: Fencer[];
        poolCount: number;
        fencersPerPool: number;
    };
    /**
     * ADD THIS:
     * Route to display the bout order for a specific pool’s fencers.
     */
    BoutOrderPage: {
        poolFencers: Fencer[];
    };
};
