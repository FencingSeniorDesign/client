/**
 * DEBracketPageOptimized
 * Optimized implementation using our new service and hooks
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event } from '../../../../core/types';
import { useRounds } from '../../hooks/useRounds';
import { useDEBouts } from '../hooks/useDEBouts';
import { DEBout } from '../services/deBoutService';
import { getRoundName } from '../utils/BracketFormats';

type DEBracketPageParams = {
  event: Event;
  currentRoundIndex: number;
  roundId: number;
  isRemote?: boolean;
};

type DEBracketPageRouteProp = RouteProp<{ params: DEBracketPageParams }, 'params'>;
type DEBracketPageNavProp = NativeStackNavigationProp<RootStackParamList, 'DEBracketPage'>;

interface DEBracketRound {
  roundIndex: number;
  tableOf: number;
  bouts: DEBout[];
}

interface DEBracketData {
  rounds: DEBracketRound[];
}

const DEBracketPageOptimized: React.FC = () => {
  const route = useRoute<DEBracketPageRouteProp>();
  const navigation = useNavigation<DEBracketPageNavProp>();
  const { event, currentRoundIndex, roundId, isRemote = false } = route.params;

  const [selectedBoutId, setSelectedBoutId] = useState<number | undefined>(undefined);

  // Use our optimized hooks
  const { useGetRoundById } = useRounds();
  const { 
    useLiveDEBoutsByRoundId, 
    useIsDERoundComplete,
    useGetDETableSize,
    useUpdateDEBoutAndAdvanceWinner
  } = useDEBouts();

  // Get the round data
  const { data: round, isLoading: roundLoading } = useGetRoundById(roundId);
  
  // Get live-updating DE bouts
  const { data: deBouts = [], error: boutsError } = useLiveDEBoutsByRoundId(roundId);
  
  // Check if the round is complete
  const { data: isRoundComplete = false } = useIsDERoundComplete(roundId);
  
  // Get the DE table size
  const { data: tableSize = 0 } = useGetDETableSize(roundId);
  
  // Mutation for updating bout scores and advancing winner
  const updateAndAdvanceMutation = useUpdateDEBoutAndAdvanceWinner();

  // Process bouts into bracket format
  const bracketData = useMemo(() => {
    if (!deBouts || deBouts.length === 0 || !tableSize) {
      return { rounds: [] };
    }

    // Calculate number of rounds based on table size
    const numRounds = Math.log2(tableSize);
    const rounds: DEBracketRound[] = [];

    // Create rounds
    for (let i = 0; i < numRounds; i++) {
      const currentTableOf = tableSize / Math.pow(2, i);
      
      // Filter bouts by tableOf value
      const roundBouts = deBouts.filter(bout => bout.tableOf === currentTableOf);
      
      // Sort bouts by their position in the bracket
      roundBouts.sort((a, b) => (a.boutOrder || 0) - (b.boutOrder || 0));

      rounds.push({
        roundIndex: i,
        tableOf: currentTableOf,
        bouts: roundBouts,
      });
    }

    return { rounds };
  }, [deBouts, tableSize]);

  // Handle bout selection
  const handleBoutPress = (bout: DEBout) => {
    // Skip if it's a BYE
    if (bout.isBye) {
      Alert.alert('BYE', 'This fencer advances automatically.');
      return;
    }

    // Skip if both fencers aren't set yet (waiting for previous round)
    if (!bout.fencerA || !bout.fencerB) {
      Alert.alert('Not Ready', 'This bout is waiting for fencers from previous rounds.');
      return;
    }

    // Set the selected bout
    setSelectedBoutId(bout.id);

    // Navigate to Referee Module
    navigation.navigate('RefereeModule', {
      boutIndex: bout.boutOrder || 0,
      fencer1Name: `${bout.fencerA.fname} ${bout.fencerA.lname}`,
      fencer2Name: `${bout.fencerB.fname} ${bout.fencerB.lname}`,
      currentScore1: bout.scoreA || 0,
      currentScore2: bout.scoreB || 0,
      onSaveScores: async (score1: number, score2: number) => {
        try {
          // Determine winner based on scores
          const winnerId = score1 > score2 ? bout.fencerA!.id : bout.fencerB!.id;
          
          // Update bout scores and advance winner
          await updateAndAdvanceMutation.mutateAsync({
            boutId: bout.id,
            scoreA: score1,
            scoreB: score2,
            winnerId,
          });
          
          // Clear selection
          setSelectedBoutId(undefined);
        } catch (error) {
          console.error('Error updating bout scores:', error);
          Alert.alert('Error', 'Failed to save scores.');
        }
      },
    });
  };

  // Handle viewing results
  const handleViewResults = () => {
    navigation.navigate('TournamentResultsPage', {
      eventId: event.id,
      isRemote
    });
  };

  // Render a single bout card
  const renderBout = (bout: DEBout) => {
    const fencerAName = bout.fencerA
      ? `${bout.fencerA.lname}, ${bout.fencerA.fname}`
      : 'BYE';
    const fencerBName = bout.fencerB
      ? `${bout.fencerB.lname}, ${bout.fencerB.fname}`
      : 'BYE';

    // Determine styles based on winner/BYE status
    const boutCompleted = bout.winnerId !== undefined;
    const isBye = bout.isBye;
    const isSelected = selectedBoutId === bout.id;

    // Determine winner (if completed)
    const fencerAWon = bout.winnerId === bout.fencerA?.id;
    const fencerBWon = bout.winnerId === bout.fencerB?.id;

    return (
      <TouchableOpacity
        style={[
          styles.boutContainer,
          isBye && styles.byeBout,
          boutCompleted && styles.completedBout,
          isSelected && styles.selectedBout,
        ]}
        onPress={() => handleBoutPress(bout)}
        disabled={isBye}
      >
        <View style={styles.fencerRow}>
          <View style={styles.fencerInfo}>
            <Text style={[
              styles.seedText,
              bout.fencerA?.seedNumber !== undefined && styles.seedVisible
            ]}>
              {bout.fencerA?.seedNumber !== undefined ? `(${bout.fencerA.seedNumber})` : ''}
            </Text>
            <Text style={[
              styles.fencerName,
              fencerAWon && styles.winnerText,
              isBye && styles.byeText
            ]}>
              {fencerAName}
            </Text>
          </View>
          <Text style={styles.fencerScore}>
            {bout.scoreA !== undefined ? bout.scoreA : '-'}
          </Text>
        </View>
        <View style={styles.fencerRow}>
          <View style={styles.fencerInfo}>
            <Text style={[
              styles.seedText,
              bout.fencerB?.seedNumber !== undefined && styles.seedVisible
            ]}>
              {bout.fencerB?.seedNumber !== undefined ? `(${bout.fencerB.seedNumber})` : ''}
            </Text>
            <Text style={[
              styles.fencerName,
              fencerBWon && styles.winnerText,
              isBye && styles.byeText
            ]}>
              {fencerBName}
            </Text>
          </View>
          <Text style={styles.fencerScore}>
            {bout.scoreB !== undefined ? bout.scoreB : '-'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (roundLoading || !round) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading bracket...</Text>
      </View>
    );
  }
  
  // Error state
  if (boutsError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load bracket data: {String(boutsError)}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {event.weapon} {event.gender} {event.age} DE
      </Text>

      <Text style={styles.formatText}>
        Format: {round.deFormat ? (round.deFormat.charAt(0).toUpperCase() + round.deFormat.slice(1)) : 'Single'} Elimination
      </Text>

      {/* Add View Results button if the round is complete */}
      {isRoundComplete && (
        <TouchableOpacity
          style={styles.viewResultsButton}
          onPress={handleViewResults}
        >
          <Text style={styles.viewResultsButtonText}>View Results</Text>
        </TouchableOpacity>
      )}

      {bracketData.rounds.map((round, index) => (
        <View key={index} style={styles.roundContainer}>
          <Text style={styles.roundTitle}>
            {getRoundName(round.tableOf, index)}
          </Text>
          <View style={styles.boutsContainer}>
            {round.bouts.map((bout, boutIndex) => (
              <View key={boutIndex} style={styles.boutWrapper}>
                {renderBout(bout)}
              </View>
            ))}
            {round.bouts.length === 0 && (
              <Text style={styles.emptyText}>No bouts in this round</Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  viewResultsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  viewResultsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#001f3f',
  },
  formatText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
  },
  roundContainer: {
    marginBottom: 25,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    borderRadius: 4,
    color: '#001f3f',
  },
  boutsContainer: {
    flexDirection: 'column',
  },
  boutWrapper: {
    marginBottom: 15,
    alignItems: 'center',
  },
  boutContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    width: '90%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  byeBout: {
    backgroundColor: '#f9f9f9',
    opacity: 0.8,
    borderStyle: 'dashed',
  },
  completedBout: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  selectedBout: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#f0f8ff',
  },
  fencerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fencerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seedText: {
    fontSize: 14,
    marginRight: 6,
    color: '#666',
    opacity: 0,
  },
  seedVisible: {
    opacity: 1,
  },
  fencerName: {
    fontSize: 16,
  },
  byeText: {
    fontStyle: 'italic',
    color: '#999',
  },
  fencerScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    minWidth: 30,
    textAlign: 'center',
  },
  winnerText: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default DEBracketPageOptimized;