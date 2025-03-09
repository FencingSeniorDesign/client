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
} from 'react-native';
import {useNavigation, RouteProp, useFocusEffect} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {RootStackParamList, Event, Round, Fencer} from '../navigation/types';
import {
  dbGetFencersInEventById,
  dbListEvents,
  dbCreateEvent,
  dbDeleteEvent,
  dbGetRoundsForEvent,
  dbInitializeRound
} from '../../db/TournamentDatabaseUtils';
import {navigateToDEPage} from "../utils/DENavigationUtil";
import tournamentServer from '../../networking/TournamentServer';
import tournamentClient from '../../networking/TournamentClient';
import { getLocalIpAddress } from '../../networking/NetworkUtils';
import ConnectionStatusBar from '../../networking/components/ConnectionStatusBar';

type Props = {
  route: RouteProp<{ params: { tournamentName: string, isRemoteConnection?: boolean } }, 'params'>;
};

export const EventManagement = ({ route }: Props) => {
  const { tournamentName, isRemoteConnection = false } = route.params;
  const [events, setEvents] = useState<Event[]>([]);
  // Map event id -> boolean (true if already started)
  const [eventStatuses, setEventStatuses] = useState<{ [key: number]: boolean }>({});
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

  // Remote connection state
  const [isRemote, setIsRemote] = useState(isRemoteConnection);
  const [remoteConnectionInfo, setRemoteConnectionInfo] = useState<{
    tournamentName: string;
    hostIp: string;
    port: number;
  } | null>(null);

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

  const loadEvents = useCallback(async () => {
    try {
      console.log("Loading events and their statuses...");
      const eventsList = await dbListEvents(tournamentName);
      setEvents(eventsList);
      const statuses: { [key: number]: boolean } = {};

      await Promise.all(
          eventsList.map(async (evt) => {
            const rounds: Round[] = await dbGetRoundsForEvent(evt.id);

            // An event is considered started if it has at least one round AND the first round has isstarted=1
            if (rounds && rounds.length > 0) {
              statuses[evt.id] = rounds[0].isstarted;
            } else {
              statuses[evt.id] = false;
            }
          })
      );

      setEventStatuses(statuses);
      console.log("Loaded event statuses:", statuses);
    } catch (error) {
      console.error('Error loading events from DB:', error);
    }
  }, [tournamentName]);

  // This effect runs when component mounts
  useEffect(() => {
    loadEvents();

    // Get the local IP address
    const fetchIpAddress = async () => {
      const ip = await getLocalIpAddress();
      setLocalIpAddress(ip);
    };

    fetchIpAddress();

    // Check if the server is already running
    const checkServer = async () => {
      await tournamentServer.loadServerInfo();
      const info = tournamentServer.getServerInfo();
      if (info && info.isActive) {
        setServerEnabled(true);
        setServerInfo({
          ip: info.hostIp === '0.0.0.0' ? 'Any' : info.hostIp,
          port: info.port
        });
      }
    };

    checkServer();
  }, [loadEvents]);

  // This effect runs when the screen comes into focus
  useFocusEffect(
      useCallback(() => {
        console.log("EventManagement screen is now focused, refreshing data...");
        loadEvents();

        // Return a cleanup function (optional)
        return () => {
          console.log("EventManagement screen is losing focus");
        };
      }, [loadEvents])
  );

  const openCreateModal = () => {
    setEditingEventId(null);
    setSelectedGender('Mixed');
    setSelectedWeapon('Foil');
    setSelectedAge('Senior');
    setModalVisible(true);
  };

  // When submitting an event creation, include the rounds and pool settings
  const handleSubmitEvent = async () => {
    try {
      const event = {
        weapon: selectedWeapon,
        gender: selectedGender,
        age: selectedAge
      };

      if (editingEventId === null) {
        //@ts-ignore TODO - once classification and seeding options are added, fix this
        await dbCreateEvent(tournamentName, event);
      }
      setModalVisible(false);
      loadEvents();
    } catch (error) {
      Alert.alert('Error', 'Failed to save event.');
      console.error(error);
    }
  };

  const handleRemoveEvent = async (id: number) => {
    try {
      await dbDeleteEvent(id);
      loadEvents();
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
    const eventToOpen = events.find((evt) => evt.id === eventId);
    if (!eventToOpen) return;

    try {
      const rounds = await dbGetRoundsForEvent(eventToOpen.id);

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
    if (serverEnabled) {
      // Stop the server
      const success = await tournamentServer.stopServer();
      if (success) {
        setServerEnabled(false);
        setServerInfo(null);
        Alert.alert('Server Stopped', 'Tournament server has been shut down');
      } else {
        Alert.alert('Error', 'Failed to stop the tournament server');
      }
    } else {
      // Start the server
      const tournament = { name: tournamentName };
      const success = await tournamentServer.startServer(tournament);
      if (success) {
        setServerEnabled(true);
        const info = tournamentServer.getServerInfo();
        if (info) {
          setServerInfo({
            ip: info.hostIp === '0.0.0.0' ? localIpAddress : info.hostIp,
            port: info.port
          });
          Alert.alert('Server Started', 'Tournament server is now running');
        }
      } else {
        Alert.alert('Error', 'Failed to start the tournament server');
      }
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
              </View>
          )}
        </View>

        {/* Server Control Button (only for local tournaments) */}
        {!isRemote && (
            <TouchableOpacity
                style={[styles.serverButton, serverEnabled ? styles.serverEnabledButton : styles.serverDisabledButton]}
                onPress={handleToggleServer}
            >
              <Text style={styles.serverButtonText}>
                {serverEnabled ? 'Disable Server' : 'Enable Server'}
              </Text>
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
            <Button title="Create Event" onPress={openCreateModal} />
        )}

        <View style={styles.eventList}>
          {events.map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <Text style={styles.eventText}>
                  {event.age} {event.gender} {event.weapon}
                </Text>
                <View style={styles.eventActions}>
                  {!isRemote && (
                      <TouchableOpacity
                          style={[styles.actionButton, styles.flexAction]}
                          onPress={() =>
                              navigation.navigate('EventSettings', {
                                event: event,
                                onSave: handleSaveEventSettings,
                              })
                          }
                      >
                        <Text style={styles.buttonText}>Edit</Text>
                      </TouchableOpacity>
                  )}
                  <TouchableOpacity
                      style={[styles.actionButton, styles.flexAction]}
                      onPress={() =>
                          eventStatuses[event.id]
                              ? handleOpenEvent(event.id)
                              : confirmStartEvent(event.id)
                      }
                  >
                    <Text style={styles.buttonText}>
                      {eventStatuses[event.id] ? 'Open' : 'Start'}
                    </Text>
                  </TouchableOpacity>
                  {!isRemote && (
                      <TouchableOpacity
                          onPress={() => confirmRemoveEvent(event.id)}
                          style={styles.removeIconContainer}
                      >
                        <Text style={styles.removeIcon}>✖</Text>
                      </TouchableOpacity>
                  )}
                </View>
              </View>
          ))}
        </View>

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
  serverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});

export default EventManagement;