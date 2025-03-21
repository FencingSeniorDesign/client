import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRefereeQueries } from '../hooks/useRefereeQueries';

interface LiveScoreDisplayProps {
  boutId: number;
}

/**
 * Component that displays live-updating scores for a bout
 * Uses live queries to automatically refresh when scores change
 */
export const LiveScoreDisplay: React.FC<LiveScoreDisplayProps> = ({ boutId }) => {
  // Use the live query hook to get real-time updates
  const { useLiveBout } = useRefereeQueries();
  const { bout, scores, error, isLoading } = useLiveBout(boutId);
  
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading bout data...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading bout: {String(error)}</Text>
      </View>
    );
  }
  
  if (!bout || !scores) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bout not found</Text>
      </View>
    );
  }
  
  // Find the left and right fencer scores
  const leftFencerScore = scores.find(s => s.fencerId === bout.lFencer)?.score || 0;
  const rightFencerScore = scores.find(s => s.fencerId === bout.rFencer)?.score || 0;
  
  // Determine if the bout has a victor
  const hasVictor = bout.victor !== null;
  const victorIsLeft = bout.victor === bout.lFencer;
  const victorIsRight = bout.victor === bout.rFencer;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Bout Score</Text>
      
      <View style={styles.scoreContainer}>
        {/* Left Fencer */}
        <View style={[
          styles.fencerContainer, 
          victorIsLeft && styles.victorContainer
        ]}>
          <Text style={styles.fencerName}>Left Fencer</Text>
          <Text style={styles.score}>{leftFencerScore}</Text>
          {victorIsLeft && <Text style={styles.victorText}>WINNER</Text>}
        </View>
        
        <Text style={styles.versus}>VS</Text>
        
        {/* Right Fencer */}
        <View style={[
          styles.fencerContainer, 
          victorIsRight && styles.victorContainer
        ]}>
          <Text style={styles.fencerName}>Right Fencer</Text>
          <Text style={styles.score}>{rightFencerScore}</Text>
          {victorIsRight && <Text style={styles.victorText}>WINNER</Text>}
        </View>
      </View>
      
      {hasVictor && (
        <Text style={styles.boutCompleteText}>Bout Complete</Text>
      )}
      
      <Text style={styles.liveText}>Live Updates Enabled</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  fencerContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: '40%',
  },
  victorContainer: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
    borderWidth: 2,
  },
  fencerName: {
    fontSize: 16,
    marginBottom: 8,
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  versus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  victorText: {
    color: 'green',
    fontWeight: 'bold',
    marginTop: 8,
  },
  boutCompleteText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
    marginTop: 16,
  },
  liveText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 8,
  },
  loadingText: {
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default LiveScoreDisplay;