import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Official } from '../../../core/types';
import { 
  useGetOfficialsByEvent,
  useCreateOfficial,
  useAssignOfficialToEvent,
  useRemoveOfficialFromEvent,
  useLiveOfficialsByEvent
} from '../hooks/useOfficials';
import { getDeviceId } from '../../../infrastructure/networking/utils';
import { useNetworkStatus } from '../../../infrastructure/networking';

// These would be defined in your navigation types
interface RootStackParamList {
  ManageOfficials: {
    eventId: number;
    eventName: string;
    isRemote?: boolean;
  };
}

interface ManageOfficialsProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ManageOfficials'>;
  route: RouteProp<RootStackParamList, 'ManageOfficials'>;
}

const ManageOfficials: React.FC<ManageOfficialsProps> = ({ route, navigation }) => {
  const { eventId, eventName, isRemote = false } = route.params;
  const networkStatus = useNetworkStatus();
  
  // Use our new live query hook for officials by event
  const { 
    data: officials = [], 
    isLoading: officialsLoading,
    error: officialsError
  } = useLiveOfficialsByEvent(eventId);
  
  // Mutation hooks for creating and managing officials
  const createOfficialMutation = useCreateOfficial();
  const assignOfficialMutation = useAssignOfficialToEvent();
  const removeOfficialMutation = useRemoveOfficialFromEvent();
  
  // State for add person modal
  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickName, setNickName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Get current device ID
  React.useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const deviceId = await getDeviceId();
        setCurrentDeviceId(deviceId);
      } catch (error) {
        console.error('Failed to get device ID:', error);
        setCurrentDeviceId('unknown');
      }
    };
    
    fetchDeviceId();
  }, []);

  const handleAddOfficial = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return;
    }

    try {
      // First create the official
      const newOfficial = await createOfficialMutation.mutateAsync({
        fname: firstName,
        lname: lastName || '',
        nickname: nickName || undefined,
        deviceId: deviceId || undefined
      });
      
      // Then assign them to the event
      await assignOfficialMutation.mutateAsync({
        officialId: newOfficial.id,
        eventId
      });
      
      // Close modal and reset form
      setModalVisible(false);
      resetFormFields();
      
      // Show success message
      Alert.alert('Success', `${firstName} ${lastName} has been added as an official`);
    } catch (error) {
      console.error('Error adding official:', error);
      Alert.alert('Error', 'Failed to add official');
    }
  };

  const resetFormFields = () => {
    setFirstName('');
    setLastName('');
    setNickName('');
    setDeviceId('');
  };

  const copyDeviceId = () => {
    if (currentDeviceId) {
      setDeviceId(currentDeviceId);
    }
  };

  const handleRemoveOfficial = (official: Official) => {
    Alert.alert(
      'Confirm Removal',
      `Are you sure you want to remove ${official.fname} ${official.lname || ''} from this event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeOfficialMutation.mutateAsync({
                officialId: official.id,
                eventId
              });
            } catch (error) {
              console.error('Error removing official:', error);
              Alert.alert('Error', 'Failed to remove official');
            }
          }
        }
      ]
    );
  };

  const renderOfficialItem = ({ item }: { item: Official }) => (
    <View style={styles.listItem}>
      <View style={styles.personInfo}>
        <Text style={styles.name}>{item.fname} {item.lname}</Text>
        {item.nickname && (
          <Text style={styles.nickname}>"{item.nickname}"</Text>
        )}
        <Text style={styles.deviceId}>Device ID: {item.deviceId || 'Not set'}</Text>
      </View>
      {!isRemote && !networkStatus.isConnected && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveOfficial(item)}
          disabled={removeOfficialMutation.isPending}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Officials - {eventName}</Text>
      
      {/* Network status warning */}
      {!networkStatus.isConnected && (
        <View style={styles.offlineWarning}>
          <Text style={styles.offlineWarningText}>
            You are currently offline. Changes will sync when you're back online.
          </Text>
        </View>
      )}
      
      {!isRemote && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.buttonText}>Add Official</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Event Officials</Text>
          {officialsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#001f3f" />
              <Text style={styles.loadingText}>Loading officials...</Text>
            </View>
          ) : officialsError ? (
            <Text style={styles.errorText}>
              Error loading officials: {officialsError.message}
            </Text>
          ) : officials.length > 0 ? (
            <FlatList
              data={officials}
              renderItem={renderOfficialItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No officials assigned to this event</Text>
          )}
        </View>
        
        <View style={styles.deviceInfoSection}>
          <Text style={styles.deviceInfoHeader}>This Device</Text>
          <Text style={styles.deviceInfoText}>Device ID: {currentDeviceId || 'Loading...'}</Text>
          <Text style={styles.helpText}>
            When adding officials, you can assign a device ID to allow automatic role assignment when joining from that device.
          </Text>
        </View>
      </ScrollView>
      
      {/* Add Official Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add Event Official
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="First Name *"
              value={firstName}
              onChangeText={setFirstName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Nickname"
              value={nickName}
              onChangeText={setNickName}
            />
            
            <View style={styles.deviceIdInputContainer}>
              <TextInput
                style={[styles.input, styles.deviceIdInput]}
                placeholder="Device ID (5 characters)"
                value={deviceId}
                onChangeText={(text) => setDeviceId(text.slice(0, 5).toUpperCase())}
                maxLength={5}
                autoCapitalize="characters"
              />
              
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={copyDeviceId}
              >
                <Text style={styles.copyButtonText}>Use This Device</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.idExplanationText}>
              When this person connects to the tournament using a device with this ID,
              they will automatically be assigned the appropriate role.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={handleAddOfficial}
                disabled={createOfficialMutation.isPending || assignOfficialMutation.isPending}
              >
                <Text style={styles.modalActionText}>
                  {(createOfficialMutation.isPending || assignOfficialMutation.isPending) ? 'Adding...' : 'Add'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  resetFormFields();
                }}
                disabled={createOfficialMutation.isPending || assignOfficialMutation.isPending}
              >
                <Text style={styles.modalActionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const navyBlue = '#001f3f';
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: navyBlue,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: navyBlue,
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  personInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  nickname: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addButton: {
    flex: 1,
    backgroundColor: navyBlue,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: navyBlue,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  deviceIdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceIdInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  copyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 6,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalActionButton: {
    backgroundColor: navyBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '40%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  modalActionText: {
    color: 'white',
    fontWeight: '500',
  },
  deviceInfoSection: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  deviceInfoHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: navyBlue,
  },
  deviceInfoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#666',
  },
  idExplanationText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offlineWarning: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  offlineWarningText: {
    color: '#856404',
    textAlign: 'center',
  },
});

export default ManageOfficials;