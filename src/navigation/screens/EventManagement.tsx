// src/navigation/screens/EventManagement.tsx - Updated for remote connections
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, RouteProp, useFocusEffect} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {RootStackParamList, Event, Round, Fencer} from '../navigation/types';
import {
  dbGetFencersInEventById,
  dbGetRoundsForEvent,
  dbInitializeRound
} from '../../db/TournamentDatabaseUtils';
import {navigateToDEPage} from "../utils/DENavigationUtil";
import tournamentServer from '../../networking/TournamentServer';
import tournamentClient from '../../networking/TournamentClient';
import { getLocalIpAddress, isConnectedToInternet, getNetworkInfo } from '../../networking/NetworkUtils';
import ConnectionStatusBar from '../../networking/components/ConnectionStatusBar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEvents, useCreateEvent, useEventStatuses, useDeleteEvent } from '../../hooks/useTournamentQueries';

type Props = {
  route: RouteProp<{ params: { tournamentName: string, isRemoteConnection?: boolean } }, 'params'>;
};

export const EventManagement = ({ route }: Props) => {
  const { tournamentName, isRemoteConnection = false } = route.params;
  const queryClient = useQueryClient();
  
  // Use TanStack Query for fetching events
  const { 
    data: events = [], 
    isLoading: eventsLoading,
    isError: eventsError
  } = useEvents(tournamentName);
  
  // We'll use TanStack Query for event statuses instead of local state
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Fields for event creation
  const [selectedGender, setSelectedGender] = useState<string>('Mixed');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('Foil');
  const [selectedAge, setSelectedAge] = useState<string>('Senior');

  // Server hosting state
  const [serverEnabled, setServerEnabled] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ip: string | null, port: number} | null>(null);
  const [localIpAddress, setLocalIpAddress] = useState<string | null>(null);
  const [serverOperationPending, setServerOperationPending] = useState(false);
  
  // Network connectivity state
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  // Remote connection state
  const [isRemote, setIsRemote] = useState(isRemoteConnection);
  const [remoteConnectionInfo, setRemoteConnectionInfo] = useState<{
    tournamentName: string;
    hostIp: string;
    port: number;
  } | null>(null);
  
  // Use TanStack Query mutation for creating events
  const createEventMutation = useCreateEvent();

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Custom back button handling for remote connections
  useEffect(() => {
    if (isRemote) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Show a confirmation dialog before disconnecting
        Alert.alert(
            'Disconnect from Tournament',
            'Are you sure you want to disconnect from this tournament?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => {} },
              {
                text: 'Disconnect',
                style: 'destructive',
                onPress: () => {
                  tournamentClient.disconnect();
                  navigation.goBack();
                }
              },
            ]
        );
        return true; // prevents default back button behavior
      });

      return () => backHandler.remove();
    }
    return undefined;
  }, [isRemote, navigation]);

  // Get connection info when in remote mode
  useEffect(() => {
    if (isRemote) {
      const clientInfo = tournamentClient.getClientInfo();
      if (clientInfo) {
        setRemoteConnectionInfo({
          tournamentName: clientInfo.tournamentName,
          hostIp: clientInfo.hostIp,
          port: clientInfo.port
        });
      }

      // Listen for disconnection events
      const handleDisconnect = () => {
        Alert.alert(
            'Connection Lost',
            'The connection to the tournament server was lost.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      };

      tournamentClient.on('disconnected', handleDisconnect);

      return () => {
        tournamentClient.removeListener('disconnected', handleDisconnect);
      };
    }
  }, [isRemote, navigation]);

  // Use TanStack Query to get event statuses
  const { 
    data: eventStatuses = {}, 
    isLoading: eventStatusesLoading 
  } = useEventStatuses(events);

  // Function to check actual server status
  const checkServerStatus = useCallback(async () => {
    await tournamentServer.loadServerInfo();
    const info = tournamentServer.getServerInfo();
    const isRunning = tournamentServer.isServerRunning();
    
    // Update UI state based on actual server status
    setServerEnabled(isRunning);
    
    if (isRunning && info) {
      setServerInfo({
        ip: info.hostIp === '0.0.0.0' ? localIpAddress : info.hostIp,
        port: info.port
      });
    } else if (!isRunning) {
      setServerInfo(null);
    }
    
    return isRunning;
  }, [localIpAddress]);
  
  // Function to check network connectivity
  const checkNetworkConnectivity = useCallback(async () => {
    try {
      const connected = await isConnectedToInternet();
      setIsNetworkConnected(connected);
      
      // Get detailed network info if needed
      if (serverEnabled || !connected) {
        const info = await getNetworkInfo();
        setNetworkInfo(info);
      }
      
      return connected;
    } catch (error) {
      console.error('Error checking network connectivity:', error);
      setIsNetworkConnected(false);
      return false;
    }
  }, [serverEnabled]);

  // This effect runs when component mounts
  useEffect(() => {
    // Get the local IP address and check connectivity
    const initializeNetworking = async () => {
      const ip = await getLocalIpAddress();
      setLocalIpAddress(ip);
      
      await checkNetworkConnectivity();
      await checkServerStatus();
    };

    initializeNetworking();
    
    // Set up periodic checks (every 5 seconds)
    const serverStatusInterval = setInterval(() => {
      checkServerStatus();
    }, 5000);
    
    const networkCheckInterval = setInterval(() => {
      checkNetworkConnectivity();
    }, 10000); // Check network less frequently
    
    // Clean up intervals on unmount
    return () => {
      clearInterval(serverStatusInterval);
      clearInterval(networkCheckInterval);
    };
  }, [checkServerStatus, checkNetworkConnectivity]);

  const openCreateModal = () => {
    setEditingEventId(null);
    setSelectedGender('Mixed');
    setSelectedWeapon('Foil');
    setSelectedAge('Senior');
    setModalVisible(true);
  };

  // Use TanStack Query hook for deleting events
  const deleteEventMutation = useDeleteEvent();

  // When submitting an event creation, include the rounds and pool settings
  const handleSubmitEvent = async () => {
    try {
      const event = {
        weapon: selectedWeapon,
        gender: selectedGender,
        age: selectedAge
      };

      if (editingEventId === null) {
        // Use the mutation from useTournamentQueries
        await createEventMutation.mutate({ 
          tournamentName, 
          event: event as any // ts-ignore via casting
        });
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save event.');
      console.error(error);
    }
  };

  const handleRemoveEvent = async (id: number) => {
    try {
      deleteEventMutation.mutate(id);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const confirmRemoveEvent = (id: number) => {
    Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this event?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: () => handleRemoveEvent(id) },
        ],
        { cancelable: true }
    );
  };

  const confirmStartEvent = (id: number) => {
    Alert.alert(
        'Confirm Start',
        'Are you sure you want to start this event?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: () => handleStartEvent(id) },
        ],
        { cancelable: true }
    );
  };

  const initializeRound = async (event: Event, round: Round, fencers: Fencer[]): Promise<boolean> => {
    try {
      await dbInitializeRound(event, round, fencers);
      return true;
    } catch (error) {
      console.error('Error initializing event:', error);
      Alert.alert('Error', 'Failed to initialize the round.');
      return false;
    }
  };

  const navigateToRoundPage = (event: Event, round: Round, roundIndex: number) => {
    if (!round || !round.type) {
      console.error('Cannot navigate: round or round.type is undefined');
      Alert.alert('Error', 'Failed to navigate to round: invalid round data');
      return;
    }

    if (round.type === 'pool') {
      navigation.navigate('PoolsPage', {
        event: event,
        currentRoundIndex: roundIndex,
        roundId: round.id,
      });
    } else if (round.type === 'de') {
      navigateToDEPage(navigation, event, round, roundIndex);
    } else {
      console.error(`Unknown round type: ${round.type}`);
      Alert.alert('Error', `Unknown round type: ${round.type}`);
    }
  };

  const handleStartEvent = async (eventId: number) => {
    const eventToStart = events.find((evt) => evt.id === eventId);
    if (!eventToStart) return;

    try {
      const fencers = await dbGetFencersInEventById(eventToStart);
      if (!fencers || fencers.length === 0) {
        Alert.alert('Error', 'Cannot start event with no fencers. Please add fencers to this event.');
        return;
      }

      const rounds = await dbGetRoundsForEvent(eventToStart.id);
      if (!rounds || rounds.length === 0) {
        Alert.alert('Error', 'No rounds defined for this event. Please add rounds in the event settings.');
        return;
      }

      const poolRoundsWithoutConfig = rounds.filter(round =>
          round.type === 'pool' && (!round.poolcount || !round.poolsize)
      );

      if (poolRoundsWithoutConfig.length > 0) {
        Alert.alert('Error', 'Some pool rounds do not have a pool configuration selected. Please set pool configurations in the event settings.');
        return;
      }

      const firstRound = rounds[0];

      if (firstRound.type === 'de') {
        let tableSize = 2;
        while (tableSize < fencers.length) {
          tableSize *= 2;
        }

        Alert.alert(
            'Starting DE Round',
            `The bracket will be automatically sized to ${tableSize} based on ${fencers.length} registered fencers.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Continue',
                onPress: async () => {
                  const success = await initializeRound(eventToStart, firstRound, fencers);
                  if (success) {
                    navigateToRoundPage(eventToStart, firstRound, 0);
                  }
                }
              }
            ]
        );
      } else {
        const success = await initializeRound(eventToStart, firstRound, fencers);
        if (success) {
          navigateToRoundPage(eventToStart, firstRound, 0);
        }
      }
    } catch (error) {
      console.error('Error starting event:', error);
      Alert.alert('Error', 'Failed to start event.');
    }
  };

  const handleOpenEvent = async (eventId: number) => {
    console.log('Opening event:', eventId);
    const eventToOpen = events.find((evt) => evt.id === eventId);
    if (!eventToOpen) return;

    try {
      console.log('Event to open:', eventToOpen);
      
      // Special handling for remote connections
      if (isRemote) {
        console.log('Remote connection - requesting rounds for event from server');
        // First, check if the event already has rounds embedded in it
        if (eventToOpen.rounds && Array.isArray(eventToOpen.rounds) && eventToOpen.rounds.length > 0) {
          console.log('Event has embedded rounds:', eventToOpen.rounds);
          const firstRound = eventToOpen.rounds[0];
          navigateToRoundPage(eventToOpen, firstRound, 0);
          return;
        }
        
        // If the event doesn't have embedded rounds, try to request them from server
        try {
          if (tournamentClient.isConnected()) {
            // Request rounds for this event
            tournamentClient.sendMessage({
              type: 'get_rounds',
              eventId: eventToOpen.id
            });
            
            // Wait for the response
            const response = await tournamentClient.waitForResponse('rounds_list', 5000);
            
            if (response && Array.isArray(response.rounds) && response.rounds.length > 0) {
              console.log('Received rounds from server:', response.rounds);
              navigateToRoundPage(eventToOpen, response.rounds[0], 0);
              return;
            } else {
              Alert.alert('Error', 'Could not retrieve rounds data from the server.');
              return;
            }
          }
        } catch (error) {
          console.error('Error requesting rounds from server:', error);
          // Fall back to local database as a last resort
        }
      }
      
      // Standard local database approach
      console.log('Fetching rounds from local database...');
      const rounds = await dbGetRoundsForEvent(eventToOpen.id);
      console.log('Retrieved rounds:', rounds);

      if (!rounds || rounds.length === 0) {
        Alert.alert('Error', 'No rounds defined for this event. Please add rounds in the event settings.');
        return;
      }

      const poolRoundsWithoutConfig = rounds.filter(round =>
          round.type === 'pool' && (!round.poolcount || !round.poolsize)
      );

      if (poolRoundsWithoutConfig.length > 0) {
        Alert.alert('Error', 'Some pool rounds do not have a pool configuration selected. Please set pool configurations in the event settings.');
        return;
      }

      const firstRound = rounds[0];

      if (!firstRound.isstarted) {
        Alert.alert(
            "Round Not Started",
            "This round hasn't been initialized yet. Would you like to start it now?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Start Round", onPress: () => handleStartEvent(eventId) }
            ]
        );
        return;
      }

      navigateToRoundPage(eventToOpen, firstRound, 0);
    } catch (error) {
      console.error('Error opening event:', error);
      Alert.alert('Error', 'Failed to open event.');
    }
  };

  const handleSaveEventSettings = async (updatedEvent: Event) => {
    try {
      loadEvents();
    } catch (error) {
      console.error('Error updating event settings:', error);
    }
  };

  const handleToggleServer = async () => {
    // Don't allow multiple operations in progress
    if (serverOperationPending) return;
    
    setServerOperationPending(true);
    
    try {
      if (serverEnabled) {
        // Verify server is actually running before trying to stop it
        const isRunning = await checkServerStatus();
        if (!isRunning) {
          // Server isn't actually running - reset UI and return
          setServerEnabled(false);
          setServerInfo(null);
          setServerOperationPending(false);
          return;
        }
        
        // Stop the server
        const success = await tournamentServer.stopServer();
        
        // Check actual server status after stop attempt
        const stillRunning = await checkServerStatus();
        
        if (!stillRunning) {
          Alert.alert('Server Stopped', 'Tournament server has been shut down');
        } else {
          Alert.alert(
            'Error', 
            'Failed to stop the tournament server. The server process may still be running in the background.'
          );
        }
      } else {
        // Check internet connectivity first
        const isConnected = await isConnectedToInternet();
        if (!isConnected) {
          Alert.alert(
            'Network Issue',
            'No network connection detected. Other devices may not be able to connect to your tournament server.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Start Anyway', 
                onPress: async () => {
                  await startTournamentServer();
                }
              }
            ]
          );
          setServerOperationPending(false);
          return;
        }
        
        await startTournamentServer();
      }
    } catch (error) {
      console.error('Error toggling server:', error);
      Alert.alert('Error', 'An unexpected error occurred while managing the server');
    } finally {
      setServerOperationPending(false);
    }
  };
  
  // Extracted method to start the tournament server
  const startTournamentServer = async () => {
    try {
      // Get latest network information for better diagnostics
      const networkInfo = await getNetworkInfo();
      console.log('Network info before starting server:', networkInfo);
      
      // Start the server
      const tournament = { name: tournamentName };
      const success = await tournamentServer.startServer(tournament);
      
      // Verify server actually started
      const isRunning = await checkServerStatus();
      
      if (isRunning) {
        const info = tournamentServer.getServerInfo();
        if (info) {
          // Get fresh IP address
          const currentIp = await getLocalIpAddress();
          
          setServerInfo({
            ip: info.hostIp === '0.0.0.0' ? currentIp : info.hostIp,
            port: info.port
          });
          
          Alert.alert(
            'Server Started', 
            `Tournament server is now running at ${currentIp}:${info.port}\n\nShare this information with participants who want to join.`
          );
        }
      } else {
        Alert.alert(
          'Error', 
          'Failed to start the tournament server. Please check your network connection and try again.'
        );
      }
    } catch (error) {
      console.error('Error starting tournament server:', error);
      Alert.alert('Error', 'An unexpected error occurred while starting the server');
    }
  };

  const handleDisconnect = async () => {
    if (isRemote) {
      Alert.alert(
          'Disconnect from Tournament',
          'Are you sure you want to disconnect from this tournament?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disconnect',
              style: 'destructive',
              onPress: async () => {
                await tournamentClient.disconnect();
                navigation.goBack();
              }
            },
          ]
      );
    }
  };

  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          {isRemote ? 'Remote Tournament' : 'Edit Tournament'}
        </Text>

        <View style={styles.headerContainer}>
          <Text style={styles.tournamentName}>{tournamentName}</Text>

          {/* Connection Status (for remote connection only) */}
          {isRemote && (
              <View style={styles.remoteConnectionBanner}>
                <Text style={styles.remoteConnectionText}>
                  Connected to remote tournament
                </Text>
                <Text style={styles.remoteConnectionText}>
                  Host: {remoteConnectionInfo?.hostIp || 'Unknown'}
                </Text>
                <TouchableOpacity
                    style={styles.disconnectButton}
                    onPress={handleDisconnect}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
          )}

          {/* IP Address Banner (for server mode only) */}
          {serverEnabled && localIpAddress && !isRemote && (
              <View style={styles.ipBanner}>
                <Text style={styles.ipText}>Tournament IP: {localIpAddress}</Text>
                <Text style={styles.ipTextSmall}>Port: {serverInfo?.port || 9001}</Text>
                <View style={styles.networkStatusContainer}>
                  <View style={[styles.networkStatusIndicator, 
                    isNetworkConnected ? styles.networkConnected : styles.networkDisconnected]} />
                  <Text style={styles.networkStatusText}>
                    {isNetworkConnected ? 'Network Connected' : 'Network Disconnected'}
                  </Text>
                </View>
              </View>
          )}
        </View>

        {/* Server Control Button (only for local tournaments) */}
        {!isRemote && (
            <TouchableOpacity
                style={[
                  styles.serverButton, 
                  serverEnabled ? styles.serverEnabledButton : styles.serverDisabledButton,
                  serverOperationPending && styles.serverPendingButton
                ]}
                onPress={handleToggleServer}
                disabled={serverOperationPending}
            >
              {serverOperationPending ? (
                <View style={styles.buttonLoadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.serverButtonText}>
                    {serverEnabled ? 'Stopping...' : 'Starting...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.serverButtonText}>
                  {serverEnabled ? 'Disable Server' : 'Enable Server'}
                </Text>
              )}
            </TouchableOpacity>
        )}

        {serverEnabled && serverInfo && !isRemote && (
            <View style={styles.serverInfoContainer}>
              <Text style={styles.serverInfoText}>
                Server running on port: {serverInfo.port}
              </Text>
              <Text style={styles.serverInfoText}>
                Share this info with players who want to join.
              </Text>
            </View>
        )}

        {!isRemote && (
            <Button 
              title="Create Event" 
              onPress={openCreateModal}
              disabled={createEventMutation.isPending} 
            />
        )}

        {eventsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#001f3f" />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : eventsError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading events. Please try again.</Text>
          </View>
        ) : (
          <View style={styles.eventList}>
            {events.length === 0 ? (
              <Text style={styles.noEventsText}>No events created yet</Text>
            ) : (
              events.map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <Text style={styles.eventText}>
                    {event.age} {event.gender} {event.weapon}
                  </Text>
                  <View style={styles.eventActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.flexAction]}
                        onPress={() =>
                            navigation.navigate('EventSettings', {
                              event: event,
                              onSave: handleSaveEventSettings,
                              isRemote: isRemote
                            })
                        }
                    >
                      <Text style={styles.buttonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.flexAction]}
                        onPress={() => {
                            console.log('Event status for', event.id, ':', eventStatuses?.[event.id]);
                            return (eventStatuses && eventStatuses[event.id] === true)
                                ? handleOpenEvent(event.id)
                                : confirmStartEvent(event.id);
                        }}
                    >
                      <Text style={styles.buttonText}>
                        {eventStatuses && (eventStatuses[event.id] === true) ? 'Open' : 'Start'}
                      </Text>
                    </TouchableOpacity>
                    {!isRemote && (
                        <TouchableOpacity
                            onPress={() => confirmRemoveEvent(event.id)}
                            style={styles.removeIconContainer}
                            disabled={deleteEventMutation.isPending}
                        >
                          <Text style={styles.removeIcon}>✖</Text>
                        </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Event</Text>

              {/* AGE SELECTOR */}
              <View style={styles.rowGroup}>
                {['Cadet', 'Senior', 'Veteran'].map((ageOption) => (
                    <TouchableOpacity
                        key={ageOption}
                        style={[
                          styles.optionButton,
                          selectedAge === ageOption && styles.selectedButton,
                        ]}
                        onPress={() => setSelectedAge(ageOption)}
                    >
                      <Text
                          style={[
                            styles.optionText,
                            { color: selectedAge === ageOption ? '#fff' : '#000' },
                          ]}
                      >
                        {ageOption}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              {/* GENDER BUTTONS */}
              <View style={styles.rowGroup}>
                {["Men's", 'Mixed', "Women's"].map((gender) => (
                    <TouchableOpacity
                        key={gender}
                        style={[
                          styles.optionButton,
                          selectedGender === gender && styles.selectedButton,
                        ]}
                        onPress={() => setSelectedGender(gender)}
                    >
                      <Text
                          style={[
                            styles.optionText,
                            { color: selectedGender === gender ? '#fff' : '#000' },
                          ]}
                      >
                        {gender}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              {/* WEAPON BUTTONS */}
              <View style={styles.rowGroup}>
                {['Epee', 'Foil', 'Saber'].map((weapon) => (
                    <TouchableOpacity
                        key={weapon}
                        style={[
                          styles.optionButton,
                          selectedWeapon === weapon && styles.selectedButton,
                        ]}
                        onPress={() => setSelectedWeapon(weapon)}
                    >
                      <Text
                          style={[
                            styles.optionText,
                            { color: selectedWeapon === weapon ? '#fff' : '#000' },
                          ]}
                      >
                        {weapon}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={handleSubmitEvent}
                >
                  <Text style={styles.modalActionText}>Submit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modalActionButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalActionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
  );
};

const navyBlue = '#000080';
const white = '#ffffff';
const greyAccent = '#cccccc';
const lightRed = '#ff9999';

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: white,
  },
  title: {
    fontSize: 26,
    marginBottom: 10,
    color: navyBlue,
  },
  headerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  tournamentName: {
    fontSize: 18,
    marginBottom: 5,
    color: navyBlue,
  },
  ipBanner: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 10,
  },
  ipText: {
    color: white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ipTextSmall: {
    color: white,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },
  networkStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  networkStatusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  networkConnected: {
    backgroundColor: '#4ade80', // Green
  },
  networkDisconnected: {
    backgroundColor: '#f87171', // Red
  },
  networkStatusText: {
    color: white,
    fontSize: 12,
  },
  remoteConnectionBanner: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    marginBottom: 10,
  },
  remoteConnectionText: {
    color: white,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    padding: 6,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 5,
  },
  disconnectButtonText: {
    color: white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  eventList: {
    marginTop: 20,
  },
  eventItem: {
    borderWidth: 1,
    borderColor: greyAccent,
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    backgroundColor: white,
  },
  eventText: {
    fontSize: 16,
    marginBottom: 10,
    color: navyBlue,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 3,
    backgroundColor: navyBlue,
  },
  flexAction: {
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: white,
    fontSize: 14,
  },
  removeIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  removeIcon: {
    fontSize: 20,
    color: 'red',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: white,
    padding: 20,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  rowGroup: {
    flexDirection: 'row',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  optionButton: {
    flex: 1,
    backgroundColor: greyAccent,
    paddingVertical: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedButton: {
    backgroundColor: navyBlue,
  },
  optionText: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
    backgroundColor: white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  modalActionButton: {
    backgroundColor: navyBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '40%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: greyAccent,
  },
  modalActionText: {
    color: white,
    fontSize: 16,
  },
  serverButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  serverEnabledButton: {
    backgroundColor: '#ff3b30', // Red (to stop server)
  },
  serverDisabledButton: {
    backgroundColor: '#34c759', // Green (to start server)
  },
  serverPendingButton: {
    backgroundColor: '#6c757d', // Gray for pending operations
    opacity: 0.8,
  },
  serverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  serverInfoContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  serverInfoText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  loadingContainer: {
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: navyBlue,
  },
  errorContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    textAlign: 'center',
  },
  noEventsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default EventManagement;