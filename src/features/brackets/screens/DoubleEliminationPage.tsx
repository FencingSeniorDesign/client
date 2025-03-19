// src/navigation/screens/DoubleEliminationPage.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Round } from '../navigation/types';
import DEBoutCard from '../components/DEBoutCard';
import {
    dbGetDEBouts,
    dbGetRoundsForEvent,
    dbUpdateDEBoutAndAdvanceWinner,
    dbGetDoubleBracketBouts,
} from '../../db/TournamentDatabaseUtils';

type DoubleEliminationPageParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
};

type DoubleEliminationPageRouteProp = RouteProp<{ params: DoubleEliminationPageParams }, 'params'>;
type DoubleEliminationPageNavProp = NativeStackNavigationProp<RootStackParamList, 'DoubleEliminationPage'>;

const DoubleEliminationPage: React.FC = () => {
    const route = useRoute<DoubleEliminationPageRouteProp>();
    const navigation = useNavigation<DoubleEliminationPageNavProp>();
    const { event, currentRoundIndex, roundId } = route.params;

    const [round, setRound] = useState<Round | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshKey, setRefreshKey] = useState<number>(0);

    const [winnersBracket, setWinnersBracket] = useState<any[]>([]);
    const [losersBracket, setLosersBracket] = useState<any[]>([]);
    const [finalsBracket, setFinalsBracket] = useState<any[]>([]);

    const [selectedTab, setSelectedTab] = useState<'winners' | 'losers' | 'finals'>('winners');

    useEffect(() => {
        async function fetchBrackets() {
            try {
                setLoading(true);

                // Get round info
                const rounds = await dbGetRoundsForEvent(event.id);
                const currentRound = rounds.find(r => r.id === roundId);

                if (!currentRound) {
                    throw new Error('Round not found');
                }

                setRound(currentRound);

                // Fetch double elimination bracket data
                const { winners, losers, finals } = await dbGetDoubleBracketBouts(roundId);

                setWinnersBracket(winners);
                setLosersBracket(losers);
                setFinalsBracket(finals);

            } catch (error) {
                console.error('Error loading double elimination brackets:', error);
                Alert.alert('Error', 'Failed to load bracket data');
            } finally {
                setLoading(false);
            }
        }

        fetchBrackets();
    }, [event, roundId, refreshKey]);

// Modified handleBoutPress function for DoubleEliminationPage.tsx

    const handleBoutPress = (bout: any) => {
        // First check if this is a bye match (one fencer present, one missing)
        const hasFencerA = !!bout.lfencer;
        const hasFencerB = !!bout.rfencer;

        // True bye condition: exactly one fencer is present and has a victor set
        if ((hasFencerA && !hasFencerB) || (!hasFencerA && hasFencerB)) {
            Alert.alert('BYE', 'This fencer advances automatically.');
            return;
        }

        // If neither fencer is set, this bout is waiting for previous results
        if (!hasFencerA && !hasFencerB) {
            Alert.alert('Not Ready', 'This bout is waiting for fencers from previous rounds.');
            return;
        }

        // If we get here, both fencers are set and the bout is valid
        navigation.navigate('RefereeModule', {
            boutIndex: bout.bout_order || 0,
            fencer1Name: `${bout.left_fname} ${bout.left_lname}`,
            fencer2Name: `${bout.right_fname} ${bout.right_lname}`,
            currentScore1: bout.left_score || 0,
            currentScore2: bout.right_score || 0,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    // Update bout scores and advance winner
                    await dbUpdateDEBoutAndAdvanceWinner(
                        bout.id,
                        score1,
                        score2,
                        bout.lfencer,
                        bout.rfencer
                    );

                    // Refresh to show updated scores and advancement
                    setRefreshKey(prev => prev + 1);
                } catch (error) {
                    console.error('Error updating bout scores:', error);
                    Alert.alert('Error', 'Failed to save scores.');
                }
            },
        });
    };

    // Group bouts by round for better display
    const groupBoutsByRound = (bouts: any[]) => {
        const grouped: Record<number, any[]> = {};

        bouts.forEach(bout => {
            const round = bout.bracket_round || 1;
            if (!grouped[round]) {
                grouped[round] = [];
            }
            grouped[round].push(bout);
        });

        return Object.entries(grouped)
            .sort(([roundA], [roundB]) => parseInt(roundA) - parseInt(roundB))
            .map(([round, bouts]) => ({
                round: parseInt(round),
                bouts
            }));
    };

// Modified renderBout function for DoubleEliminationPage.tsx

    const renderBout = (bout: any, bracketType: 'winners' | 'losers' | 'finals') => {
        // Determine if this is a bye match (one fencer present, one missing)
        const hasFencerA = !!bout.lfencer;
        const hasFencerB = !!bout.rfencer;
        const isBye = (hasFencerA && !hasFencerB) || (!hasFencerA && hasFencerB);

        // Add the isBye property to the bout object so handleBoutPress can use it
        bout.isBye = isBye;

        return (
            <DEBoutCard
                key={bout.id}
                id={bout.id}
                fencerA={bout.lfencer ? {
                    id: bout.lfencer,
                    fname: bout.left_fname || '',
                    lname: bout.left_lname || '',
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0
                } : undefined}
                fencerB={bout.rfencer ? {
                    id: bout.rfencer,
                    fname: bout.right_fname || '',
                    lname: bout.right_lname || '',
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0
                } : undefined}
                scoreA={bout.left_score !== null ? bout.left_score : undefined}
                scoreB={bout.right_score !== null ? bout.right_score : undefined}
                seedA={bout.seed_left}
                seedB={bout.seed_right}
                winner={bout.victor}
                isBye={isBye}
                bracketType={bracketType}
                onPress={() => handleBoutPress(bout)}
            />
        );
    };
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading double elimination brackets...</Text>
            </View>
        );
    }

    // Group bouts by round
    const groupedWinners = groupBoutsByRound(winnersBracket);
    const groupedLosers = groupBoutsByRound(losersBracket);
    const groupedFinals = groupBoutsByRound(finalsBracket);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {event.weapon} {event.gender} {event.age}
            </Text>
            <Text style={styles.subtitle}>Double Elimination</Text>

            {/* Tab selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'winners' && styles.activeTab]}
                    onPress={() => setSelectedTab('winners')}
                >
                    <Text style={[styles.tabText, selectedTab === 'winners' && styles.activeTabText]}>
                        Winners Bracket
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'losers' && styles.activeTab]}
                    onPress={() => setSelectedTab('losers')}
                >
                    <Text style={[styles.tabText, selectedTab === 'losers' && styles.activeTabText]}>
                        Losers Bracket
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'finals' && styles.activeTab]}
                    onPress={() => setSelectedTab('finals')}
                >
                    <Text style={[styles.tabText, selectedTab === 'finals' && styles.activeTabText]}>
                        Finals
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.bracketContainer}>
                {selectedTab === 'winners' && (
                    <>
                        {groupedWinners.map(group => (
                            <View key={`winners-${group.round}`} style={styles.roundContainer}>
                                <Text style={styles.roundTitle}>
                                    Winners Round {group.round}
                                </Text>
                                {group.bouts.map(bout => renderBout(bout, 'winners'))}
                            </View>
                        ))}
                        {groupedWinners.length === 0 && (
                            <Text style={styles.emptyText}>No bouts in winners bracket</Text>
                        )}
                    </>
                )}

                {selectedTab === 'losers' && (
                    <>
                        {groupedLosers.map(group => (
                            <View key={`losers-${group.round}`} style={styles.roundContainer}>
                                <Text style={styles.roundTitle}>
                                    Losers Round {group.round}
                                </Text>
                                {group.bouts.map(bout => renderBout(bout, 'losers'))}
                            </View>
                        ))}
                        {groupedLosers.length === 0 && (
                            <Text style={styles.emptyText}>No bouts in losers bracket yet</Text>
                        )}
                    </>
                )}

                {selectedTab === 'finals' && (
                    <>
                        {groupedFinals.map(group => (
                            <View key={`finals-${group.round}`} style={styles.roundContainer}>
                                <Text style={styles.roundTitle}>
                                    {group.round === 1 ? 'Finals' : 'Bracket Reset'}
                                </Text>
                                {group.bouts.map(bout => renderBout(bout, 'finals'))}
                            </View>
                        ))}
                        {groupedFinals.length === 0 && (
                            <Text style={styles.emptyText}>Finals not available yet</Text>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 15,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 5,
        color: '#666',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        marginBottom: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    bracketContainer: {
        flex: 1,
        padding: 10,
    },
    roundContainer: {
        marginBottom: 20,
    },
    roundTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 30,
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    }
});

export default DoubleEliminationPage;