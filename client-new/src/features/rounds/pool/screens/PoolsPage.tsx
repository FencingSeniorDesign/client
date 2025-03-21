import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Event, Fencer } from '../../../../core/types';
import { useNetworkStatus } from '../../../../infrastructure/networking/client';
import { useQueryClient } from '@tanstack/react-query';
import ConnectionStatusBar from '../../../../infrastructure/networking/components/ConnectionStatusBar';
import { usePoolQueries } from '../hooks/usePoolQueries';
import { usePoolBoutQueries } from '../hooks/usePoolBoutQueries';
import { useRoundQueries } from '../../hooks/useRoundQueries';

type PoolsPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
    isRemote?: boolean;
};

type RootStackParamList = {
    PoolsPage: PoolsPageRouteParams;
    BoutOrderPage: { roundId: number; poolId: number; isRemote?: boolean };
    RoundResults: { roundId: number; eventId: number; currentRoundIndex: number };
    // Other routes in your app
};

type PoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: PoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<PoolsPageNavProp>();
    const { isConnected } = useNetworkStatus();
    const queryClient = useQueryClient();

    const { event, currentRoundIndex, roundId, isRemote = false } = route.params;
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);
    const [poolCompletionStatus, setPoolCompletionStatus] = useState<{ [poolId: number]: boolean }>({});

    // For strip number modal
    const [stripModalVisible, setStripModalVisible] = useState<boolean>(false);
    const [currentPoolForStrip, setCurrentPoolForStrip] = useState<number | null>(null);
    const [stripInput, setStripInput] = useState<string>('');
    const [poolStrips, setPoolStrips] = useState<{ [poolId: number]: number }>({});

    // Seeding modal state
    const [seedingModalVisible, setSeedingModalVisible] = useState<boolean>(false);

    // Use the hooks
    const poolQueries = usePoolQueries();
    const poolBoutQueries = usePoolBoutQueries();
    const roundQueries = useRoundQueries();
    
    // Get the pools data
    const { 
        data: pools = [], 
        isLoading: poolsLoading, 
        error: poolsError 
    } = poolQueries.useGetPoolsForRound(roundId);
    
    // Get the seeding data
    const {
        data: seeding = [],
        isLoading: seedingLoading,
        error: seedingError
    } = poolBoutQueries.useGetSeedingForRound(roundId);
    
    // Mark round as complete mutation
    const markRoundCompleteQuery = roundQueries.useMarkAsComplete();

    // Set expanded pools array when pools data changes
    useEffect(() => {
        if (pools && pools.length > 0) {
            setExpandedPools(new Array(pools.length).fill(false));
        }
    }, [pools]);

    // Get the completion status for all pools
    const poolCompletionQueries = useMemo(() => {
        if (!pools || pools.length === 0 || !roundId) return [];
        
        return pools.map(pool => 
            poolBoutQueries.useCheckPoolCompletion(roundId, pool.poolid)
        );
    }, [pools, roundId, poolBoutQueries]);
    
    // Update completion status when queries complete
    useEffect(() => {
        if (!pools || pools.length === 0) return;
        
        const statusObj: { [poolId: number]: boolean } = {};
        poolCompletionQueries.forEach((query, index) => {
            if (query.data !== undefined && pools[index]) {
                statusObj[pools[index].poolid] = query.data;
            }
        });
        
        // Only update if we have status for at least one pool
        if (Object.keys(statusObj).length > 0) {
            setPoolCompletionStatus(prev => ({...prev, ...statusObj}));
        }
    }, [pools, poolCompletionQueries]);

    // Refresh queries when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (roundId) {
                // Refresh the pool data and completion status
                pools.forEach((pool) => {
                    queryClient.invalidateQueries({
                        queryKey: poolBoutQueries.poolBoutKeys.filter({ 
                            roundId, 
                            poolId: pool.poolid,
                            completion: true 
                        })
                    });
                });
            }
        }, [roundId, pools, queryClient, poolBoutQueries.poolBoutKeys])
    );

    // Toggle pool expansion
    const togglePool = (index: number) => {
        setExpandedPools(prev => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };

    // Handle long press on pool to set strip number
    const handlePoolLongPress = (poolId: number) => {
        setCurrentPoolForStrip(poolId);
        setStripInput('');
        setStripModalVisible(true);
    };

    // Submit strip number from modal
    const submitStripNumber = () => {
        if (currentPoolForStrip !== null && stripInput.trim() !== '') {
            const num = parseInt(stripInput, 10);
            if (!isNaN(num)) {
                setPoolStrips(prev => ({ ...prev, [currentPoolForStrip]: num }));
            }
        }
        setStripModalVisible(false);
        setCurrentPoolForStrip(null);
        setStripInput('');
    };

    // Fetch seeding data and show modal
    const fetchSeeding = () => {
        setSeedingModalVisible(true);
    };

    // Confirm ending the round
    const confirmEndRound = () => {
        Alert.alert(
            "End Round",
            "Are you sure you want to end the round?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes", onPress: async () => {
                        try {
                            await markRoundCompleteQuery.mutateAsync(roundId);
                            
                            navigation.navigate('RoundResults', {
                                roundId,
                                eventId: event.id,
                                currentRoundIndex
                            });
                        } catch (error) {
                            console.error("Error marking round as complete:", error);
                            Alert.alert(
                                "Error", 
                                "Failed to complete the round. Please try again."
                            );
                        }
                    }
                }
            ]
        );
    };

    // Show loading state
    if (poolsLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading pools data...</Text>
            </View>
        );
    }

    // Show error state
    if (poolsError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error loading pools: {poolsError.toString()}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {isRemote && <ConnectionStatusBar compact={true} />}
            <Text style={styles.title}>Pools</Text>

            <TouchableOpacity
                style={styles.viewSeedingButton}
                onPress={fetchSeeding}
            >
                <Text style={styles.viewSeedingButtonText}>View Seeding</Text>
            </TouchableOpacity>

            {pools.map((poolObj, index) => {
                const displayPoolNumber = poolObj.poolid + 1;
                const isExpanded = expandedPools[index];
                const complete = poolCompletionStatus[poolObj.poolid] || false;
                const stripText = poolStrips[poolObj.poolid] ? ` on strip ${poolStrips[poolObj.poolid]}` : '';
                const headerText = `Pool ${displayPoolNumber} : ${poolObj.fencers.length} fencer${poolObj.fencers.length !== 1 ? 's' : ''}${stripText}`;
                return (
                    <View key={poolObj.poolid} style={styles.poolContainer}>
                        <TouchableOpacity
                            onPress={() => togglePool(index)}
                            onLongPress={() => handlePoolLongPress(poolObj.poolid)}
                            style={[
                                styles.poolHeader,
                                complete ? styles.poolHeaderComplete : styles.poolHeaderOngoing,
                            ]}
                        >
                            <View style={styles.poolHeaderRow}>
                                <Text style={styles.poolHeaderText}>{headerText}</Text>
                                <Text style={styles.arrowText}>{isExpanded ? '▼' : '▶'}</Text>
                            </View>
                        </TouchableOpacity>
                        {isExpanded && (
                            <View style={styles.fencerList}>
                                {poolObj.fencers.map((fencer, i) => (
                                    <Text key={i} style={styles.fencerText}>
                                        {fencer.lname}, {fencer.fname}
                                    </Text>
                                ))}
                                <TouchableOpacity
                                    style={styles.refereeButton}
                                    onPress={() =>
                                        navigation.navigate('BoutOrderPage', {
                                            roundId: roundId,
                                            poolId: poolObj.poolid,
                                            isRemote
                                        })
                                    }
                                >
                                    <Text style={styles.refereeButtonText}>
                                        {complete ? "Edit Completed Pool" : "Referee"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}

            <TouchableOpacity
                style={[
                    styles.endRoundButton,
                    !Object.values(poolCompletionStatus).every(status => status) && styles.disabledButton,
                ]}
                disabled={!Object.values(poolCompletionStatus).every(status => status)}
                onPress={confirmEndRound}
            >
                <Text style={styles.endRoundButtonText}>End Round</Text>
            </TouchableOpacity>

            {/* Strip Number Modal */}
            <Modal
                visible={stripModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setStripModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter Strip Number</Text>
                        <TextInput
                            style={styles.stripInput}
                            keyboardType="number-pad"
                            placeholder="e.g., 17"
                            value={stripInput}
                            onChangeText={setStripInput}
                        />
                        <TouchableOpacity style={styles.modalButton} onPress={submitStripNumber}>
                            <Text style={styles.modalButtonText}>Submit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setStripModalVisible(false)}>
                            <Text style={styles.modalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Seeding Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={seedingModalVisible}
                onRequestClose={() => setSeedingModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Current Seeding</Text>
                        <ScrollView style={styles.seedingList}>
                            {seedingLoading ? (
                                <ActivityIndicator size="small" color="#0000ff" />
                            ) : seedingError ? (
                                <Text style={styles.errorText}>Error loading seeding data</Text>
                            ) : seeding.map((item) => (
                                <View key={item.fencer.id} style={styles.seedingItem}>
                                    <View style={styles.seedingRow}>
                                        <Text style={styles.seedNumber}>{item.seed}</Text>
                                        <Text style={styles.seedFencer}>
                                            {item.fencer.lname}, {item.fencer.fname}
                                            {item.fencer.frating !== 'U' && ` (${item.fencer.frating}${item.fencer.fyear})`}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSeedingModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default PoolsPage;

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        backgroundColor: '#ffeded',
        padding: 16,
        borderRadius: 8,
        marginVertical: 10,
    },
    errorText: {
        color: 'red',
    },
    infoText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginVertical: 10,
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
    },
    poolHeaderOngoing: {
        backgroundColor: '#007AFF',
    },
    poolHeaderComplete: {
        backgroundColor: '#4CAF50',
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
    refereeButton: {
        backgroundColor: '#000080',
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 10,
    },
    refereeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    endRoundButton: {
        backgroundColor: '#228B22',
        paddingVertical: 15,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 20,
    },
    endRoundButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    viewSeedingButton: {
        backgroundColor: '#4682B4',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 15,
    },
    viewSeedingButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    seedingList: {
        maxHeight: 700,
    },
    seedingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    seedingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    seedNumber: {
        width: 40,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginRight: 8,
    },
    seedFencer: {
        flex: 1,
        fontSize: 16,
    },
    closeButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 15,
        width: '60%',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    stripInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        width: '60%',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        marginBottom: 10,
        width: '60%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});