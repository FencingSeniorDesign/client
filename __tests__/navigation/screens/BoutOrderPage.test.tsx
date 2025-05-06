// Add this mock at the very top to stub out expo-sqlite/kv-store.
jest.mock('expo-sqlite/kv-store', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(() => Promise.resolve(null)),
        setItem: jest.fn(() => Promise.resolve(null)),
        removeItem: jest.fn(() => Promise.resolve(null)),
        clear: jest.fn(() => Promise.resolve(null)),
    },
}));

// Add this mock at the very top to stub out react-native-tcp-socket.
jest.mock('react-native-tcp-socket', () => ({
    createConnection: jest.fn(() => ({
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
    })),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabase: jest.fn(),
    SQLite: {
        openDatabaseSync: jest.fn(() => ({
            transaction: jest.fn(),
            exec: jest.fn(),
            close: jest.fn(),
        })),
    },
}));

// Mock DrizzleClient
jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    initializeDatabase: jest.fn(() => Promise.resolve()),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import BoutOrderPage from '../../../src/navigation/screens/BoutOrderPage';
import { useBoutsForPool, usePools, useUpdatePoolBoutScores } from '../../../src/data/TournamentDataHooks';

// Mock the hooks used inside BoutOrderPage.
jest.mock('../../../src/data/TournamentDataHooks', () => ({
    useBoutsForPool: jest.fn(),
    usePools: jest.fn(),
    useUpdatePoolBoutScores: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), isPending: false }),
}));

// Mock navigation hooks so that BoutOrderPage receives appropriate route parameters.
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        useRoute: () => ({
            params: { roundId: 1, poolId: 1, isRemote: false },
        }),
        useNavigation: () => ({ navigate: jest.fn() }),
    };
});

describe('BoutOrderPage', () => {
    const mockBoutsData = [
        {
            id: 1,
            left_fencerid: 101,
            left_fname: 'Alice',
            left_lname: 'Smith',
            left_club: 'ClubA',
            left_clubid: 1,
            left_clubname: 'Club A',
            left_clubabbreviation: 'CA',
            right_fencerid: 102,
            right_fname: 'Bob',
            right_lname: 'Jones',
            right_club: 'ClubB',
            right_clubid: 2,
            right_clubname: 'Club B',
            right_clubabbreviation: 'CB',
            left_score: 0,
            right_score: 0,
            status: 'pending',
        },
    ];

    const mockPoolsData = [
        {
            poolid: 1,
            fencers: [
                { id: 101, fname: 'Alice', lname: 'Smith', poolNumber: 1, club: 'ClubA' },
                { id: 102, fname: 'Bob', lname: 'Jones', poolNumber: 2, club: 'ClubB' },
            ],
        },
    ];

    it('renders loading state', () => {
        // Simulate loading state.
        (useBoutsForPool as jest.Mock).mockReturnValue({ data: null, isLoading: true, error: null });
        (usePools as jest.Mock).mockReturnValue({ data: null, isLoading: true, error: null });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );
        expect(getByText('loadingBouts')).toBeTruthy();
    });

    it('renders error state', () => {
        // Simulate error in loading bouts.
        (useBoutsForPool as jest.Mock).mockReturnValue({ data: null, isLoading: false, error: 'Error fetching bouts' });
        (usePools as jest.Mock).mockReturnValue({ data: null, isLoading: false, error: null });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );
        expect(getByText(/errorLoadingBouts/)).toBeTruthy();
    });

    it('renders Bout Order page with bouts data', async () => {
        // Simulate loaded data for bouts and pools
        (useBoutsForPool as jest.Mock).mockReturnValue({ data: mockBoutsData, isLoading: false, error: null });
        (usePools as jest.Mock).mockReturnValue({ data: mockPoolsData, isLoading: false, error: null });

        const { getByText } = render(
            <NavigationContainer>
                <BoutOrderPage />
            </NavigationContainer>
        );

        await waitFor(() => {
            // Check for headers
            expect(getByText('viewBouts')).toBeTruthy();
            expect(getByText('poolBouts')).toBeTruthy();

            // Check for fencer names in the actual format
            expect(getByText('(-) Alice (CA)')).toBeTruthy();
            expect(getByText('(-) Bob (CB)')).toBeTruthy();

            // Check for the VS text
            expect(getByText('VS')).toBeTruthy();
        });
    });
});
