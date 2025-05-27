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
    Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Device } from 'react-native-ble-plx';
import { ScoringBoxType, ConnectionState } from '../../../../networking/ble/types';
import { nfcService, NFCTagData } from '../../../../networking/ble/NFCService';

interface ConnectionModalProps {
    visible: boolean;
    onClose: () => void;
    onScan: (boxType: ScoringBoxType) => Promise<Device[]>;
    onConnect: (boxType: ScoringBoxType, deviceId: string) => Promise<void>;
    onDisconnect: () => void;
    onCancelScan: () => void;
    connectionState: ConnectionState;
    connectedBoxType?: ScoringBoxType;
    connectedDeviceName?: string;
    connectedDeviceId?: string;
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
    onCancelScan,
    connectionState,
    connectedBoxType,
    connectedDeviceName,
    connectedDeviceId,
}: ConnectionModalProps) {
    const { t } = useTranslation();
    const [selectedBox, setSelectedBox] = useState<ScoringBoxType | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [foundDevices, setFoundDevices] = useState<Device[]>([]);
    const [nfcSupported, setNfcSupported] = useState(false);
    const [isNFCScanning, setIsNFCScanning] = useState(false);
    const [showNFCWriteModal, setShowNFCWriteModal] = useState(false);
    const [isNFCWriting, setIsNFCWriting] = useState(false);

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

    // Check NFC support on mount
    useEffect(() => {
        nfcService.isNFCSupported().then(setNfcSupported);
    }, []);

    const handleNFCScan = async () => {
        if (!nfcSupported) {
            Alert.alert(t('nfc.notSupported'), t('nfc.notSupportedMessage'));
            return;
        }

        setIsNFCScanning(true);
        try {
            const tagData = await nfcService.readTag();
            if (tagData) {
                console.log('Read NFC tag:', tagData);

                // Check if the box type is supported
                const supportedBox = boxOptions.find(box => box.type === tagData.boxType && box.available);
                if (!supportedBox) {
                    Alert.alert(t('nfc.error'), t('nfc.unsupportedBoxType'));
                    return;
                }

                // Close any existing connections first
                if (connectionState === ConnectionState.CONNECTED) {
                    await onDisconnect();
                }

                // Connect to the device
                await onConnect(tagData.boxType, tagData.deviceId);
                onClose(); // Close modal on successful connection
            }
        } catch (error) {
            //console.error('NFC scan error:', error);
            //if (error.message && !error.message.includes('cancelled')) {
                //Alert.alert(t('nfc.scanError'), error.message);
            //}
        } finally {
            setIsNFCScanning(false);
        }
    };

    const handleNFCWrite = async () => {
        if (!nfcSupported || connectionState !== ConnectionState.CONNECTED || !connectedBoxType || !connectedDeviceId) {
            return;
        }

        setIsNFCWriting(true);
        try {
            const tagData: NFCTagData = {
                version: 1,
                boxType: connectedBoxType,
                deviceId: connectedDeviceId,
                deviceName: connectedDeviceName || undefined,
                timestamp: Date.now(),
            };

            await nfcService.writeTag(tagData);
            Alert.alert(t('nfc.writeSuccess'), t('nfc.writeSuccessMessage'));
            setShowNFCWriteModal(false);
        } catch (error) {
            //console.error('NFC write error:', error);
            if (error.message && !error.message.includes('cancelled')) {
                Alert.alert(t('nfc.writeError'), error.message);
            }
        } finally {
            setIsNFCWriting(false);
        }
    };

    const handleBoxSelection = async (box: BoxOption) => {
        if (!box.available) {
            console.log('Box not available:', box.name);
            return;
        }

        if (connectionState === ConnectionState.CONNECTED && connectedBoxType === box.type) {
            // Already connected to this box type
            return;
        }

        // If we're already scanning this box type, cancel the scan
        if (isScanning && selectedBox === box.type) {
            onCancelScan();
            setIsScanning(false);
            setSelectedBox(null);
            setFoundDevices([]);
            return;
        }

        // If selecting a different box, reset previous selection
        if (selectedBox && selectedBox !== box.type) {
            onCancelScan();
            setFoundDevices([]);
        }

        setSelectedBox(box.type);
        setIsScanning(true);

        try {
            // Scan for devices
            const devices = await onScan(box.type);
            setFoundDevices(devices);
            setIsScanning(false);
        } catch (error) {
            //('Scan failed:', error);
            setIsScanning(false);
            setSelectedBox(null);
            setFoundDevices([]);
            // Log error instead of showing alert
            if (error.message !== 'Scan cancelled') {
                //('Scan failed:', error.message || 'Unknown error');
            }
        }
    };

    const handleDeviceSelection = async (device: Device) => {
        if (!selectedBox) return;

        try {
            await onConnect(selectedBox, device.id);
            // Connection successful
            setFoundDevices([]);
            setSelectedBox(null);
            onClose(); // Close modal after successful connection
        } catch (error) {
            //('Connection failed:', error);
        }
    };

    // Reset state when modal closes
    useEffect(() => {
        if (!visible) {
            // Cancel any ongoing scan when modal closes
            if (isScanning) {
                onCancelScan();
            }
            setIsScanning(false);
            setSelectedBox(null);
            setFoundDevices([]);
        }
    }, [visible, isScanning, onCancelScan]);

    const renderBoxOption = ({ item }: { item: BoxOption }) => {
        const isConnected = connectionState === ConnectionState.CONNECTED && connectedBoxType === item.type;
        const isThisBoxScanning = isScanning && selectedBox === item.type;
        const isThisBoxSelected = selectedBox === item.type;
        const hasFoundDevices = isThisBoxSelected && foundDevices.length > 0;

        return (
            <View>
                <TouchableOpacity
                    style={[
                        styles.boxOption,
                        isConnected && styles.boxOptionConnected,
                        isThisBoxScanning && styles.boxOptionScanning,
                        !item.available && styles.boxOptionDisabled,
                    ]}
                    onPress={() => handleBoxSelection(item)}
                    disabled={isScanning && !isThisBoxScanning}
                >
                    <View style={styles.boxIconContainer}>
                        <FontAwesome5
                            name={item.icon}
                            size={30}
                            color={isConnected ? '#4CAF50' : isThisBoxScanning ? '#1976d2' : '#666'}
                        />
                    </View>
                    <View style={styles.boxTextContainer}>
                        <Text
                            style={[
                                styles.boxName,
                                isConnected && styles.boxNameConnected,
                                isThisBoxScanning && styles.boxNameScanning,
                            ]}
                        >
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
                    {isThisBoxScanning && <ActivityIndicator size="small" color="#1976d2" style={styles.loader} />}
                    {isConnected && (
                        <FontAwesome5 name="check-circle" size={24} color="#4CAF50" style={styles.checkIcon} />
                    )}
                </TouchableOpacity>

                {/* Found devices section */}
                {hasFoundDevices && (
                    <View style={styles.devicesContainer}>
                        <Text style={styles.devicesTitle}>{t('ble.foundDevices', { count: foundDevices.length })}</Text>
                        {foundDevices.map(device => (
                            <TouchableOpacity
                                key={device.id}
                                style={styles.deviceItem}
                                onPress={() => handleDeviceSelection(device)}
                            >
                                <View style={styles.deviceInfo}>
                                    <Text style={styles.deviceName}>
                                        {device.name || device.localName || t('ble.unknownDevice')}
                                    </Text>
                                    <Text style={styles.deviceId}>{device.id}</Text>
                                </View>
                                <FontAwesome5 name="chevron-right" size={16} color="#666" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const handleClose = () => {
        if (isScanning) {
            onCancelScan();
        }
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('ble.connectToScoringBox')}</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <FontAwesome5 name="times" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* NFC Scan Button - shown when not connected */}
                    {nfcSupported && connectionState !== ConnectionState.CONNECTED && (
                        <TouchableOpacity style={styles.nfcScanButton} onPress={handleNFCScan} disabled={isNFCScanning}>
                            <FontAwesome5 name="wifi" size={20} color="#fff" />
                            <Text style={styles.nfcScanButtonText}>
                                {isNFCScanning ? t('nfc.scanning') : t('nfc.scanTag')}
                            </Text>
                            {isNFCScanning && <ActivityIndicator size="small" color="#fff" style={styles.nfcLoader} />}
                        </TouchableOpacity>
                    )}

                    {/* NFC Manager Button - shown when connected to TournaFence */}
                    {nfcSupported &&
                        connectionState === ConnectionState.CONNECTED &&
                        connectedBoxType === ScoringBoxType.TOURNAFENCE && (
                            <TouchableOpacity
                                style={styles.nfcManagerButton}
                                onPress={() => setShowNFCWriteModal(true)}
                            >
                                <FontAwesome5 name="tag" size={20} color="#1976d2" />
                                <Text style={styles.nfcManagerButtonText}>{t('nfc.nfcManager')}</Text>
                            </TouchableOpacity>
                        )}

                    <FlatList
                        data={
                            selectedBox && !connectionState
                                ? boxOptions.filter(box => box.type === selectedBox)
                                : boxOptions
                        }
                        renderItem={renderBoxOption}
                        keyExtractor={item => item.type}
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
                </View>
            </View>

            {/* NFC Write Modal */}
            <Modal
                visible={showNFCWriteModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowNFCWriteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.nfcWriteModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('nfc.writeTag')}</Text>
                            <TouchableOpacity onPress={() => setShowNFCWriteModal(false)} style={styles.closeButton}>
                                <FontAwesome5 name="times" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.nfcWriteContent}>
                            <FontAwesome5 name="tag" size={48} color="#1976d2" style={styles.nfcIcon} />
                            <Text style={styles.nfcWriteDescription}>{t('nfc.writeDescription')}</Text>

                            <View style={styles.nfcInfoBox}>
                                <Text style={styles.nfcInfoLabel}>{t('nfc.boxType')}:</Text>
                                <Text style={styles.nfcInfoValue}>{connectedBoxType}</Text>
                            </View>

                            <View style={styles.nfcInfoBox}>
                                <Text style={styles.nfcInfoLabel}>{t('nfc.deviceName')}:</Text>
                                <Text style={styles.nfcInfoValue}>{connectedDeviceName || t('nfc.unknown')}</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.nfcWriteButton, isNFCWriting && styles.nfcWriteButtonDisabled]}
                                onPress={handleNFCWrite}
                                disabled={isNFCWriting}
                            >
                                {isNFCWriting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <FontAwesome5 name="pencil-alt" size={20} color="#fff" />
                                )}
                                <Text style={styles.nfcWriteButtonText}>
                                    {isNFCWriting ? t('nfc.writing') : t('nfc.writeToTag')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    devicesContainer: {
        marginTop: 10,
        marginHorizontal: 10,
        backgroundColor: '#f0f4f8',
        borderRadius: 10,
        padding: 10,
    },
    devicesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 10,
        paddingHorizontal: 10,
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
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#fff',
        marginHorizontal: 5,
        marginVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
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
    nfcScanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1976d2',
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 8,
    },
    nfcScanButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    nfcLoader: {
        marginLeft: 10,
    },
    nfcManagerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e3f2fd',
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#1976d2',
    },
    nfcManagerButtonText: {
        color: '#1976d2',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    nfcWriteModalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        width: '90%',
        maxWidth: 400,
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
    nfcWriteContent: {
        padding: 20,
        alignItems: 'center',
    },
    nfcIcon: {
        marginBottom: 20,
    },
    nfcWriteDescription: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    nfcInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginVertical: 5,
        width: '100%',
    },
    nfcInfoLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        marginRight: 10,
    },
    nfcInfoValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    nfcWriteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4caf50',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        marginTop: 20,
        minWidth: 200,
    },
    nfcWriteButtonDisabled: {
        backgroundColor: '#9e9e9e',
    },
    nfcWriteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
});
