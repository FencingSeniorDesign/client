// RoundResults.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, Fencer } from '../navigation/types';
import { dbGetPoolsForRound, dbGetBoutsForPool } from '../../db/TournamentDatabaseUtils';

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
    const route = useRoute<RoundResultsRouteProp>();
    const { roundId } = route.params;
    const [poolResults, setPoolResults] = useState<PoolResult[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function fetchResults() {
            try {
                // Fetch all pools for this round
                const pools = await dbGetPoolsForRound(roundId);
                const results: PoolResult[] = [];

                // Process each pool
                for (const pool of pools) {
                    // Initialize stats for each fencer in this pool.
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

                    // Retrieve bouts for the current pool.
                    const bouts = await dbGetBoutsForPool(roundId, pool.poolid);

                    bouts.forEach((bout: any) => {
                        const leftId = bout.left_fencerid;
                        const rightId = bout.right_fencerid;
                        const leftScore = bout.left_score ?? 0;
                        const rightScore = bout.right_score ?? 0;

                        // Update left fencer's stats.
                        if (statsMap.has(leftId)) {
                            const leftStats = statsMap.get(leftId)!;
                            leftStats.boutsCount += 1;
                            leftStats.touchesScored += leftScore;
                            leftStats.touchesReceived += rightScore;
                            if (leftScore > rightScore) {
                                leftStats.wins += 1;
                            }
                        }
                        // Update right fencer's stats.
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

                    // Compute win rate and indicator for each fencer.
                    const stats: FencerStats[] = [];
                    statsMap.forEach(stat => {
                        if (stat.boutsCount > 0) {
                            stat.winRate = (stat.wins / stat.boutsCount) * 100;
                        } else {
                            stat.winRate = 0;
                        }
                        stat.indicator = stat.touchesScored - stat.touchesReceived;
                        stats.push(stat);
                    });

                    // Optionally sort stats—for example, by win rate descending.
                    stats.sort((a, b) => b.winRate - a.winRate);

                    results.push({
                        poolid: pool.poolid,
                        stats,
                    });
                }
                setPoolResults(results);
            } catch (error) {
                console.error("Error fetching round results:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchResults();
    }, [roundId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

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
        </ScrollView>
    );
};

export default RoundResults;

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
});
