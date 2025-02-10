import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event } from '../navigation/types'; // adjust path as necessary

type Props = {
  route: RouteProp<{ params: { tournamentName: string } }, 'params'>;
};

export const EventManagement = ({ route }: Props) => {
  const { tournamentName } = route.params;
  const [events, setEvents] = useState<Event[]>([]);

  // Control modal visibility for event creation/updating.
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Local states for event creation
  const [selectedGender, setSelectedGender] = useState<string>('Male');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('Foil');
  const [selectedRound, setSelectedRound] = useState<string>('Pools with promotion');

  // Use the typed navigation hook
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Helper function to generate event title
  const generateEventTitle = (gender: string, weapon: string, round: string): string => {
    let genderText = gender;
    if (gender === 'Male') {
      genderText = "Men's";
    } else if (gender === 'Female') {
      genderText = "Women's";
    } else {
      genderText = 'Mixed';
    }
    // Adjust round text capitalization (if needed)
    const roundText = round.replace('promotion', 'Promotion');
    return `${genderText} ${weapon} ${roundText}`;
  };

  // Open a modal to create a new event.
  const openCreateModal = () => {
    setEditingEventId(null);
    setSelectedGender('Male');
    setSelectedWeapon('Foil');
    setSelectedRound('Pools with promotion');
    setModalVisible(true);
  };

  // Callback to update an event from the EventSettings page.
  const handleUpdateEvent = (updatedEvent: Event) => {
    setEvents((prevEvents) =>
        prevEvents.map((event) =>
            event.id === updatedEvent.id ? updatedEvent : event
        )
    );
  };

  // Open the EventSettings page, passing the relevant event object and onSave callback.
  const openEventSettings = (event: Event) => {
    navigation.navigate('EventSettings', {
      event,
      onSave: (updatedEvent: Event) => {
        handleUpdateEvent(updatedEvent);
      },
    });
  };

  // Handles adding a new event or updating an existing one.
  const handleSubmitEvent = () => {
    const eventTitle = generateEventTitle(selectedGender, selectedWeapon, selectedRound);
    if (editingEventId === null) {
      // Provide default values for poolCount and fencersPerPool.
      const newEvent: Event = {
        id: Date.now(),
        gender: selectedGender,
        weapon: selectedWeapon,
        round: selectedRound,
        name: eventTitle,
        fencers: [],
        poolCount: 4,         // Default value for poolCount
        fencersPerPool: 5,    // Default value for fencersPerPool
      };
      setEvents([...events, newEvent]);
    } else {
      const updatedEvents = events.map((event) =>
          event.id === editingEventId
              ? { ...event, gender: selectedGender, weapon: selectedWeapon, round: selectedRound, name: eventTitle }
              : event
      );
      setEvents(updatedEvents);
    }
    setModalVisible(false);
  };

  const handleRemoveEvent = (id: number) => {
    const updated = events.filter((event) => event.id !== id);
    setEvents(updated);
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

  const handleStartEvent = (eventId: number) => {
    const eventToStart = events.find((evt) => evt.id === eventId);
    if (!eventToStart) return;

    navigation.navigate('PoolsPage', {
      eventId: eventToStart.id,
      fencers: eventToStart.fencers,
      poolCount: eventToStart.poolCount ?? 4,         // Use user value or default to 4
      fencersPerPool: eventToStart.fencersPerPool ?? 5,  // Use user value or default to 5
    });
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
                  {event.name || `Gender: ${event.gender}, Weapon: ${event.weapon}, Round: ${event.round}`}
                </Text>
                <View style={styles.eventActions}>
                  <TouchableOpacity
                      style={[styles.actionButton, styles.flexAction]}
                      onPress={() => openEventSettings(event)}
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      style={[styles.actionButton, styles.flexAction]}
                      onPress={() => confirmStartEvent(event.id)}
                  >
                    <Text style={styles.buttonText}>Start</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      style={[styles.actionButton, styles.flexAction, styles.removeButton]}
                      onPress={() => confirmRemoveEvent(event.id)}
                  >
                    <Text style={styles.buttonText}>Remove</Text>
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
              <Text style={styles.modalTitle}>Create / Edit Event</Text>

              {/* Gender Buttons */}
              <View style={styles.rowGroup}>
                {['Male', 'Mixed', 'Female'].map((gender) => (
                    <TouchableOpacity
                        key={gender}
                        style={[
                          styles.optionButton,
                          {
                            flex: 1,
                            marginHorizontal: 4,
                            backgroundColor:
                                selectedGender === gender ? styles.selectedButton.backgroundColor : styles.optionButton.backgroundColor,
                          },
                        ]}
                        onPress={() => setSelectedGender(gender)}
                    >
                      <Text
                          style={[
                            styles.optionText,
                            { color: selectedGender === gender ? white : 'black' },
                          ]}
                      >
                        {gender}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              {/* Weapon Type Buttons */}
              <View style={styles.rowGroup}>
                {['Epee', 'Foil', 'Saber'].map((weapon) => (
                    <TouchableOpacity
                        key={weapon}
                        style={[
                          styles.optionButton,
                          {
                            flex: 1,
                            marginHorizontal: 4,
                            backgroundColor:
                                selectedWeapon === weapon ? styles.selectedButton.backgroundColor : styles.optionButton.backgroundColor,
                          },
                        ]}
                        onPress={() => setSelectedWeapon(weapon)}
                    >
                      <Text
                          style={[
                            styles.optionText,
                            { color: selectedWeapon === weapon ? white : 'black' },
                          ]}
                      >
                        {weapon}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              {/* Round/Promotion Presets (vertical stack) */}
              <View style={styles.columnGroup}>
                {[
                  'Only Pools',
                  'Pools with promotion',
                  'Direct Elimination',
                ].map((roundOption) => (
                    <TouchableOpacity
                        key={roundOption}
                        style={[
                          styles.fullWidthButton,
                          selectedRound === roundOption && styles.selectedFullWidthButton,
                        ]}
                        onPress={() => setSelectedRound(roundOption)}
                    >
                      <Text
                          style={[
                            styles.optionText,
                            { color: selectedRound === roundOption ? white : 'black' },
                          ]}
                      >
                        {roundOption}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalActionButton} onPress={handleSubmitEvent}>
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
    fontSize: 24,
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
  },
  actionButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 3,
    backgroundColor: navyBlue, // Restored background for Edit and Start buttons.
  },
  flexAction: {
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: white,
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: lightRed,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: white,
    width: '90%',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',
    color: navyBlue,
  },
  // Row-based button group (for gender and weapon)
  rowGroup: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  optionButton: {
    backgroundColor: greyAccent,
    paddingVertical: 14,
    borderRadius: 5,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: navyBlue,
  },
  optionText: {
    fontSize: 16,
  },
  // Column-based button group for round presets
  columnGroup: {
    marginBottom: 15,
  },
  fullWidthButton: {
    backgroundColor: greyAccent,
    paddingVertical: 14,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  selectedFullWidthButton: {
    backgroundColor: navyBlue,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
