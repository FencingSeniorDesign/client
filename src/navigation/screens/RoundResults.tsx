import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, Fencer } from '../navigation/types';
import { useInitializeRound, useRoundResultsData, useRounds, useRoundStarted } from '../../data/TournamentDataHooks';
import { navigateToDEPage } from '../utils/DENavigationUtil';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';

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
    bouts?: any[]; // Adding bouts to pool results
}

// View modes for the results display
type ViewMode = 'list' | 'poolSheet' | 'overall';

/**
 * Round Results component for displaying pool results and navigating to the next round
 * with multiple view options (List View, Pool Sheet, Overall Results)
 */
const RoundResults: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RoundResultsRouteProp>();
    const { roundId, eventId, currentRoundIndex, isRemote = false } = route.params;

    // State for view mode selection
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Handle user initiated loading states
    const [isInitializingNextRound, setIsInitializingNextRound] = useState(false);

    // Use custom hook to handle data fetching and processing
    const {
        poolResults,
        event,
        nextRoundInfo: { nextRound, hasNextRound, nextRoundStarted: initialNextRoundStarted },
        isLoading,
        isError,
    } = useRoundResultsData(roundId, eventId, currentRoundIndex);

    // Dedicated hook to track if the next round has started
    const { data: isNextRoundStarted } = useRoundStarted(nextRound?.id);

    // Get all rounds to determine if this is the final round
    const { data: rounds = [] } = useRounds(eventId);

    // Calculate combined stats for overall results
    const allFencersStats = useMemo(() => {
        if (!poolResults || poolResults.length === 0) return [];

        // Flatten and combine all fencer stats from all pools
        const combinedStats = poolResults.flatMap(pool => pool.stats);

        // Sort by indicator (descending), then by touches scored (descending) as tiebreaker
        return [...combinedStats].sort((a, b) => {
            if (b.indicator !== a.indicator) {
                return b.indicator - a.indicator;
            }
            return b.touchesScored - a.touchesScored;
        });
    }, [poolResults]);

    const isFinalRound = useMemo(() => {
        return rounds.length > 0 && currentRoundIndex === rounds.length - 1;
    }, [rounds, currentRoundIndex]);

    // Initialize round mutation
    const initializeRoundMutation = useInitializeRound();

    // Handle starting the next round
    const handleNextRound = async () => {
        if (!hasNextRound || !nextRound || !event) {
            return;
        }

        try {
            if (!isNextRoundStarted) {
                setIsInitializingNextRound(true);

                // Use the mutation hook to initialize the round
                await initializeRoundMutation.mutateAsync({
                    eventId: eventId,
                    roundId: nextRound.id,
                });

                Alert.alert(t('common.success'), t('roundResults.nextRoundInitialized'));

                // Navigate to the next round
                navigateToNextRound();
            } else {
                // If round is already started, just navigate without initialization
                navigateToNextRound();
            }
        } catch (error) {
            console.error('Error handling next round:', error);
            Alert.alert(t('common.error'), t('roundResults.failedToInitializeNextRound'));
        } finally {
            setIsInitializingNextRound(false);
        }
    };

    // Helper function to navigate to the next round
    const navigateToNextRound = () => {
        if (!nextRound || !event) return;

        if (nextRound.type === 'de') {
            navigateToDEPage(navigation, event, nextRound, currentRoundIndex + 1, isRemote);
        } else {
            navigation.navigate('PoolsPage', {
                event: event,
                currentRoundIndex: currentRoundIndex + 1,
                roundId: nextRound.id,
                isRemote,
            });
        }
    };

    // Handle viewing tournament results
    const handleViewResults = () => {
        navigation.navigate('TournamentResultsPage', {
            eventId: eventId,
            isRemote,
        });
    };

    // Show loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>{t('roundResults.loadingResults')}</Text>
            </View>
        );
    }

    // Show error state
    if (isError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('roundResults.errorLoadingResults')}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <BLEStatusBar compact={true} />
            <Text style={styles.title}>{t('roundResults.title')}</Text>

            {/* View mode selection buttons */}
            <View style={styles.viewModeContainer}>
                <TouchableOpacity
                    style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewModeButton]}
                    onPress={() => setViewMode('list')}
                >
                    <Text style={[styles.viewModeButtonText, viewMode === 'list' && styles.activeViewModeButtonText]}>
                        {t('roundResults.listView')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewModeButton, viewMode === 'poolSheet' && styles.activeViewModeButton]}
                    onPress={() => setViewMode('poolSheet')}
                >
                    <Text
                        style={[styles.viewModeButtonText, viewMode === 'poolSheet' && styles.activeViewModeButtonText]}
                    >
                        {t('roundResults.poolSheet')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.viewModeButton, viewMode === 'overall' && styles.activeViewModeButton]}
                    onPress={() => setViewMode('overall')}
                >
                    <Text
                        style={[styles.viewModeButtonText, viewMode === 'overall' && styles.activeViewModeButtonText]}
                    >
                        {t('roundResults.overallResults')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Render appropriate view based on selection */}
            {viewMode === 'list' &&
                poolResults.map(poolResult => <PoolListView key={poolResult.poolid} poolResult={poolResult} />)}

            {viewMode === 'poolSheet' &&
                poolResults.map(poolResult => <PoolSheetView key={poolResult.poolid} poolResult={poolResult} />)}

            {viewMode === 'overall' && <OverallResultsView fencerStats={allFencersStats} />}

            {/* If this is the final round, show the "View Tournament Results" button */}
            {isFinalRound && (
                <TouchableOpacity style={styles.viewResultsButton} onPress={handleViewResults}>
                    <Text style={styles.viewResultsButtonText}>{t('roundResults.viewTournamentResults')}</Text>
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
                            {isNextRoundStarted ? t('roundResults.nextRound') : t('roundResults.startNextRound')}
                        </Text>
                    )}
                </TouchableOpacity>
            )}
        </ScrollView>
    );
};

// Separated into component to ensure consistent hook usage
const PoolListView: React.FC<{ poolResult: PoolResult }> = ({ poolResult }) => {
    const { t } = useTranslation();

    // Pre-calculate rankings to avoid mutating arrays during render
    const fencerRankings = useMemo(() => {
        const sortedStats = [...poolResult.stats].sort(
            (a, b) => b.indicator - a.indicator || b.touchesScored - a.touchesScored
        );

        const rankMap = new Map<number, number>();
        sortedStats.forEach((stat, index) => {
            rankMap.set(stat.fencer.id, index + 1);
        });

        return rankMap;
    }, [poolResult.stats]);

    return (
        <View style={styles.poolContainer}>
            <Text style={styles.poolTitle}>
                {t('roundResults.pool')} {poolResult.poolid + 1}
            </Text>
            <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>{t('roundResults.fencer')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.winRate')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.touchesScored')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.touchesReceived')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.indicator')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.place')}</Text>
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
                    <Text style={styles.tableCell}>{fencerRankings.get(stat.fencer.id)}</Text>
                </View>
            ))}
        </View>
    );
};

// Separated pool sheet view component
const PoolSheetView: React.FC<{ poolResult: PoolResult }> = ({ poolResult }) => {
    const { t } = useTranslation();
    const { stats } = poolResult;
    const fencerCount = stats.length;

    // Create a lookup map for bouts to find results quickly
    const boutMap = useMemo(() => {
        const map = new Map();

        if (poolResult.bouts) {
            // Log the bout data for debugging
            console.log(`Pool ${poolResult.poolid + 1} has ${poolResult.bouts.length} bouts`);

            poolResult.bouts.forEach(bout => {
                // Create keys for both directions to easily look up bouts
                const leftToRightKey = `${bout.left_fencerid}-${bout.right_fencerid}`;
                const rightToLeftKey = `${bout.right_fencerid}-${bout.left_fencerid}`;

                // Log the bout details for debugging
                console.log(`Bout: ${leftToRightKey}, Scores: ${bout.left_score}-${bout.right_score}`);

                // Store the bout with the respective fencer perspective
                map.set(leftToRightKey, {
                    fencerId: bout.left_fencerid,
                    opponentId: bout.right_fencerid,
                    myScore: bout.left_score,
                    opponentScore: bout.right_score,
                    isLeftFencer: true,
                });

                map.set(rightToLeftKey, {
                    fencerId: bout.right_fencerid,
                    opponentId: bout.left_fencerid,
                    myScore: bout.right_score,
                    opponentScore: bout.left_score,
                    isLeftFencer: false,
                });
            });
        } else {
            console.log(`Pool ${poolResult.poolid + 1} has no bouts data`);
        }

        console.log(`BoutMap has ${map.size} entries`);
        return map;
    }, [poolResult.bouts]);

    // Function to get results between two fencers from the perspective of fencerA
    const getBoutResult = (fencerIdA: number, fencerIdB: number) => {
        const key = `${fencerIdA}-${fencerIdB}`;
        const result = boutMap.get(key);
        if (!result) {
            console.log(`No bout found for ${key}`);
        }
        return result;
    };

    return (
        <View style={styles.poolSheetContainer}>
            <View style={styles.poolSheetHeader}>
                <Text style={styles.poolSheetTitle}>
                    {t('roundResults.pool')} {poolResult.poolid + 1} {t('roundResults.sheet')}
                </Text>
            </View>
            <View style={styles.poolSheetTableContainer}>
                {/* Header row with column numbers */}
                <View style={styles.poolSheetHeaderRow}>
                    <View style={styles.poolSheetNameHeader}>
                        <Text style={styles.poolSheetHeaderText}>{t('roundResults.name')}</Text>
                    </View>
                    {Array.from({ length: fencerCount }).map((_, idx) => (
                        <View key={`col-${idx}`} style={styles.poolSheetColHeader}>
                            <Text style={styles.poolSheetHeaderText}>{idx + 1}</Text>
                        </View>
                    ))}
                    <View style={styles.poolSheetStatsHeader}>
                        <Text style={styles.poolSheetHeaderText}>{t('roundResults.victoryRatio')}</Text>
                    </View>
                    <View style={styles.poolSheetStatsHeader}>
                        <Text style={styles.poolSheetHeaderText}>{t('roundResults.touchesScoredShort')}</Text>
                    </View>
                    <View style={styles.poolSheetStatsHeader}>
                        <Text style={styles.poolSheetHeaderText}>{t('roundResults.touchesReceivedShort')}</Text>
                    </View>
                    <View style={styles.poolSheetStatsHeader}>
                        <Text style={styles.poolSheetHeaderText}>{t('roundResults.indicatorShort')}</Text>
                    </View>
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
                        {stats.map((opponentStat, colIdx) => {
                            if (stat.fencer.id === opponentStat.fencer.id) {
                                // Same fencer, gray cell
                                return <View key={`bout-${rowIdx}-${colIdx}`} style={styles.poolSheetSameCell} />;
                            }

                            // Get the actual bout result between these two fencers
                            const boutResult = getBoutResult(stat.fencer.id, opponentStat.fencer.id);

                            // If no result found, show empty cell
                            if (!boutResult) {
                                return <View key={`bout-${rowIdx}-${colIdx}`} style={styles.poolSheetResultCell} />;
                            }

                            // Get the result from this fencer's perspective
                            const myScore = boutResult.myScore || 0;
                            const opponentScore = boutResult.opponentScore || 0;

                            // Create result code (V5, D3, etc.)
                            let resultCode;
                            if (myScore > opponentScore) {
                                resultCode = `V${myScore}`;
                            } else if (myScore < opponentScore) {
                                resultCode = `D${opponentScore}`;
                            } else {
                                resultCode = `D${opponentScore}`; // Default case if scores are equal
                            }

                            return (
                                <View key={`bout-${rowIdx}-${colIdx}`} style={styles.poolSheetResultCell}>
                                    <Text style={styles.poolSheetResultText}>{resultCode}</Text>
                                </View>
                            );
                        })}

                        {/* Stats columns */}
                        <View style={styles.poolSheetStatCell}>
                            <Text style={styles.poolSheetStatText}>
                                {(stat.boutsCount > 0 ? stat.wins / stat.boutsCount : 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.poolSheetStatCell}>
                            <Text style={styles.poolSheetStatText}>{stat.touchesScored}</Text>
                        </View>
                        <View style={styles.poolSheetStatCell}>
                            <Text style={styles.poolSheetStatText}>{stat.touchesReceived}</Text>
                        </View>
                        <View style={styles.poolSheetStatCell}>
                            <Text style={styles.poolSheetStatText}>{stat.indicator}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

// Separated overall results view component
const OverallResultsView: React.FC<{ fencerStats: FencerStats[] }> = ({ fencerStats }) => {
    const { t } = useTranslation();

    return (
        <View style={styles.overallContainer}>
            <Text style={styles.overallTitle}>{t('roundResults.overallResults')}</Text>
            <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>{t('roundResults.rank')}</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>{t('roundResults.fencer')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.victoryRatio')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.touchesScoredShort')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.touchesReceivedShort')}</Text>
                <Text style={styles.tableHeaderCell}>{t('roundResults.indicatorShort')}</Text>
            </View>
            {fencerStats.map((stat, index) => (
                <View key={stat.fencer.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 0.5 }]}>{index + 1}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }, index === 0 ? styles.goldText : {}]}>
                        {stat.fencer.fname} {stat.fencer.lname}
                    </Text>
                    <Text style={styles.tableCell}>
                        {(stat.boutsCount > 0 ? stat.wins / stat.boutsCount : 0).toFixed(2)}
                    </Text>
                    <Text style={styles.tableCell}>{stat.touchesScored}</Text>
                    <Text style={styles.tableCell}>{stat.touchesReceived}</Text>
                    <Text style={styles.tableCell}>{stat.indicator}</Text>
                </View>
            ))}
        </View>
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
    poolSheetStatsHeader: {
        width: 40,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#444',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
        backgroundColor: '#444',
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
    poolSheetStatCell: {
        width: 40,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRightWidth: 1,
        borderRightColor: '#ddd',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    poolSheetStatText: {
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
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
