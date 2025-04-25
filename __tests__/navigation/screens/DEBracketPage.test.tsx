import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DEBracketPage from '../../../src/navigation/screens/DEBracketPage';

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
            isRemote: false,
        },
    }),
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
    }),
}));

// Mock database utilities
jest.mock('../../../src/db/DrizzleDatabaseUtils', () => ({
    dbGetDEBouts: jest.fn().mockResolvedValue([
        {
            id: 1,
            tableof: 8,
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
        },
    ]),
    dbGetRoundsForEvent: jest.fn().mockResolvedValue([
        {
            id: 1,
            type: 'de',
            deformat: 'single',
            detablesize: 8,
        },
    ]),
    dbUpdateDEBoutAndAdvanceWinner: jest.fn(),
    dbGetDETableSize: jest.fn().mockResolvedValue(8),
    dbIsDERoundComplete: jest.fn().mockResolvedValue(false),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('DEBracketPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        const { getByText } = render(<DEBracketPage />);
        expect(getByText('Loading bracket...')).toBeTruthy();
    });

    it('renders bracket data after loading', async () => {
        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(getByText('Foil Mixed Senior DE')).toBeTruthy();
            expect(getByText('Format: Single Elimination')).toBeTruthy();
            expect(getByText('Quarter-Finals')).toBeTruthy();
        });
    });

    it('displays bout information correctly', async () => {
        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(getByText('Doe, John')).toBeTruthy();
            expect(getByText('Smith, Jane')).toBeTruthy();
            expect(getByText('15')).toBeTruthy();
            expect(getByText('13')).toBeTruthy();
        });
    });

    it('handles bout press for incomplete bout', async () => {
        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            const bout = getByText('Doe, John').parentElement?.parentElement?.parentElement;
            fireEvent.press(bout);
        });

        const navigation = require('@react-navigation/native').useNavigation();
        expect(navigation.navigate).toHaveBeenCalledWith('RefereeModule', expect.any(Object));
    });

    it('shows error for invalid bout data', async () => {
        // Mock database to return invalid bout data
        jest.spyOn(require('../../../src/db/DrizzleDatabaseUtils'), 'dbGetDEBouts')
            .mockResolvedValueOnce([
                {
                    id: 1,
                    tableof: 8,
                    // Missing fencer data
                },
            ]);

        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(getByText('Failed to load bracket data.')).toBeTruthy();
        });
    });

    it('displays view results button when round is complete and is final', async () => {
        // Mock round completion check
        jest.spyOn(require('../../../src/db/DrizzleDatabaseUtils'), 'dbIsDERoundComplete')
            .mockResolvedValueOnce(true);

        // Mock to make it the final round
        jest.spyOn(require('@react-navigation/native'), 'useRoute')
            .mockReturnValue({
                params: {
                    event: {
                        id: 1,
                        weapon: 'Foil',
                        gender: 'Mixed',
                        age: 'Senior',
                    },
                    currentRoundIndex: 1, // Last round
                    roundId: 1,
                    isRemote: false,
                },
            });

        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(getByText('View Tournament Results')).toBeTruthy();
        });
    });

    it('handles bye bouts correctly', async () => {
        // Mock a bye bout
        jest.spyOn(require('../../../src/db/DrizzleDatabaseUtils'), 'dbGetDEBouts')
            .mockResolvedValueOnce([
                {
                    id: 1,
                    tableof: 8,
                    lfencer: 1,
                    rfencer: null, // Bye bout
                    left_fname: 'John',
                    left_lname: 'Doe',
                    seed_left: 1,
                },
            ]);

        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(getByText('BYE')).toBeTruthy();
        });

        fireEvent.press(getByText('Doe, John').parentElement?.parentElement?.parentElement);
        expect(Alert.alert).toHaveBeenCalledWith('BYE', 'This fencer advances automatically.');
    });

    it('processes bout results and advances winners', async () => {
        const { getByText } = render(<DEBracketPage />);
        const dbUpdateDEBoutAndAdvanceWinner = require('../../../src/db/DrizzleDatabaseUtils').dbUpdateDEBoutAndAdvanceWinner;
        
        await waitFor(() => {
            const bout = getByText('Doe, John').parentElement?.parentElement?.parentElement;
            fireEvent.press(bout);
        });

        const navigation = require('@react-navigation/native').useNavigation();
        const onSaveScores = navigation.navigate.mock.calls[0][1].onSaveScores;
        
        await onSaveScores(15, 10);
        
        expect(dbUpdateDEBoutAndAdvanceWinner).toHaveBeenCalledWith(1, 15, 10, 1, 2);
    });
});