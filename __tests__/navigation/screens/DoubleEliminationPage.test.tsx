import React from 'react';
import { render } from '@testing-library/react-native';
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
}));

describe('DoubleEliminationPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        const { getByText } = render(<DoubleEliminationPage />);
        expect(getByText('TBD')).toBeTruthy();
    });

    it('applies correct styles', () => {
        const { getByText } = render(<DoubleEliminationPage />);
        const tbdText = getByText('TBD');
        
        // Verify text styling
        expect(tbdText.props.style).toEqual({
            fontSize: 24,
        });

        // Verify container styling
        const container = tbdText.parent.parent;
        expect(container.props.style).toEqual({
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        });
    });
});