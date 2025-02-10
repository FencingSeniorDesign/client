// screens/BoutOrderPage.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleProp,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
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
    const { poolFencers } = route.params;

    const [bouts, setBouts] = useState<Bout[]>([]);
    const [activeBoutIndex, setActiveBoutIndex] = useState<number>(0);
    const [expandedBoutIndex, setExpandedBoutIndex] = useState<number | null>(null);

    useEffect(() => {
        // Generate pairs (round robin)
        const allPairs: Array<[Fencer, Fencer]> = [];
        for (let i = 0; i < poolFencers.length; i++) {
            for (let j = i + 1; j < poolFencers.length; j++) {
                allPairs.push([poolFencers[i], poolFencers[j]]);
            }
        }
        // Shuffle
        const shuffled = [...allPairs].sort(() => Math.random() - 0.5);

        // Attempt reordering to avoid consecutive same-fencer bouts
        const arranged: Array<[Fencer, Fencer]> = [];
        while (shuffled.length > 0) {
            let pair = shuffled.shift() as [Fencer, Fencer];
            if (
                arranged.length > 0 &&
                sharesFencer(arranged[arranged.length - 1], pair)
            ) {
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

        // Initialize
        const initialBouts: Bout[] = arranged.map((pair, index) => ({
            fencerA: pair[0],
            fencerB: pair[1],
            scoreA: 0,
            scoreB: 0,
            status: index === 0 ? 'active' : 'pending',
        }));
        setBouts(initialBouts);
    }, [poolFencers]);

    const sharesFencer = (p1: [Fencer, Fencer], p2: [Fencer, Fencer]) =>
        p1[0].id === p2[0].id ||
        p1[0].id === p2[1].id ||
        p1[1].id === p2[0].id ||
        p1[1].id === p2[1].id;

    const handleBoutPress = (index: number) => {
        if (index === activeBoutIndex && bouts[index].status === 'active') {
            // Toggle dropdown
            setExpandedBoutIndex((prev) => (prev === index ? null : index));
        }
    };

    const handleScoreChange = (index: number, which: 'A' | 'B', value: string) => {
        const newScore = parseInt(value, 10) || 0;
        setBouts((prev) => {
            const copy = [...prev];
            if (which === 'A') {
                copy[index].scoreA = newScore;
            } else {
                copy[index].scoreB = newScore;
            }
            return copy;
        });
    };

    const handleSubmitScores = (index: number) => {
        setBouts((prev) => {
            const newBouts = [...prev];
            newBouts[index].status = 'completed';
            return newBouts;
        });
        setExpandedBoutIndex(null);
        const nextIndex = index + 1;
        if (nextIndex < bouts.length) {
            setBouts((prev) => {
                const newBouts = [...prev];
                newBouts[nextIndex].status = 'active';
                return newBouts;
            });
            setActiveBoutIndex(nextIndex);
        }
    };

    // Map fencer ID => 1-based index
    const fencerIndexMap = poolFencers.reduce<Record<string, number>>((acc, f, i) => {
        acc[f.id] = i + 1;
        return acc;
    }, {});

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Bout Order</Text>

            {bouts.map((bout, index) => {
                const isActive = bout.status === 'active';
                const isCompleted = bout.status === 'completed';
                const isOnDeck = index === activeBoutIndex + 1 && !isCompleted;

                // Container style
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

                // "VS" or final score
                let middleText = 'VS';
                if (isCompleted) {
                    middleText = `${bout.scoreA}-${bout.scoreB}`;
                }

                // Decide winner/loser or tie
                const aIsWinner = bout.scoreA > bout.scoreB;
                const bIsWinner = bout.scoreB > bout.scoreA;
                const isTie = bout.scoreA === bout.scoreB;

                return (
                    <View key={index} style={{ marginBottom: 12 }}>
                        {isOnDeck && <Text style={styles.onDeckLabel}>On Deck</Text>}

                        {/* BOUT CONTAINER */}
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleBoutPress(index)}
                            style={[styles.boutContainer, containerStyle]}
                        >
                            {/* LEFT FENCER */}
                            <View
                                style={[
                                    styles.fencerBox,
                                    // If completed, color winner/loser
                                    isCompleted && aIsWinner && styles.winnerBox,
                                    isCompleted && bIsWinner && styles.loserBox,
                                    isCompleted && isTie && styles.tieBox,

                                    // If active
                                    !isCompleted && isActive && styles.activeFencerBox,

                                    // If onDeck
                                    !isCompleted && isOnDeck && styles.onDeckFencerBox,

                                    // If pending
                                    !isCompleted && !isActive && !isOnDeck && styles.pendingFencerBox,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.fencerText,
                                        // If completed, text color black
                                        isCompleted && { color: '#000' },
                                        // If pending or active
                                        !isCompleted && isActive && { color: '#fff' },
                                        !isCompleted && isOnDeck && { color: '#fff' },
                                        !isCompleted && !isActive && !isOnDeck && styles.pendingFencerText,
                                    ]}
                                >
                                    {fencerIndexMap[bout.fencerA.id]} {bout.fencerA.firstName}
                                </Text>
                            </View>

                            <Text style={styles.middleText}>{middleText}</Text>

                            {/* RIGHT FENCER */}
                            <View
                                style={[
                                    styles.fencerBox,
                                    // If completed
                                    isCompleted && bIsWinner && styles.winnerBox,
                                    isCompleted && aIsWinner && styles.loserBox,
                                    isCompleted && isTie && styles.tieBox,

                                    // If active
                                    !isCompleted && isActive && styles.activeFencerBox,
                                    // If onDeck
                                    !isCompleted && isOnDeck && styles.onDeckFencerBox,
                                    // If pending
                                    !isCompleted && !isActive && !isOnDeck && styles.pendingFencerBox,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.fencerText,
                                        isCompleted && { color: '#000' },
                                        !isCompleted && isActive && { color: '#fff' },
                                        !isCompleted && isOnDeck && { color: '#fff' },
                                        !isCompleted && !isActive && !isOnDeck && styles.pendingFencerText,
                                    ]}
                                >
                                    {fencerIndexMap[bout.fencerB.id]} {bout.fencerB.firstName}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* SCORE ENTRY */}
                        {expandedBoutIndex === index && isActive && (
                            <View style={styles.scoreEntryContainer}>
                                <Text style={styles.scoreEntryTitle}>Enter Scores</Text>
                                <View style={styles.scoreRow}>
                                    <Text style={styles.scoreFencerLabel}>
                                        {fencerIndexMap[bout.fencerA.id]} {bout.fencerA.firstName}:
                                    </Text>
                                    <TextInput
                                        style={styles.scoreInput}
                                        keyboardType="numeric"
                                        value={String(bout.scoreA)}
                                        onChangeText={(val) => handleScoreChange(index, 'A', val)}
                                    />
                                </View>
                                <View style={styles.scoreRow}>
                                    <Text style={styles.scoreFencerLabel}>
                                        {fencerIndexMap[bout.fencerB.id]} {bout.fencerB.firstName}:
                                    </Text>
                                    <TextInput
                                        style={styles.scoreInput}
                                        keyboardType="numeric"
                                        value={String(bout.scoreB)}
                                        onChangeText={(val) => handleScoreChange(index, 'B', val)}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.enterButton}
                                    onPress={() => handleSubmitScores(index)}
                                >
                                    <Text style={styles.enterButtonText}>Enter</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
};

export default BoutOrderPage;

/** ------------ Styles ------------ */
const navyBlue = '#000080';
const darkGrey = '#4f4f4f';
const mediumGrey = '#888888'; // for completed container (dark, but not as dark as darkGrey)
const green = '#008000';
const red = '#FF0000';
const lightOpacityNavy = 'rgba(0, 0, 128, 0.5)';
const tieColor = '#ffffff99';

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        padding: 16,
        fontWeight: 'bold',
    },

    /* BOUT CONTAINER BASE */
    boutContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        padding: 8,
    },

    /* STATUS-BASED CONTAINERS */
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
    /* Updated completed container to a darker grey than before, but lighter than darkGrey */
    completedContainer: {
        backgroundColor: mediumGrey,
    },

    /* FENCER BOX (BASE) */
    fencerBox: {
        flex: 1,
        padding: 12,
        borderRadius: 6,
        marginHorizontal: 4,
        justifyContent: 'center',
    },

    /* ACTIVE / ON DECK / PENDING STYLES FOR THE FENCER BOX */
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

    /* COMPLETED BOUT: WIN/LOSE/TIE BOXES */
    winnerBox: {
        backgroundColor: green,
    },
    loserBox: {
        backgroundColor: red,
    },
    tieBox: {
        backgroundColor: tieColor,
    },

    /* TEXT STYLES */
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

    /* ON DECK LABEL */
    onDeckLabel: {
        textAlign: 'left',
        marginLeft: 4,
        marginBottom: 2,
        fontSize: 14,
        color: navyBlue,
        fontWeight: '600',
    },

    /* SCORE ENTRY */
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
    enterButton: {
        backgroundColor: navyBlue,
        marginTop: 8,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
    enterButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
