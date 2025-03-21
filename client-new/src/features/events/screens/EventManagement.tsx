import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useEventQueries } from '../hooks/useEventQueries';
import { Event } from '../../../core/types';
import { MainStackNavigationProp } from '../../../navigation/types';
import { useNetworkStatus } from '../../../infrastructure/networking/client';

interface EventManagementProps {
  route: {
    params: {
      tournamentName: string;
      isRemote?: boolean;
    }
  };
}

/**
 * EventManagement screen component
 * Displays the list of events for a tournament with live updates
 */
export const EventManagement: React.FC<EventManagementProps> = ({ route }) => {
  const { tournamentName, isRemote = false } = route.params;
  const navigation = useNavigation<MainStackNavigationProp>();
  const { isConnected } = useNetworkStatus();
  
  // Use the live query hook for real-time updates
  const { useLiveEventsByTournament, useDelete } = useEventQueries();
  const { data: events, error } = useLiveEventsByTournament(tournamentName);
  
  // Delete event mutation
  const { mutate: deleteEvent, isPending: isDeleting } = useDelete();
  
  // Loading and error states
  const isLoading = !events && !error;
  
  // Event selection handler
  const handleSelectEvent = (event: Event) => {
    navigation.navigate('EventSettings', {
      event: event,
      onSave: () => {}, // This will be handled by live queries now
      isRemote
    });
  };
  
  // Delete event handler
  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete the ${event.weapon} ${event.gender} ${event.age} event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteEvent(event.id);
          }
        }
      ]
    );
  };
  
  // Navigate to manage officials
  const navigateToManageOfficials = () => {
    navigation.navigate('ManageOfficials', {
      tournamentName: tournamentName,
      isRemote: isRemote
    });
  };
  
  // Handle starting an event
  const handleStartEvent = (eventId: number) => {
    // Check the first round type for this event and navigate to the appropriate screen
    navigation.navigate('RoundResults', {
      eventId: eventId,
      roundId: 0, // This will be updated when we implement the rounds domain
      currentRoundIndex: 0,
      isRemote
    });
  };

  // Render each event item
  const renderEventItem = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={() => handleSelectEvent(item)}
      disabled={isDeleting}
    >
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>
          {item.weapon} {item.gender} {item.age}
        </Text>
        <Text style={styles.eventDetails}>
          Classification: {item.class}
        </Text>
      </View>
      
      <View style={styles.eventActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleSelectEvent(item)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={() => handleStartEvent(item.id)}
        >
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
        
        {!isRemote && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteEvent(item)}
            disabled={isDeleting}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
  
  // If loading, show a loading indicator
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }
  
  // If error, show an error message
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Error loading events: {String(error)}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Events for {tournamentName}</Text>
      
      {/* Show offline warning when not connected */}
      {!isConnected && isRemote && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineWarningText}>
            You are currently offline. Changes will be synced when you reconnect.
          </Text>
        </View>
      )}
      
      {!isRemote && (
        <TouchableOpacity
          style={styles.manageOfficialsButton}
          onPress={navigateToManageOfficials}
        >
          <Text style={styles.manageOfficialsText}>Manage Officials</Text>
        </TouchableOpacity>
      )}
      
      {/* Badge to indicate live updates */}
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>
      
      {/* If no events, show a message */}
      {(!events || events.length === 0) ? (
        <View style={styles.noEventsContainer}>
          <Text style={styles.noEventsText}>
            No events available for this tournament.
          </Text>
          
          {!isRemote && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                // This will be implemented separately
                Alert.alert('Coming Soon', 'Adding events will be implemented soon');
              }}
            >
              <Text style={styles.addButtonText}>Add Event</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      {!isRemote && events && events.length > 0 && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // This will be implemented separately
            Alert.alert('Coming Soon', 'Adding events will be implemented soon');
          }}
        >
          <Text style={styles.addButtonText}>Add Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  eventItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventInfo: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    color: '#666666',
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: '#1890ff',
  },
  startButton: {
    backgroundColor: '#52c41a',
  },
  deleteButton: {
    backgroundColor: '#ff4d4f',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#1890ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noEventsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 16,
    textAlign: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#52c41a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  manageOfficialsButton: {
    backgroundColor: '#722ed1',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  manageOfficialsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  offlineWarning: {
    backgroundColor: '#faad14',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  offlineWarningText: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default EventManagement;