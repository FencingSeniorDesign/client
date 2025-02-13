import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CustomTimeModal } from './CustomTimeModal';
import { usePersistentState } from '../../../hooks/usePersistentStateHook';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';

type CardColor = 'yellow' | 'red' | 'black' | null;
type FencerCard = { color: CardColor };

type RefereeModuleRouteProp = RouteProp<RootStackParamList, 'RefereeModule'>;

export function RefereeModule() {
    const route = useRoute<RefereeModuleRouteProp>();
    const navigation = useNavigation();

    // Safely destructure params (use default values if route.params is undefined)
    const {
        fencer1Name = 'Fencer 1',
        fencer2Name = 'Fencer 2',
        boutIndex,
        currentScore1 = 0,
        currentScore2 = 0,
        onSaveScores,
    } = route.params ?? {};

    // State to toggle Kawaii mode
    const [kawaiiMode, setKawaiiMode] = useState(false);

    // Timer state (still using persistent state for the timer)
    const [time, setTime] = usePersistentState<number>('RefereeModule:time', 180);
    const [isRunning, setIsRunning] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('');
    const [customSeconds, setCustomSeconds] = useState('');

    // Reset scores to 0–0 on entry (ignoring any passed currentScore values)
    const [fencer1Score, setFencer1Score] = useState(0);
    const [fencer2Score, setFencer2Score] = useState(0);

    const timerRef = useRef<NodeJS.Timer | null>(null);

    const [showCardAssignment, setShowCardAssignment] = useState(false);
    const [selectedCard, setSelectedCard] = useState<CardColor>(null);
    const [fencer1Cards, setFencer1Cards] = useState<FencerCard[]>([]);
    const [fencer2Cards, setFencer2Cards] = useState<FencerCard[]>([]);

    // Define a set of kawaii style overrides
    const kawaiiModeStyles = {
        container: { backgroundColor: '#ffe4e1' }, // Misty Rose
        timerRunning: { backgroundColor: '#d87093' }, // Pale Violet Red
        timerStopped: { backgroundColor: '#ffb6c1' }, // Light Pink
        scoreButton: { backgroundColor: '#ff69b4' },  // Hot Pink
        minusButton: { backgroundColor: '#dda0dd' },  // Plum
        doubleTouchButton: { backgroundColor: '#ff69b4' },
        saveScoresButton: { backgroundColor: '#ba55d3' }, // Medium Orchid
    };

    const handleCardPress = (color: CardColor) => {
        setSelectedCard(color);
        setShowCardAssignment(true);
    };

    const assignCard = (fencer: 1 | 2) => {
        if (selectedCard) {
            if (fencer === 1) {
                setFencer1Cards([...fencer1Cards, { color: selectedCard }]);
            } else {
                setFencer2Cards([...fencer2Cards, { color: selectedCard }]);
            }
            setSelectedCard(null);
            setShowCardAssignment(false);
        }
    };

    const updateScore = (fencer: 1 | 2, increment: boolean) => {
        if (fencer === 1) {
            setFencer1Score(prev => Math.max(0, increment ? prev + 1 : prev - 1));
        } else {
            setFencer2Score(prev => Math.max(0, increment ? prev + 1 : prev - 1));
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (!isRunning && time > 0) {
            setIsRunning(true);
            timerRef.current = setInterval(() => {
                setTime(prevTime => {
                    if (prevTime <= 1) {
                        stopTimer();
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRunning(false);
    };

    const toggleTimer = () => {
        if (isRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    };

    const setTimerDuration = (minutes: number) => {
        stopTimer();
        setTime(minutes * 60);
        setModalVisible(false);
    };

    const handleCustomTime = (minutes: number, seconds: number) => {
        const totalSeconds = minutes * 60 + seconds;
        if (totalSeconds > 0) {
            stopTimer();
            setTime(totalSeconds);
            setModalVisible(false);
            setCustomMinutes('');
            setCustomSeconds('');
        }
    };

    return (
        <View style={[styles.container, kawaiiMode && kawaiiModeStyles.container]}>
            <TouchableOpacity
                style={[
                    styles.timerContainer,
                    isRunning
                        ? kawaiiMode
                            ? kawaiiModeStyles.timerRunning
                            : styles.timerRunning
                        : kawaiiMode
                            ? kawaiiModeStyles.timerStopped
                            : styles.timerStopped,
                ]}
                onPress={toggleTimer}
                onLongPress={() => setModalVisible(true)}
            >
                <Text
                    style={[
                        styles.timerText,
                        isRunning ? styles.timerTextRunning : styles.timerTextStopped,
                    ]}
                >
                    {formatTime(time)}
                </Text>
                <Text
                    style={[
                        styles.timerStatus,
                        isRunning ? styles.timerStatusRunning : styles.timerStatusStopped,
                    ]}
                >
                    {isRunning ? 'Tap to pause' : 'Tap to start'}
                </Text>
            </TouchableOpacity>

            {/* Score Section */}
            <View style={styles.scoreContainer}>
                <View style={styles.fencerContainer}>
                    <Text style={styles.fencerLabel}>
                        {kawaiiMode ? 'Kitten 1' : fencer1Name}
                    </Text>
                    <View style={styles.cardsContainer}>
                        {fencer1Cards.map((card, index) => (
                            <View
                                key={index}
                                style={[styles.cardIndicator, { backgroundColor: card.color }]}
                            />
                        ))}
                    </View>
                    <Text style={styles.scoreText}>{fencer1Score}</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.scoreButton, kawaiiMode && kawaiiModeStyles.scoreButton]}
                            onPress={() => updateScore(1, true)}
                        >
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.scoreButton,
                                styles.minusButton,
                                kawaiiMode && kawaiiModeStyles.minusButton,
                            ]}
                            onPress={() => updateScore(1, false)}
                        >
                            <Text style={styles.buttonText}>−</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.fencerContainer}>
                    <Text style={styles.fencerLabel}>
                        {kawaiiMode ? 'Kitten 2' : fencer2Name}
                    </Text>
                    <View style={styles.cardsContainer}>
                        {fencer2Cards.map((card, index) => (
                            <View
                                key={index}
                                style={[styles.cardIndicator, { backgroundColor: card.color }]}
                            />
                        ))}
                    </View>
                    <Text style={styles.scoreText}>{fencer2Score}</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.scoreButton, kawaiiMode && kawaiiModeStyles.scoreButton]}
                            onPress={() => updateScore(2, true)}
                        >
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.scoreButton,
                                styles.minusButton,
                                kawaiiMode && kawaiiModeStyles.minusButton,
                            ]}
                            onPress={() => updateScore(2, false)}
                        >
                            <Text style={styles.buttonText}>−</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Double Touch Button */}
            <TouchableOpacity
                style={[styles.doubleTouchButton, kawaiiMode && kawaiiModeStyles.doubleTouchButton]}
                onPress={() => {
                    // Implement your double touch functionality here
                    console.log('Double Touch pressed');
                }}
            >
                <Text style={styles.doubleTouchButtonText}>Double Touch</Text>
            </TouchableOpacity>

            {/* Save Scores Button */}
            {onSaveScores && (
                <TouchableOpacity
                    style={[styles.saveScoresButton, kawaiiMode && kawaiiModeStyles.saveScoresButton]}
                    onPress={() => {
                        onSaveScores(fencer1Score, fencer2Score);
                        navigation.goBack();
                    }}
                >
                    <Text style={styles.saveScoresButtonText}>Save Scores</Text>
                </TouchableOpacity>
            )}

            {/* Card Assignment Modal */}
            {showCardAssignment && (
                <View style={styles.assignmentContainer}>
                    <Text style={styles.assignmentText}>
                        Assign {selectedCard} card to:
                    </Text>
                    <View style={styles.assignmentButtons}>
                        <TouchableOpacity style={styles.assignButton} onPress={() => assignCard(1)}>
                            <Text style={styles.assignButtonText}>Fencer 1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.assignButton} onPress={() => assignCard(2)}>
                            <Text style={styles.assignButtonText}>Fencer 2</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Card Color Buttons */}
            <View style={styles.cardButtonsContainer}>
                <TouchableOpacity
                    style={styles.cardButton}
                    onPress={() => handleCardPress('yellow')}
                >
                    <Text style={styles.cardButtonText}>Yellow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.cardButton}
                    onPress={() => handleCardPress('red')}
                >
                    <Text style={styles.cardButtonText}>Red</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.cardButton}
                    onPress={() => handleCardPress('black')}
                >
                    <Text style={styles.cardButtonText}>Black</Text>
                </TouchableOpacity>
            </View>

            <CustomTimeModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSetTime={setTimerDuration}
                onSetCustomTime={handleCustomTime}
                customMinutes={customMinutes}
                customSeconds={customSeconds}
                setCustomMinutes={setCustomMinutes}
                setCustomSeconds={setCustomSeconds}
                onKawaiiMode={() => {
                    setKawaiiMode(true);
                    setModalVisible(false);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 20,
    },
    timerContainer: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 10,
        margin: 20,
    },
    timerRunning: {
        backgroundColor: '#4CAF50',
    },
    timerStopped: {
        backgroundColor: '#f0f0f0',
    },
    timerText: {
        fontSize: 80,
        fontWeight: 'bold',
    },
    timerTextRunning: {
        color: '#fff',
    },
    timerTextStopped: {
        color: '#333',
    },
    timerStatus: {
        fontSize: 14,
        marginTop: 8,
    },
    timerStatusRunning: {
        color: '#fff',
    },
    timerStatusStopped: {
        color: '#666',
    },
    scoreContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        width: '100%',
    },
    fencerContainer: {
        alignItems: 'center',
        minWidth: 120,
    },
    fencerLabel: {
        fontSize: 30,
        fontWeight: '600',
        marginBottom: 0,
        paddingBottom: 0,
        marginRight: 15,
    },
    scoreText: {
        fontSize: 100,
        fontWeight: 'bold',
        marginBottom: 10,
        marginRight: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        marginHorizontal: 10,
    },
    scoreButton: {
        backgroundColor: '#007AFF',
        width: 80,
        height: 80,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
    },
    minusButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    cardButtonsContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        height: 80,
    },
    cardButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    assignmentContainer: {
        position: 'absolute',
        bottom: 160,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    assignmentText: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 10,
    },
    assignmentButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    assignButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 5,
        width: 140,
    },
    assignButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
    },
    cardsContainer: {
        flexDirection: 'row',
        marginTop: 8,
    },
    cardIndicator: {
        width: 15,
        height: 15,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#000',
        marginRight: 4,
    },
    doubleTouchButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        marginHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    doubleTouchButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    saveScoresButton: {
        backgroundColor: '#228B22',
        paddingVertical: 15,
        marginHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    saveScoresButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
});
export default RefereeModule;
