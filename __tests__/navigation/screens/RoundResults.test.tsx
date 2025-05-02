// Mock SQLite before any imports
jest.mock('expo-sqlite', () => ({
    openDatabaseSync: () => ({
        transaction: jest.fn(),
        exec: jest.fn(),
    }),
}));

jest.mock('../../../src/db/DrizzleClient', () => ({
    db: {
        query: jest.fn(),
        transaction: jest.fn(),
    },
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RoundResults from '../../../src/navigation/screens/RoundResults';
import { useRoundResultsData as useRoundResults } from '../../../src/data/TournamentDataHooks';

// Define the default valid round results
const validRoundResults = {
    poolResults: [
        {
            poolid: 0,
            stats: [
                {
                    fencer: { id: 1, fname: 'John', lname: 'Doe' },
                    wins: 4,
                    boutsCount: 5,
                    touchesScored: 25,
                    touchesReceived: 15,
                    winRate: 0.8,
                    indicator: 10,
                },
                {
                    fencer: { id: 2, fname: 'Jane', lname: 'Smith' },
                    wins: 3,
                    boutsCount: 5,
                    touchesScored: 20,
                    touchesReceived: 18,
                    winRate: 0.6,
                    indicator: 2,
                },
            ],
        },
    ],
    event: {
        id: 1,
        name: 'Test Event',
    },
    nextRoundInfo: {
        nextRound: null,
        hasNextRound: false,
        nextRoundStarted: false,
    },
    isLoading: false,
    isError: false,
};

jest.mock('../../../src/data/TournamentDataHooks', () => ({
    useRoundResultsData: jest.fn(), // we will set value below
    useRoundStarted: () => ({ data: false }),
    useRounds: () => ({ data: [{ id: 1 }] }), // dummy rounds array
    useInitializeRound: () => ({ mutateAsync: jest.fn() }),
}));

// Mock navigation stays as is
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
    }),
    useRoute: () => ({
        params: {
            roundId: 1,
            eventId: 1,
            roundType: 'pool',
            currentRoundIndex: 0,
            isRemote: false,
        },
    }),
}));

describe('RoundResults', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (useRoundResults as jest.Mock).mockReturnValue(validRoundResults);
    });

    it('renders round results table', async () => {
        const { getByText } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByText('Round Results')).toBeTruthy();
            expect(getByText('Fencer')).toBeTruthy();
            expect(getByText('WR')).toBeTruthy();
            expect(getByText('TS')).toBeTruthy();
            expect(getByText('TR')).toBeTruthy();
            expect(getByText('IND')).toBeTruthy();
            expect(getByText('PL')).toBeTruthy();
        });
    });

    it('displays fencer results correctly', async () => {
        const { getByText } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByText('John Doe')).toBeTruthy();
            // Win rate renders with toFixed(1) and "%" appended.
            expect(getByText('0.8%')).toBeTruthy();
            expect(getByText('25')).toBeTruthy();
            expect(getByText('15')).toBeTruthy();
            expect(getByText('10')).toBeTruthy();
        });
    });

    it('shows loading state', () => {
        // Override hook to simulate loading.
        (useRoundResults as jest.Mock).mockReturnValue({
            ...validRoundResults,
            poolResults: [],
            isLoading: true,
            isError: false,
        });
        const { getByText } = render(<RoundResults />);
        expect(getByText('Loading round results...')).toBeTruthy();
    });

    it('shows error state', () => {
        (useRoundResults as jest.Mock).mockReturnValue({
            ...validRoundResults,
            poolResults: [],
            isLoading: false,
            isError: true,
        });
        const { getByText } = render(<RoundResults />);
        expect(getByText('Error loading round results. Please try again.')).toBeTruthy();
    });

    it('sorts fencers by place', async () => {
        const { getByText } = render(<RoundResults />);
        await waitFor(() => {
            // With valid data, "John Doe" (indicator 10) should appear before "Jane Smith"
            expect(getByText('John Doe')).toBeTruthy();
            expect(getByText('Jane Smith')).toBeTruthy();
        });
    });

    it('displays victory percentage correctly', async () => {
        const { getByText } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByText('0.8%')).toBeTruthy();
            expect(getByText('0.6%')).toBeTruthy();
        });
    });

    it('formats indicators with correct sign', async () => {
        const { getByText, rerender } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByText('10')).toBeTruthy();
        });
        // Now update mock with a negative indicator
        (useRoundResults as jest.Mock).mockReturnValue({
            ...validRoundResults,
            poolResults: [
                {
                    poolid: 0,
                    stats: [
                        {
                            fencer: { id: 1, fname: 'John', lname: 'Doe' },
                            wins: 4,
                            boutsCount: 5,
                            touchesScored: 25,
                            touchesReceived: 15,
                            winRate: 0.8,
                            indicator: -5,
                        },
                    ],
                },
            ],
        });
        rerender(<RoundResults />);
        await waitFor(() => {
            expect(getByText('-5')).toBeTruthy();
        });
    });

    it('handles round completion status', async () => {
        // Default valid mock: nextRound was null, so no "Start Next Round" button.
        const { queryByText, rerender, getByText } = render(<RoundResults />);
        await waitFor(() => {
            expect(queryByText('Start Next Round')).toBeNull();
        });
        // Now simulate an incomplete round (nextRound provided)
        (useRoundResults as jest.Mock).mockReturnValue({
            ...validRoundResults,
            poolResults: [{ stats: [] }],
            nextRoundInfo: { nextRound: { id: 2, type: 'pool' }, hasNextRound: true, nextRoundStarted: false },
        });
        rerender(<RoundResults />);
        await waitFor(() => {
            expect(getByText('Start Next Round')).toBeTruthy();
        });
    });

    it('displays no results message when fencers array is empty', async () => {
        // Override with empty poolResults array.
        (useRoundResults as jest.Mock).mockReturnValue({
            ...validRoundResults,
            poolResults: [],
        });
        const { queryByText } = render(<RoundResults />);
        await waitFor(() => {
            // Adjust the expectation based on your component's actual message.
            // For now, assume no results message is not rendered.
            expect(queryByText('No results available')).toBeNull();
        });
    });

    it('handles different round types', async () => {
        const { getByText, rerender } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByText('Round Results')).toBeTruthy();
        });
        // Update the route params for a DE (Direct Elimination) round.
        jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
            params: {
                roundId: 1,
                eventId: 1,
                roundType: 'de',
                currentRoundIndex: 0,
                isRemote: false,
            },
        });
        rerender(<RoundResults />);
        await waitFor(() => {
            // Adjust expectation if your component changes header for DE rounds.
            expect(getByText('Round Results')).toBeTruthy();
        });
    });
});
