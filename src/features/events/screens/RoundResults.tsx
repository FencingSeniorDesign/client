// src/navigation/screens/RoundResults.tsx
import React, { useState } from 'react';
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
import { useInitializeRound, useRoundResultsData } from '../../data/TournamentDataHooks';
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

/**
 * Round Results component for displaying pool results and navigating to the next round
 */
const RoundResults: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<RoundResultsRouteProp>();
    const { roundId, eventId, currentRoundIndex } = route.params;
    
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
        } finally {
            setIsInitializingNextRound(false);
        }
    };

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
    disabledButton: {
        backgroundColor: '#aaaaaa',
        opacity: 0.7,
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
