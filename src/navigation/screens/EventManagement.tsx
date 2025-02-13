import React, { useState, useEffect } from 'react';
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
import { useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event, RoundData } from '../navigation/types';
import {
  dbListEvents,
  dbCreateEvent,
  dbUpdateEvent,
  dbDeleteEvent,
} from '../../db/TournamentDatabaseUtils';

// Extend RoundData with additional configuration properties
type ExtendedRoundData = RoundData & {
  // For Pools rounds:
  poolsOption?: 'promotion' | 'target';
  targetBracketSize?: number;
  // For DE rounds:
  eliminationFormat?: 'single' | 'double' | 'compass';
};

type Props = {
  route: RouteProp<{ params: { tournamentName: string } }, 'params'>;
};

export const EventManagement = ({ route }: Props) => {
  const { tournamentName } = route.params;
  const [events, setEvents] = useState<Event[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Fields for event creation (creation still uses the modal)
  const [selectedGender, setSelectedGender] = useState<string>('Mixed');
  const [selectedWeapon, setSelectedWeapon] = useState<string>('Foil');
  const [selectedAge, setSelectedAge] = useState<string>('Senior');

  // Use our extended rounds type
  const [rounds, setRounds] = useState<ExtendedRoundData[]>([]);
  const [showRoundTypeOptions, setShowRoundTypeOptions] = useState<boolean>(false);
  const [expandedConfigIndex, setExpandedConfigIndex] = useState<number | null>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Load events from DB filtered by tournament name
  const loadEvents = async () => {
    try {
      const eventsList = await dbListEvents(tournamentName);
      setEvents(eventsList);
    } catch (error) {
      console.error('Error loading events from DB:', error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Opens the modal for creating a new event
  const openCreateModal = () => {
    setEditingEventId(null);
    setSelectedGender('Mixed');
    setSelectedWeapon('Foil');
    setSelectedAge('Senior');
    setRounds([]);
    setModalVisible(true);
  };

  // Helper functions for round reordering and configuration

  const moveRoundUp = (index: number) => {
    if (index <= 0) return;
    setRounds(prev => {
      const newRounds = [...prev];
      [newRounds[index - 1], newRounds[index]] = [newRounds[index], newRounds[index - 1]];
      return newRounds;
    });
  };

  const moveRoundDown = (index: number) => {
    setRounds(prev => {
      if (index >= prev.length - 1) return prev;
      const newRounds = [...prev];
      [newRounds[index], newRounds[index + 1]] = [newRounds[index + 1], newRounds[index]];
      return newRounds;
    });
  };

  const removeRound = (index: number) => {
    setRounds(prev => prev.filter((_, i) => i !== index));
    if (expandedConfigIndex === index) {
      setExpandedConfigIndex(null);
    }
  };

  const toggleRoundConfig = (index: number) => {
    if (expandedConfigIndex === index) {
      setExpandedConfigIndex(null);
    } else {
      setExpandedConfigIndex(index);
    }
  };

  const setPoolsOption = (index: number, option: 'promotion' | 'target') => {
    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[index] = { ...newRounds[index], poolsOption: option };
      return newRounds;
    });
  };

  const updateRoundPromotion = (index: number, val: string) => {
    const promotion = parseInt(val, 10) || 0;
    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[index] = { ...newRounds[index], promotion };
      return newRounds;
    });
  };

  const updateRoundTarget = (index: number, size: number) => {
    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[index] = { ...newRounds[index], targetBracketSize: size };
      return newRounds;
    });
  };

  const updateRoundElimination = (index: number, format: 'single' | 'double' | 'compass') => {
    setRounds(prev => {
      const newRounds = [...prev];
      newRounds[index] = { ...newRounds[index], eliminationFormat: format };
      return newRounds;
    });
  };

  const addRound = (roundType: 'Pools' | 'DE') => {
    if (roundType === 'Pools') {
      const newRound: ExtendedRoundData = {
        roundType: 'Pools',
        promotion: 100,
        poolsOption: 'promotion',
        targetBracketSize: 8,
      };
      setRounds([...rounds, newRound]);
    } else {
      const newRound: ExtendedRoundData = {
        roundType: 'DE',
        eliminationFormat: 'single',
      };
      setRounds([...rounds, newRound]);
    }
    setShowRoundTypeOptions(false);
  };

  // For new event creation, handle submission from the modal
  const handleSubmitEvent = async () => {
    try {
      if (editingEventId === null) {
        await dbCreateEvent(tournamentName, {
          id: Date.now(), // Generate an ID
          age: selectedAge,
          gender: selectedGender,
          weapon: selectedWeapon,
          name: '', // Adjust if you have a name field
          rounds,
          fencers: [],
          poolCount: 4,
          fencersPerPool: 5,
        });
      } else {
        await dbUpdateEvent(editingEventId, {
          age: selectedAge,
          gender: selectedGender,
          weapon: selectedWeapon,
          name: '',
          rounds,
          fencers: [],
          poolCount: 4,
          fencersPerPool: 5,
        });
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

  const handleStartEvent = (eventId: number) => {
    const eventToStart = events.find((evt) => evt.id === eventId);
    if (!eventToStart) return;
    navigation.navigate('PoolsPage', {
      event: eventToStart,
      currentRoundIndex: 0,
      fencers: eventToStart.fencers ?? [],
      poolCount: eventToStart.poolCount ?? 4,
      fencersPerPool: eventToStart.fencersPerPool ?? 5,
    });
  };

  // Callback passed to EventSettings to update the event in the database
  const handleSaveEventSettings = async (updatedEvent: Event) => {
    try {
      await dbUpdateEvent(updatedEvent.id, updatedEvent);
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
                  {/* Navigate to EventSettings on edit */}
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
                      onPress={() => confirmStartEvent(event.id)}
                  >
                    <Text style={styles.buttonText}>Start</Text>
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

        {/* Modal for creating a new event */}
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

              {/* Rounds List */}
              {rounds.length > 0 && (
                  <View style={styles.roundsList}>
                    {rounds.map((round, idx) => (
                        <View key={idx} style={styles.roundItem}>
                          <View style={styles.roundItemRow}>
                            <View style={styles.dragHandle}>
                              <Text style={styles.dragIcon}>☰</Text>
                              <TouchableOpacity onPress={() => moveRoundUp(idx)} style={styles.moveButton}>
                                <Text style={styles.moveButtonText}>↑</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => moveRoundDown(idx)} style={styles.moveButton}>
                                <Text style={styles.moveButtonText}>↓</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.roundLabelText}>
                              {round.roundType === 'Pools' ? 'Pools Round' : 'DE Round'}
                            </Text>
                            <View style={styles.roundItemActions}>
                              <TouchableOpacity onPress={() => removeRound(idx)} style={styles.removeRoundButton}>
                                <Text style={styles.removeRoundButtonText}>✖</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => toggleRoundConfig(idx)} style={styles.configButton}>
                                <Text style={styles.configButtonText}>⚙</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          {expandedConfigIndex === idx && (
                              <View style={styles.roundConfig}>
                                {round.roundType === 'Pools' ? (
                                    <View>
                                      <View style={styles.configToggle}>
                                        <TouchableOpacity
                                            onPress={() => setPoolsOption(idx, 'promotion')}
                                            style={[
                                              styles.configOptionButton,
                                              round.poolsOption === 'promotion' && styles.configOptionSelected,
                                            ]}
                                        >
                                          <Text style={styles.configOptionText}>Promotion %</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setPoolsOption(idx, 'target')}
                                            style={[
                                              styles.configOptionButton,
                                              round.poolsOption === 'target' && styles.configOptionSelected,
                                            ]}
                                        >
                                          <Text style={styles.configOptionText}>Target Bracket</Text>
                                        </TouchableOpacity>
                                      </View>
                                      {round.poolsOption === 'promotion' ? (
                                          <TextInput
                                              style={styles.configInput}
                                              keyboardType="numeric"
                                              value={round.promotion?.toString() || ''}
                                              onChangeText={(val) => updateRoundPromotion(idx, val)}
                                              placeholder="Enter Promotion %"
                                          />
                                      ) : (
                                          <View style={styles.targetSelector}>
                                            {[8, 16, 32, 64, 128, 256].map((size) => (
                                                <TouchableOpacity
                                                    key={size}
                                                    onPress={() => updateRoundTarget(idx, size)}
                                                    style={[
                                                      styles.targetButton,
                                                      round.targetBracketSize === size && styles.targetButtonSelected,
                                                    ]}
                                                >
                                                  <Text style={styles.targetButtonText}>{size}</Text>
                                                </TouchableOpacity>
                                            ))}
                                          </View>
                                      )}
                                    </View>
                                ) : (
                                    <View style={styles.deConfig}>
                                      {['single', 'double', 'compass'].map((format) => (
                                          <TouchableOpacity
                                              key={format}
                                              onPress={() =>
                                                  updateRoundElimination(idx, format as 'single' | 'double' | 'compass')
                                              }
                                              style={[
                                                styles.configOptionButton,
                                                round.eliminationFormat === format && styles.configOptionSelected,
                                              ]}
                                          >
                                            <Text style={styles.configOptionText}>
                                              {format === 'single' ? 'Single' : format === 'double' ? 'Double' : 'Compass'}
                                            </Text>
                                          </TouchableOpacity>
                                      ))}
                                    </View>
                                )}
                              </View>
                          )}
                        </View>
                    ))}
                  </View>
              )}
              <TouchableOpacity
                  style={styles.addRoundButton}
                  onPress={() => setShowRoundTypeOptions(!showRoundTypeOptions)}
              >
                <Text style={styles.addRoundButtonText}>Add Round</Text>
              </TouchableOpacity>
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
