// src/navigation/utils/BracketFormats.ts
// Utility functions and constants for DE bracket formats

/**
 * Information about each DE format for UI display and decision making
 */
export interface DEFormatInfo {
    id: 'single' | 'double' | 'compass';
    name: string;
    description: string;
    minFencers: number;
    maxFencers: number;
}

/**
 * Available DE format options with descriptions
 */
export const DE_FORMATS: DEFormatInfo[] = [
    {
        id: 'single',
        name: 'Single Elimination',
        description: 'Standard tournament bracket. Fencers are eliminated after one loss.',
        minFencers: 2,
        maxFencers: 256,
    },
    {
        id: 'double',
        name: 'Double Elimination',
        description: 'Fencers continue in a losers bracket after their first loss, providing a second chance.',
        minFencers: 4,
        maxFencers: 64, // Practical upper limit for a tournament app
    },
    {
        id: 'compass',
        name: 'Compass Draw',
        description:
            'Four separate brackets (East, North, West, South) based on when fencers lose, allowing all to fence a full set of bouts.',
        minFencers: 4,
        maxFencers: 64,
    },
];

/**
 * Get tournament bracket size given number of fencers
 * @param fencerCount Number of fencers in bracket
 * @returns Appropriate bracket size (nearest power of 2 that is >= fencerCount)
 */
export function getBracketSize(fencerCount: number): number {
    let size = 2;
    while (size < fencerCount) {
        size *= 2;
    }
    return size;
}

/**
 * Get round name based on bracket size and round index
 * @param tableOf Table size for the bracket (e.g., 64 for a bracket of 64)
 * @param roundIndex Index of the round (0-based)
 * @param isFinals Whether this is a finals round in a double elimination tournament
 * @returns Human-readable name for the round
 */
export function getRoundName(tableOf: number, roundIndex: number, isFinals: boolean = false): string {
    if (isFinals) {
        return roundIndex === 0 ? 'Finals' : 'Bracket Reset';
    }

    const roundsTotal = Math.log2(tableOf);
    const reverseIndex = roundsTotal - roundIndex - 1;

    switch (reverseIndex) {
        case 0:
            return 'Finals';
        case 1:
            return 'Semi-Finals';
        case 2:
            return 'Quarter-Finals';
        case 3:
            return 'Round of 16';
        case 4:
            return 'Round of 32';
        case 5:
            return 'Round of 64';
        case 6:
            return 'Round of 128';
        case 7:
            return 'Round of 256';
        default:
            return `Round ${roundIndex + 1}`;
    }
}

/**
 * Get compass direction name
 * @param direction Compass direction
 * @returns Human-readable description of the bracket
 */
export function getCompassDescription(direction: 'east' | 'north' | 'west' | 'south'): string {
    switch (direction) {
        case 'east':
            return 'Main Bracket (Original Seeding)';
        case 'north':
            return 'First-Round Repechage';
        case 'west':
            return 'Second-Round Repechage';
        case 'south':
            return 'Consolation Bracket';
    }
}

/**
 * Get the appropriate page to navigate to for a DE round
 * @param format DE format
 * @returns Name of the screen component to navigate to
 */
export function getDEPageForFormat(format: string): 'DEBracketPage' | 'DoubleEliminationPage' | 'CompassDrawPage' {
    switch (format) {
        case 'single':
            return 'DEBracketPage';
        case 'double':
            return 'DoubleEliminationPage';
        case 'compass':
            return 'CompassDrawPage';
        default:
            return 'DEBracketPage'; // Default to single elimination
    }
}
