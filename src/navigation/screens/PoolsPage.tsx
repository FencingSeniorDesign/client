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
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Event, Fencer } from '../navigation/types';
import {
    PoolResult,
    rankFencersFromPools,
    getPromotedFencers,
    buildPools,
    buildDEBracket,
} from '../utils/RoundAlgorithms';

type PoolsPageRouteProps = RouteProp<RootStackParamList, 'PoolsPage'>;
type PoolsPageNavProp = StackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<PoolsPageRouteProps>();
    const navigation = useNavigation<PoolsPageNavProp>();

    const {
        event,
        currentRoundIndex,
        fencers,
        poolCount,
        fencersPerPool,
    } = route.params;

    const [pools, setPools] = useState<Fencer[][]>([]);
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);
    const [completedPools, setCompletedPools] = useState<boolean[]>([]);
    const [poolResults, setPoolResults] = useState<PoolResult[][]>([]);

    useEffect(() => {
        const built = buildPools(fencers, poolCount, fencersPerPool);
        setPools(built);

        setExpandedPools(new Array(poolCount).fill(false));
        setCompletedPools(new Array(poolCount).fill(false));

        const blank: PoolResult[][] = [];
        for (let i = 0; i < poolCount; i++) {
            blank.push([]);
        }
        setPoolResults(blank);
    }, [fencers, poolCount, fencersPerPool]);

    const togglePool = (index: number) => {
        setExpandedPools((prev) => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };

    const handleRefereePress = (poolIndex: number) => {
        const poolFencers = pools[poolIndex];
        navigation.navigate('BoutOrderPage', {
            poolFencers,
        });
    };

    const handleMarkPoolCompleted = (poolIndex: number) => {
        const copy = [...completedPools];
        copy[poolIndex] = true;
        setCompletedPools(copy);
    };

    const allCompleted = completedPools.every((c) => c);

    const handleGoToNextRound = () => {
        if (!allCompleted) {
            Alert.alert("Pools not finished", "Complete all pools first.");
            return;
        }

        const sortedFencers = rankFencersFromPools(poolResults);
        if (!sortedFencers.length) {
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
                poolCount: event.poolCount,
                fencersPerPool: event.fencersPerPool,
            });
        } else {
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
                                        {fencer.lname}, {fencer.fname}, {fencer.erating}
                                    </Text>
                                ))}

                                {!isCompleted && (
                                    <TouchableOpacity
                                        style={styles.refButton}
                                        onPress={() => handleRefereePress(index)}
                                    >
                                        <Text style={styles.refButtonText}>Referee</Text>
                                    </TouchableOpacity>
                                )}

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
