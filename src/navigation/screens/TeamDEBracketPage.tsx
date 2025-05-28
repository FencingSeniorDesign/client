// src/navigation/screens/TeamDEBracketPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Team, Round } from '../navigation/types';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { useScoringBoxContext } from '../../networking/ble/ScoringBoxContext';
import { ConnectionState } from '../../networking/ble/types';
import { db } from '../../db/DrizzleClient';
import * as schema from '../../db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { dbGetTeamBracketForRound, dbIsTeamDERoundComplete } from '../../db/utils/teamBracket';
import * as teamUtils from '../../db/utils/team';

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

    const [round, setRound] = useState<Round | null>(null);
    const [bracketData, setBracketData] = useState<TeamDEBracketData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshKey, setRefreshKey] = useState<number>(0);
    const [isRoundComplete, setIsRoundComplete] = useState<boolean>(false);
    const [isFinalRound, setIsFinalRound] = useState<boolean>(false);

    // Fetch round data
    const fetchRoundData = useCallback(async () => {
        try {
            const roundData = await db
                .select()
                .from(schema.rounds)
                .where(eq(schema.rounds.id, roundId))
                .limit(1);
            
            if (roundData.length > 0) {
                setRound(roundData[0] as Round);
            }
        } catch (error) {
            console.error('Error fetching round data:', error);
        }
    }, [roundId]);

    // Fetch bracket data
    const fetchBracketData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Get bracket structure
            const bracket = await dbGetTeamBracketForRound(roundId);
            if (!bracket) {
                throw new Error('Failed to load bracket data');
            }

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
                    // Get team details
                    let teamA = null;
                    let teamB = null;
                    
                    if (match.team_a_id) {
                        teamA = await teamUtils.getTeam(db, match.team_a_id);
                    }
                    if (match.team_b_id) {
                        teamB = await teamUtils.getTeam(db, match.team_b_id);
                    }

                    const isBye = !teamA || !teamB;

                    processedMatches.push({
                        id: match.id,
                        tableOf: tableSize,
                        boutIndex: processedMatches.length,
                        teamA: teamA || undefined,
                        teamB: teamB || undefined,
                        winnerId: match.winner_id,
                        isBye,
                    });
                }

                rounds.push({
                    roundIndex: rounds.length,
                    tableOf: tableSize,
                    matches: processedMatches,
                });
            }

            setBracketData({ rounds });

            // Check if round is complete
            const isComplete = await dbIsTeamDERoundComplete(roundId);
            setIsRoundComplete(isComplete);

            // Check if this is the final round (table of 2)
            const hasFinal = rounds.some(r => r.tableOf === 2);
            setIsFinalRound(hasFinal && rounds.length === 1);

        } catch (error) {
            console.error('Error fetching bracket data:', error);
            Alert.alert(t('common.error'), t('teamDEBracketPage.errorLoadingBracket'));
        } finally {
            setLoading(false);
        }
    }, [roundId, t]);

    useEffect(() => {
        fetchRoundData();
    }, [fetchRoundData]);

    useEffect(() => {
        fetchBracketData();
    }, [fetchBracketData, refreshKey]);

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
            Alert.alert(
                t('common.disconnectBoxPromptTitle'),
                t('common.disconnectBoxPromptMessage'),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                        text: t('common.exitWithoutDisconnecting'),
                        onPress: () => navigateToResults(),
                    },
                    {
                        text: t('common.disconnectAndExit'),
                        onPress: async () => {
                            try {
                                await disconnect();
                                navigateToResults();
                            } catch (error) {
                                console.error('Failed to disconnect:', error);
                                navigateToResults();
                            }
                        },
                        style: 'destructive',
                    },
                ]
            );
        } else {
            navigateToResults();
        }
    };

    const navigateToResults = () => {
        navigation.navigate('RoundResults', {
            roundId,
            eventId: event.id,
            currentRoundIndex,
            isRemote,
        });
    };

    // Render team name or placeholder
    const renderTeamName = (team?: Team, seed?: number, placeholder: string = 'TBD') => {
        if (team) {
            return `${seed ? `(${seed}) ` : ''}${team.name}`;
        }
        return placeholder;
    };

    // Render a single match
    const renderMatch = (match: TeamDEBout) => {
        const isComplete = match.winnerId !== null && match.winnerId !== undefined;
        const teamAWon = match.winnerId === match.teamA?.id;
        const teamBWon = match.winnerId === match.teamB?.id;

        return (
            <TouchableOpacity
                key={match.id}
                style={styles.matchContainer}
                onPress={() => handleMatchPress(match)}
                disabled={match.isBye || isComplete}
            >
                <View style={[styles.teamContainer, teamAWon && styles.winnerContainer]}>
                    <Text style={[styles.teamText, teamAWon && styles.winnerText]}>
                        {renderTeamName(match.teamA, match.seedA)}
                    </Text>
                </View>
                <View style={styles.scoreContainer}>
                    {isComplete && (
                        <Text style={styles.scoreText}>
                            {match.isBye ? 'BYE' : 'Complete'}
                        </Text>
                    )}
                </View>
                <View style={[styles.teamContainer, teamBWon && styles.winnerContainer]}>
                    <Text style={[styles.teamText, teamBWon && styles.winnerText]}>
                        {renderTeamName(match.teamB, match.seedB, match.isBye ? 'BYE' : 'TBD')}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Render a round
    const renderRound = (round: TeamDEBracketRound) => {
        const roundTitle = round.tableOf === 2 
            ? t('teamDEBracketPage.finals')
            : round.tableOf === 4
            ? t('teamDEBracketPage.semifinals')
            : round.tableOf === 8
            ? t('teamDEBracketPage.quarterfinals')
            : t('teamDEBracketPage.roundOf', { count: round.tableOf });

        return (
            <View key={round.roundIndex} style={styles.roundContainer}>
                <Text style={styles.roundTitle}>{roundTitle}</Text>
                <View style={styles.matchesContainer}>
                    {round.matches.map(match => renderMatch(match))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001f3f" />
                <Text style={styles.loadingText}>{t('teamDEBracketPage.loadingBracket')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            
            <ScrollView 
                horizontal={true} 
                contentContainerStyle={styles.scrollContent}
                showsHorizontalScrollIndicator={true}
            >
                {bracketData && bracketData.rounds.map(round => renderRound(round))}
            </ScrollView>

            {isRoundComplete && (
                <TouchableOpacity style={styles.viewResultsButton} onPress={handleViewResults}>
                    <Text style={styles.viewResultsButtonText}>
                        {isFinalRound 
                            ? t('teamDEBracketPage.viewFinalResults')
                            : t('teamDEBracketPage.viewRoundResults')}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    scrollContent: {
        flexDirection: 'row',
        padding: 20,
        minWidth: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    roundContainer: {
        marginHorizontal: 10,
        minWidth: 250,
    },
    roundTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        color: '#001f3f',
    },
    matchesContainer: {
        alignItems: 'center',
    },
    matchContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginVertical: 8,
        width: 230,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    teamContainer: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginVertical: 2,
        backgroundColor: '#f0f0f0',
    },
    winnerContainer: {
        backgroundColor: '#d4edda',
        borderColor: '#c3e6cb',
        borderWidth: 1,
    },
    teamText: {
        fontSize: 16,
        color: '#333',
    },
    winnerText: {
        fontWeight: 'bold',
        color: '#155724',
    },
    scoreContainer: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    scoreText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    viewResultsButton: {
        backgroundColor: '#28a745',
        padding: 15,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    viewResultsButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default TeamDEBracketPage;