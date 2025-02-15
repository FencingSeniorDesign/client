import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { dbCreateTournament } from '../../db/TournamentDatabaseUtils';

interface CreateTournamentButtonProps {
  onTournamentCreated: () => void;
}

export const CreateTournamentButton: React.FC<CreateTournamentButtonProps> = ({ onTournamentCreated }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tournamentName, setTournamentName] = useState('');

  const handleSubmit = async () => {
    if (!tournamentName.trim()) {
      Alert.alert('Error', 'Please enter a tournament name');
      return;
    }

    try {
      await dbCreateTournament(tournamentName.trim());
      setModalVisible(false);
      setTournamentName('');
      onTournamentCreated(); // Notify the parent component to refresh the list
    } catch (error) {
      Alert.alert('Error', 'Failed to create tournament. It might already exist.');
      console.error(error);
    }
  };

  return (
      <View>
        <TouchableOpacity
            style={styles.button}
            onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Create Tournament</Text>
        </TouchableOpacity>

        <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Tournament</Text>

              <TextInput
                  style={styles.input}
                  value={tournamentName}
                  onChangeText={setTournamentName}
                  placeholder="Enter tournament name"
                  autoFocus
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false);
                      setTournamentName('');
                    }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={handleSubmit}
                >
                  <Text style={styles.buttonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
  );
};

const styles = StyleSheet.create({
  button: {
      backgroundColor: '#001f3f', // Navy blue
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
  },
  submitButton: {
    backgroundColor: '#34c759',
  },
});