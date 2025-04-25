import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CompassDrawPage from '../../../src/navigation/screens/CompassDrawPage';

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
        },
    }),
}));

// Mock the database utilities
jest.mock('../../../src/db/DrizzleDatabaseUtils', () => ({
    dbGetCompassDrawForRound: jest.fn().mockResolvedValue({
        matches: [
            {
                id: 1,
                roundId: 1,
                fencerA: { id: 1, name: 'Fencer A' },
                fencerB: { id: 2, name: 'Fencer B' },
                winner: null,
                score: null,
            },
        ],
    }),
    dbUpdateMatchResult: jest.fn(),
}));

describe('CompassDrawPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the compass draw page with matches', async () => {
        const { getByText } = render(<CompassDrawPage />);
        
        await waitFor(() => {
            expect(getByText('Compass Draw')).toBeTruthy();
            expect(getByText('Fencer A')).toBeTruthy();
            expect(getByText('Fencer B')).toBeTruthy();
        });
    });

    it('allows selecting a winner for a match', async () => {
        const { getByText } = render(<CompassDrawPage />);
        
        await waitFor(() => {
            expect(getByText('Fencer A')).toBeTruthy();
        });

        const fencerAButton = getByText('Fencer A');
        fireEvent.press(fencerAButton);

        // Should show confirmation dialog or update UI to reflect winner
        await waitFor(() => {
            expect(getByText('Winner: Fencer A')).toBeTruthy();
        });
    });

    it('displays loading state while fetching data', () => {
        const { getByTestId } = render(<CompassDrawPage />);
        expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('handles error state when failing to fetch data', async () => {
        // Mock the database call to fail
        jest.spyOn(require('../../../src/db/DrizzleDatabaseUtils'), 'dbGetCompassDrawForRound')
            .mockRejectedValueOnce(new Error('Failed to fetch'));

        const { getByText } = render(<CompassDrawPage />);
        
        await waitFor(() => {
            expect(getByText('Error loading compass draw')).toBeTruthy();
        });
    });

    it('updates match results when a winner is selected', async () => {
        const { getByText } = render(<CompassDrawPage />);
        const dbUpdateMatchResult = require('../../../src/db/DrizzleDatabaseUtils').dbUpdateMatchResult;

        await waitFor(() => {
            expect(getByText('Fencer A')).toBeTruthy();
        });

        fireEvent.press(getByText('Fencer A'));

        await waitFor(() => {
            expect(dbUpdateMatchResult).toHaveBeenCalledWith(
                expect.any(Number),
                expect.objectContaining({
                    winner: 1,
                })
            );
        });
    });
});