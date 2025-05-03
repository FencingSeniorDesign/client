// __tests__/navigation/utils/BracketFormats.test.ts
import {
    getBracketSize,
    getRoundName,
    getCompassDescription,
    getDEPageForFormat,
    DE_FORMATS,
} from '../../../src/navigation/utils/BracketFormats';

describe('BracketFormats Utilities', () => {
    describe('DE_FORMATS', () => {
        it('contains the expected formats', () => {
            expect(DE_FORMATS).toHaveLength(3);

            // Check single elimination format
            const singleFormat = DE_FORMATS.find(format => format.id === 'single');
            expect(singleFormat).toBeDefined();
            expect(singleFormat?.name).toBe('Single Elimination');
            expect(singleFormat?.minFencers).toBe(2);

            // Check double elimination format
            const doubleFormat = DE_FORMATS.find(format => format.id === 'double');
            expect(doubleFormat).toBeDefined();
            expect(doubleFormat?.name).toBe('Double Elimination');
            expect(doubleFormat?.minFencers).toBe(4);

            // Check compass draw format
            const compassFormat = DE_FORMATS.find(format => format.id === 'compass');
            expect(compassFormat).toBeDefined();
            expect(compassFormat?.name).toBe('Compass Draw');
            expect(compassFormat?.minFencers).toBe(4);
        });
    });

    describe('getBracketSize', () => {
        it('returns the correct power of 2 bracket sizes', () => {
            expect(getBracketSize(1)).toBe(2);
            expect(getBracketSize(2)).toBe(2);
            expect(getBracketSize(3)).toBe(4);
            expect(getBracketSize(4)).toBe(4);
            expect(getBracketSize(5)).toBe(8);
            expect(getBracketSize(8)).toBe(8);
            expect(getBracketSize(9)).toBe(16);
            expect(getBracketSize(16)).toBe(16);
            expect(getBracketSize(17)).toBe(32);
            expect(getBracketSize(32)).toBe(32);
            expect(getBracketSize(33)).toBe(64);
            expect(getBracketSize(64)).toBe(64);
            expect(getBracketSize(65)).toBe(128);
            expect(getBracketSize(128)).toBe(128);
            expect(getBracketSize(129)).toBe(256);
            expect(getBracketSize(256)).toBe(256);
        });
    });

    describe('getRoundName', () => {
        it('returns correct round names based on bracket size and round index', () => {
            // Finals
            expect(getRoundName(8, 2)).toBe('Finals');
            expect(getRoundName(16, 3)).toBe('Finals');
            expect(getRoundName(32, 4)).toBe('Finals');

            // Semi-Finals
            expect(getRoundName(8, 1)).toBe('Semi-Finals');
            expect(getRoundName(16, 2)).toBe('Semi-Finals');
            expect(getRoundName(32, 3)).toBe('Semi-Finals');

            // Quarter-Finals
            expect(getRoundName(8, 0)).toBe('Quarter-Finals');
            expect(getRoundName(16, 1)).toBe('Quarter-Finals');
            expect(getRoundName(32, 2)).toBe('Quarter-Finals');

            // Larger brackets
            expect(getRoundName(16, 0)).toBe('Round of 16');
            expect(getRoundName(32, 1)).toBe('Round of 16');
            expect(getRoundName(32, 0)).toBe('Round of 32');
            expect(getRoundName(64, 0)).toBe('Round of 64');
            expect(getRoundName(128, 0)).toBe('Round of 128');
            expect(getRoundName(256, 0)).toBe('Round of 256');

            // Generic round name for other cases
            expect(getRoundName(4, 0)).toBe('Semi-Finals');
        });

        it('handles finals rounds in double elimination', () => {
            expect(getRoundName(64, 0, true)).toBe('Finals');
            expect(getRoundName(64, 1, true)).toBe('Bracket Reset');
        });
    });

    describe('getCompassDescription', () => {
        it('returns correct descriptions for compass directions', () => {
            expect(getCompassDescription('east')).toBe('Main Bracket (Original Seeding)');
            expect(getCompassDescription('north')).toBe('First-Round Repechage');
            expect(getCompassDescription('west')).toBe('Second-Round Repechage');
            expect(getCompassDescription('south')).toBe('Consolation Bracket');
        });
    });

    describe('getDEPageForFormat', () => {
        it('returns correct page components for different formats', () => {
            expect(getDEPageForFormat('single')).toBe('DEBracketPage');
            expect(getDEPageForFormat('double')).toBe('DoubleEliminationPage');
            expect(getDEPageForFormat('compass')).toBe('CompassDrawPage');
            expect(getDEPageForFormat('unknown')).toBe('DEBracketPage'); // Default fallback
        });
    });
});
