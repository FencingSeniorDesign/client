import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DEBracketPage from '../../../src/navigation/screens/DEBracketPage';

// Mock the event data
const mockEvent = {
    id: 1,
    weapon: 'Foil',
    gender: 'Mixed',
    age: 'Senior',
};

// Mock navigation with mocked functions we can reference
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useRoute: () => ({
        params: {
            event: mockEvent,
            currentRoundIndex: 0,
            roundId: 1,
        },
    }),
    useNavigation: () => ({
        navigate: mockNavigate,
        goBack: mockGoBack,
    }),
}));

// Mock Alert
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock database calls
const mockRound = {
    id: 1,
    type: 'de',
    deformat: 'single',
    detablesize: 8,
};

const mockBouts = [{
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
}];

jest.mock('../../../src/db/DrizzleDatabaseUtils', () => ({
    dbGetRoundsForEvent: jest.fn().mockResolvedValue([mockRound]),
    dbGetDEBouts: jest.fn().mockResolvedValue(mockBouts),
    dbIsDERoundComplete: jest.fn().mockResolvedValue(false),
    dbUpdateDEBoutAndAdvanceWinner: jest.fn().mockResolvedValue(true),
    dbGetDETableSize: jest.fn().mockResolvedValue(8),
}));

describe('DEBracketPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockNavigate.mockClear();
        mockGoBack.mockClear();
        mockAlert.mockClear();
    });

    it('renders loading state initially', () => {
        const { getByText } = render(<DEBracketPage />);
        expect(getByText('Loading bracket...')).toBeTruthy();
    });

    it('shows error for invalid bout data', async () => {
        const { dbGetDEBouts } = require('../../../src/db/DrizzleDatabaseUtils');
        dbGetDEBouts.mockRejectedValueOnce(new Error('Failed to load'));

        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(getByText('Failed to load bracket data.')).toBeTruthy();
        });
    });

    it('handles error state when round not found', async () => {
        const { dbGetRoundsForEvent } = require('../../../src/db/DrizzleDatabaseUtils');
        dbGetRoundsForEvent.mockResolvedValueOnce([]);

        const { getByText } = render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(getByText('Failed to load bracket data.')).toBeTruthy();
        });
    });

    it('shows loading indicator', () => {
        const { getByText } = render(<DEBracketPage />);
        expect(getByText('Loading bracket...')).toBeTruthy();
    });

    it('handles navigation back on non-DE round', async () => {
        const { dbGetRoundsForEvent } = require('../../../src/db/DrizzleDatabaseUtils');
        dbGetRoundsForEvent.mockResolvedValueOnce([{
            id: 1,
            type: 'pool', // Not a DE round
        }]);

        render(<DEBracketPage />);
        
        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Error', 'This is not a DE round.');
            expect(mockGoBack).toHaveBeenCalled();
        }, { timeout: 1000 });
    });
});