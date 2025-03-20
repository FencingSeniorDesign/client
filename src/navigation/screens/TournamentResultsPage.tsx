import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, Fencer, Round } from '../navigation/types';
import { useRounds } from '../../data/TournamentDataHooks';
import { useQueryClient } from '@tanstack/react-query';
import dataProvider from '../../data/TournamentDataProvider';
import { MaterialIcons } from '@expo/vector-icons';
import ConnectionStatusBar from '../../networking/components/ConnectionStatusBar';

// Define the route params for this page
type TournamentResultsRouteParams = {
    eventId: number;
    isRemote?: boolean;
};

type TournamentResultsRouteProp = RouteProp<{ params: TournamentResultsRouteParams }, 'params'>;

// Define types for pool and DE results
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

interface DEResult {
    fencer: Fencer;
    place: number;
    victories: number;
    bouts: number;
    touchesScored: number;
    touchesReceived: number;
    indicator: number;
}

const TournamentResultsPage: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<TournamentResultsRouteProp>();
    const { eventId, isRemote = false } = route.params;
    const queryClient = useQueryClient();

    // State variables
    const [event, setEvent] = useState<Event | null>(null);
    const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
    const [poolResults, setPoolResults] = useState<PoolResult[]>([]);
    const [deResults, setDEResults] = useState<DEResult[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch rounds data using the custom hook
    const { data: rounds = [], isLoading: roundsLoading, isError: roundsError } = useRounds(eventId);

    // Fetch event data
    useEffect(() => {
        const fetchEventData = async () => {
            try {
                const eventData = await dataProvider.getEventById(eventId);
                setEvent(eventData);
            } catch (err) {
                console.error("Error fetching event data:", err);
                setError("Failed to load event data");
            }
        };

        fetchEventData();
    }, [eventId]);

    // Fetch results for the selected round
    useEffect(() => {
        if (roundsLoading || !rounds.length) return;

        const fetchRoundResults = async () => {
            setLoading(true);
            setError(null);

            try {
                const selectedRound = rounds[selectedRoundIndex];

                if (!selectedRound) {
                    setError("Round not found");
                    setLoading(false);
                    return;
                }

                if (selectedRound.type === 'pool') {
                    // Fetch pool results
                    await fetchPoolResults(selectedRound);
                } else if (selectedRound.type === 'de') {
                    // Fetch DE results
                    await fetchDEResults(selectedRound);
                }
            } catch (err) {
                console.error("Error fetching round results:", err);
                setError("Failed to load round results");
            } finally {
                setLoading(false);
            }
        };

        fetchRoundResults();
    }, [rounds, selectedRoundIndex, roundsLoading]);

    // Function to fetch pool results
    const fetchPoolResults = async (round: Round) => {
        // Get pools for the round
        const pools = await dataProvider.getPools(round.id);

        const results: PoolResult[] = [];

        for (const pool of pools) {
            // Get bouts for this pool
            const bouts = await dataProvider.getBoutsForPool(round.id, pool.poolid);

            // Calculate stats for each fencer
            const statsMap = new Map<number, FencerStats>();

            // Initialize fencer stats
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

            // Process bout data
            bouts.forEach((bout: any) => {
                const leftId = bout.left_fencerid;
                const rightId = bout.right_fencerid;
                const leftScore = bout.left_score ?? 0;
                const rightScore = bout.right_score ?? 0;

                if (statsMap.has(leftId)) {
                    const stats = statsMap.get(leftId)!;
                    stats.boutsCount += 1;
                    stats.touchesScored += leftScore;
                    stats.touchesReceived += rightScore;
                    if (leftScore > rightScore) {
                        stats.wins += 1;
                    }
                }

                if (statsMap.has(rightId)) {
                    const stats = statsMap.get(rightId)!;
                    stats.boutsCount += 1;
                    stats.touchesScored += rightScore;
                    stats.touchesReceived += leftScore;
                    if (rightScore > leftScore) {
                        stats.wins += 1;
                    }
                }
            });

            // Calculate final stats
            const stats: FencerStats[] = [];
            statsMap.forEach(stat => {
                stat.winRate = stat.boutsCount > 0 ? (stat.wins / stat.boutsCount) * 100 : 0;
                stat.indicator = stat.touchesScored - stat.touchesReceived;
                stats.push(stat);
            });

            // Sort stats by win rate (descending), then by indicator (descending)
            stats.sort((a, b) => {
                if (a.winRate !== b.winRate) {
                    return b.winRate - a.winRate;
                }
                return b.indicator - a.indicator;
            });

            results.push({
                poolid: pool.poolid,
                stats,
            });
        }

        setPoolResults(results);
        setDEResults([]);
    };

    // Function to fetch DE results
    const fetchDEResults = async (round: Round) => {
        try {
            // Get all bouts for the DE round
            const bouts = await dataProvider.getBouts(round.id);

            // Get seeding information
            const seeding = await dataProvider.getSeedingForRound(round.id);

            // Map to track fencer statistics
            const fencerStatsMap = new Map<number, {
                fencer: Fencer;
                bouts: number;
                victories: number;
                touchesScored: number;
                touchesReceived: number;
                finalPlace?: number;
                lastRoundReached: number;
                seed: number;
            }>();

            // Initialize fencer stats from seeding
            seeding.forEach(({ fencer, seed }) => {
                fencerStatsMap.set(fencer.id!, {
                    fencer,
                    bouts: 0,
                    victories: 0,
                    touchesScored: 0,
                    touchesReceived: 0,
                    lastRoundReached: 0,
                    seed
                });
            });

            // Process bouts to calculate stats
            bouts.forEach((bout: any) => {
                const leftId = bout.lfencer;
                const rightId = bout.rfencer;
                const leftScore = bout.left_score ?? 0;
                const rightScore = bout.right_score ?? 0;
                const victorId = bout.victor;
                const tableof = bout.tableof;
                const round = Math.log2(tableof);

                // Only count if both fencers are present (skip byes)
                if (leftId && rightId) {
                    // Update left fencer stats
                    if (fencerStatsMap.has(leftId)) {
                        const stats = fencerStatsMap.get(leftId)!;
                        stats.bouts += 1;
                        stats.touchesScored += leftScore;
                        stats.touchesReceived += rightScore;
                        if (victorId === leftId) {
                            stats.victories += 1;
                            // Update the last round this fencer reached
                            stats.lastRoundReached = Math.max(stats.lastRoundReached, round + 1);
                        } else {
                            // If they lost, this was their last round
                            stats.lastRoundReached = Math.max(stats.lastRoundReached, round);
                        }
                    }

                    // Update right fencer stats
                    if (fencerStatsMap.has(rightId)) {
                        const stats = fencerStatsMap.get(rightId)!;
                        stats.bouts += 1;
                        stats.touchesScored += rightScore;
                        stats.touchesReceived += leftScore;
                        if (victorId === rightId) {
                            stats.victories += 1;
                            // Update the last round this fencer reached
                            stats.lastRoundReached = Math.max(stats.lastRoundReached, round + 1);
                        } else {
                            // If they lost, this was their last round
                            stats.lastRoundReached = Math.max(stats.lastRoundReached, round);
                        }
                    }
                }
            });

            // Convert the map to an array of results
            const results: DEResult[] = Array.from(fencerStatsMap.values()).map(stats => {
                return {
                    fencer: stats.fencer,
                    place: 0, // We'll calculate this next
                    victories: stats.victories,
                    bouts: stats.bouts,
                    touchesScored: stats.touchesScored,
                    touchesReceived: stats.touchesReceived,
                    indicator: stats.touchesScored - stats.touchesReceived,
                    lastRoundReached: stats.lastRoundReached,
                    seed: stats.seed
                };
            });

            // Sort fencers by lastRoundReached (descending), then by victories, indicator, and initial seed
            results.sort((a, b) => {
                if (a.lastRoundReached !== b.lastRoundReached) {
                    return b.lastRoundReached - a.lastRoundReached;
                }
                if (a.victories !== b.victories) {
                    return b.victories - a.victories;
                }
                if (a.indicator !== b.indicator) {
                    return b.indicator - a.indicator;
                }
                // If everything else is equal, use original seeding
                return a.seed - b.seed;
            });

            // Assign places based on the sorted order
            results.forEach((result, index) => {
                result.place = index + 1;
            });

            // Set the DE results
            setDEResults(results);
            setPoolResults([]);
        } catch (err) {
            console.error("Error fetching DE results:", err);
            setError("Failed to load direct elimination results");
        }
    };

    // Render a tab for each round
    const renderRoundTabs = () => {
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
                {rounds.map((round, index) => (
                    <TouchableOpacity
                        key={round.id}
                        style={[
                            styles.tab,
                            selectedRoundIndex === index && styles.activeTab
                        ]}
                        onPress={() => setSelectedRoundIndex(index)}
                    >
                        <Text style={[
                            styles.tabText,
                            selectedRoundIndex === index && styles.activeTabText
                        ]}>
                            {round.type === 'pool' ? `Pool Round ${index + 1}` : `DE Round ${index + 1}`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    // Render a medal icon based on the place
    const renderMedal = (place: number) => {
        if (place === 1) {
            return <MaterialIcons name="star" size={24} color="#FFD700" style={styles.medalIcon} />; // Gold
        } else if (place === 2) {
            return <MaterialIcons name="star" size={24} color="#C0C0C0" style={styles.medalIcon} />; // Silver
        } else if (place === 3) {
            return <MaterialIcons name="star" size={24} color="#CD7F32" style={styles.medalIcon} />; // Bronze
        }
        return null;
    };

    // Render pool results
    const renderPoolResults = () => {
        if (!poolResults.length) {
            return (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No pool results available</Text>
                </View>
            );
        }

        return (
            <>
                {poolResults.map(poolResult => (
                    <View key={poolResult.poolid} style={styles.poolContainer}>
                        <Text style={styles.poolTitle}>Pool {poolResult.poolid + 1}</Text>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Fencer</Text>
                            <Text style={styles.tableHeaderCell}>V/M</Text>
                            <Text style={styles.tableHeaderCell}>TS</Text>
                            <Text style={styles.tableHeaderCell}>TR</Text>
                            <Text style={styles.tableHeaderCell}>Ind</Text>
                        </View>
                        {poolResult.stats.map((stat, index) => (
                            <View key={stat.fencer.id} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>
                                    {stat.fencer.lname}, {stat.fencer.fname}
                                </Text>
                                <Text style={styles.tableCell}>
                                    {stat.wins}/{stat.boutsCount} ({stat.winRate.toFixed(1)}%)
                                </Text>
                                <Text style={styles.tableCell}>{stat.touchesScored}</Text>
                                <Text style={styles.tableCell}>{stat.touchesReceived}</Text>
                                <Text style={styles.tableCell}>{stat.indicator}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </>
        );
    };

    // Render DE results
    const renderDEResults = () => {
        if (!deResults.length) {
            return (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No direct elimination results available</Text>
                </View>
            );
        }

        return (
            <View style={styles.deContainer}>
                <Text style={styles.deTitle}>Final Results</Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Place</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Fencer</Text>
                    <Text style={styles.tableHeaderCell}>V/M</Text>
                    <Text style={styles.tableHeaderCell}>TS</Text>
                    <Text style={styles.tableHeaderCell}>TR</Text>
                    <Text style={styles.tableHeaderCell}>Ind</Text>
                </View>
                {deResults.map((result) => (
                    <View key={result.fencer.id} style={styles.tableRow}>
                        <View style={[styles.tableCellContainer, { flex: 0.5 }]}>
                            <Text style={styles.tableCell}>
                                {result.place}
                            </Text>
                            {renderMedal(result.place)}
                        </View>
                        <Text style={[styles.tableCell, { flex: 2 }]}>
                            {result.fencer.lname}, {result.fencer.fname}
                        </Text>
                        <Text style={styles.tableCell}>
                            {result.victories}/{result.bouts}
                        </Text>
                        <Text style={styles.tableCell}>{result.touchesScored}</Text>
                        <Text style={styles.tableCell}>{result.touchesReceived}</Text>
                        <Text style={styles.tableCell}>{result.indicator}</Text>
                    </View>
                ))}
            </View>
        );
    };

    // Determine which content to render based on the selected round
    const renderContent = () => {
        if (loading || roundsLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#001f3f" />
                    <Text style={styles.loadingText}>Loading results...</Text>
                </View>
            );
        }

        if (error || roundsError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {error || "Failed to load round results"}
                    </Text>
                </View>
            );
        }

        if (!rounds.length) {
            return (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No rounds found for this event</Text>
                </View>
            );
        }

        const selectedRound = rounds[selectedRoundIndex];

        return (
            <>
                <View style={styles.roundInfoContainer}>
                    <Text style={styles.roundInfoText}>
                        {selectedRound.type === 'pool' ? 'Pool Round' : 'Direct Elimination Round'}
                    </Text>
                    {selectedRound.type === 'de' && (
                        <Text style={styles.formatInfoText}>
                            Format: {selectedRound.deformat.charAt(0).toUpperCase() + selectedRound.deformat.slice(1)} Elimination
                        </Text>
                    )}
                </View>
                {selectedRound.type === 'pool' ? renderPoolResults() : renderDEResults()}
            </>
        );
    };

    return (
        <View style={styles.container}>
            {isRemote && <ConnectionStatusBar compact={true} />}

            <View style={styles.header}>
                <Text style={styles.title}>Tournament Results</Text>
                {event && (
                    <Text style={styles.eventName}>
                        {event.gender} {event.age} {event.weapon}
                    </Text>
                )}
            </View>

            {renderRoundTabs()}

            <ScrollView contentContainerStyle={styles.contentContainer}>
                {renderContent()}
            </ScrollView>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backButtonText}>Back to Event</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        backgroundColor: '#001f3f',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    eventName: {
        fontSize: 18,
        color: '#fff',
        opacity: 0.8,
    },
    tabsContainer: {
        flexGrow: 0,
        backgroundColor: '#f0f0f0',
        paddingVertical: 10,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginHorizontal: 5,
        borderRadius: 20,
        backgroundColor: '#ddd',
    },
    activeTab: {
        backgroundColor: '#001f3f',
    },
    tabText: {
        fontSize: 16,
        color: '#333',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 80, // Extra padding at the bottom
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        padding: 20,
        backgroundColor: '#ffeded',
        borderRadius: 8,
        marginVertical: 10,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    },
    noDataContainer: {
        padding: 30,
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    },
    roundInfoContainer: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        alignItems: 'center',
    },
    roundInfoText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    formatInfoText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    poolContainer: {
        marginBottom: 24,
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
    deContainer: {
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    deTitle: {
        backgroundColor: '#4CAF50',
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
        alignItems: 'center',
    },
    tableCellContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tableCell: {
        flex: 1,
        textAlign: 'center',
    },
    medalIcon: {
        marginLeft: 4,
    },
    backButton: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#001f3f',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TournamentResultsPage;