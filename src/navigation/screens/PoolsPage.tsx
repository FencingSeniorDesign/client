// screens/PoolsPage.tsx

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList, Event, Fencer } from '../navigation/types';
import {
    PoolResult,
    rankFencersFromPools,
    getPromotedFencers,
    buildPools,
    buildDEBracket,
} from '../utils/RoundAlgorithms';

/**
 * Route param shape for PoolsPage. Must match your RootStackParamList.
 */
type PoolsPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    fencers: Fencer[];
    poolCount: number;
    fencersPerPool: number;
};

type PoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: PoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<PoolsPageNavProp>();

    const {
        event,
        currentRoundIndex,
        fencers,
        poolCount,
        fencersPerPool,
    } = route.params;

    const [pools, setPools] = useState<Fencer[][]>([]);
    // Which pools are expanded
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);
    // Track pool completions
    const [completedPools, setCompletedPools] = useState<boolean[]>([]);

    /**
     * If you're tracking actual pool results (wins, touches, etc.),
     * you might keep an array of PoolResult[] for each pool:
     */
    const [poolResults, setPoolResults] = useState<PoolResult[][]>([]);

    useEffect(() => {
        // Build the pools from the "fencers" param
        const built = buildPools(fencers, poolCount, fencersPerPool);
        setPools(built);

        setExpandedPools(new Array(poolCount).fill(false));
        setCompletedPools(new Array(poolCount).fill(false));

        // Initialize empty results array. (One entry per pool.)
        const blank: PoolResult[][] = [];
        for (let i = 0; i < poolCount; i++) {
            blank.push([]);
        }
        setPoolResults(blank);
    }, [fencers, poolCount, fencersPerPool]);

    /**
     * Expand/Collapse pool
     */
    const togglePool = (index: number) => {
        setExpandedPools((prev) => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };

    /**
     * Navigate to BoutOrderPage for that pool
     */
    const handleRefereePress = (poolIndex: number) => {
        const poolFencers = pools[poolIndex];
        navigation.navigate('BoutOrderPage', {
            poolFencers,
        });
        // In a real app, you'd handle returning with partial results, etc.
    };

    /**
     * "Mark Completed" for demonstration
     * In a real app, you'd store actual results from BoutOrderPage or the local state
     */
    const handleMarkPoolCompleted = (poolIndex: number) => {
        const copy = [...completedPools];
        copy[poolIndex] = true;
        setCompletedPools(copy);

        // If you had real pool results, you'd store them in poolResults[poolIndex] here
        // for demonstration, we do nothing special
    };

    // Are all pools done?
    const allCompleted = completedPools.every((c) => c);

    /**
     * "Go to Next Round" logic:
     * 1) Merge/Rank fencers from poolResults
     * 2) Check nextRound in event.rounds
     * 3) If nextRound = Pools => build new PoolsPage
     * 4) If nextRound = DE => build bracket => DEBracketPage
     */
    const handleGoToNextRound = () => {
        if (!allCompleted) {
            Alert.alert("Pools not finished", "Complete all pools first.");
            return;
        }

        // rank fencers from poolResults
        // If you have actual stats, pass them. For now let's skip real data:
        const sortedFencers = rankFencersFromPools(poolResults);
        // If you don't have real data, you could fallback to the original array, e.g.:
        if (!sortedFencers.length) {
            // fallback if no real results
            // a real approach might do: sortedFencers = [...fencers]
            sortedFencers.push(...fencers);
        }

        const nextIndex = currentRoundIndex + 1;
        if (nextIndex >= event.rounds.length) {
            Alert.alert("No more rounds", "This event is finished.");
            return;
        }
        const nextRound = event.rounds[nextIndex];

        if (nextRound.roundType === 'Pools') {
            const promotion = nextRound.promotion ?? 100;
            const promoted = getPromotedFencers(sortedFencers, promotion);
            navigation.navigate('PoolsPage', {
                event,
                currentRoundIndex: nextIndex,
                fencers: promoted,
                poolCount: event.poolCount,      // or nextRound-specific values if stored
                fencersPerPool: event.fencersPerPool,
            });
        } else {
            // DE
            const promo = nextRound.promotion ?? 100;
            const finalFencers = getPromotedFencers(sortedFencers, promo);
            const bracketData = buildDEBracket(finalFencers);

            navigation.navigate('DEBracketPage', {
                event,
                currentRoundIndex: nextIndex,
                bracketData,
            });
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {pools.map((pool, index) => {
                const isCompleted = completedPools[index];
                return (
                    <View
                        key={index}
                        style={[
                            styles.poolContainer,
                            isCompleted && {
                                borderColor: 'green',
                                backgroundColor: '#ccffcc',
                            },
                        ]}
                    >
                        <TouchableOpacity onPress={() => togglePool(index)} style={styles.poolHeader}>
                            <View style={styles.poolHeaderRow}>
                                <Text style={styles.poolHeaderText}>
                                    Pool {index + 1} : {pool.length} fencer
                                    {pool.length !== 1 ? 's' : ''}
                                </Text>
                                <Text style={styles.arrowText}>
                                    {expandedPools[index] ? '▼' : '▶'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {expandedPools[index] && (
                            <View style={styles.fencerList}>
                                {pool.map((fencer, i) => (
                                    <Text key={i} style={styles.fencerText}>
                                        {fencer.lastName}, {fencer.firstName}, {fencer.rating}
                                    </Text>
                                ))}

                                {/* If not completed, show "Referee" button */}
                                {!isCompleted && (
                                    <TouchableOpacity
                                        style={styles.refButton}
                                        onPress={() => handleRefereePress(index)}
                                    >
                                        <Text style={styles.refButtonText}>Referee</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Demo "Mark Completed" button */}
                                {!isCompleted && (
                                    <TouchableOpacity
                                        style={[styles.refButton, { backgroundColor: 'green', marginTop: 8 }]}
                                        onPress={() => handleMarkPoolCompleted(index)}
                                    >
                                        <Text style={styles.refButtonText}>Mark Completed (Demo)</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                );
            })}

            {/* If all pools done => show "Go to Next Round" */}
            {allCompleted && (
                <TouchableOpacity style={styles.nextRoundButton} onPress={handleGoToNextRound}>
                    <Text style={styles.nextRoundButtonText}>Go to Next Round</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
};

export default PoolsPage;

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    poolContainer: {
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    poolHeader: {
        padding: 15,
        backgroundColor: '#007AFF',
    },
    poolHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    poolHeaderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    arrowText: {
        color: '#fff',
        fontSize: 30,
        marginRight: 10,
    },
    fencerList: {
        padding: 15,
        backgroundColor: '#f9f9f9',
    },
    fencerText: {
        fontSize: 16,
        marginBottom: 10,
    },
    refButton: {
        backgroundColor: '#000080',
        paddingVertical: 10,
        borderRadius: 6,
        marginTop: 10,
        alignItems: 'center',
    },
    refButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    nextRoundButton: {
        backgroundColor: 'orange',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 20,
    },
    nextRoundButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
