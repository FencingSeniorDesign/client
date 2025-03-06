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
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Fencer, Bout } from '../navigation/types';
import { dbGetBoutsForPool, dbUpdateBoutScores } from '../../db/TournamentDatabaseUtils';

type BoutOrderPageRouteProps = RouteProp<RootStackParamList, 'BoutOrderPage'>;
type BoutOrderPageNavProp = StackNavigationProp<RootStackParamList, 'BoutOrderPage'>;

const BoutOrderPage: React.FC = () => {
    const route = useRoute<BoutOrderPageRouteProps>();
    const navigation = useNavigation<BoutOrderPageNavProp>();
    const { roundId, poolId } = route.params;

    const [bouts, setBouts] = useState<Bout[]>([]);
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

    // Load bouts from DB and pull each fencer’s pool id from the DB result.
    const loadBouts = async () => {
        try {
            const rows = await dbGetBoutsForPool(roundId, poolId);
            const fetchedBouts: Bout[] = rows.map((row: any) => {
                const fencerA: Fencer = {
                    id: row.left_fencerid,
                    fname: row.left_fname,
                    lname: row.left_lname,
                    erating: 'U',
                    eyear: 0,
                    frating: 'U',
                    fyear: 0,
                    srating: 'U',
                    syear: 0,
                    // Use the alias from the query:
                    poolNumber: row.left_poolposition,
                };
                const fencerB: Fencer = {
                    id: row.right_fencerid,
                    fname: row.right_fname,
                    lname: row.right_lname,
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
                return { id: row.id, fencerA, fencerB, scoreA, scoreB, status };
            });
            setBouts(fetchedBouts);
        } catch (error) {
            console.error("Error fetching bouts from DB:", error);
        }
    };

    useEffect(() => {
        loadBouts();
    }, [roundId, poolId]);

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
            await dbUpdateBoutScores(
                bout.id,
                bout.scoreA,
                bout.scoreB,
                bout.fencerA.id!,
                bout.fencerB.id!
            );
            await loadBouts();
            setExpandedBoutIndex(null);
        } catch (error) {
            console.error("Error updating bout scores in DB:", error);
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
            await dbUpdateBoutScores(
                bout.id,
                newScoreA,
                newScoreB,
                bout.fencerA.id!,
                bout.fencerB.id!
            );
            await loadBouts();
            setAlterModalVisible(false);
            setAlterIndex(null);
        } catch (error) {
            console.error("Error updating bout scores in DB:", error);
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
                    await dbUpdateBoutScores(
                        bout.id,
                        score1,
                        score2,
                        bout.fencerA.id!,
                        bout.fencerB.id!
                    );
                    await loadBouts();
                } catch (error) {
                    console.error("Error updating bout scores in DB:", error);
                }
            },
        });
    };

    // Render each bout using the original order.
    const renderBoutWithRank = (bout: Bout, index: number) => {
        const pendingRank = bout.status === 'pending' ? getPendingRank(bout) : null;

        // Determine winner for completed bouts.
        let winnerId: number | null = null;
        if (bout.status === 'completed') {
            if (bout.scoreA > bout.scoreB) {
                winnerId = bout.fencerA.id;
            } else if (bout.scoreB > bout.scoreA) {
                winnerId = bout.fencerB.id;
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
                        </Text>
                    </View>
                    <Text style={styles.middleText}>
                        {bout.status === 'completed' ? `${bout.scoreA}-${bout.scoreB}` : 'VS'}
                    </Text>
                    <View style={styles.fencerBox}>
                        <Text style={[styles.fencerText, winnerId === bout.fencerB.id && styles.winnerText]}>
                            {`(${bout.fencerB.poolNumber || '-'}) ${bout.fencerB.fname}`}
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
});

export { BoutOrderPage };
