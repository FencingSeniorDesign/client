// src/navigation/screens/BoutOrderPage.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Fencer, Bout } from '../navigation/types';
import { useBoutsForPool, useUpdatePoolBoutScores, usePools } from '../../data/TournamentDataHooks';
import { assignPoolPositions, getBoutOrder } from '../utils/BoutOrderUtils';
import tournamentClient from '../../networking/TournamentClient';
import ConnectionStatusBar from '../../networking/components/ConnectionStatusBar';

type BoutOrderPageRouteProps = RouteProp<RootStackParamList, 'BoutOrderPage'>;
type BoutOrderPageNavProp = StackNavigationProp<RootStackParamList, 'BoutOrderPage'>;

const BoutOrderPage: React.FC = () => {
    const route = useRoute<BoutOrderPageRouteProps>();
    const navigation = useNavigation<BoutOrderPageNavProp>();
    const { roundId, poolId, isRemote = false } = route.params;

    // Use React Query hooks, ensuring they respect remote status
    const { data: boutsData, isLoading: boutsLoading, error: boutsError } = useBoutsForPool(roundId, poolId);
    const { data: poolsData, isLoading: poolsLoading, error: poolsError } = usePools(roundId);
    const updateBoutScoresMutation = useUpdatePoolBoutScores();

    const [bouts, setBouts] = useState<Bout[]>([]);
    const [fencers, setFencers] = useState<Fencer[]>([]);
    const [expandedBoutIndex, setExpandedBoutIndex] = useState<number | null>(null);
    const [protectedScores, setProtectedScores] = useState<boolean>(false);
    const [alterModalVisible, setAlterModalVisible] = useState<boolean>(false);
    const [alterIndex, setAlterIndex] = useState<number | null>(null);
    const [alterScoreA, setAlterScoreA] = useState<string>('0');
    const [alterScoreB, setAlterScoreB] = useState<string>('0');

    // Toggle for double stripping mode.
    const [doubleStripping, setDoubleStripping] = useState<boolean>(false);
    const activeCount = doubleStripping ? 2 : 1;
    const onDeckCount = doubleStripping ? 2 : 1;

    // Extract fencers from pools data
    useEffect(() => {
        if (poolsData) {
            const currentPool = poolsData.find(pool => pool.poolid === poolId);
            if (currentPool && currentPool.fencers) {
                // Apply club-based pool positions
                const fencersWithPositions = assignPoolPositions(currentPool.fencers);
                setFencers(fencersWithPositions);
            }
        }
    }, [poolsData, poolId]);

    // Process the bouts data when it loads from the hook
    useEffect(() => {
        if (boutsData && fencers.length > 0) {
            console.log(`Received bout data for pool ${poolId} (Remote: ${isRemote}):`,
                JSON.stringify(boutsData.slice(0, 1))); // Log first bout for debugging

            // Get the official bout order based on pool size and club affiliations
            const poolSize = fencers.length;
            const boutOrder = getBoutOrder(poolSize, fencers);
            
            // Map the bout data to our Bout objects
            const fetchedBouts: Bout[] = boutsData.map((row: any) => {
                // Create consistent Bout objects regardless of data source
                const fencerA: Fencer = {
                    id: row.left_fencerid,
                    fname: row.left_fname,
                    lname: row.left_lname,
                    club: row.left_club,
                    clubid: row.left_clubid,
                    clubName: row.left_clubname,
                    clubAbbreviation: row.left_clubabbreviation,
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0,
                    poolNumber: row.left_poolposition,
                };
                const fencerB: Fencer = {
                    id: row.right_fencerid,
                    fname: row.right_fname,
                    lname: row.right_lname,
                    club: row.right_club,
                    clubid: row.right_clubid,
                    clubName: row.right_clubname,
                    clubAbbreviation: row.right_clubabbreviation,
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0,
                    poolNumber: row.right_poolposition,
                };
                const scoreA = row.left_score ?? 0;
                const scoreB = row.right_score ?? 0;
                const status = (scoreA !== 0 || scoreB !== 0) ? 'completed' : 'pending';
                const bout = { id: row.id, fencerA, fencerB, scoreA, scoreB, status };
                
                // Add boutOrderPosition for sorting
                const boutPosition = boutOrder.findIndex(([posA, posB]) => {
                    return (
                        (fencerA.poolNumber === posA && fencerB.poolNumber === posB) || 
                        (fencerA.poolNumber === posB && fencerB.poolNumber === posA)
                    );
                });
                
                return { ...bout, boutOrderPosition: boutPosition !== -1 ? boutPosition : Number.MAX_SAFE_INTEGER };
            });

            // Sort bouts according to the official bout order positions
            const sortedBouts = [...fetchedBouts].sort((a, b) => a.boutOrderPosition - b.boutOrderPosition);
            
            console.log('Sorted bouts by official bout order:', 
                sortedBouts.map(b => `${b.fencerA.poolNumber}-${b.fencerB.poolNumber} (pos: ${b.boutOrderPosition})`));
                
            setBouts(sortedBouts);
        }
    }, [boutsData, fencers, poolId, isRemote]);

    // For pending bouts, compute a pendingRank based on order in the list.
    let pendingCounter = 0;
    const getPendingRank = (bout: Bout): number | null => {
        if (bout.status === 'pending') {
            return pendingCounter++;
        }
        return null;
    };

    // All bouts (active or not) are interactive for altering scores when protectedScores is off.
    const handleBoutPress = (index: number) => {
        setExpandedBoutIndex(prev => (prev === index ? null : index));
    };

    const handleSubmitScores = async (index: number) => {
        const bout = bouts[index];
        try {
            console.log(`Submitting scores for bout ${bout.id}: ${bout.scoreA}-${bout.scoreB}`);
            const result = await updateBoutScoresMutation.mutateAsync({
                boutId: bout.id,
                scoreA: bout.scoreA,
                scoreB: bout.scoreB,
                fencerAId: bout.fencerA.id!,
                fencerBId: bout.fencerB.id!,
                roundId,
                poolId
            });
            console.log(`Score update completed with result:`, result);
            setExpandedBoutIndex(null);
        } catch (error) {
            console.error("Error updating bout scores:", error);
            Alert.alert("Error", "Failed to update bout scores. Please try again.");
        }
    };

    const handleScoreChange = (index: number, which: 'A' | 'B', val: string) => {
        const intVal = parseInt(val, 10) || 0;
        const updatedBouts = bouts.map((b, i) => {
            if (i === index) {
                return which === 'A' ? { ...b, scoreA: intVal } : { ...b, scoreB: intVal };
            }
            return b;
        });
        setBouts(updatedBouts);
    };

    // Allow altering scores regardless of bout status if protectedScores is off.
    const handleBoutLongPress = (index: number) => {
        if (protectedScores) return;
        setAlterIndex(index);
        setAlterScoreA(String(bouts[index].scoreA));
        setAlterScoreB(String(bouts[index].scoreB));
        setAlterModalVisible(true);
    };

    const handleAlterSave = async () => {
        if (alterIndex === null) return;
        const bout = bouts[alterIndex];
        const newScoreA = parseInt(alterScoreA, 10) || 0;
        const newScoreB = parseInt(alterScoreB, 10) || 0;
        try {
            console.log(`Altering scores for bout ${bout.id} to ${newScoreA}-${newScoreB}`);
            const result = await updateBoutScoresMutation.mutateAsync({
                boutId: bout.id,
                scoreA: newScoreA,
                scoreB: newScoreB,
                fencerAId: bout.fencerA.id!,
                fencerBId: bout.fencerB.id!,
                roundId,
                poolId
            });
            console.log(`Score alteration completed with result:`, result);
            setAlterModalVisible(false);
            setAlterIndex(null);
        } catch (error) {
            console.error("Error updating bout scores:", error);
            Alert.alert("Error", "Failed to update bout scores. Please try again.");
        }
    };

    const openRefModuleForBout = (index: number) => {
        const bout = bouts[index];
        navigation.navigate('RefereeModule', {
            boutIndex: index,
            fencer1Name: bout.fencerA.lname || bout.fencerA.fname,
            fencer2Name: bout.fencerB.lname || bout.fencerB.fname,
            currentScore1: bout.scoreA,
            currentScore2: bout.scoreB,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    console.log(`Saving scores from ref module for bout ${bout.id}: ${score1}-${score2}`);
                    const result = await updateBoutScoresMutation.mutateAsync({
                        boutId: bout.id,
                        scoreA: score1,
                        scoreB: score2,
                        fencerAId: bout.fencerA.id!,
                        fencerBId: bout.fencerB.id!,
                        roundId,
                        poolId
                    });
                    console.log(`Ref module score update completed with result:`, result);
                } catch (error) {
                    console.error("Error updating bout scores:", error);
                }
            },
        });
    };

    // Function to update every bout with random scores (0-5) and send the update to the database.
    const handleRandomScores = async () => {
        // Update each bout with random scores.
        const updatedBouts = await Promise.all(bouts.map(async (bout) => {
            const randomScoreA = Math.floor(Math.random() * 6); // generates 0-5
            const randomScoreB = Math.floor(Math.random() * 6);
            try {
                console.log(`Updating bout ${bout.id} with random scores: ${randomScoreA}-${randomScoreB}`);
                const result = await updateBoutScoresMutation.mutateAsync({
                    boutId: bout.id,
                    scoreA: randomScoreA,
                    scoreB: randomScoreB,
                    fencerAId: bout.fencerA.id!,
                    fencerBId: bout.fencerB.id!,
                    roundId,
                    poolId
                });
                console.log(`Random score update for bout ${bout.id} completed with result:`, result);
                return { ...bout, scoreA: randomScoreA, scoreB: randomScoreB, status: 'completed' as 'completed' | 'pending' | 'active' };
            } catch (error) {
                console.error(`Error updating bout ${bout.id} with random scores:`, error);
                Alert.alert("Error", `Failed to update bout ${bout.id} with random scores.`);
                return bout;
            }
        }));
        setBouts(updatedBouts);
    };

    // Show loading state
    if (boutsLoading || poolsLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading bouts...</Text>
            </View>
        );
    }

    // Show error message if there was an error
    if (boutsError || poolsError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error loading bouts: {(boutsError || poolsError)?.toString()}</Text>
            </View>
        );
    }

    // Render each bout using the original order.
    const renderBoutWithRank = (bout: Bout, index: number) => {
        const pendingRank = bout.status === 'pending' ? getPendingRank(bout) : null;

        // Determine winner for completed bouts.
        let winnerId: number | null = null;
        if (bout.status === 'completed') {
            if (bout.scoreA > bout.scoreB) {
                winnerId = bout.fencerA.id || null;
            } else if (bout.scoreB > bout.scoreA) {
                winnerId = bout.fencerB.id || null;
            }
        }

        // Apply styling for pending bouts based on pendingRank.
        let styleOverride = {};
        if (bout.status === 'pending' && pendingRank !== null) {
            if (pendingRank < activeCount) {
                styleOverride = { borderColor: green, borderWidth: 2 };
            } else if (pendingRank < activeCount + onDeckCount) {
                styleOverride = { borderColor: green, borderWidth: 2, borderStyle: 'dashed', opacity: 0.8 };
            } else {
                styleOverride = { borderColor: '#ccc', borderWidth: 1, opacity: 0.5 };
            }
        } else {
            styleOverride = { borderColor: mediumGrey, borderWidth: 1, opacity: 0.5 };
        }

        return (
            <View key={index} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleBoutPress(index)}
                    onLongPress={() => handleBoutLongPress(index)}
                    style={[styles.boutContainer, styleOverride]}
                >
                    <View style={styles.fencerBox}>
                        <Text style={[styles.fencerText, winnerId === bout.fencerA.id && styles.winnerText]}>
                            {`(${bout.fencerA.poolNumber || '-'}) ${bout.fencerA.fname}`}
                            {bout.fencerA.clubAbbreviation && ` (${bout.fencerA.clubAbbreviation})`}
                        </Text>
                    </View>
                    <Text style={styles.middleText}>
                        {bout.status === 'completed' ? `${bout.scoreA}-${bout.scoreB}` : 'VS'}
                    </Text>
                    <View style={styles.fencerBox}>
                        <Text style={[styles.fencerText, winnerId === bout.fencerB.id && styles.winnerText]}>
                            {`(${bout.fencerB.poolNumber || '-'}) ${bout.fencerB.fname}`}
                            {bout.fencerB.clubAbbreviation && ` (${bout.fencerB.clubAbbreviation})`}
                        </Text>
                    </View>
                </TouchableOpacity>
                {expandedBoutIndex === index && bout.status === 'pending' && (
                    <View style={styles.scoreEntryContainer}>
                        <Text style={styles.scoreEntryTitle}>Enter Scores</Text>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>{bout.fencerA.fname}:</Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={String(bout.scoreA)}
                                onChangeText={(val) => handleScoreChange(index, 'A', val)}
                            />
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>{bout.fencerB.fname}:</Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={String(bout.scoreB)}
                                onChangeText={(val) => handleScoreChange(index, 'B', val)}
                            />
                        </View>
                        <View style={styles.scoreButtonsRow}>
                            <TouchableOpacity style={styles.enterButton} onPress={() => handleSubmitScores(index)}>
                                <Text style={styles.enterButtonText}>Enter</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.refModuleButton} onPress={() => openRefModuleForBout(index)}>
                                <Text style={styles.refModuleButtonText}>Ref Module</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Show connection status if in remote mode */}
            {isRemote && <ConnectionStatusBar compact={true} />}

            {/* Header with double stripping toggle */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Bout Order</Text>
                <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setDoubleStripping(prev => !prev)}
                >
                    <Text style={styles.toggleButtonText}>
                        {doubleStripping ? 'Double Stripping On' : 'Double Stripping Off'}
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.toggleButtonSmall, protectedScores && styles.toggleButtonActive]}
                    onPress={() => setProtectedScores(!protectedScores)}
                >
                    <Text style={styles.toggleButtonText}>Protected Scores</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Bout Order</Text>
                {bouts.map((bout, index) => renderBoutWithRank(bout, index))}
            </ScrollView>

            {/* Random Scores Button */}
            <TouchableOpacity style={styles.randomScoresButton} onPress={handleRandomScores}>
                <Text style={styles.randomScoresButtonText}>Random Scores</Text>
            </TouchableOpacity>

            {/* Alter Scores Modal */}
            <Modal visible={alterModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.alterModalContent}>
                        <Text style={styles.alterModalTitle}>Alter Scores</Text>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>Score A:</Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={alterScoreA}
                                onChangeText={setAlterScoreA}
                            />
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>Score B:</Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={alterScoreB}
                                onChangeText={setAlterScoreB}
                            />
                        </View>
                        <View style={styles.scoreButtonsRow}>
                            <TouchableOpacity style={styles.enterButton} onPress={handleAlterSave}>
                                <Text style={styles.enterButtonText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.enterButton, { backgroundColor: '#666' }]} onPress={() => setAlterModalVisible(false)}>
                                <Text style={styles.enterButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Loading overlay for mutations */}
            {updateBoutScoresMutation.isPending && (
                <View style={styles.modalOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Updating scores...</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

export default BoutOrderPage;

/** ------------ Styles ------------ */
const navyBlue = '#000080';
const darkGrey = '#4f4f4f';
const mediumGrey = '#888888';
const green = '#4CAF50';
const red = '#FF0000';

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#001f3f',
        padding: 10,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    toggleButton: {
        padding: 8,
        backgroundColor: green,
        borderRadius: 4,
    },
    toggleButtonSmall: {
        padding: 8,
        backgroundColor: '#ccc',
        borderRadius: 4,
        alignSelf: 'flex-end',
        margin: 10,
    },
    toggleButtonActive: {
        backgroundColor: green,
    },
    toggleButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        padding: 16,
        fontWeight: 'bold',
    },
    boutContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        padding: 8,
    },
    fencerBox: {
        flex: 1,
        padding: 12,
        borderRadius: 6,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    fencerText: {
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    winnerText: {
        color: green,
        fontWeight: 'bold',
    },
    middleText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scoreEntryContainer: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 6,
        marginTop: 4,
    },
    scoreEntryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    scoreFencerLabel: {
        fontSize: 16,
        marginRight: 8,
    },
    scoreInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        width: 60,
        padding: 6,
        textAlign: 'center',
        fontSize: 16,
    },
    scoreButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    enterButton: {
        backgroundColor: navyBlue,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        flex: 1,
        marginRight: 4,
    },
    enterButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    refModuleButton: {
        backgroundColor: navyBlue,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        flex: 1,
        marginLeft: 4,
    },
    refModuleButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alterModalContent: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        width: '80%',
    },
    alterModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    loadingContainer: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: red,
        fontSize: 16,
        textAlign: 'center',
    },
    randomScoresButton: {
        backgroundColor: green,
        padding: 12,
        borderRadius: 6,
        margin: 16,
        alignItems: 'center',
    },
    randomScoresButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export { BoutOrderPage };