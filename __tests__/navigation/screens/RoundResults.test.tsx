import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RoundResults from '../../../src/navigation/screens/RoundResults';
import { useRoundResultsData as useRoundResults } from '../../../src/data/TournamentDataHooks';

// Mock the hooks
jest.mock('../../../src/data/TournamentDataHooks');

// Mock navigation
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
        },
    }),
}));

describe('RoundResults', () => {
    const mockResults = {
        fencers: [
            {
                id: 1,
                fname: 'John',
                lname: 'Doe',
                victories: 4,
                matches: 5,
                touches_scored: 25,
                touches_received: 15,
                indicator: 10,
                place: 1,
            },
            {
                id: 2,
                fname: 'Jane',
                lname: 'Smith',
                victories: 3,
                matches: 5,
                touches_scored: 20,
                touches_received: 18,
                indicator: 2,
                place: 2,
            },
        ],
        isComplete: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRoundResults as jest.Mock).mockReturnValue({
            data: mockResults,
            isLoading: false,
            isError: false,
        });
    });

    it('renders round results table', async () => {
        const { getByText } = render(<RoundResults />);

        await waitFor(() => {
            expect(getByText('Round Results')).toBeTruthy();
            expect(getByText('Name')).toBeTruthy();
            expect(getByText('V/M')).toBeTruthy();
            expect(getByText('TS')).toBeTruthy();
            expect(getByText('TR')).toBeTruthy();
            expect(getByText('Ind')).toBeTruthy();
            expect(getByText('Place')).toBeTruthy();
        });
    });

    it('displays fencer results correctly', async () => {
        const { getByText } = render(<RoundResults />);

        await waitFor(() => {
            expect(getByText('John Doe')).toBeTruthy();
            expect(getByText('4/5')).toBeTruthy();
            expect(getByText('25')).toBeTruthy();
            expect(getByText('15')).toBeTruthy();
            expect(getByText('+10')).toBeTruthy();
            expect(getByText('1')).toBeTruthy();
        });
    });

    it('shows loading state', () => {
        (useRoundResults as jest.Mock).mockReturnValue({
            data: null,
            isLoading: true,
            isError: false,
        });

        const { getByTestId } = render(<RoundResults />);
        expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows error state', () => {
        (useRoundResults as jest.Mock).mockReturnValue({
            data: null,
            isLoading: false,
            isError: true,
        });

        const { getByText } = render(<RoundResults />);
        expect(getByText('Error loading results')).toBeTruthy();
    });

    it('sorts fencers by place', async () => {
        const { getAllByTestId } = render(<RoundResults />);

        await waitFor(() => {
            const fencerRows = getAllByTestId('fencer-row');
            expect(fencerRows[0]).toHaveTextContent('John Doe');
            expect(fencerRows[1]).toHaveTextContent('Jane Smith');
        });
    });

    it('displays victory percentage correctly', async () => {
        const { getByText } = render(<RoundResults />);

        await waitFor(() => {
            expect(getByText('0.800')).toBeTruthy(); // 4/5 = 0.800
            expect(getByText('0.600')).toBeTruthy(); // 3/5 = 0.600
        });
    });

    it('handles round completion status', async () => {
        const { getByText } = render(<RoundResults />);

        await waitFor(() => {
            expect(getByText('Round Complete')).toBeTruthy();
        });

        // Test incomplete round
        (useRoundResults as jest.Mock).mockReturnValue({
            data: { ...mockResults, isComplete: false },
            isLoading: false,
            isError: false,
        });

        const { getByText: getByTextIncomplete } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByTextIncomplete('Round In Progress')).toBeTruthy();
        });
    });

    it('displays no results message when fencers array is empty', async () => {
        (useRoundResults as jest.Mock).mockReturnValue({
            data: { fencers: [], isComplete: true },
            isLoading: false,
            isError: false,
        });

        const { getByText } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByText('No results available')).toBeTruthy();
        });
    });

    it('formats indicators with correct sign', async () => {
        const { getByText } = render(<RoundResults />);

        await waitFor(() => {
            expect(getByText('+10')).toBeTruthy(); // Positive indicator
            expect(getByText('+2')).toBeTruthy(); // Positive indicator
        });

        // Update mock to include negative indicator
        (useRoundResults as jest.Mock).mockReturnValue({
            data: {
                fencers: [{
                    ...mockResults.fencers[0],
                    indicator: -5,
                }],
                isComplete: true,
            },
            isLoading: false,
            isError: false,
        });

        const { getByText: getByTextNegative } = render(<RoundResults />);
        await waitFor(() => {
            expect(getByTextNegative('-5')).toBeTruthy();
        });
    });

    it('handles different round types', async () => {
        const { rerender, getByText } = render(<RoundResults />);

        // Test pool round
        await waitFor(() => {
            expect(getByText('Pool Round Results')).toBeTruthy();
        });

        // Test DE round
        jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
            params: {
                roundId: 1,
                eventId: 1,
                roundType: 'de',
            },
        });

        rerender(<RoundResults />);
        await waitFor(() => {
            expect(getByText('Direct Elimination Results')).toBeTruthy();
        });
    });
});