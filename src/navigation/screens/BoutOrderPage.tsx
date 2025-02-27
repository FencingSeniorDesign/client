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

    // Reusable function to load bouts from the DB.
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
                };
                const scoreA = row.left_score ?? 0;
                const scoreB = row.right_score ?? 0;
                const status = (scoreA !== 0 || scoreB !== 0) ? 'completed' : 'pending';
                return {
                    id: row.id,
                    fencerA,
                    fencerB,
                    scoreA,
                    scoreB,
                    status,
                };
            });
            setBouts(fetchedBouts);
        } catch (error) {
            console.error("Error fetching bouts from DB:", error);
        }
    };

    // Load bouts when the component mounts or when roundId/poolId change.
    useEffect(() => {
        loadBouts();
    }, [roundId, poolId]);

    // Toggle expansion for a bout (to show/hide score entry UI).
    const handleBoutPress = (index: number) => {
        setExpandedBoutIndex(prev => (prev === index ? null : index));
    };

    // Submit scores for a bout, update the DB, then refresh the bout list.
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

    // Handle local score changes.
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

    // On long press, open the modal to alter scores (if not protected).
    const handleBoutLongPress = (index: number) => {
        if (protectedScores) return;
        if (bouts[index].status === 'completed') {
            setAlterIndex(index);
            setAlterScoreA(String(bouts[index].scoreA));
            setAlterScoreB(String(bouts[index].scoreB));
            setAlterModalVisible(true);
        }
    };

    // Save altered scores, update the DB, then refresh the bout list.
    const handleAlterSave = async () => {
        if (alterIndex === null) return;
        const index = alterIndex;
        const bout = bouts[index];
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

    // Navigate to the Referee Module for additional score entry.
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

    return (
        <View style={{ flex: 1 }}>
            {/* Top toggles */}
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.toggleButton, protectedScores && styles.toggleButtonActive]}
                    onPress={() => setProtectedScores(!protectedScores)}
                >
                    <Text style={styles.toggleButtonText}>Protected Scores</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Bout Order</Text>
                {bouts.map((bout, index) => {
                    let middleText = 'VS';
                    if (bout.status === 'completed') {
                        middleText = `${bout.scoreA}-${bout.scoreB}`;
                    }
                    let containerStyle;
                    if (bout.status === 'completed') {
                        containerStyle = styles.completedContainer;
                    } else if (bout.status === 'pending') {
                        containerStyle = styles.pendingContainer;
                    } else {
                        containerStyle = styles.activeContainer;
                    }
                    return (
                        <View key={index} style={{ marginBottom: 12 }}>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => handleBoutPress(index)}
                                onLongPress={() => handleBoutLongPress(index)}
                                style={[styles.boutContainer, containerStyle]}
                            >
                                <View style={styles.fencerBox}>
                                    <Text style={styles.fencerText}>{bout.fencerA.fname}</Text>
                                </View>
                                <Text style={styles.middleText}>{middleText}</Text>
                                <View style={styles.fencerBox}>
                                    <Text style={styles.fencerText}>{bout.fencerB.fname}</Text>
                                </View>
                            </TouchableOpacity>
                            {expandedBoutIndex === index && bout.status !== 'completed' && (
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
                                        <TouchableOpacity
                                            style={styles.enterButton}
                                            onPress={() => handleSubmitScores(index)}
                                        >
                                            <Text style={styles.enterButtonText}>Enter</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.refModuleButton}
                                            onPress={() => openRefModuleForBout(index)}
                                        >
                                            <Text style={styles.refModuleButtonText}>Ref Module</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                            <TouchableOpacity style={styles.enterButton} onPress={handleAlterSave}>
                                <Text style={styles.enterButtonText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.enterButton, { backgroundColor: '#666' }]}
                                onPress={() => setAlterModalVisible(false)}
                            >
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
const green = '#008000';
const red = '#FF0000';
const lightOpacityNavy = 'rgba(0, 0, 128, 0.5)';
const tieColor = '#ffffff99';

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 8,
    },
    toggleButton: {
        borderWidth: 1,
        borderColor: navyBlue,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 8,
    },
    toggleButtonActive: {
        backgroundColor: navyBlue,
    },
    toggleButtonText: {
        color: '#000',
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
    activeContainer: {
        backgroundColor: darkGrey,
    },
    onDeckContainer: {
        backgroundColor: lightOpacityNavy,
    },
    pendingContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: navyBlue,
    },
    completedContainer: {
        backgroundColor: mediumGrey,
    },
    fencerBox: {
        flex: 1,
        padding: 12,
        borderRadius: 6,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    activeFencerBox: {
        backgroundColor: navyBlue,
    },
    onDeckFencerBox: {
        backgroundColor: navyBlue,
        opacity: 0.8,
    },
    pendingFencerBox: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: navyBlue,
    },
    winnerBox: {
        backgroundColor: green,
    },
    loserBox: {
        backgroundColor: red,
    },
    tieBox: {
        backgroundColor: tieColor,
    },
    fencerText: {
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    pendingFencerText: {
        color: navyBlue,
    },
    middleText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    onDeckLabel: {
        textAlign: 'left',
        marginLeft: 4,
        marginBottom: 2,
        fontSize: 14,
        color: navyBlue,
        fontWeight: '600',
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
    savePoolButton: {
        backgroundColor: '#228B22',
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 16,
    },
    savePoolButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
