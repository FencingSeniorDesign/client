// src/features/referee/screens/RefereeModuleOptimized.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomTimeModal } from '../components/CustomTimeModal';
import { usePersistentState } from '../../../core/hooks/usePersistentStateHook';
import { ConnectionStatusBar } from '../../../infrastructure/networking';
import { useNetworkStatus } from '../../../infrastructure/networking';
import { 
  useLiveBoutWithScores, 
  useUpdateBoutScores, 
  useSetBoutVictor,
  useUpdateBout
} from '../hooks/useReferees';
import { LiveScoreDisplay } from '../components/LiveScoreDisplay';
import { Bout, FencerBout } from '../../../core/types';

// These types would be properly defined in your navigation types
interface RootStackParamList {
  RefereeModule: {
    boutId: number;
    fencer1Id?: number;
    fencer2Id?: number;
    fencer1Name?: string;
    fencer2Name?: string;
  };
}

type CardColor = 'yellow' | 'red' | 'black' | null;
type FencerCard = { color: CardColor };

type RefereeModuleRouteProp = RouteProp<RootStackParamList, 'RefereeModule'>;

export function RefereeModuleOptimized() {
  const route = useRoute<RefereeModuleRouteProp>();
  const navigation = useNavigation();
  const networkStatus = useNetworkStatus();

  const {
    boutId,
    fencer1Id,
    fencer2Id,
    fencer1Name = 'Left Fencer',
    fencer2Name = 'Right Fencer',
  } = route.params;

  // Use the live bout query hook
  const { 
    bout, 
    scores,
    isLoading,
    error 
  } = useLiveBoutWithScores(boutId);

  // Score update mutation
  const updateScoresMutation = useUpdateBoutScores();
  
  // Bout victor mutation
  const setBoutVictorMutation = useSetBoutVictor();
  
  // Update bout mutation (for timer updates)
  const updateBoutMutation = useUpdateBout();
  
  // UI state
  const [kawaiiMode, setKawaiiMode] = useState(false);
  
  // Get the current scores from the live query
  const fencer1Score = scores.find(s => s.fencerId === fencer1Id)?.score || 0;
  const fencer2Score = scores.find(s => s.fencerId === fencer2Id)?.score || 0;

  // Main timer (persistent)
  const [time, setTime] = usePersistentState<number>('RefereeModule:time', 180);
  const [isRunning, setIsRunning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');

  // Timer refs
  const timerRef = useRef<NodeJS.Timer | null>(null);

  // Non‑combativity (passivity) timer state
  const [passivityTime, setPassivityTime] = useState(60);
  const [savedPassivityTime, setSavedPassivityTime] = useState<number | null>(null);
  const passivityTimerRef = useRef<NodeJS.Timer | null>(null);

  // New state to track the last score change
  const [lastScoreChange, setLastScoreChange] = useState<{ fencer: 1 | 2; delta: number } | null>(null);

  // Card state
  const [showCardActionModal, setShowCardActionModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardColor>(null);
  const [removalMode, setRemovalMode] = useState(false);
  const [fencer1Cards, setFencer1Cards] = useState<FencerCard[]>([]);
  const [fencer2Cards, setFencer2Cards] = useState<FencerCard[]>([]);

  // Style configs for "kawaii mode"
  const kawaiiModeStyles = {
    container: { backgroundColor: '#ffe4e1' },
    timerRunning: { backgroundColor: '#d87093' },
    timerStopped: { backgroundColor: '#ffb6c1' },
    scoreButton: { backgroundColor: '#ff69b4' },
    minusButton: { backgroundColor: '#dda0dd' },
    doubleTouchButton: { backgroundColor: '#ff69b4' },
    saveScoresButton: { backgroundColor: '#ba55d3' },
  };

  // Card action handlers
  const handleCardPress = (color: CardColor, remove: boolean = false) => {
    setSelectedCard(color);
    setRemovalMode(remove);
    setShowCardActionModal(true);
  };

  const assignCard = (fencer: 1 | 2) => {
    if (selectedCard) {
      if (fencer === 1) {
        setFencer1Cards([...fencer1Cards, { color: selectedCard }]);
      } else {
        setFencer2Cards([...fencer2Cards, { color: selectedCard }]);
      }
      setSelectedCard(null);
      setShowCardActionModal(false);
      setRemovalMode(false);
    }
  };

  const removeCard = (fencer: 1 | 2) => {
    if (selectedCard) {
      if (fencer === 1) {
        const index = fencer1Cards.findIndex(card => card.color === selectedCard);
        if (index !== -1) {
          const newCards = [...fencer1Cards];
          newCards.splice(index, 1);
          setFencer1Cards(newCards);
        }
      } else {
        const index = fencer2Cards.findIndex(card => card.color === selectedCard);
        if (index !== -1) {
          const newCards = [...fencer2Cards];
          newCards.splice(index, 1);
          setFencer2Cards(newCards);
        }
      }
      setSelectedCard(null);
      setShowCardActionModal(false);
      setRemovalMode(false);
    }
  };

  // Score update handling with optimistic updates
  const updateScore = (fencer: 1 | 2, increment: boolean) => {
    if (!fencer1Id || !fencer2Id) {
      Alert.alert('Error', 'Missing fencer IDs');
      return;
    }
    
    if (!bout) {
      Alert.alert('Error', 'Bout data not available');
      return;
    }
    
    // Stop both timers immediately on score change
    stopTimer();
    
    // Save passivity timer value and score change for potential revert
    setSavedPassivityTime(passivityTime);
    setLastScoreChange({ fencer, delta: increment ? 1 : -1 });
    
    // Reset passivity timer
    setPassivityTime(60);
    
    // Calculate new scores
    let newFencer1Score = fencer1Score;
    let newFencer2Score = fencer2Score;
    
    if (fencer === 1) {
      newFencer1Score = Math.max(0, increment ? fencer1Score + 1 : fencer1Score - 1);
    } else {
      newFencer2Score = Math.max(0, increment ? fencer2Score + 1 : fencer2Score - 1);
    }
    
    // Use the mutation to update scores with optimistic updates
    updateScoresMutation.mutate({
      boutId: boutId,
      fencer1Id,
      fencer1Score: newFencer1Score,
      fencer2Id,
      fencer2Score: newFencer2Score
    }, {
      onError: (error) => {
        // Rollback to previous state if update fails
        if (savedPassivityTime !== null) {
          setPassivityTime(savedPassivityTime);
        }
        Alert.alert('Error', `Failed to update score: ${error.message}`);
      }
    });
  };

  // Function to revert the last score change
  const revertLastPoint = () => {
    if (lastScoreChange && fencer1Id && fencer2Id) {
      const { fencer, delta } = lastScoreChange;
      
      // Calculate scores to revert to
      const revertedFencer1Score = fencer === 1 
        ? Math.max(0, fencer1Score - delta) 
        : fencer1Score;
        
      const revertedFencer2Score = fencer === 2 
        ? Math.max(0, fencer2Score - delta) 
        : fencer2Score;
      
      // Update scores with reverted values
      updateScoresMutation.mutate({
        boutId,
        fencer1Id,
        fencer1Score: revertedFencer1Score,
        fencer2Id,
        fencer2Score: revertedFencer2Score
      });
      
      // Restore saved passivity time
      if (savedPassivityTime !== null) {
        setPassivityTime(savedPassivityTime);
      }
      
      // Clear revert state
      setLastScoreChange(null);
      setSavedPassivityTime(null);
    }
  };

  // Timer logic
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
      passivityTimerRef.current = setInterval(() => {
        setPassivityTime(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (passivityTimerRef.current) {
      clearInterval(passivityTimerRef.current);
      passivityTimerRef.current = null;
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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (passivityTimerRef.current) {
        clearInterval(passivityTimerRef.current);
      }
    };
  }, []);

  // Set bout victor (winner) function
  const setBoutVictor = (victorId: number) => {
    if (!bout) return;
    
    setBoutVictorMutation.mutate({
      boutId: bout.id,
      victorId
    }, {
      onSuccess: () => {
        // Navigate back on success
        navigation.goBack();
      },
      onError: (error) => {
        Alert.alert('Error', `Failed to set victor: ${error.message}`);
      }
    });
  };

  // Render card indicators
  const renderAggregatedCards = (cards: FencerCard[]) => {
    const cardTypes: CardColor[] = ['yellow', 'red', 'black'];
    let elements: JSX.Element[] = [];
    cardTypes.forEach(type => {
      const count = cards.filter(card => card.color === type).length;
      if (count === 0) return;
      if (count > 3) {
        elements.push(
          <View
            key={type}
            style={[
              styles.cardIndicator,
              styles.aggregatedIndicator,
              { backgroundColor: type || undefined },
            ]}
          >
            <Text style={[styles.cardCountText, { color: type === 'yellow' ? '#000' : '#fff' }]}>
              {count}x
            </Text>
          </View>
        );
      } else {
        for (let i = 0; i < count; i++) {
          elements.push(
            <View key={`${type}-${i}`} style={[styles.cardIndicator, { backgroundColor: type || undefined }]} />
          );
        }
      }
    });
    return elements;
  };

  // Display loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001f3f" />
        <Text style={styles.loadingText}>Loading bout data...</Text>
      </View>
    );
  }

  // Display error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Helper to get last name
  function getLastName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1] || fullName;
  }

  return (
    <View style={[styles.container, kawaiiMode && kawaiiModeStyles.container]}>
      {/* Connection status bar at the top */}
      <ConnectionStatusBar compact={true} />
      
      {/* Offline warning */}
      {!networkStatus.isConnected && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineWarningText}>
            You are currently offline. Changes will sync when you're back online.
          </Text>
        </View>
      )}

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
        <Text style={[styles.timerText, isRunning ? styles.timerTextRunning : styles.timerTextStopped]}>
          {formatTime(time)}
        </Text>
        <Pressable>
          <Text style={styles.passivityTimerText}>
            {formatTime(passivityTime)}
          </Text>
        </Pressable>
        <Text style={[styles.timerStatus, isRunning ? styles.timerStatusRunning : styles.timerStatusStopped]}>
          {isRunning ? 'Tap to pause, hold for options' : 'Tap to start, hold for options'}
        </Text>
      </TouchableOpacity>

      <View style={styles.scoreContainer}>
        <View style={styles.fencerContainer}>
          <View style={styles.cardsContainer}>
            {renderAggregatedCards(fencer1Cards)}
          </View>
          <Text style={styles.fencerLabel}>
            {kawaiiMode ? 'Kitten 1' : getLastName(fencer1Name)}
          </Text>
          <Text style={styles.scoreText}>{fencer1Score}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.scoreButton, kawaiiMode && kawaiiModeStyles.scoreButton]}
              onPress={() => updateScore(1, true)}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scoreButton, styles.minusButton, kawaiiMode && kawaiiModeStyles.minusButton]}
              onPress={() => updateScore(1, false)}
            >
              <Text style={styles.buttonText}>−</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fencerContainer}>
          <View style={styles.cardsContainer}>
            {renderAggregatedCards(fencer2Cards)}
          </View>
          <Text style={styles.fencerLabel}>
            {kawaiiMode ? 'Kitten 2' : getLastName(fencer2Name)}
          </Text>
          <Text style={styles.scoreText}>{fencer2Score}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.scoreButton, kawaiiMode && kawaiiModeStyles.scoreButton]}
              onPress={() => updateScore(2, true)}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scoreButton, styles.minusButton, kawaiiMode && kawaiiModeStyles.minusButton]}
              onPress={() => updateScore(2, false)}
            >
              <Text style={styles.buttonText}>−</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.doubleTouchButton, kawaiiMode && kawaiiModeStyles.doubleTouchButton]}
        onPress={() => {
          updateScore(1, true);
          updateScore(2, true);
        }}
      >
        <Text style={styles.doubleTouchButtonText}>Double Touch</Text>
      </TouchableOpacity>

      <View style={styles.victoryContainer}>
        <TouchableOpacity
          style={styles.victoryButton}
          onPress={() => fencer1Id && setBoutVictor(fencer1Id)}
        >
          <Text style={styles.victoryButtonText}>
            {getLastName(fencer1Name)} Wins
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.victoryButton}
          onPress={() => fencer2Id && setBoutVictor(fencer2Id)}
        >
          <Text style={styles.victoryButtonText}>
            {getLastName(fencer2Name)} Wins
          </Text>
        </TouchableOpacity>
      </View>

      {showCardActionModal && (
        <Modal
          visible={showCardActionModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCardActionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {removalMode ? (
                <>
                  <Text style={styles.modalText}>
                    Remove {selectedCard} card from:
                  </Text>
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity style={styles.modalButton} onPress={() => removeCard(1)}>
                      <Text style={styles.modalButtonText}>Left</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButton} onPress={() => removeCard(2)}>
                      <Text style={styles.modalButtonText}>Right</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.colorPreview, { backgroundColor: selectedCard || '#fff' }]} />
                  <Text style={styles.modalText}>Assign card to:</Text>
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity style={styles.modalButton} onPress={() => assignCard(1)}>
                      <Text style={styles.modalButtonText}>Left</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButton} onPress={() => assignCard(2)}>
                      <Text style={styles.modalButtonText}>Right</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowCardActionModal(false)}>
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <View style={styles.cardButtonsContainer}>
        <Pressable
          style={({ pressed }) => [styles.cardButton, { backgroundColor: 'yellow' }, pressed && styles.pressedButton]}
          onPress={() => handleCardPress('yellow', false)}
          onLongPress={() => handleCardPress('yellow', true)}
        >
          <Text style={styles.cardButtonText}>Yellow</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.cardButton, { backgroundColor: 'red' }, pressed && styles.pressedButton]}
          onPress={() => handleCardPress('red', false)}
          onLongPress={() => handleCardPress('red', true)}
        >
          <Text style={styles.cardButtonText}>Red</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.cardButton, { backgroundColor: 'black' }, pressed && styles.pressedButton]}
          onPress={() => handleCardPress('black', false)}
          onLongPress={() => handleCardPress('black', true)}
        >
          <Text style={[styles.cardButtonText, { color: 'white' }]}>Black</Text>
        </Pressable>
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
        onRevertLastPoint={revertLastPoint}
        kawaiiMode={kawaiiMode}
        canRevertLastPoint={lastScoreChange !== null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#001f3f',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  offlineWarning: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    margin: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  offlineWarningText: {
    color: '#856404',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
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
  passivityTimerText: {
    fontSize: 20,
    marginTop: 10,
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
  cardsContainer: {
    flexDirection: 'row',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  fencerLabel: {
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 0,
  },
  scoreText: {
    fontSize: 100,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 10,
  },
  scoreButton: {
    backgroundColor: '#001f3f',
    width: 80,
    height: 80,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  minusButton: {
    backgroundColor: '#5a0b0b',
  },
  buttonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardButtonsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    height: 80,
  },
  cardButton: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: 8,
    borderColor: '#5a0b0b',
    alignItems: 'center',
  },
  pressedButton: {
    opacity: 0.6,
  },
  cardButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '80%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  colorPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#001f3f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginVertical: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  modalCloseButtonText: {
    color: '#000',
    fontSize: 16,
  },
  doubleTouchButton: {
    backgroundColor: '#001f3f',
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
  victoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  victoryButton: {
    backgroundColor: '#228B22',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  victoryButtonText: {
    color: '#fff',
    fontSize: 16,
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
  cardIndicator: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 4,
  },
  aggregatedIndicator: {
    width: 25,
    height: 25,
    borderRadius: 5,
  },
  cardCountText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default RefereeModuleOptimized;