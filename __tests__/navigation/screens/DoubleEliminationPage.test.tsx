import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DoubleEliminationPage from '../../../src/navigation/screens/DoubleEliminationPage';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
    useRoute: () => ({
        params: {
            event: {
                id: 1,
                weapon: 'Foil',
                gender: 'Mixed',
                age: 'Senior',
            },
            currentRoundIndex: 0,
            roundId: 1,
        },
    }),
    useNavigation: () => ({
        navigate: jest.fn(),
    }),
}));

// Mock database utilities
jest.mock('../../../src/db/DrizzleDatabaseUtils', () => ({
    dbGetRoundsForEvent: jest.fn().mockResolvedValue([
        {
            id: 1,
            type: 'de',
            deformat: 'double',
            detablesize: 8,
        },
    ]),
    dbGetDoubleBracketBouts: jest.fn().mockResolvedValue({
        winners: [
            {
                id: 1,
                bracket_round: 1,
                lfencer: 1,
                rfencer: 2,
                left_fname: 'John',
                left_lname: 'Doe',
                right_fname: 'Jane',
                right_lname: 'Smith',
                left_score: 15,
                right_score: 13,
                victor: 1,
                seed_left: 1,
                seed_right: 8,
                bout_order: 1,
            },
        ],
        losers: [
            {
                id: 2,
                bracket_round: 1,
                lfencer: 3,
                rfencer: 4,
                left_fname: 'Bob',
                left_lname: 'Wilson',
                right_fname: 'Alice',
                right_lname: 'Brown',
                left_score: null,
                right_score: null,
                victor: null,
                seed_left: 4,
                seed_right: 5,
                bout_order: 2,
            },
        ],
        finals: [],
    }),
    dbUpdateDEBoutAndAdvanceWinner: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock DEBoutCard component
jest.mock('../../../src/components/DEBoutCard', () => {
    return function MockDEBoutCard(props: any) {
        return (
            <div data-testid="bout-card" onClick={props.onPress}>
                {props.fencerA && `${props.fencerA.fname} ${props.fencerA.lname}`}
                {props.fencerB && ` vs ${props.fencerB.fname} ${props.fencerB.lname}`}
            </div>
        );
    };
});

describe('DoubleEliminationPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        const { getByText } = render(<DoubleEliminationPage />);
        expect(getByText('Loading double elimination brackets...')).toBeTruthy();
    });

    it('renders bracket data after loading', async () => {
        const { getByText } = render(<DoubleEliminationPage />);
        
        await waitFor(() => {
            expect(getByText('Foil Mixed Senior')).toBeTruthy();
            expect(getByText('Double Elimination')).toBeTruthy();
            expect(getByText('Winners Round 1')).toBeTruthy();
        });
    });

    it('switches between bracket tabs', async () => {
        const { getByText } = render(<DoubleEliminationPage />);
        
        await waitFor(() => {
            expect(getByText('Winners Bracket')).toBeTruthy();
        });

        fireEvent.press(getByText('Losers Bracket'));
        expect(getByText('Losers Round 1')).toBeTruthy();

        fireEvent.press(getByText('Finals'));
        expect(getByText('Finals not available yet')).toBeTruthy();
    });

    it('handles bout press for incomplete bout', async () => {
        const { getAllByTestId } = render(<DoubleEliminationPage />);
        
        await waitFor(() => {
            const boutCards = getAllByTestId('bout-card');
            fireEvent.press(boutCards[0]);
        });

        const navigation = require('@react-navigation/native').useNavigation();
        expect(navigation.navigate).toHaveBeenCalledWith('RefereeModule', expect.any(Object));
    });

    it('handles bye bout correctly', async () => {
        // Mock a bye bout
        jest.spyOn(require('../../../src/db/DrizzleDatabaseUtils'), 'dbGetDoubleBracketBouts')
            .mockResolvedValueOnce({
                winners: [{
                    id: 1,
                    bracket_round: 1,
                    lfencer: 1,
                    rfencer: null,
                    left_fname: 'John',
                    left_lname: 'Doe',
                    seed_left: 1,
                }],
                losers: [],
                finals: [],
            });

        const { getAllByTestId } = render(<DoubleEliminationPage />);
        
        await waitFor(() => {
            const boutCards = getAllByTestId('bout-card');
            fireEvent.press(boutCards[0]);
        });

        expect(Alert.alert).toHaveBeenCalledWith('BYE', 'This fencer advances automatically.');
    });

    it('updates bout scores and advances winner', async () => {
        const { getAllByTestId } = render(<DoubleEliminationPage />);
        const dbUpdateDEBoutAndAdvanceWinner = require('../../../src/db/DrizzleDatabaseUtils').dbUpdateDEBoutAndAdvanceWinner;
        
        await waitFor(() => {
            const boutCards = getAllByTestId('bout-card');
            fireEvent.press(boutCards[0]);
        });

        const navigation = require('@react-navigation/native').useNavigation();
        const onSaveScores = navigation.navigate.mock.calls[0][1].onSaveScores;
        
        await onSaveScores(15, 10);
        
        expect(dbUpdateDEBoutAndAdvanceWinner).toHaveBeenCalledWith(1, 15, 10, 1, 2);
    });

    it('handles error when loading brackets', async () => {
        // Mock database error
        jest.spyOn(require('../../../src/db/DrizzleDatabaseUtils'), 'dbGetDoubleBracketBouts')
            .mockRejectedValueOnce(new Error('Database error'));

        const { getByText } = render(<DoubleEliminationPage />);
        
        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to load bracket data');
        });
    });

    it('displays empty state messages when no bouts exist', async () => {
        // Mock empty brackets
        jest.spyOn(require('../../../src/db/DrizzleDatabaseUtils'), 'dbGetDoubleBracketBouts')
            .mockResolvedValueOnce({
                winners: [],
                losers: [],
                finals: [],
            });

        const { getByText } = render(<DoubleEliminationPage />);
        
        await waitFor(() => {
            expect(getByText('No bouts in winners bracket')).toBeTruthy();
        });

        fireEvent.press(getByText('Losers Bracket'));
        expect(getByText('No bouts in losers bracket yet')).toBeTruthy();

        fireEvent.press(getByText('Finals'));
        expect(getByText('Finals not available yet')).toBeTruthy();
    });
});