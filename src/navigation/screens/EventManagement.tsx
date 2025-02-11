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
import { RootStackParamList, Event, RoundData } from '../navigation/types';

type Props = {
  route: RouteProp<{ params: { tournamentName: string } }, 'params'>;
};

export const EventManagement = ({ route }: Props) => {
  const { tournamentName } = route.params;
  const [events, setEvents] = useState<Event[]>([]);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Local states for gender/weapon
  const [selectedGender, setSelectedGender] = useState<string>('Male');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('Foil');
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [showRoundTypeOptions, setShowRoundTypeOptions] = useState<boolean>(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const generateEventTitle = (gender: string, weapon: string): string => {
    const genderText =
        gender === 'Male' ? "Men's" : gender === 'Female' ? "Women's" : 'Mixed';
    return `${genderText} ${weapon}`;
  };

  const openCreateModal = () => {
    setEditingEventId(null);
    setSelectedGender('Male');
    setSelectedWeapon('Foil');
    setRounds([]);
    setModalVisible(true);
  };

  const handleUpdateEvent = (updatedEvent: Event) => {
    setEvents((prevEvents) =>
        prevEvents.map((evt) => (evt.id === updatedEvent.id ? updatedEvent : evt))
    );
  };

  const openEventSettings = (event: Event) => {
    navigation.navigate('EventSettings', {
      event,
      onSave: (updated: Event) => {
        handleUpdateEvent(updated);
      },
    });
  };

  const handleSubmitEvent = () => {
    const eventTitle = generateEventTitle(selectedGender, selectedWeapon);

    if (editingEventId === null) {
      const newEvent: Event = {
        id: Date.now(),
        gender: selectedGender,
        weapon: selectedWeapon,
        rounds: rounds,
        name: eventTitle,
        fencers: [],
        poolCount: 4,
        fencersPerPool: 5,
      };
      setEvents([...events, newEvent]);
    } else {
      const updatedEvents = events.map((evt) => {
        if (evt.id === editingEventId) {
          return {
            ...evt,
            gender: selectedGender,
            weapon: selectedWeapon,
            rounds: rounds,
            name: eventTitle,
          };
        }
        return evt;
      });
      setEvents(updatedEvents);
    }
    setModalVisible(false);
  };

  const handleRemoveEvent = (id: number) => {
    const updated = events.filter((e) => e.id !== id);
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

    // Instead of passing "eventId", we pass the entire event object (and required fields).
    navigation.navigate('PoolsPage', {
      event: eventToStart,
      currentRoundIndex: 0,
      fencers: eventToStart.fencers,
      poolCount: eventToStart.poolCount ?? 4,
      fencersPerPool: eventToStart.fencersPerPool ?? 5,
    });
  };

  const addRound = (roundType: 'Pools' | 'DE') => {
    const newRound: RoundData = {
      roundType,
      promotion: roundType === 'Pools' ? 100 : undefined,
    };
    setRounds([...rounds, newRound]);
    setShowRoundTypeOptions(false);
  };

  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Tournament</Text>
        <Text style={styles.tournamentName}>{tournamentName}</Text>
        <Button title="Create Event" onPress={openCreateModal} />

        <View style={styles.eventList}>
          {events.map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <Text style={styles.eventText}>{event.name}</Text>
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

              {/* GENDER BUTTONS */}
              <View style={styles.rowGroup}>
                {['Male', 'Mixed', 'Female'].map((gender) => (
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

              {/* SHOW chosen rounds */}
              {rounds.length > 0 && (
                  <View style={styles.roundsContainer}>
                    {rounds.map((r, idx) => (
                        <View style={styles.roundChip} key={idx}>
                          <Text style={styles.roundChipText}>{r.roundType}</Text>
                        </View>
                    ))}
                  </View>
              )}

              {/* "Add Round" button */}
              <TouchableOpacity
                  style={styles.addRoundButton}
                  onPress={() => setShowRoundTypeOptions(!showRoundTypeOptions)}
              >
                <Text style={styles.addRoundButtonText}>Add Round</Text>
              </TouchableOpacity>

              {/* Round type options sub-menu */}
              {showRoundTypeOptions && (
                  <View style={styles.roundTypeMenu}>
                    <TouchableOpacity
                        style={[styles.roundTypeChoice, { backgroundColor: '#fff' }]}
                        onPress={() => addRound('Pools')}
                    >
                      <Text style={styles.roundTypeChoiceText}>Pools</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.roundTypeChoice, { backgroundColor: '#fff' }]}
                        onPress={() => addRound('DE')}
                    >
                      <Text style={styles.roundTypeChoiceText}>DE</Text>
                    </TouchableOpacity>
                  </View>
              )}

              {/* ACTION BUTTONS */}
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
  roundsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  roundChip: {
    backgroundColor: navyBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginTop: 4,
  },
  roundChipText: {
    color: white,
    fontSize: 14,
    fontWeight: 'bold',
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
  roundTypeMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  roundTypeChoice: {
    borderWidth: 1,
    borderColor: navyBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  roundTypeChoiceText: {
    fontSize: 16,
    color: navyBlue,
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
