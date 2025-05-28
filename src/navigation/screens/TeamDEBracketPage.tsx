// src/navigation/screens/TeamDEBracketPage.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Team, Round } from '../navigation/types';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { useScoringBoxContext } from '../../networking/ble/ScoringBoxContext';
import { ConnectionState } from '../../networking/ble/types';
import { useTeamBracket, useTeamDERoundComplete, useRound, useTeams } from '../../data/TournamentDataHooks';

type TeamDEBracketPageParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
};

type TeamDEBracketPageRouteProp = RouteProp<{ params: TeamDEBracketPageParams }, 'params'>;
type TeamDEBracketPageNavProp = NativeStackNavigationProp<RootStackParamList>;

interface TeamDEBout {
    id: number;
    tableOf: number;
    boutIndex: number;
    teamA?: Team;
    teamB?: Team;
    scoreA?: number;
    scoreB?: number;
    winnerId?: number;
    isBye?: boolean;
    seedA?: number;
    seedB?: number;
}

interface TeamDEBracketRound {
    roundIndex: number;
    tableOf: number;
    matches: TeamDEBout[];
}

interface TeamDEBracketData {
    rounds: TeamDEBracketRound[];
}

const TeamDEBracketPage: React.FC = () => {
    const route = useRoute<TeamDEBracketPageRouteProp>();
    const navigation = useNavigation<TeamDEBracketPageNavProp>();
    const { event, currentRoundIndex, roundId, isRemote = false } = route.params;
    const { t } = useTranslation();
    const { connectionState, disconnect } = useScoringBoxContext();

    // Use React Query hooks
    const { data: round } = useRound(roundId);
    const { data: bracket, isLoading: bracketLoading, refetch: refetchBracket } = useTeamBracket(roundId);
    const { data: isRoundComplete = false } = useTeamDERoundComplete(roundId);
    const { data: teams = [] } = useTeams(event.id);

    // Create a team lookup map
    const teamLookup = useMemo(() => {
        const map = new Map<number, Team>();
        teams.forEach(team => {
            if (team.id) map.set(team.id, team);
        });
        return map;
    }, [teams]);

    // Process bracket data into display format
    const bracketData = useMemo<TeamDEBracketData | null>(() => {
        if (!bracket || !bracket.bouts) return null;

        // Organize bouts by table size
        const boutsByTable = new Map<number, any[]>();

        for (const bout of bracket.bouts) {
            const tableOf = bout.table_of || 0;
            if (!boutsByTable.has(tableOf)) {
                boutsByTable.set(tableOf, []);
            }
            boutsByTable.get(tableOf)!.push(bout);
        }

        // Build rounds
        const rounds: TeamDEBracketRound[] = [];
        const tableSizes = Array.from(boutsByTable.keys()).sort((a, b) => b - a);

        for (const tableSize of tableSizes) {
            const matches = boutsByTable.get(tableSize) || [];
            const processedMatches: TeamDEBout[] = [];

            for (const match of matches) {
                const teamA = match.team_a_id ? teamLookup.get(match.team_a_id) : undefined;
                const teamB = match.team_b_id ? teamLookup.get(match.team_b_id) : undefined;
                const isBye = !match.team_a_id || !match.team_b_id;

                processedMatches.push({
                    id: match.id,
                    tableOf: tableSize,
                    boutIndex: processedMatches.length,
                    teamA,
                    teamB,
                    scoreA: match.team_a_score,
                    scoreB: match.team_b_score,
                    winnerId: match.winner_id,
                    isBye,
                    seedA: teamA?.seed,
                    seedB: teamB?.seed,
                });
            }

            rounds.push({
                roundIndex: rounds.length,
                tableOf: tableSize,
                matches: processedMatches,
            });
        }

        return { rounds };
    }, [bracket, teamLookup]);

    const isFinalRound = useMemo(() => {
        if (!bracketData) return false;
        const hasFinal = bracketData.rounds.some(r => r.tableOf === 2);
        return hasFinal && bracketData.rounds.length === 1;
    }, [bracketData]);

    // Handle match press
    const handleMatchPress = (match: TeamDEBout) => {
        if (match.isBye || !match.teamA || !match.teamB) {
            return;
        }

        // Navigate directly to the appropriate team bout page
        if (event.team_format === 'NCAA') {
            navigation.navigate('NCAATeamBoutPage' as any, {
                teamBoutId: match.id,
                event,
                isRemote,
            });
        } else {
            navigation.navigate('RelayTeamBoutPage' as any, {
                teamBoutId: match.id,
                event,
                isRemote,
            });
        }
    };

    // Handle navigation to round results
    const handleViewResults = () => {
        if (connectionState === ConnectionState.CONNECTED) {
            Alert.alert(t('common.disconnectBoxPromptTitle'), t('common.disconnectBoxPromptMessage'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.disconnectAndExit'),
                    onPress: () => {
                        disconnect();
                        navigateToResults();
                    },
                },
                {
                    text: t('common.exitWithoutDisconnecting'),
                    onPress: navigateToResults,
                },
            ]);
        } else {
            navigateToResults();
        }
    };

    const navigateToResults = () => {
        if (isFinalRound) {
            navigation.navigate('TournamentResultsPage', { event });
        } else {
            navigation.navigate('RoundResults', { event, roundIndex: currentRoundIndex, isRemote });
        }
    };

    // Loading state
    if (bracketLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001f3f" />
                <Text style={styles.loadingText}>{t('teamDEBracketPage.loadingBracket')}</Text>
            </View>
        );
    }

    if (!bracketData || bracketData.rounds.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{t('teamDEBracketPage.noBoutsFound')}</Text>
            </View>
        );
    }

    // Render a match
    const renderMatch = (match: TeamDEBout) => {
        let teamAName = 'TBD';
        if (match.teamA) {
            teamAName = `${match.teamA.name}`;
        }

        let teamBName = 'TBD';
        if (match.teamB) {
            teamBName = `${match.teamB.name}`;
        }

        // Determine styles based on match status
        const matchCompleted = match.winnerId !== undefined && match.winnerId !== null;
        const isTBD = !match.teamA && !match.teamB;
        // A match is a true BYE if it's marked as such or has exactly one team
        const isActualBye = match.isBye || (!match.teamA && match.teamB) || (match.teamA && !match.teamB);

        // Determine winner (if completed)
        const teamAWon = match.winnerId === match.teamA?.id;
        const teamBWon = match.winnerId === match.teamB?.id;

        return (
            <TouchableOpacity
                style={[
                    styles.matchContainer,
                    isActualBye && styles.byeMatch,
                    isTBD && styles.tbdMatch,
                    matchCompleted && styles.completedMatch,
                ]}
                onPress={() => handleMatchPress(match)}
                disabled={isActualBye || isTBD}
            >
                <View style={styles.teamRow}>
                    <View style={styles.teamInfo}>
                        <Text
                            style={[
                                styles.seedText,
                                match.seedA !== undefined && match.teamA !== undefined && styles.seedVisible,
                            ]}
                        >
                            {match.seedA !== undefined && match.teamA !== undefined ? `(${match.seedA})` : ''}
                        </Text>
                        <Text
                            style={[
                                styles.teamName,
                                teamAWon && styles.winnerText,
                                !match.teamA && (isTBD ? styles.tbdText : styles.byeText),
                            ]}
                        >
                            {match.teamA ? teamAName : isTBD ? t('teamDEBracketPage.tbd') : t('teamDEBracketPage.bye')}
                        </Text>
                    </View>
                    <Text style={styles.teamScore}>{match.scoreA !== undefined ? match.scoreA : '-'}</Text>
                </View>
                <View style={styles.teamRow}>
                    <View style={styles.teamInfo}>
                        <Text
                            style={[
                                styles.seedText,
                                match.seedB !== undefined && match.teamB !== undefined && styles.seedVisible,
                            ]}
                        >
                            {match.seedB !== undefined && match.teamB !== undefined ? `(${match.seedB})` : ''}
                        </Text>
                        <Text
                            style={[
                                styles.teamName,
                                teamBWon && styles.winnerText,
                                !match.teamB && (isTBD ? styles.tbdText : styles.byeText),
                            ]}
                        >
                            {match.teamB ? teamBName : isTBD ? t('teamDEBracketPage.tbd') : t('teamDEBracketPage.bye')}
                        </Text>
                    </View>
                    <Text style={styles.teamScore}>{match.scoreB !== undefined ? match.scoreB : '-'}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Render a round
    const renderRound = (round: TeamDEBracketRound) => {
        const roundTitle = getRoundName(round.tableOf, t);

        return (
            <View key={round.roundIndex} style={styles.roundContainer}>
                <Text style={styles.roundTitle}>{roundTitle}</Text>
                <View style={styles.matchesContainer}>
                    {round.matches.map((match, matchIndex) => (
                        <View key={matchIndex} style={styles.matchWrapper}>
                            {renderMatch(match)}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // Helper function to get round name based on tableOf value
    function getRoundName(tableOf: number, t: (key: string, options?: any) => string): string {
        switch (tableOf) {
            case 2:
                return t('teamDEBracketPage.finals');
            case 4:
                return t('teamDEBracketPage.semifinals');
            case 8:
                return t('teamDEBracketPage.quarterfinals');
            case 16:
                return t('teamDEBracketPage.roundOf16');
            case 32:
                return t('teamDEBracketPage.roundOf32');
            case 64:
                return t('teamDEBracketPage.roundOf64');
            case 128:
                return t('teamDEBracketPage.roundOf128');
            default:
                return t('teamDEBracketPage.roundOfX', { x: tableOf });
        }
    }

    return (
        <ScrollView style={styles.container}>
            <BLEStatusBar compact={true} />
            <Text style={styles.title}>
                {event.weapon} {event.gender} {event.age} Team DE
            </Text>

            {bracketData && bracketData.rounds.map(round => renderRound(round))}

            {isRoundComplete && (
                <TouchableOpacity style={styles.viewResultsButton} onPress={handleViewResults}>
                    <Text style={styles.viewResultsButtonText}>
                        {isFinalRound
                            ? t('teamDEBracketPage.viewFinalResults')
                            : t('teamDEBracketPage.viewRoundResults')}
                    </Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 15,
        color: '#001f3f',
    },
    roundContainer: {
        marginBottom: 25,
    },
    roundTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
        textAlign: 'center',
    },
    matchesContainer: {
        gap: 12,
    },
    matchWrapper: {
        marginHorizontal: 5,
    },
    matchContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    byeMatch: {
        opacity: 0.7,
        backgroundColor: '#f9f9f9',
    },
    tbdMatch: {
        opacity: 0.6,
        borderStyle: 'dashed',
    },
    completedMatch: {
        backgroundColor: '#e8f5e9',
        borderColor: '#4caf50',
    },
    teamRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    teamInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    seedText: {
        fontSize: 12,
        color: '#666',
        marginRight: 6,
        opacity: 0,
    },
    seedVisible: {
        opacity: 1,
    },
    teamName: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    teamScore: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
        minWidth: 30,
        textAlign: 'center',
    },
    winnerText: {
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    byeText: {
        fontStyle: 'italic',
        color: '#666',
    },
    tbdText: {
        fontStyle: 'italic',
        color: '#999',
    },
    viewResultsButton: {
        backgroundColor: '#001f3f',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 8,
        marginVertical: 20,
        alignSelf: 'center',
    },
    viewResultsButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 50,
    },
});

export default TeamDEBracketPage;
