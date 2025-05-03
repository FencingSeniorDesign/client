// __tests__/navigation/utils/DENavigationUtil.test.ts
import {
    navigateToDEPage,
    getDEFormatTitle,
    getDEFormatDescription,
    getDEScreenName,
} from '../../../src/navigation/utils/DENavigationUtil';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('react-native', () => ({
    Alert: {
        alert: jest.fn(),
    },
}));

describe('DENavigationUtil', () => {
    // Mock navigation for tests
    const mockNavigation = {
        navigate: jest.fn(),
    };

    // Mock event and round for tests
    const mockEvent = {
        id: 1,
        eventName: 'Test Event',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('navigateToDEPage', () => {
        it('navigates to DEBracketPage for single elimination format', () => {
            const mockRound = {
                id: 1,
                type: 'de',
                deformat: 'single',
            };

            navigateToDEPage(mockNavigation as any, mockEvent as any, mockRound as any, 0);

            expect(mockNavigation.navigate).toHaveBeenCalledWith('DEBracketPage', {
                event: mockEvent,
                currentRoundIndex: 0,
                roundId: 1,
                isRemote: false,
            });
        });

        it('shows alert for double elimination format', () => {
            const mockRound = {
                id: 2,
                type: 'de',
                deformat: 'double',
            };

            navigateToDEPage(mockNavigation as any, mockEvent as any, mockRound as any, 1);

            expect(Alert.alert).toHaveBeenCalledWith(
                'Feature In Development',
                'Double Elimination has been temporarily disabled and will be reimplemented in a future update.',
                [{ text: 'OK' }]
            );
            expect(mockNavigation.navigate).not.toHaveBeenCalled();
        });

        it('shows alert for compass draw format', () => {
            const mockRound = {
                id: 3,
                type: 'de',
                deformat: 'compass',
            };

            navigateToDEPage(mockNavigation as any, mockEvent as any, mockRound as any, 2);

            expect(Alert.alert).toHaveBeenCalledWith(
                'Feature In Development',
                'Compass Draw has been temporarily disabled and will be reimplemented in a future update.',
                [{ text: 'OK' }]
            );
            expect(mockNavigation.navigate).not.toHaveBeenCalled();
        });

        it('defaults to single elimination for unknown/unspecified format', () => {
            const mockRound = {
                id: 4,
                type: 'de',
                deformat: undefined,
            };

            navigateToDEPage(mockNavigation as any, mockEvent as any, mockRound as any, 3);

            expect(mockNavigation.navigate).toHaveBeenCalledWith('DEBracketPage', {
                event: mockEvent,
                currentRoundIndex: 3,
                roundId: 4,
                isRemote: false,
            });
        });

        it('respects isRemote flag', () => {
            const mockRound = {
                id: 5,
                type: 'de',
                deformat: 'single',
            };

            navigateToDEPage(mockNavigation as any, mockEvent as any, mockRound as any, 0, true);

            expect(mockNavigation.navigate).toHaveBeenCalledWith('DEBracketPage', {
                event: mockEvent,
                currentRoundIndex: 0,
                roundId: 5,
                isRemote: true,
            });
        });

        it('handles invalid inputs gracefully', () => {
            // Test with undefined round
            navigateToDEPage(mockNavigation as any, mockEvent as any, undefined as any, 0);
            expect(mockNavigation.navigate).not.toHaveBeenCalled();

            // Test with undefined event
            navigateToDEPage(
                mockNavigation as any,
                undefined as any,
                { id: 1, type: 'de', deformat: 'single' } as any,
                0
            );
            expect(mockNavigation.navigate).not.toHaveBeenCalled();

            // Test with non-DE round
            navigateToDEPage(mockNavigation as any, mockEvent as any, { id: 1, type: 'pool' } as any, 0);
            expect(mockNavigation.navigate).not.toHaveBeenCalled();
        });
    });

    describe('getDEFormatTitle', () => {
        it('returns correct title for each format', () => {
            expect(getDEFormatTitle('single')).toBe('Single Elimination');
            expect(getDEFormatTitle('double')).toBe('Double Elimination');
            expect(getDEFormatTitle('compass')).toBe('Compass Draw');
            expect(getDEFormatTitle(undefined)).toBe('Direct Elimination');
            expect(getDEFormatTitle('unknown')).toBe('Direct Elimination');
        });
    });

    describe('getDEFormatDescription', () => {
        it('returns correct description for each format', () => {
            expect(getDEFormatDescription('single')).toBe('Fencers are eliminated after one loss.');
            expect(getDEFormatDescription('double')).toBe(
                'Fencers continue in a losers bracket after their first loss.'
            );
            expect(getDEFormatDescription('compass')).toBe(
                'Fencers proceed through different brackets based on when they lose.'
            );
            expect(getDEFormatDescription(undefined)).toBe('Direct elimination tournament format.');
            expect(getDEFormatDescription('unknown')).toBe('Direct elimination tournament format.');
        });
    });

    describe('getDEScreenName', () => {
        it('returns correct screen name for each format', () => {
            expect(getDEScreenName('single')).toBe('DEBracketPage');
            expect(getDEScreenName('double')).toBe('DoubleEliminationPage');
            expect(getDEScreenName('compass')).toBe('CompassDrawPage');
            expect(getDEScreenName(undefined)).toBe('DEBracketPage');
            expect(getDEScreenName('unknown')).toBe('DEBracketPage');
        });
    });
});
