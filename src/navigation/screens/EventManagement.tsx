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

type Props = {
  route: RouteProp<{ params: { tournamentName: string } }, 'params'>;
};

export const EventManagement = ({ route }: Props) => {
  const { tournamentName } = route.params;
  const [events, setEvents] = useState<Event[]>([]);
  // Map event id -> boolean (true if already started)
  const [eventStatuses, setEventStatuses] = useState<{ [key: number]: boolean }>({});
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Fields for event creation
  const [selectedGender, setSelectedGender] = useState<string>('Mixed');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('Foil');
  const [selectedAge, setSelectedAge] = useState<string>('Senior');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // // Load events and determine if they have already been started (rounds exist AND first round is initialized)
  // const loadEvents = async () => {
  //   try {
  //     const eventsList = await dbListEvents(tournamentName);
  //     setEvents(eventsList);
  //     const statuses: { [key: number]: boolean } = {};
  //
  //     await Promise.all(
  //         eventsList.map(async (evt) => {
  //           const rounds: Round[] = await dbGetRoundsForEvent(evt.id);
  //
  //           // An event is considered started if it has at least one round AND the first round has isstarted=1
  //           if (rounds && rounds.length > 0) {
  //             statuses[evt.id] = rounds[0].isstarted;
  //           } else {
  //             statuses[evt.id] = false;
  //           }
  //         })
  //     );
  //
  //     setEventStatuses(statuses);
  //   } catch (error) {
  //     console.error('Error loading events from DB:', error);
  //   }
  // };
  //
  // useEffect(() => {
  //   loadEvents();
  // }, []);

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
        // class: string;
        // seeding: string;
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

  // For new (unstarted) events, confirm start before initializing rounds
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

// Helper function that ONLY handles initialization
  const initializeRound = async (event: Event, round: Round, fencers: Fencer[]): Promise<boolean> => {
    try {
      // Initialize the round (creates assignments, bouts, etc.)
      await dbInitializeRound(event, round, fencers);
      return true;
    } catch (error) {
      console.error('Error initializing event:', error);
      Alert.alert('Error', 'Failed to initialize the round.');
      return false;
    }
  };

// Centralized navigation function for any round type
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
      // Use the utility function for DE navigation
      navigateToDEPage(navigation, event, round, roundIndex);
    } else {
      console.error(`Unknown round type: ${round.type}`);
      Alert.alert('Error', `Unknown round type: ${round.type}`);
    }
  };

// The handleStartEvent now uses the separate functions
  const handleStartEvent = async (eventId: number) => {
    const eventToStart = events.find((evt) => evt.id === eventId);
    if (!eventToStart) return;

    try {
      const fencers = await dbGetFencersInEventById(eventToStart);
      // Check if there are fencers in the event
      if (!fencers || fencers.length === 0) {
        Alert.alert('Error', 'Cannot start event with no fencers. Please add fencers to this event.');
        return;
      }

      const rounds = await dbGetRoundsForEvent(eventToStart.id);
      // Check if there are rounds defined for the event
      if (!rounds || rounds.length === 0) {
        Alert.alert('Error', 'No rounds defined for this event. Please add rounds in the event settings.');
        return;
      }
      
      // Check if any pool rounds don't have pool configurations
      const poolRoundsWithoutConfig = rounds.filter(round => 
        round.type === 'pool' && (!round.poolcount || !round.poolsize)
      );
      
      if (poolRoundsWithoutConfig.length > 0) {
        Alert.alert('Error', 'Some pool rounds do not have a pool configuration selected. Please set pool configurations in the event settings.');
        return;
      }

      const firstRound = rounds[0];

      // For DE rounds, show the auto-sizing confirmation
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
        // For pool rounds, just initialize without confirmation
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

  // handleOpenEvent also uses the common navigation function
  const handleOpenEvent = async (eventId: number) => {
    const eventToOpen = events.find((evt) => evt.id === eventId);
    if (!eventToOpen) return;

    try {
      const rounds = await dbGetRoundsForEvent(eventToOpen.id);
      
      // Check if there are rounds defined for the event
      if (!rounds || rounds.length === 0) {
        Alert.alert('Error', 'No rounds defined for this event. Please add rounds in the event settings.');
        return;
      }
      
      // Check if any pool rounds don't have pool configurations
      const poolRoundsWithoutConfig = rounds.filter(round => 
        round.type === 'pool' && (!round.poolcount || !round.poolsize)
      );
      
      if (poolRoundsWithoutConfig.length > 0) {
        Alert.alert('Error', 'Some pool rounds do not have a pool configuration selected. Please set pool configurations in the event settings.');
        return;
      }

      const firstRound = rounds[0];

      // Check if already started
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

      // If it's already started, simply navigate to the appropriate page
      navigateToRoundPage(eventToOpen, firstRound, 0);
    } catch (error) {
      console.error('Error opening event:', error);
      Alert.alert('Error', 'Failed to open event.');
    }
  };

  // This callback is passed to EventSettings so that updates made there (e.g. rounds, pool settings) are saved.
  const handleSaveEventSettings = async (updatedEvent: Event) => {
    try {
      // await dbUpdateEvent(updatedEvent.id, updatedEvent);
      loadEvents();
    } catch (error) {
      console.error('Error updating event settings:', error);
    }
  };

  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Tournament</Text>
        <Text style={styles.tournamentName}>{tournamentName}</Text>
        <Button title="Create Event" onPress={openCreateModal} />

        <View style={styles.eventList}>
          {events.map((event) => (
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
                          })
                      }
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity
                      onPress={() => confirmRemoveEvent(event.id)}
                      style={styles.removeIconContainer}
                  >
                    <Text style={styles.removeIcon}>✖</Text>
                  </TouchableOpacity>
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
  tournamentName: {
    fontSize: 18,
    marginBottom: 20,
    color: navyBlue,
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
  roundsList: {
    marginBottom: 10,
  },
  roundItem: {
    borderWidth: 1,
    borderColor: greyAccent,
    borderRadius: 5,
    padding: 8,
    marginBottom: 8,
    backgroundColor: white,
  },
  roundItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dragHandle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragIcon: {
    fontSize: 20,
    marginRight: 4,
  },
  moveButton: {
    paddingHorizontal: 4,
  },
  moveButtonText: {
    fontSize: 16,
  },
  roundLabelText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  roundItemActions: {
    flexDirection: 'row',
  },
  removeRoundButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeRoundButtonText: {
    fontSize: 18,
    color: 'red',
  },
  configButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  configButtonText: {
    fontSize: 18,
    color: navyBlue,
  },
  roundConfig: {
    marginTop: 8,
    padding: 8,
    borderTopWidth: 1,
    borderColor: greyAccent,
  },
  deConfig: {
    marginTop: 8,
    padding: 8,
    borderTopWidth: 1,
    borderColor: greyAccent,
  },
  configToggle: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  configOptionButton: {
    flex: 1,
    backgroundColor: greyAccent,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  configOptionSelected: {
    backgroundColor: navyBlue,
  },
  configOptionText: {
    fontSize: 14,
    color: '#000',
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  targetSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  targetButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: greyAccent,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  targetButtonSelected: {
    backgroundColor: navyBlue,
  },
  targetButtonText: {
    fontSize: 14,
    color: '#000',
  },
  addRoundButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: navyBlue,
    paddingVertical: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  addRoundButtonText: {
    color: navyBlue,
    fontSize: 16,
    fontWeight: '600',
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
});

export default EventManagement;
