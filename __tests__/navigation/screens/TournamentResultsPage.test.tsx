import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TournamentResultsPage from '../../../src/navigation/screens/TournamentResultsPage';
import { useRounds } from '../../../src/data/TournamentDataHooks';
import dataProvider from '../../../src/data/DrizzleDataProvider';

// Mock the hooks and data provider
jest.mock('../../../src/data/TournamentDataHooks');
jest.mock('../../../src/data/DrizzleDataProvider');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
    }),
    useRoute: () => ({
        params: {
            eventId: 1,
            isRemote: false,
        },
    }),
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
        (dataProvider.getBouts as jest.Mock).mockResolvedValue([]);
        (dataProvider.getSeedingForRound as jest.Mock).mockResolvedValue([]);
    });

    it('renders loading state initially', () => {
        const { getByText } = render(<TournamentResultsPage />);
        expect(getByText('Loading results...')).toBeTruthy();
    });

    it('displays event information after loading', async () => {
        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByText('Mixed Senior Foil')).toBeTruthy();
            expect(getByText('Tournament Results')).toBeTruthy();
        });
    });

    it('renders round tabs correctly', async () => {
        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByText('Pool Round 1')).toBeTruthy();
            expect(getByText('DE Round 2')).toBeTruthy();
        });
    });

    it('switches between rounds when tabs are pressed', async () => {
        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            const deRoundTab = getByText('DE Round 2');
            fireEvent.press(deRoundTab);
        });

        expect(getByText('Direct Elimination Round')).toBeTruthy();
        expect(getByText('Format: Single Elimination')).toBeTruthy();
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

        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByText('Pool 1')).toBeTruthy();
            expect(getByText('Doe, John')).toBeTruthy();
            expect(getByText('V/M')).toBeTruthy();
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

        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            const deRoundTab = getByText('DE Round 2');
            fireEvent.press(deRoundTab);
        });

        await waitFor(() => {
            expect(getByText('Final Results')).toBeTruthy();
            expect(getByText('Place')).toBeTruthy();
            expect(getByText('Doe, John')).toBeTruthy();
        });
    });

    it('handles error states', async () => {
        (dataProvider.getEventById as jest.Mock).mockRejectedValue(new Error('Failed to load'));

        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByText('Failed to load event data')).toBeTruthy();
        });
    });

    it('navigates back when back button is pressed', async () => {
        const navigation = require('@react-navigation/native').useNavigation();
        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            const backButton = getByText('Back to Event');
            fireEvent.press(backButton);
        });

        expect(navigation.goBack).toHaveBeenCalled();
    });

    it('shows connection status bar in remote mode', async () => {
        jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
            params: {
                eventId: 1,
                isRemote: true,
            },
        });

        const { getByTestId } = render(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByTestId('connection-status-bar')).toBeTruthy();
        });
    });

    it('calculates statistics correctly for pool results', async () => {
        const mockPoolBouts = [
            {
                left_fencerid: 1,
                right_fencerid: 2,
                left_score: 5,
                right_score: 3,
            },
            {
                left_fencerid: 1,
                right_fencerid: 3,
                left_score: 5,
                right_score: 2,
            },
        ];

        (dataProvider.getBoutsForPool as jest.Mock).mockResolvedValue(mockPoolBouts);

        const { getByText } = render(<TournamentResultsPage />);

        await waitFor(() => {
            expect(getByText('2/2')).toBeTruthy(); // Perfect victory record
            expect(getByText('10')).toBeTruthy(); // Total touches scored
            expect(getByText('5')).toBeTruthy(); // Total touches received
            expect(getByText('+5')).toBeTruthy(); // Indicator
        });
    });
});