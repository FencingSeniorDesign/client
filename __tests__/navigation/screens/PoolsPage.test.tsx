jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PoolsPage from '../../../src/navigation/screens/PoolsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// Set up a test QueryClient
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: jest.fn() }),
    useRoute: () => ({
        params: {
            event: { id: 1, name: 'Test Event' },
            currentRoundIndex: 0,
            roundId: 1,
            isRemote: false,
        },
    }),
    useFocusEffect: (callback: any) => callback(),
}));

// Mock hooks from TournamentDataHooks
jest.mock('../../../src/data/TournamentDataHooks', () => ({
    usePools: jest.fn(),
    useCompleteRound: () => ({}),
    useRoundCompleted: () => ({ data: false, isLoading: false, refetch: jest.fn() }),
}));

// (Optional) If not already mocked elsewhere, mock the seeding DB function.
jest.mock('../../../src/db/DrizzleDatabaseUtils', () => ({
    dbGetSeedingForRound: jest.fn(() =>
        Promise.resolve([{ seed: 1, fencer: { id: 1, fname: 'John', lname: 'Doe', frating: 'A', fyear: 2022 } }])
    ),
}));

describe('PoolsPage', () => {
    it('renders loading state when pools are loading', () => {
        const { usePools } = require('../../../src/data/TournamentDataHooks');
        (usePools as jest.Mock).mockReturnValue({ data: null, isLoading: true, error: null });
        const { getByText } = renderWithClient(<PoolsPage />);
        expect(getByText('Loading pools data...')).toBeTruthy();
    });

    it('renders error state when error occurs', () => {
        const { usePools } = require('../../../src/data/TournamentDataHooks');
        (usePools as jest.Mock).mockReturnValue({ data: null, isLoading: false, error: new Error('Failed') });
        const { getByText } = renderWithClient(<PoolsPage />);
        expect(getByText(/Error loading pools:/)).toBeTruthy();
    });

    it('renders list of pools correctly', async () => {
        const { usePools } = require('../../../src/data/TournamentDataHooks');
        const mockPoolsData = [
            {
                poolid: 0,
                fencers: [
                    { id: 1, fname: 'John', lname: 'Doe' },
                    { id: 2, fname: 'Jane', lname: 'Smith' },
                ],
            },
            { poolid: 1, fencers: [{ id: 3, fname: 'Alice', lname: 'Wonderland' }] },
        ];
        (usePools as jest.Mock).mockReturnValue({ data: mockPoolsData, isLoading: false, error: null });
        const { getByText } = renderWithClient(<PoolsPage />);
        await waitFor(() => {
            expect(getByText(/Pool 1 :/)).toBeTruthy();
            expect(getByText(/Pool 2 :/)).toBeTruthy();
        });
    });

    it('opens seeding modal when "View Seeding" button is pressed', async () => {
        const { usePools } = require('../../../src/data/TournamentDataHooks');
        const mockPoolsData = [{ poolid: 0, fencers: [{ id: 1, fname: 'John', lname: 'Doe' }] }];
        (usePools as jest.Mock).mockReturnValue({ data: mockPoolsData, isLoading: false, error: null });
        const { getByText } = renderWithClient(<PoolsPage />);
        const viewSeedingButton = getByText('View Seeding');
        fireEvent.press(viewSeedingButton);
        await waitFor(() => {
            expect(getByText('Current Seeding')).toBeTruthy();
        });
    });
});
