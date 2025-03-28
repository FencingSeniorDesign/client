// src/navigation/utils/DENavigationUtil.ts
import { NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Round } from '../navigation/types';


/**
 * Utility function to navigate to the appropriate DE page
 * based on the format of the round
 */
export function navigateToDEPage(
    navigation: NativeStackNavigationProp<RootStackParamList>,
    event: Event,
    round: Round,
    currentRoundIndex: number,
    isRemote: boolean = false
): void {
    // Validate inputs
    if (!round) {
        console.error('navigateToDEPage: round is undefined');
        return;
    }

    if (!event) {
        console.error('navigateToDEPage: event is undefined');
        return;
    }

    if (round.type !== 'de') {
        console.error('This function should only be used for DE rounds');
        return;
    }

    // Navigate based on DE format
    switch (round.deformat) {
        case 'single':
            navigation.navigate('DEBracketPage', {
                event,
                currentRoundIndex,
                roundId: round.id,
                isRemote
            });
            break;
        case 'double':
            navigation.navigate('DoubleEliminationPage', {
                event,
                currentRoundIndex,
                roundId: round.id,
                isRemote
            });
            break;
        case 'compass':
            navigation.navigate('CompassDrawPage', {
                event,
                currentRoundIndex,
                roundId: round.id,
                isRemote
            });
            break;
        default:
            console.log(`DE format not specified, defaulting to single elimination. Format was: ${round.deformat}`);
            // Default to single elimination if format is not recognized
            navigation.navigate('DEBracketPage', {
                event,
                currentRoundIndex,
                roundId: round.id,
                isRemote
            });
    }
}

/**
 * Returns the title to use for the navigation header
 * based on the DE format
 */
export function getDEFormatTitle(format: string | undefined): string {
    switch (format) {
        case 'single':
            return 'Single Elimination';
        case 'double':
            return 'Double Elimination';
        case 'compass':
            return 'Compass Draw';
        default:
            return 'Direct Elimination';
    }
}

/**
 * Returns a brief description of the DE format
 */
export function getDEFormatDescription(format: string | undefined): string {
    switch (format) {
        case 'single':
            return 'Fencers are eliminated after one loss.';
        case 'double':
            return 'Fencers continue in a losers bracket after their first loss.';
        case 'compass':
            return 'Fencers proceed through different brackets based on when they lose.';
        default:
            return 'Direct elimination tournament format.';
    }
}

/**
 * Returns the DE bracket screen name based on format
 */
export function getDEScreenName(format: string | undefined): 'DEBracketPage' | 'DoubleEliminationPage' | 'CompassDrawPage' {
    switch (format) {
        case 'single':
            return 'DEBracketPage';
        case 'double':
            return 'DoubleEliminationPage';
        case 'compass':
            return 'CompassDrawPage';
        default:
            return 'DEBracketPage';
    }
}