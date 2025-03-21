import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import TournamentList from './TournamentList';
import { useTournamentQueries } from '../hooks/useTournamentQueries';

interface TournamentListContainerProps {
  isComplete?: boolean;
  title?: string;
}

/**
 * Container component that fetches tournament data using live queries
 * and renders the TournamentList component with the data
 */
export const TournamentListContainer: React.FC<TournamentListContainerProps> = ({
  isComplete = false,
  title,
}) => {
  // Use the query hook to get tournament data
  const { useTournaments } = useTournamentQueries();
  const { data: tournaments, isLoading, isError, refetch } = useTournaments(isComplete);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading tournaments</Text>
          <Text style={styles.errorDescription}>Please try again later</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <TournamentList 
        tournaments={tournaments || []} 
        onTournamentDeleted={refetch}
        isComplete={isComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  errorDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default TournamentListContainer;