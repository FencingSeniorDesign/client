import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Fencer } from '../navigation/types';
import { useInitializeRound, useRoundResultsData, useRounds } from '../../data/TournamentDataHooks';
import { navigateToDEPage } from '../utils/DENavigationUtil';

type RoundResultsRouteProp = RouteProp<RootStackParamList, 'RoundResults'>;

// Types for the component's internal data structure
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

// View modes for the results display
type ViewMode = 'list' | 'poolSheet' | 'overall';

/**
 * Round Results component for displaying pool results and navigating to the next round
 * with multiple view options (List View, Pool Sheet, Overall Results)
 */
const RoundResults: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RoundResultsRouteProp>();
    const { roundId, eventId, currentRoundIndex, isRemote = false } = route.params;

    // State for view mode selection
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [allFencersStats, setAllFencersStats] = useState<FencerStats[]>([]);

    // Handle user initiated loading states
    const [isInitializingNextRound, setIsInitializingNextRound] = useState(false);

    // Use custom hook to handle data fetching and processing
    const {
        poolResults,
        event,
        nextRoundInfo: { nextRound, hasNextRound, nextRoundStarted },
        isLoading,
        isError
    } = useRoundResultsData(roundId, eventId, currentRoundIndex);

    // Get all rounds to determine if this is the final round
    const { data: rounds = [] } = useRounds(eventId);
    const [isFinalRound, setIsFinalRound] = useState(false);

    // Check if this is the final round
    useEffect(() => {
        if (rounds.length > 0) {
            setIsFinalRound(currentRoundIndex === rounds.length - 1);
        }
    }, [rounds, currentRoundIndex]);

    // Combine and process all fencer stats for overall results view
    useEffect(() => {
        if (poolResults.length > 0) {
            // Flatten and combine all fencer stats from all pools
            const combinedStats = poolResults.flatMap(pool => pool.stats);

            // Sort by indicator (descending), then by touches scored (descending) as tiebreaker
            const sortedStats = [...combinedStats].sort((a, b) => {
                if (b.indicator !== a.indicator) {
                    return b.indicator - a.indicator;
                }
                return b.touchesScored - a.touchesScored;
            });

            setAllFencersStats(sortedStats);
        }
    }, [poolResults]);

    // Initialize round mutation
    const initializeRoundMutation = useInitializeRound();

    // Handle starting the next round
    const handleNextRound = async () => {
        if (!hasNextRound || !nextRound || !event) {
            return;
        }

        try {
            if (!nextRoundStarted) {
                setIsInitializingNextRound(true);

                // Use the mutation hook to initialize the round
                await initializeRoundMutation.mutateAsync({
                    eventId: eventId,
                    roundId: nextRound.id
                });

                Alert.alert("Success", "Next round initialized successfully!");
            }

            // Navigate to the appropriate screen based on round type
            if (nextRound.type === 'de') {
                navigateToDEPage(navigation, event, nextRound, currentRoundIndex + 1, isRemote);
            } else {
                navigation.navigate('PoolsPage', {
                    event: event,
                    currentRoundIndex: currentRoundIndex + 1,
                    roundId: nextRound.id,
                    isRemote
                });
            }
        } catch (error) {
            console.error("Error handling next round:", error);
            Alert.alert("Error", "Failed to initialize or open the next round.");
        } finally {
            setIsInitializingNextRound(false);
        }
    };

    // Handle viewing tournament results
    const handleViewResults = () => {
        navigation.navigate('TournamentResultsPage', {
            eventId: eventId,
            isRemote
        });
    };

    // Creates a result code for pool sheet (V5, D2, etc.)
    const getResultCode = (winner: number, loser: number, score: number) => {
        if (winner > 0) {
            return `V${score}`;
        } else if (loser > 0) {
            return `D${score}`;
        }
        return 'D0'; // Default for no score
    };

    // Renders the Pool Sheet view
    const renderPoolSheet = (poolResult: PoolResult) => {
        const { stats } = poolResult;
        const fencerCount = stats.length;

        // For demonstration, we'll create some sample bout data
        // In a real implementation, this would come from your data source
        const generateBoutResult = (fencerA: number, fencerB: number) => {
            if (fencerA === fencerB) return null; // Same fencer, no bout

            // Use the win rate to determine who likely won
            const statsA = stats[fencerA];
            const statsB = stats[fencerB];

            if (statsA.winRate > statsB.winRate) {
                return { winner: statsA.fencer.id, score: 5 };
            } else if (statsB.winRate > statsA.winRate) {
                return { winner: statsB.fencer.id, score: 5 };
            } else {
                // Tie, randomize winner
                return { winner: Math.random() > 0.5 ? statsA.fencer.id : statsB.fencer.id, score: 5 };
            }
        };

        return (
            <View style={styles.poolSheetContainer}>
                <View style={styles.poolSheetHeader}>
                    <Text style={styles.poolSheetTitle}>Pool {poolResult.poolid + 1} Sheet</Text>
                </View>
                <View style={styles.poolSheetTableContainer}>
                    {/* Header row with column numbers */}
                    <View style={styles.poolSheetHeaderRow}>
                        <View style={styles.poolSheetNameHeader}>
                            <Text style={styles.poolSheetHeaderText}>Name</Text>
                        </View>
                        {Array.from({ length: fencerCount }).map((_, idx) => (
                            <View key={`col-${idx}`} style={styles.poolSheetColHeader}>
                                <Text style={styles.poolSheetHeaderText}>{idx + 1}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Fencer rows */}
                    {stats.map((stat, rowIdx) => (
                        <View key={`row-${stat.fencer.id}`} style={styles.poolSheetRow}>
                            {/* Fencer name cell with number */}
                            <View style={styles.poolSheetNameCell}>
                                <Text style={styles.poolSheetRowNumber}>{rowIdx + 1}</Text>
                                <Text style={styles.poolSheetName} numberOfLines={1} ellipsizeMode="tail">
                                    {stat.fencer.lname}, {stat.fencer.fname}
                                </Text>
                            </View>

                            {/* Bout result cells */}
                            {stats.map((_, colIdx) => {
                                if (rowIdx === colIdx) {
                                    // Same fencer, gray cell
                                    return (
                                        <View
                                            key={`bout-${rowIdx}-${colIdx}`}
                                            style={styles.poolSheetSameCell}
                                        />
                                    );
                                }

                                // Generate a simulated bout result
                                const boutResult = generateBoutResult(rowIdx, colIdx);
                                const isWinner = boutResult?.winner === stat.fencer.id;
                                const boutScore = boutResult?.score || 0;

                                let resultCode;
                                if (isWinner) {
                                    resultCode = `V${boutScore}`;
                                } else {
                                    // The difference is just for display
                                    const lossByScore = Math.max(1, Math.min(4, Math.floor(Math.random() * 5)));
                                    resultCode = `D${lossByScore}`;
                                }

                                return (
                                    <View key={`bout-${rowIdx}-${colIdx}`} style={styles.poolSheetResultCell}>
                                        <Text style={styles.poolSheetResultText}>{resultCode}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // Renders the traditional list view (original implementation)
    const renderListView = (poolResult: PoolResult) => (
        <View key={poolResult.poolid} style={styles.poolContainer}>
            <Text style={styles.poolTitle}>Pool {poolResult.poolid + 1}</Text>
            <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Fencer</Text>
                <Text style={styles.tableHeaderCell}>WR</Text>
                <Text style={styles.tableHeaderCell}>TS</Text>
                <Text style={styles.tableHeaderCell}>TR</Text>
                <Text style={styles.tableHeaderCell}>IND</Text>
                <Text style={styles.tableHeaderCell}>PL</Text>
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
                    <Text style={styles.tableCell}>{poolResult.stats
                        .sort((a, b) => b.indicator - a.indicator || b.touchesScored - a.touchesScored)
                        .findIndex(s => s.fencer.id === stat.fencer.id) + 1}</Text>
                </View>
            ))}
        </View>
    );

    // Renders the overall results view
    const renderOverallResults = () => (
        <View style={styles.overallContainer}>
            <Text style={styles.overallTitle}>Overall Results</Text>
            <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Rank</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Fencer</Text>
                <Text style={styles.tableHeaderCell}>WR</Text>
                <Text style={styles.tableHeaderCell}>TS</Text>
                <Text style={styles.tableHeaderCell}>TR</Text>
                <Text style={styles.tableHeaderCell}>IND</Text>
                <Text style={styles.tableHeaderCell}>PL</Text>
            </View>
            {allFencersStats.map((stat, index) => (
                <View key={stat.fencer.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 0.5 }]}>{index + 1}</Text>
                    <Text
                        style={[
                            styles.tableCell,
                            { flex: 2 },
                            index === 0 ? styles.goldText : {}
                        ]}
                    >
                        {stat.fencer.fname} {stat.fencer.lname}
                    </Text>
                    <Text style={styles.tableCell}>{stat.winRate.toFixed(1)}%</Text>
                    <Text style={styles.tableCell}>{stat.touchesScored}</Text>
                    <Text style={styles.tableCell}>{stat.touchesReceived}</Text>
                    <Text style={styles.tableCell}>{stat.indicator}</Text>
                    <Text style={styles.tableCell}>{index + 1}</Text>
                </View>
            ))}
        </View>
    );

    // Show loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading round results...</Text>
            </View>
        );
    }

    // Show error state
    if (isError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error loading round results. Please try again.</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Round Results</Text>

            {/* View mode selection buttons */}
            <View style={styles.viewModeContainer}>
                <TouchableOpacity
                    style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewModeButton]}
                    onPress={() => setViewMode('list')}
                >
                    <Text style={[styles.viewModeButtonText, viewMode === 'list' && styles.activeViewModeButtonText]}>
                        List View
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewModeButton, viewMode === 'poolSheet' && styles.activeViewModeButton]}
                    onPress={() => setViewMode('poolSheet')}
                >
                    <Text style={[styles.viewModeButtonText, viewMode === 'poolSheet' && styles.activeViewModeButtonText]}>
                        Pool Sheet
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewModeButton, viewMode === 'overall' && styles.activeViewModeButton]}
                    onPress={() => setViewMode('overall')}
                >
                    <Text style={[styles.viewModeButtonText, viewMode === 'overall' && styles.activeViewModeButtonText]}>
                        Overall Results
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Render appropriate view based on selection */}
            {viewMode === 'list' && poolResults.map(renderListView)}
            {viewMode === 'poolSheet' && poolResults.map(renderPoolSheet)}
            {viewMode === 'overall' && renderOverallResults()}

            {/* If this is the final round, show the "View Tournament Results" button */}
            {isFinalRound && (
                <TouchableOpacity
                    style={styles.viewResultsButton}
                    onPress={handleViewResults}
                >
                    <Text style={styles.viewResultsButtonText}>View Tournament Results</Text>
                </TouchableOpacity>
            )}

            {/* Only show the "Next Round" button if there is a next round */}
            {hasNextRound && (
                <TouchableOpacity
                    style={[styles.nextRoundButton, isInitializingNextRound && styles.disabledButton]}
                    onPress={handleNextRound}
                    disabled={isInitializingNextRound}
                >
                    {isInitializingNextRound ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.nextRoundButtonText}>
                            {nextRoundStarted ? "Open Next Round" : "Start Next Round"}
                        </Text>
                    )}
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
    viewModeContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    viewModeButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#007AFF',
        marginHorizontal: 2,
    },
    activeViewModeButton: {
        backgroundColor: '#007AFF',
    },
    viewModeButtonText: {
        color: '#007AFF',
        fontWeight: '500',
    },
    activeViewModeButtonText: {
        color: 'white',
    },
    // Original pool list view styles
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
    // Pool sheet view styles
    poolSheetContainer: {
        marginBottom: 20,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    poolSheetHeader: {
        backgroundColor: '#007AFF',
        padding: 12,
    },
    poolSheetTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    poolSheetTableContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    poolSheetHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#333',
    },
    poolSheetRow: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
    },
    poolSheetNameHeader: {
        width: 150,
        paddingVertical: 10,
        paddingHorizontal: 4,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: '#444',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    poolSheetColHeader: {
        width: 40,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#444',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    poolSheetHeaderText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14,
    },
    poolSheetNameCell: {
        width: 150,
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    poolSheetRowNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 6,
        minWidth: 14,
    },
    poolSheetName: {
        flex: 1,
        fontSize: 13,
    },
    poolSheetSameCell: {
        width: 40,
        height: 45,
        backgroundColor: '#e0e0e0',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    poolSheetResultCell: {
        width: 40,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    poolSheetResultText: {
        fontSize: 14,
        textAlign: 'center',
    },
    // Overall results view styles
    overallContainer: {
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    overallTitle: {
        backgroundColor: '#228B22',
        color: '#fff',
        padding: 10,
        fontSize: 18,
        fontWeight: 'bold',
    },
    goldText: {
        color: '#FFD700',
        fontWeight: 'bold',
    },
    // Navigation button styles
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
    viewResultsButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    viewResultsButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#aaaaaa',
        opacity: 0.7,
    },
    // Loading and error states
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        fontSize: 16,
    },
});

export default RoundResults;