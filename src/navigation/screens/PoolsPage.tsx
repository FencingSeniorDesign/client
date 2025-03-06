// src/navigation/screens/PoolsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    dbGetPoolsForRound,
    dbGetBoutsForPool,
    dbMarkRoundAsComplete,
    dbGetSeedingForRound,
} from '../../db/TournamentDatabaseUtils';
import { RootStackParamList, Event, Fencer } from '../navigation/types';

type PoolsPageRouteParams = {
    event: Event;
    currentRoundIndex: number;
    roundId: number;
};

type PoolsPageNavProp = NativeStackNavigationProp<RootStackParamList, 'PoolsPage'>;

const PoolsPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: PoolsPageRouteParams }, 'params'>>();
    const navigation = useNavigation<PoolsPageNavProp>();

    const { event, currentRoundIndex, roundId } = route.params;
    const [pools, setPools] = useState<{ poolid: number; fencers: Fencer[] }[]>([]);
    const [expandedPools, setExpandedPools] = useState<boolean[]>([]);
    const [poolCompletionStatus, setPoolCompletionStatus] = useState<{ [poolId: number]: boolean }>({});

    // For strip number modal
    const [stripModalVisible, setStripModalVisible] = useState<boolean>(false);
    const [currentPoolForStrip, setCurrentPoolForStrip] = useState<number | null>(null);
    const [stripInput, setStripInput] = useState<string>('');
    const [poolStrips, setPoolStrips] = useState<{ [poolId: number]: number }>({});

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
            const statusObj: { [poolId: number]: boolean } = {};
            await Promise.all(
                pools.map(async (pool) => {
                    const bouts = await dbGetBoutsForPool(roundId, pool.poolid);
                    const complete = bouts.every(bout => {
                        const scoreA = bout.left_score ?? 0;
                        const scoreB = bout.right_score ?? 0;
                        return scoreA !== 0 || scoreB !== 0;
                    });
                    statusObj[pool.poolid] = complete;
                })
            );
            setPoolCompletionStatus(statusObj);
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

    const handlePoolLongPress = (poolId: number) => {
        setCurrentPoolForStrip(poolId);
        setStripInput('');
        setStripModalVisible(true);
    };

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

    // Seeding modal code
    const fetchSeeding = async () => {
        try {
            const seedingData = await dbGetSeedingForRound(roundId);
            console.log("Seeding data fetched:", seedingData);
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
                            await dbMarkRoundAsComplete(roundId);
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
                            {seeding.map((item) => (
                                <View key={item.fencer.id} style={styles.seedingItem}>
                                    {/* Put them on the same line via flexDirection: 'row' */}
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
        // Let each item sit on its own row
        // But keep seed number and name side-by-side
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    // We add a new style for a row:
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
