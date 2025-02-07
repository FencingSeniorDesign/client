// screens/RefereeModule/RefereeModule.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CustomTimeModal } from './CustomTimeModal';
import { usePersistentState } from '../../../hooks/usePersistentStateHook';

type CardColor = 'yellow' | 'red' | 'black' | null;
type FencerCard = { color: CardColor };

export function RefereeModule() {
    const [time, setTime] = usePersistentState<number>('RefereeModule:time', 180);
    const [isRunning, setIsRunning] = useState(false); //TODO - we could hypothetically let it run in the background? Not sure why we would tho
    const [modalVisible, setModalVisible] = useState(false);
    const [customMinutes, setCustomMinutes] = useState('');
    const [customSeconds, setCustomSeconds] = useState('');
    const [fencer1Score, setFencer1Score] = usePersistentState<number>('RefereeModule:fencer1Score', 0);
    const [fencer2Score, setFencer2Score] = usePersistentState<number>('RefereeModule:fencer2Score', 0);
    const timerRef = useRef<NodeJS.Timer | null>(null);
    const [showCardAssignment, setShowCardAssignment] = useState(false);
    const [selectedCard, setSelectedCard] = useState<CardColor>(null);
    const [fencer1Cards, setFencer1Cards] = usePersistentState<FencerCard[]>('RefereeModule:fencer1Cards', []);
    const [fencer2Cards, setFencer2Cards] = usePersistentState<FencerCard[]>('RefereeModule:fencer2Cards', []);

    const handleCardPress = (color: CardColor) => {
        setSelectedCard(color);
        setShowCardAssignment(true);
    };

    const assignCard = (fencer: 1 | 2) => {
        console.log('assignCard', fencer, selectedCard);

        if (selectedCard) {
            if (fencer === 1) {
                console.log('assignCard', fencer, selectedCard);
                setFencer1Cards([...fencer1Cards, { color: selectedCard }]);
            } else {
                console.log('assignCard', fencer, selectedCard);
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
                setTime((prevTime) => {
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
        const totalSeconds = (minutes * 60) + seconds;
        if (totalSeconds > 0) {
            stopTimer();
            setTime(totalSeconds);
            setModalVisible(false);
            setCustomMinutes('');
            setCustomSeconds('');
        }
    };


    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[
                    styles.timerContainer,
                    isRunning ? styles.timerRunning : styles.timerStopped
                ]}
                onPress={toggleTimer}
                onLongPress={() => setModalVisible(true)}
            >
                <Text style={[
                    styles.timerText,
                    isRunning ? styles.timerTextRunning : styles.timerTextStopped
                ]}>
                    {formatTime(time)}
                </Text>
                <Text style={[
                    styles.timerStatus,
                    isRunning ? styles.timerStatusRunning : styles.timerStatusStopped
                ]}>
                    {isRunning ? 'Tap to pause' : 'Tap to start'}
                </Text>
            </TouchableOpacity>



            <View style={styles.scoreContainer}>
                <View style={styles.fencerContainer}>
                    <Text style={styles.fencerLabel}>Fencer 1</Text>

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
                            style={styles.scoreButton}
                            onPress={() => updateScore(1, true)}
                        >
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.scoreButton, styles.minusButton]}
                            onPress={() => updateScore(1, false)}
                        >
                            <Text style={styles.buttonText}>−</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.fencerContainer}>
                    <Text style={styles.fencerLabel}>Fencer 2</Text>

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
                            style={styles.scoreButton}
                            onPress={() => updateScore(2, true)}
                        >
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.scoreButton, styles.minusButton]}
                            onPress={() => updateScore(2, false)}
                        >
                            <Text style={styles.buttonText}>−</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {showCardAssignment && (
                <View style={styles.assignmentContainer}>
                    <Text style={styles.assignmentText}>Assign {selectedCard} card to:</Text>
                    <View style={styles.assignmentButtons}>
                        <TouchableOpacity
                            style={styles.assignButton}
                            onPress={() => assignCard(1)}
                        >
                            <Text style={styles.assignButtonText}>Fencer 1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.assignButton}
                            onPress={() => assignCard(2)}
                        >
                            <Text style={styles.assignButtonText}>Fencer 2</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.cardButtonsContainer}>
                <TouchableOpacity
                    style={[styles.cardButton, { backgroundColor: 'yellow' }]}
                    onPress={() => handleCardPress('yellow')}
                >
                    <Text style={styles.cardButtonText}>Yellow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.cardButton, { backgroundColor: 'red' }]}
                    onPress={() => handleCardPress('red')}
                >
                    <Text style={styles.cardButtonText}>Red</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.cardButton, { backgroundColor: 'black' }]}
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
        fontSize: 48,
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
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 10,
    },
    scoreText: {
        fontSize: 48,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    scoreButton: {
        backgroundColor: '#007AFF',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    minusButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    cardButtonsContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    cardButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    assignmentContainer: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    assignmentText: {
        fontSize: 16,
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
        width: 120,
    },
    assignButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 16,
    },
    fencerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    cardsContainer: {
        flexDirection: 'row',
        gap: 5,
    },
    cardIndicator: {
        width: 15,
        height: 15,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#000',
    },

});
