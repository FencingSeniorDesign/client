import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRounds } from '../hooks/useRounds';
import { Round, RoundType } from '../../../core/types';

type RoundManagementProps = {
  eventId: number;
};

/**
 * Round Management screen
 * Uses optimized round hooks for better performance
 */
const RoundManagement: React.FC<RoundManagementProps> = ({ eventId }) => {
  const [selectedRoundId, setSelectedRoundId] = useState<number | undefined>(undefined);
  
  // Use the optimized hooks from useRounds
  const { 
    useGetRoundsByEventId, 
    useLiveRoundsByEventId,
    useGetCurrentRound,
    useUpdateRound,
    useCreatePoolRound,
    useCreateDERound,
    useMarkRoundAsStarted,
    useMarkRoundAsComplete,
  } = useRounds();
  
  // For regular data fetching - use when you don't need real-time updates
  // const { data: rounds = [], isLoading, error } = useGetRoundsByEventId(eventId);
  
  // For real-time data with live updates
  const { data: rounds = [], error } = useLiveRoundsByEventId(eventId);
  const { data: currentRound } = useGetCurrentRound(eventId);
  
  // Mutations
  const updateRound = useUpdateRound();
  const createPoolRound = useCreatePoolRound();
  const createDERound = useCreateDERound();
  const markAsStarted = useMarkRoundAsStarted();
  const markAsComplete = useMarkRoundAsComplete();
  
  // Handle round selection
  const handleSelectRound = (round: Round) => {
    setSelectedRoundId(round.id);
  };
  
  // Handle creating a new pool round
  const handleCreatePoolRound = () => {
    createPoolRound.mutate({
      eventId,
      rorder: rounds.length + 1,
      poolCount: 2,
      poolSize: 7,
      options: {
        poolsOption: 'standard',
        promotionPercent: 80,
      },
    });
  };
  
  // Handle creating a new DE round
  const handleCreateDERound = () => {
    createDERound.mutate({
      eventId,
      rorder: rounds.length + 1,
      deFormat: 'single',
      deTableSize: 16,
    });
  };
  
  // Handle marking a round as started
  const handleStartRound = (id: number) => {
    markAsStarted.mutate(id);
  };
  
  // Handle marking a round as complete
  const handleCompleteRound = (id: number) => {
    markAsComplete.mutate(id);
  };
  
  // Render the round item
  const renderRoundItem = ({ item }: { item: Round }) => {
    const isCurrentRound = currentRound?.id === item.id;
    const roundStatusText = 
      !item.isStarted ? 'Not Started' : 
      item.isComplete ? 'Complete' : 
      'In Progress';
    
    return (
      <TouchableOpacity 
        style={[
          styles.roundItem, 
          isCurrentRound && styles.currentRound,
          selectedRoundId === item.id && styles.selectedRound
        ]}
        onPress={() => handleSelectRound(item)}
      >
        <View style={styles.roundHeader}>
          <Text style={styles.roundTitle}>
            {item.type === 'pool' ? 'Pool Round' : 'DE Round'} {item.rorder}
          </Text>
          <Text style={styles.roundStatus}>{roundStatusText}</Text>
        </View>
        
        <View style={styles.roundDetails}>
          {item.type === 'pool' && (
            <Text>
              {item.poolCount} pools × {item.poolSize} fencers
            </Text>
          )}
          
          {item.type === 'de' && (
            <Text>
              {item.deFormat} elimination - {item.deTableSize} fencers
            </Text>
          )}
        </View>
        
        <View style={styles.roundActions}>
          {!item.isStarted && (
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => handleStartRound(item.id)}
            >
              <Text style={styles.buttonText}>Start Round</Text>
            </TouchableOpacity>
          )}
          
          {item.isStarted && !item.isComplete && (
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => handleCompleteRound(item.id)}
            >
              <Text style={styles.buttonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Loading state when we have no data yet
  if (!rounds && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  // Error state
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {String(error)}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Round Management</Text>
      
      <View style={styles.createButtons}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreatePoolRound}>
          <Text style={styles.buttonText}>Add Pool Round</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton} onPress={handleCreateDERound}>
          <Text style={styles.buttonText}>Add DE Round</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={rounds}
        renderItem={renderRoundItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No rounds created yet</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  createButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  button: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 16,
  },
  roundItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  currentRound: {
    borderColor: '#3498db',
    borderWidth: 2,
  },
  selectedRound: {
    backgroundColor: '#f0f8ff',
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  roundStatus: {
    fontStyle: 'italic',
  },
  roundDetails: {
    marginBottom: 12,
  },
  roundActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    fontSize: 16,
  },
});

export default RoundManagement;