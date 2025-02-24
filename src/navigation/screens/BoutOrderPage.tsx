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
import { RootStackParamList, Fencer } from '../navigation/types';

type BoutOrderPageRouteProps = RouteProp<RootStackParamList, 'BoutOrderPage'>;

type BoutStatus = 'pending' | 'active' | 'completed';

type Bout = {
    fencerA: Fencer;
    fencerB: Fencer;
    scoreA: number;
    scoreB: number;
    status: BoutStatus;
};

const BoutOrderPage: React.FC = () => {
    const route = useRoute<BoutOrderPageRouteProps>();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'BoutOrderPage'>>();
    const { poolFencers } = route.params;

    // local states
    const [bouts, setBouts] = useState<Bout[]>([]);
    const [expandedBoutIndex, setExpandedBoutIndex] = useState<number | null>(null);

    // Toggles at the top
    const [protectedScores, setProtectedScores] = useState<boolean>(false);
    const [doubleStrip, setDoubleStrip] = useState<boolean>(false);

    // "Alter Scores" modal
    const [alterModalVisible, setAlterModalVisible] = useState<boolean>(false);
    const [alterIndex, setAlterIndex] = useState<number | null>(null);
    const [alterScoreA, setAlterScoreA] = useState<string>('0');
    const [alterScoreB, setAlterScoreB] = useState<string>('0');

    // "Save Completed Pool"
    const [poolCompleted, setPoolCompleted] = useState<boolean>(false);

    /**
     * On mount, generate all bouts in a round-robin, shuffle, reorder to avoid consecutive
     * same-fencer bouts, then set the first concurrency to 'active'.
     */
    useEffect(() => {
        const newBouts: Bout[] = buildInitialBouts();
        // Mark the first concurrency bouts active
        const concurrency = doubleStrip ? 2 : 1;
        const final = applyConcurrency(newBouts, concurrency);
        setBouts(final);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * If user toggles doubleStrip, recalc concurrency for the existing bouts
     */
    useEffect(() => {
        if (!bouts.length) return;
        const concurrency = doubleStrip ? 2 : 1;
        const updated = applyConcurrency(bouts, concurrency);
        if (!areBoutsSame(updated, bouts)) {
            setBouts(updated);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doubleStrip]);

    /**
     * Build initial round-robin + reorder. Used only once on mount.
     */
    function buildInitialBouts(): Bout[] {
        const allPairs: Array<[Fencer, Fencer]> = [];
        for (let i = 0; i < poolFencers.length; i++) {
            for (let j = i + 1; j < poolFencers.length; j++) {
                allPairs.push([poolFencers[i], poolFencers[j]]);
            }
        }
        const shuffled = [...allPairs].sort(() => Math.random() - 0.5);
        const arranged: Array<[Fencer, Fencer]> = [];
        while (shuffled.length) {
            let pair = shuffled.shift()!;
            if (arranged.length && sharesFencer(arranged[arranged.length - 1], pair)) {
                let foundIndex = -1;
                for (let k = 0; k < shuffled.length; k++) {
                    if (!sharesFencer(arranged[arranged.length - 1], shuffled[k])) {
                        foundIndex = k;
                        break;
                    }
                }
                if (foundIndex !== -1) {
                    const temp = pair;
                    pair = shuffled[foundIndex];
                    shuffled[foundIndex] = temp;
                }
            }
            arranged.push(pair);
        }
        return arranged.map((pair) => ({
            fencerA: pair[0],
            fencerB: pair[1],
            scoreA: 0,
            scoreB: 0,
            status: 'pending' as BoutStatus,
        }));
    }

    function sharesFencer(p1: [Fencer, Fencer], p2: [Fencer, Fencer]) {
        return (
            p1[0].id === p2[0].id ||
            p1[0].id === p2[1].id ||
            p1[1].id === p2[0].id ||
            p1[1].id === p2[1].id
        );
    }

    /**
     * Re-apply concurrency: first N non-completed bouts => 'active', rest => 'pending'
     */
    function applyConcurrency(boutsArr: Bout[], concurrency: number): Bout[] {
        const updated = boutsArr.map((b): Bout => b.status === 'completed' ? b : { ...b, status: 'pending' } );
        let count = 0;
        for (let i = 0; i < updated.length; i++) {
            if (updated[i].status !== 'completed') {
                if (count < concurrency) {
                    updated[i].status = 'active';
                    count++;
                } else {
                    updated[i].status = 'pending';
                }
            }
        }
        return updated;
    }

    /**
     * Compare two bout arrays quickly (shallow).
     */
    function areBoutsSame(a: Bout[], b: Bout[]): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i].status !== b[i].status) return false;
            if (a[i].scoreA !== b[i].scoreA) return false;
            if (a[i].scoreB !== b[i].scoreB) return false;
            if (a[i].fencerA.id !== b[i].fencerA.id) return false;
            if (a[i].fencerB.id !== b[i].fencerB.id) return false;
        }
        return true;
    }

    /**
     * Press an active bout => toggle expand/collapse
     */
    const handleBoutPress = (index: number) => {
        if (bouts[index].status === 'active') {
            setExpandedBoutIndex((prev) => (prev === index ? null : index));
        }
    };

    /**
     * Submit the scores for an active bout => completed => re-apply concurrency.
     */
    const handleSubmitScores = (index: number) => {
        setBouts((prev) => {
            const copy = [...prev];
            copy[index].status = 'completed';
            if (expandedBoutIndex === index) {
                setExpandedBoutIndex(null);
            }
            const concurrency = doubleStrip ? 2 : 1;
            return applyConcurrency(copy, concurrency);
        });
    };

    /**
     * Score input changes
     */
    const handleScoreChange = (index: number, which: 'A' | 'B', val: string) => {
        setBouts((prev) => {
            const copy = [...prev];
            const intVal = parseInt(val, 10) || 0;
            if (which === 'A') copy[index].scoreA = intVal;
            else copy[index].scoreB = intVal;
            return copy;
        });
    };

    /**
     * Long-press a completed bout => Alter Scores (if not protected).
     */
    const handleBoutLongPress = (index: number) => {
        if (protectedScores) return;
        if (bouts[index].status === 'completed') {
            setAlterIndex(index);
            setAlterScoreA(String(bouts[index].scoreA));
            setAlterScoreB(String(bouts[index].scoreB));
            setAlterModalVisible(true);
        }
    };

    const handleAlterSave = () => {
        if (alterIndex == null) return;
        const i = alterIndex;
        setBouts((prev) => {
            const copy = [...prev];
            copy[i].scoreA = parseInt(alterScoreA, 10) || 0;
            copy[i].scoreB = parseInt(alterScoreB, 10) || 0;
            return copy;
        });
        setAlterModalVisible(false);
        setAlterIndex(null);
    };

    /**
     * "Save Completed Pool"
     */
    const handleSaveCompletedPool = () => {
        const allDone = bouts.every((b) => b.status === 'completed');
        if (!allDone) {
            Alert.alert(
                'Not all bouts completed',
                'Please finish all bouts first.'
            );
            return;
        }
        setPoolCompleted(true);
        Alert.alert('Pool Saved', 'This pool is now marked as completed.');
    };

    // "On deck" = next concurrency pending bouts
    function getOnDeckIndices(): number[] {
        const activeIndices: number[] = [];
        for (let i = 0; i < bouts.length; i++) {
            if (bouts[i].status === 'active') {
                activeIndices.push(i);
            }
        }
        if (!activeIndices.length) return [];
        const lastActive = Math.max(...activeIndices);
        const onDeck: number[] = [];
        let count = 0;
        const concurrency = doubleStrip ? 2 : 1;
        for (let i = lastActive + 1; i < bouts.length; i++) {
            if (bouts[i].status === 'pending') {
                onDeck.push(i);
                count++;
                if (count >= concurrency) break;
            }
        }
        return onDeck;
    }

    const onDeckIndices = getOnDeckIndices();

    // For display: map each fencer’s id to a pool index
    const fencerIndexMap = poolFencers.reduce<Record<string, number>>(
        (acc, f, i) => {
            acc[f.id] = i + 1;
            return acc;
        },
        {}
    );

    // When a Ref Module button is tapped, navigate to the full Referee Module screen.
    const openRefModuleForBout = (index: number) => {
        const bout = bouts[index];
        navigation.navigate('RefereeModule', {
            boutIndex: index,
            fencer1Name: bout.fencerA.lname || bout.fencerA.fname,
            fencer2Name: bout.fencerB.lname || bout.fencerB.fname,
            currentScore1: bout.scoreA,
            currentScore2: bout.scoreB,
            onSaveScores: (score1: number, score2: number) => {
                setBouts((prev) => {
                    const newBouts = [...prev];
                    newBouts[index].scoreA = score1;
                    newBouts[index].scoreB = score2;
                    newBouts[index].status = 'completed';
                    const concurrency = doubleStrip ? 2 : 1;
                    return applyConcurrency(newBouts, concurrency);
                });
            },
        });
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Toggles row */}
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        protectedScores && styles.toggleButtonActive,
                    ]}
                    onPress={() => setProtectedScores(!protectedScores)}
                >
                    <Text style={styles.toggleButtonText}>Protected Scores</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        doubleStrip && styles.toggleButtonActive,
                    ]}
                    onPress={() => setDoubleStrip(!doubleStrip)}
                >
                    <Text style={styles.toggleButtonText}>Double Strip</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Bout Order</Text>

                {bouts.map((bout, index) => {
                    const isActive = bout.status === 'active';
                    const isCompleted = bout.status === 'completed';
                    const isOnDeck = onDeckIndices.includes(index);

                    let middleText = 'VS';
                    if (isCompleted) {
                        middleText = `${bout.scoreA}-${bout.scoreB}`;
                    }

                    // Winner/loser logic
                    const aIsWinner = bout.scoreA > bout.scoreB;
                    const bIsWinner = bout.scoreB > bout.scoreA;
                    const isTie = bout.scoreA === bout.scoreB;

                    let containerStyle;
                    if (isCompleted) {
                        containerStyle = styles.completedContainer;
                    } else if (isActive) {
                        containerStyle = styles.activeContainer;
                    } else if (isOnDeck) {
                        containerStyle = styles.onDeckContainer;
                    } else {
                        containerStyle = styles.pendingContainer;
                    }

                    return (
                        <View key={index} style={{ marginBottom: 12 }}>
                            {isOnDeck && (
                                <Text style={styles.onDeckLabel}>On Deck</Text>
                            )}

                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => handleBoutPress(index)}
                                onLongPress={() => handleBoutLongPress(index)}
                                style={[styles.boutContainer, containerStyle]}
                            >
                                {/* Fencer A */}
                                <View
                                    style={[
                                        styles.fencerBox,
                                        isCompleted && aIsWinner && styles.winnerBox,
                                        isCompleted && bIsWinner && styles.loserBox,
                                        isCompleted && isTie && styles.tieBox,
                                        !isCompleted && isActive && styles.activeFencerBox,
                                        !isCompleted && isOnDeck && styles.onDeckFencerBox,
                                        !isCompleted &&
                                        !isActive &&
                                        !isOnDeck &&
                                        styles.pendingFencerBox,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.fencerText,
                                            isCompleted && { color: '#000' },
                                            !isCompleted && isActive && { color: '#fff' },
                                            !isCompleted && isOnDeck && { color: '#fff' },
                                            !isCompleted &&
                                            !isActive &&
                                            !isOnDeck &&
                                            styles.pendingFencerText,
                                        ]}
                                    >
                                        {fencerIndexMap[bout.fencerA.id]} {bout.fencerA.fname}
                                    </Text>
                                </View>

                                <Text style={styles.middleText}>{middleText}</Text>

                                {/* Fencer B */}
                                <View
                                    style={[
                                        styles.fencerBox,
                                        isCompleted && bIsWinner && styles.winnerBox,
                                        isCompleted && aIsWinner && styles.loserBox,
                                        isCompleted && isTie && styles.tieBox,
                                        !isCompleted && isActive && styles.activeFencerBox,
                                        !isCompleted && isOnDeck && styles.onDeckFencerBox,
                                        !isCompleted &&
                                        !isActive &&
                                        !isOnDeck &&
                                        styles.pendingFencerBox,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.fencerText,
                                            isCompleted && { color: '#000' },
                                            !isCompleted && isActive && { color: '#fff' },
                                            !isCompleted && isOnDeck && { color: '#fff' },
                                            !isCompleted &&
                                            !isActive &&
                                            !isOnDeck &&
                                            styles.pendingFencerText,
                                        ]}
                                    >
                                        {fencerIndexMap[bout.fencerB.id]} {bout.fencerB.fname}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* Score entry dropdown (if active & expanded) */}
                            {expandedBoutIndex === index && isActive && (
                                <View style={styles.scoreEntryContainer}>
                                    <Text style={styles.scoreEntryTitle}>
                                        Enter Scores
                                    </Text>
                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreFencerLabel}>
                                            {fencerIndexMap[bout.fencerA.id]}{' '}
                                            {bout.fencerA.fname}:
                                        </Text>
                                        <TextInput
                                            style={styles.scoreInput}
                                            keyboardType="numeric"
                                            value={String(bout.scoreA)}
                                            onChangeText={(val) =>
                                                handleScoreChange(index, 'A', val)
                                            }
                                        />
                                    </View>
                                    <View style={styles.scoreRow}>
                                        <Text style={styles.scoreFencerLabel}>
                                            {fencerIndexMap[bout.fencerB.id]}{' '}
                                            {bout.fencerB.fname}:
                                        </Text>
                                        <TextInput
                                            style={styles.scoreInput}
                                            keyboardType="numeric"
                                            value={String(bout.scoreB)}
                                            onChangeText={(val) =>
                                                handleScoreChange(index, 'B', val)
                                            }
                                        />
                                    </View>
                                    <View style={styles.scoreButtonsRow}>
                                        <TouchableOpacity
                                            style={styles.enterButton}
                                            onPress={() => handleSubmitScores(index)}
                                        >
                                            <Text style={styles.enterButtonText}>
                                                Enter
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.refModuleButton}
                                            onPress={() => openRefModuleForBout(index)}
                                        >
                                            <Text style={styles.refModuleButtonText}>
                                                Ref Module
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Save Completed Pool */}
                <TouchableOpacity
                    style={styles.savePoolButton}
                    onPress={handleSaveCompletedPool}
                >
                    <Text style={styles.savePoolButtonText}>
                        Save Completed Pool
                    </Text>
                </TouchableOpacity>
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
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                marginTop: 12,
                            }}
                        >
                            <TouchableOpacity
                                style={styles.enterButton}
                                onPress={handleAlterSave}
                            >
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
        color: '#fff',
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
