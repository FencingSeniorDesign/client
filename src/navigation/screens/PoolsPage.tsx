// In PoolsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dbGetPoolsForRound, dbGetBoutsForPool, dbMarkRoundAsComplete, dbGetSeedingForRound } from "../../db/TournamentDatabaseUtils";
import { RootStackParamList, Event, Fencer } from '../navigation/types';

type PoolsPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number; // Ensure roundId is provided when navigating here
};

type PoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: PoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<PoolsPageNavProp>();

    const { event, currentRoundIndex, roundId } = route.params;
    const [pools, setPools] = useState<{ poolid: number; fencers: Fencer[] }[]>([]);
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);
    const [allBoutsComplete, setAllBoutsComplete] = useState<boolean>(false);
    
    // Seeding modal state
    const [seedingModalVisible, setSeedingModalVisible] = useState<boolean>(false);
    const [seeding, setSeeding] = useState<{ seed: number; fencer: Fencer }[]>([]);

    useEffect(() => {
        async function fetchPools() {
            try {
                console.log("Fetching pools for roundId:", roundId);
                const poolsData = await dbGetPoolsForRound(roundId);
                console.log("Pools data fetched:", JSON.stringify(poolsData.map(pool => pool.fencers), null, 2));
                setPools(poolsData);
                setExpandedPools(new Array(poolsData.length).fill(false));
            } catch (error) {
                console.error("Error fetching pools from DB:", error);
            }
        }
        fetchPools();
    }, [roundId]);

    const checkBoutsCompletion = useCallback(async () => {
        try {
            const results = await Promise.all(
                pools.map(pool => dbGetBoutsForPool(roundId, pool.poolid))
            );
            const allBouts = results.flat();
            const complete = allBouts.every(bout => {
                const scoreA = bout.scoreA ?? null;
                const scoreB = bout.scoreB ?? null;
                return scoreA !== 0 || scoreB !== 0;
            });
            setAllBoutsComplete(complete);
        } catch (error) {
            console.error("Error checking bout completion:", error);
        }
    }, [pools, roundId]);

    useEffect(() => {
        if (pools.length > 0) {
            checkBoutsCompletion();
        }
    }, [pools, checkBoutsCompletion]);

    useFocusEffect(
        useCallback(() => {
            if (pools.length > 0) {
                checkBoutsCompletion();
            }
        }, [pools, checkBoutsCompletion])
    );

    const togglePool = (index: number) => {
        setExpandedPools(prev => {
            const updated = [...prev];
            updated[index] = !updated[index];
            return updated;
        });
    };
    
    const fetchSeeding = async () => {
        try {
            const seedingData = await dbGetSeedingForRound(roundId);
            setSeeding(seedingData);
            setSeedingModalVisible(true);
        } catch (error) {
            console.error("Error fetching seeding:", error);
            Alert.alert("Error", "Could not fetch seeding information.");
        }
    };

    const confirmEndRound = () => {
        Alert.alert(
            "End Round",
            "Are you sure you want to end the round?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes", onPress: async () => {
                        try {
                            // Mark the round as complete in the database.
                            await dbMarkRoundAsComplete(roundId);
                            // Then navigate to the RoundResults page.
                            navigation.navigate('RoundResults', { 
                                roundId, 
                                eventId: event.id,
                                currentRoundIndex 
                            });
                        } catch (error) {
                            console.error("Error marking round as complete:", error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {pools.length === 0 && (
                <Text style={styles.infoText}>
                    No pool assignments found. Please verify that the round has been initialized.
                </Text>
            )}
            
            <TouchableOpacity
                style={styles.viewSeedingButton}
                onPress={fetchSeeding}
            >
                <Text style={styles.viewSeedingButtonText}>View Seeding</Text>
            </TouchableOpacity>
            
            {pools.map((poolObj, index) => {
                const isExpanded = expandedPools[index];
                return (
                    <View key={poolObj.poolid} style={styles.poolContainer}>
                        <TouchableOpacity onPress={() => togglePool(index)} style={styles.poolHeader}>
                            <View style={styles.poolHeaderRow}>
                                <Text style={styles.poolHeaderText}>
                                    Pool {poolObj.poolid + 1} : {poolObj.fencers.length} fencer{poolObj.fencers.length !== 1 ? 's' : ''}
                                </Text>
                                <Text style={styles.arrowText}>
                                    {isExpanded ? '▼' : '▶'}
                                </Text>
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
                                        })
                                    }
                                >
                                    <Text style={styles.refereeButtonText}>Referee</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}
            
            <TouchableOpacity
                style={[
                    styles.endRoundButton,
                    !allBoutsComplete && styles.disabledButton
                ]}
                disabled={!allBoutsComplete}
                onPress={confirmEndRound}
            >
                <Text style={styles.endRoundButtonText}>End Round</Text>
            </TouchableOpacity>
            
            {/* Seeding Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={seedingModalVisible}
                onRequestClose={() => setSeedingModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Current Seeding</Text>
                        
                        <ScrollView style={styles.seedingList}>
                            {seeding.map((item) => (
                                <View key={item.fencer.id} style={styles.seedingItem}>
                                    <Text style={styles.seedNumber}>{item.seed}</Text>
                                    <Text style={styles.seedFencer}>
                                        {item.fencer.lname}, {item.fencer.fname}
                                        {item.fencer.frating !== 'U' && ` (${item.fencer.frating}${item.fencer.fyear})`}
                                    </Text>
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
    // New styles for seeding button and modal
    viewSeedingButton: {
        backgroundColor: '#4682B4', // Steel Blue
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
    modalContainer: {
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
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
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
        maxHeight: 400,
    },
    seedingItem: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    seedNumber: {
        width: 40,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
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
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
