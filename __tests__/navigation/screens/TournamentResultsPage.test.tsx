const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: mockGoBack,
    }),
    useRoute: () => ({
        params: {
            eventId: 1,
            isRemote: false,
        },
    }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TournamentResultsPage from '../../../src/navigation/screens/TournamentResultsPage';
import { useRounds } from '../../../src/data/TournamentDataHooks';
import dataProvider from '../../../src/data/DrizzleDataProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a test query client
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// Mock the hooks and data provider
jest.mock('../../../src/data/TournamentDataHooks');
jest.mock('../../../src/data/DrizzleDataProvider');

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabaseSync: () => ({
        transaction: jest.fn(),
        exec: jest.fn(),
    }),
}));

// Mock react-native-tcp-socket
jest.mock('react-native-tcp-socket', () => ({
    createServer: jest.fn(() => ({
        listen: jest.fn(),
        on: jest.fn(),
    })),
    createConnection: jest.fn(() => ({
        write: jest.fn(),
        on: jest.fn(),
        connect: jest.fn(),
    })),
}));

// Mock async-storage
jest.mock('expo-sqlite/kv-store', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
    MaterialIcons: 'MaterialIcons',
}));

describe('TournamentResultsPage', () => {
    const mockEvent = {
        id: 1,
        weapon: 'Foil',
        gender: 'Mixed',
        age: 'Senior',
    };

    const mockRounds = [
        {
            id: 1,
            type: 'pool',
            eventid: 1,
            rorder: 1,
        },
        {
            id: 2,
            type: 'de',
            eventid: 1,
            rorder: 2,
            deformat: 'single',
        },
    ];

    const mockPoolResults = [
        {
            poolid: 0,
            stats: [
                {
                    fencer: {
                        id: 1,
                        fname: 'John',
                        lname: 'Doe',
                    },
                    boutsCount: 5,
                    wins: 4,
                    touchesScored: 25,
                    touchesReceived: 15,
                    winRate: 80,
                    indicator: 10,
                },
            ],
        },
    ];

    const mockDEResults = [
        {
            fencer: {
                id: 1,
                fname: 'John',
                lname: 'Doe',
            },
            place: 1,
            victories: 3,
            bouts: 3,
            touchesScored: 45,
            touchesReceived: 30,
            indicator: 15,
            seed: 1,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock hooks and data provider
        (useRounds as jest.Mock).mockReturnValue({
            data: mockRounds,
            isLoading: false,
            isError: false,
        });

        (dataProvider.getEventById as jest.Mock).mockResolvedValue(mockEvent);
        (dataProvider.getPools as jest.Mock).mockResolvedValue([{ poolid: 0, fencers: [] }]);
        (dataProvider.getBoutsForPool as jest.Mock).mockResolvedValue([]);
        (dataProvider.getBouts as jest.Mock).mockResolvedValue([
            {
                lfencer: 1,
                rfencer: 2,
                left_score: 15,
                right_score: 10,
                victor: 1,
                tableof: 2,
            },
        ]);
        (dataProvider.getSeedingForRound as jest.Mock).mockResolvedValue([
            { fencer: { id: 1, fname: 'John', lname: 'Doe' }, seed: 1 },
            { fencer: { id: 2, fname: 'Jane', lname: 'Smith' }, seed: 2 },
        ]);
    });

    it('renders loading state initially', () => {
        const { getByText } = renderWithClient(<TournamentResultsPage />);
        expect(getByText('loadingResults')).toBeTruthy();
    });

    it('displays event information after loading', async () => {
        const { getByText } = renderWithClient(<TournamentResultsPage />);

        await waitFor(() => {
            // We're not expecting "Tournament Results" text directly anymore,
            // but we should have the pool round or DE round text
            expect(getByText(/poolRound/)).toBeTruthy();
        });
    });

    it('renders round tabs correctly', async () => {
        const { getByText } = renderWithClient(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByText(/poolRound/)).toBeTruthy();
            expect(getByText(/deRound/)).toBeTruthy();
        });
    });

    it('switches between rounds when tabs are pressed', async () => {
        const { getByText } = renderWithClient(<TournamentResultsPage />);

        await waitFor(() => {
            const deRoundTab = getByText(/deRound/);
            fireEvent.press(deRoundTab);
        });

        expect(getByText('deRoundInfo')).toBeTruthy();
        expect(getByText(/format/)).toBeTruthy();
    });

    it('displays pool results correctly', async () => {
        (dataProvider.getPools as jest.Mock).mockResolvedValue([
            { poolid: 0, fencers: [{ id: 1, fname: 'John', lname: 'Doe' }] },
        ]);
        (dataProvider.getBoutsForPool as jest.Mock).mockResolvedValue([
            {
                left_fencerid: 1,
                right_fencerid: 2,
                left_score: 5,
                right_score: 3,
            },
        ]);

        const { getByText, getAllByText } = renderWithClient(<TournamentResultsPage />);

        await waitFor(() => {
            // Since there can be multiple elements containing "pool" text (pool tabs, pool titles),
            // use getAllByText and check that at least one element exists
            const poolElements = getAllByText(/pool/);
            expect(poolElements.length).toBeGreaterThan(0);

            expect(getByText('Doe, John')).toBeTruthy();
            expect(getByText('victoryRatio')).toBeTruthy();
        });
    });

    it('displays DE results with medals', async () => {
        (dataProvider.getBouts as jest.Mock).mockResolvedValue([
            {
                lfencer: 1,
                rfencer: 2,
                left_score: 15,
                right_score: 10,
                victor: 1,
                tableof: 8,
            },
        ]);

        const { getByText } = renderWithClient(<TournamentResultsPage />);

        await waitFor(() => {
            const deRoundTab = getByText(/deRound/);
            fireEvent.press(deRoundTab);
        });

        await waitFor(() => {
            expect(getByText('finalResults')).toBeTruthy();
            expect(getByText('place')).toBeTruthy();
            expect(getByText('Doe, John')).toBeTruthy();
        });
    });

    it('handles error states', async () => {
        (dataProvider.getEventById as jest.Mock).mockRejectedValue(new Error('Failed to load'));

        const { getByText } = renderWithClient(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByText('failedToLoadEventData')).toBeTruthy();
        });
    });

    it('navigates back when back button is pressed', async () => {
        const { getByText } = renderWithClient(<TournamentResultsPage />);

        await waitFor(() => {
            const backButton = getByText('backToEvent');
            fireEvent.press(backButton);
        });

        expect(mockGoBack).toHaveBeenCalled();
    });
});
