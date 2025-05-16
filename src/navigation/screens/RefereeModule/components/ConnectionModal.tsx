import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Platform,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Device } from 'react-native-ble-plx';
import { ScoringBoxType, ConnectionState } from '../../../../networking/ble/types';

interface ConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (boxType: ScoringBoxType) => Promise<Device[]>;
  onConnect: (boxType: ScoringBoxType, deviceId: string) => Promise<void>;
  onDisconnect: () => void;
  connectionState: ConnectionState;
  connectedBoxType?: ScoringBoxType;
  connectedDeviceName?: string;
}

interface BoxOption {
  type: ScoringBoxType;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

export function ConnectionModal({
  visible,
  onClose,
  onScan,
  onConnect,
  onDisconnect,
  connectionState,
  connectedBoxType,
  connectedDeviceName,
}: ConnectionModalProps) {
  const { t } = useTranslation();
  const [selectedBox, setSelectedBox] = useState<ScoringBoxType | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<Device[]>([]);
  const [showDeviceSelection, setShowDeviceSelection] = useState(false);

  const boxOptions: BoxOption[] = [
    {
      type: ScoringBoxType.TOURNAFENCE,
      name: t('ble.tournafence.name'),
      description: t('ble.tournafence.description'),
      icon: 'box',
      available: true,
    },
    {
      type: ScoringBoxType.ENPOINTE,
      name: t('ble.enpointe.name'),
      description: t('ble.enpointe.description'),
      icon: 'trophy',
      available: false, // Placeholder for now
    },
    {
      type: ScoringBoxType.SKEWERED,
      name: t('ble.skewered.name'),
      description: t('ble.skewered.description'),
      icon: 'broadcast-tower',
      available: false, // Placeholder for now
    },
  ];

  const handleBoxSelection = async (box: BoxOption) => {
    if (!box.available) {
      Alert.alert(
        t('ble.comingSoon'),
        t('ble.notAvailable', { name: box.name }),
        [{ text: t('common.ok') }]
      );
      return;
    }

    if (connectionState === ConnectionState.CONNECTED && connectedBoxType === box.type) {
      // Already connected to this box type
      return;
    }

    setSelectedBox(box.type);
    setIsScanning(true);
    
    try {
      // Scan for devices
      const devices = await onScan(box.type);
      setFoundDevices(devices);
      setIsScanning(false);
      setShowDeviceSelection(true);
    } catch (error) {
      console.error('Scan failed:', error);
      setIsScanning(false);
      setSelectedBox(null);
      Alert.alert(
        t('ble.scanFailed'),
        error.message || t('ble.unknownError'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const handleDeviceSelection = async (device: Device) => {
    if (!selectedBox) return;
    
    try {
      await onConnect(selectedBox, device.id);
      // Connection successful
      setShowDeviceSelection(false);
      setFoundDevices([]);
      setSelectedBox(null);
      onClose(); // Close modal after successful connection
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert(
        t('ble.connectionFailed'),
        error.message || t('ble.unknownError'),
        [{ text: t('common.ok') }]
      );
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setIsScanning(false);
      setSelectedBox(null);
      setFoundDevices([]);
      setShowDeviceSelection(false);
    }
  }, [visible]);

  const renderBoxOption = ({ item }: { item: BoxOption }) => {
    const isConnected = connectionState === ConnectionState.CONNECTED && connectedBoxType === item.type;
    const isThisBoxScanning = isScanning && selectedBox === item.type;

    return (
      <TouchableOpacity
        style={[
          styles.boxOption,
          isConnected && styles.boxOptionConnected,
          isThisBoxScanning && styles.boxOptionScanning,
          !item.available && styles.boxOptionDisabled,
        ]}
        onPress={() => handleBoxSelection(item)}
        disabled={isScanning}
      >
        <View style={styles.boxIconContainer}>
          <FontAwesome5 
            name={item.icon} 
            size={30} 
            color={isConnected ? '#4CAF50' : isThisBoxScanning ? '#1976d2' : '#666'} 
          />
        </View>
        <View style={styles.boxTextContainer}>
          <Text style={[styles.boxName, isConnected && styles.boxNameConnected, isThisBoxScanning && styles.boxNameScanning]}>
            {item.name}
            {!item.available && ' (Coming Soon)'}
          </Text>
          {isThisBoxScanning ? (
            <Text style={styles.scanningText}>{t('ble.scanning')}</Text>
          ) : (
            <Text style={styles.boxDescription}>{item.description}</Text>
          )}
          {isConnected && connectedDeviceName && (
            <Text style={styles.deviceName}>{connectedDeviceName}</Text>
          )}
        </View>
        {isThisBoxScanning && (
          <ActivityIndicator size="small" color="#1976d2" style={styles.loader} />
        )}
        {isConnected && (
          <FontAwesome5 name="check-circle" size={24} color="#4CAF50" style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showDeviceSelection ? t('ble.selectDevice') : t('ble.connectToScoringBox')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome5 name="times" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {showDeviceSelection ? (
            <>
              <Text style={styles.deviceListTitle}>
                {t('ble.foundDevices', { count: foundDevices.length })}
              </Text>
              <FlatList
                data={foundDevices}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.deviceItem}
                    onPress={() => handleDeviceSelection(item)}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>
                        {item.name || item.localName || t('ble.unknownDevice')}
                      </Text>
                      <Text style={styles.deviceId}>{item.id}</Text>
                    </View>
                    <FontAwesome5 name="chevron-right" size={16} color="#666" />
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeviceSelection(false);
                  setFoundDevices([]);
                  setSelectedBox(null);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {isScanning && selectedBox === ScoringBoxType.TOURNAFENCE && (
                <View style={styles.nfcPrompt}>
                  <FontAwesome5 name="wifi" size={24} color="#1976d2" />
                  <Text style={styles.nfcPromptText}>{t('ble.tapNfcToPair')}</Text>
                </View>
              )}

              <FlatList
                data={boxOptions}
                renderItem={renderBoxOption}
                keyExtractor={(item) => item.type}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />

              {connectionState === ConnectionState.CONNECTED && (
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() => {
                    onDisconnect();
                    onClose();
                  }}
                >
                  <Text style={styles.disconnectButtonText}>{t('ble.disconnect')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  boxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  boxOptionConnected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  boxOptionScanning: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#1976d2',
  },
  boxOptionDisabled: {
    opacity: 0.5,
  },
  boxIconContainer: {
    width: 50,
    alignItems: 'center',
  },
  boxTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  boxName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  boxNameConnected: {
    color: '#2e7d32',
  },
  boxNameScanning: {
    color: '#1976d2',
  },
  boxDescription: {
    fontSize: 14,
    color: '#666',
  },
  scanningText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  deviceName: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 3,
  },
  loader: {
    marginLeft: 10,
  },
  checkIcon: {
    marginLeft: 10,
  },
  separator: {
    height: 5,
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    margin: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nfcPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  nfcPromptText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
  deviceListTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 15,
    color: '#333',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    margin: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});