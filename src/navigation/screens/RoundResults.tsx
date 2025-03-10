// src/navigation/screens/RoundResults.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Fencer, Round, Event } from '../navigation/types';
import {
    dbGetPoolsForRound,
    dbGetBoutsForPool,
    dbGetRoundsForEvent,
    dbInitializeRound,
    dbGetFencersInEventById
} from '../../db/TournamentDatabaseUtils';
import { navigateToDEPage } from '../utils/DENavigationUtil';

interface FencerStats {
    fencer: Fencer;
    boutsCount: number;
    wins: number;
    touchesScored: number;
    touchesReceived: number;
    winRate: number;
    indicator: number;
}

interface PoolResult {
    poolid: number;
    stats: FencerStats[];
}

type RoundResultsRouteProp = RouteProp<RootStackParamList, 'RoundResults'>;

const RoundResults: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RoundResultsRouteProp>();
    const { roundId, eventId, currentRoundIndex } = route.params;
    const [poolResults, setPoolResults] = useState<PoolResult[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [nextRound, setNextRound] = useState<Round | null>(null);
    const [hasNextRound, setHasNextRound] = useState<boolean>(false);
    const [nextRoundStarted, setNextRoundStarted] = useState<boolean>(false);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // Fetch pool results for this round
                const pools = await dbGetPoolsForRound(roundId);
                const results: PoolResult[] = [];

                for (const pool of pools) {
                    const statsMap = new Map<number, FencerStats>();
                    pool.fencers.forEach(fencer => {
                        if (fencer.id !== undefined) {
                            statsMap.set(fencer.id, {
                                fencer,
                                boutsCount: 0,
                                wins: 0,
                                touchesScored: 0,
                                touchesReceived: 0,
                                winRate: 0,
                                indicator: 0,
                            });
                        }
                    });

                    const bouts = await dbGetBoutsForPool(roundId, pool.poolid);
                    bouts.forEach((bout: any) => {
                        const leftId = bout.left_fencerid;
                        const rightId = bout.right_fencerid;
                        const leftScore = bout.left_score ?? 0;
                        const rightScore = bout.right_score ?? 0;

                        if (statsMap.has(leftId)) {
                            const leftStats = statsMap.get(leftId)!;
                            leftStats.boutsCount += 1;
                            leftStats.touchesScored += leftScore;
                            leftStats.touchesReceived += rightScore;
                            if (leftScore > rightScore) {
                                leftStats.wins += 1;
                            }
                        }
                        if (statsMap.has(rightId)) {
                            const rightStats = statsMap.get(rightId)!;
                            rightStats.boutsCount += 1;
                            rightStats.touchesScored += rightScore;
                            rightStats.touchesReceived += leftScore;
                            if (rightScore > leftScore) {
                                rightStats.wins += 1;
                            }
                        }
                    });

                    const stats: FencerStats[] = [];
                    statsMap.forEach(stat => {
                        stat.winRate = stat.boutsCount > 0 ? (stat.wins / stat.boutsCount) * 100 : 0;
                        stat.indicator = stat.touchesScored - stat.touchesReceived;
                        stats.push(stat);
                    });
                    stats.sort((a, b) => b.winRate - a.winRate);
                    results.push({
                        poolid: pool.poolid,
                        stats,
                    });
                }
                setPoolResults(results);

                // Fetch round data for next round determination
                const allRounds = await dbGetRoundsForEvent(eventId);
                const currentRound = allRounds.find(r => r.id === roundId);
                if (!currentRound) {
                    throw new Error("Current round not found");
                }
                const nextRoundIndex = currentRoundIndex + 1;
                if (nextRoundIndex < allRounds.length) {
                    const nextRoundData = allRounds[nextRoundIndex];
                    setNextRound(nextRoundData);
                    setHasNextRound(true);
                    setNextRoundStarted(nextRoundData.isstarted === 1);
                } else {
                    setHasNextRound(false);
                }

                // Fetch event info (here we simply call dbGetFencersInEventById to get the event structure)
                const eventFencers = await dbGetFencersInEventById({ id: eventId } as Event);
                if (eventFencers.length > 0) {
                    setEvent({ id: eventId } as Event);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [roundId, eventId, currentRoundIndex]);

    const handleNextRound = async () => {
        if (!hasNextRound || !nextRound || !event) {
            return;
        }
        try {
            if (!nextRoundStarted) {
                const fencers = await dbGetFencersInEventById(event);
                await dbInitializeRound(event, nextRound, fencers);
                Alert.alert("Success", "Next round initialized successfully!");
                setNextRoundStarted(true);
            }
            // If the next round is a DE round, navigate to the DE screen; otherwise, go to PoolsPage.
            if (nextRound.type === 'de') {
                navigateToDEPage(navigation, event, nextRound, currentRoundIndex + 1);
            } else {
                navigation.navigate('PoolsPage', {
                    event: event,
                    currentRoundIndex: currentRoundIndex + 1,
                    roundId: nextRound.id
                });
            }
        } catch (error) {
            console.error("Error handling next round:", error);
            Alert.alert("Error", "Failed to initialize or open the next round.");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Round Results</Text>
            {poolResults.map(poolResult => (
                <View key={poolResult.poolid} style={styles.poolContainer}>
                    <Text style={styles.poolTitle}>Pool {poolResult.poolid + 1}</Text>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Fencer</Text>
                        <Text style={styles.tableHeaderCell}>Win Rate</Text>
                        <Text style={styles.tableHeaderCell}>Scored</Text>
                        <Text style={styles.tableHeaderCell}>Received</Text>
                        <Text style={styles.tableHeaderCell}>Indicator</Text>
                    </View>
                    {poolResult.stats.map(stat => (
                        <View key={stat.fencer.id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 2 }]}>
                                {stat.fencer.fname} {stat.fencer.lname}
                            </Text>
                            <Text style={styles.tableCell}>{stat.winRate.toFixed(1)}%</Text>
                            <Text style={styles.tableCell}>{stat.touchesScored}</Text>
                            <Text style={styles.tableCell}>{stat.touchesReceived}</Text>
                            <Text style={styles.tableCell}>{stat.indicator}</Text>
                        </View>
                    ))}
                </View>
            ))}

            {hasNextRound && (
                <TouchableOpacity style={styles.nextRoundButton} onPress={handleNextRound}>
                    <Text style={styles.nextRoundButtonText}>
                        {nextRoundStarted ? "Open Next Round" : "Start Next Round"}
                    </Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    poolContainer: {
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    poolTitle: {
        backgroundColor: '#007AFF',
        color: '#fff',
        padding: 10,
        fontSize: 18,
        fontWeight: 'bold',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    tableHeaderCell: {
        flex: 1,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tableCell: {
        flex: 1,
        textAlign: 'center',
    },
    nextRoundButton: {
        backgroundColor: '#228B22',
        paddingVertical: 15,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    nextRoundButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default RoundResults;
