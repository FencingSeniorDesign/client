// src/navigation/screens/JoinTournamentModal.tsx - Updated with server discovery
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import tournamentClient from '../../networking/TournamentClient';
import { 
    isValidIpAddress, 
    isValidPort, 
    startServerDiscovery, 
    stopServerDiscovery,
    serverDiscovery,
    DiscoveredServer
} from '../../networking/NetworkUtils';
import { RootStackParamList } from '../navigation/types';

interface JoinTournamentModalProps {
    visible: boolean;
    onClose: () => void;
    onJoinSuccess: (tournamentName: string) => void;
}

export const JoinTournamentModal: React.FC<JoinTournamentModalProps> = ({
    visible,
    onClose,
    onJoinSuccess,
}) => {
    // States for manual connection
    const [hostIp, setHostIp] = useState('');
    const [port, setPort] = useState('9001');
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // States for server discovery
    const [showManualEntry, setShowManualEntry] = useState(true); // Start with manual entry as default
    const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // Start server discovery when modal is visible
    useEffect(() => {
        if (visible) {
            handleRefreshServers();
        }

        // Set up event listeners for discovery updates
        const serversUpdatedListener = (servers: DiscoveredServer[]) => {
            setDiscoveredServers(servers);
        };

        const scanningChangedListener = (scanning: boolean) => {
            setIsDiscovering(scanning);
        };

        serverDiscovery.on('serversUpdated', serversUpdatedListener);
        serverDiscovery.on('scanningChanged', scanningChangedListener);

        // Clean up when modal closes
        return () => {
            if (visible) {
                stopServerDiscovery();
            }
            serverDiscovery.removeListener('serversUpdated', serversUpdatedListener);
            serverDiscovery.removeListener('scanningChanged', scanningChangedListener);
        };
    }, [visible]);

    // Set up client connection event listeners
    useEffect(() => {
        // Set up event listeners
        const joinedListener = (message: string) => {
            setConnecting(false);
            const clientInfo = tournamentClient.getClientInfo();
            if (clientInfo) {
                // Notify parent component
                onJoinSuccess(clientInfo.tournamentName);

                // After successful connection, navigate to EventManagement screen
                // with the tournament name from the connection
                navigation.navigate('EventManagement', {
                    tournamentName: clientInfo.tournamentName,
                    isRemoteConnection: true  // Flag to indicate this is a remote connection
                });

                // Close the modal after navigation is triggered
                onClose();
            }
        };

        const joinFailedListener = (message: string) => {
            setConnecting(false);
            setError(message);
        };

        tournamentClient.on('joined', joinedListener);
        tournamentClient.on('joinFailed', joinFailedListener);

        // Clean up event listeners
        return () => {
            tournamentClient.removeListener('joined', joinedListener);
            tournamentClient.removeListener('joinFailed', joinFailedListener);
        };
    }, [onJoinSuccess, onClose, navigation]);

    // Handle manual connect button press
    const handleManualConnect = async () => {
        // Validate inputs
        if (!hostIp.trim()) {
            setError('Please enter a host IP address');
            return;
        }

        if (!isValidIpAddress(hostIp)) {
            setError('Please enter a valid IP address (e.g., 192.168.1.5)');
            return;
        }

        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || !isValidPort(portNum)) {
            setError('Please enter a valid port number (1024-65535)');
            return;
        }

        setError(null);
        setConnecting(true);

        try {
            const success = await tournamentClient.connectToServer(hostIp, portNum);
            if (!success) {
                setConnecting(false);
                setError('Failed to connect to the tournament server');
            }
        } catch (error: any) {
            setConnecting(false);
            setError(error.message || 'Failed to connect to the tournament server');
        }
    };

    // Handle selecting a discovered server
    const handleSelectServer = async (server: DiscoveredServer) => {
        setHostIp(server.hostIp);
        setPort(server.port.toString());
        setError(null);
        setConnecting(true);

        try {
            const success = await tournamentClient.connectToServer(server.hostIp, server.port);
            if (!success) {
                setConnecting(false);
                setError(`Failed to connect to "${server.tournamentName}"`);
            }
        } catch (error: any) {
            setConnecting(false);
            setError(error.message || `Failed to connect to "${server.tournamentName}"`);
        }
    };

    // Handle refresh servers button press
    const handleRefreshServers = async () => {
        setError(null);
        setIsDiscovering(true);
        try {
            const servers = await startServerDiscovery();
            setDiscoveredServers(servers);
        } catch (error: any) {
            console.error('Error discovering servers:', error);
            setError('Failed to discover servers on the local network');
        } finally {
            setIsDiscovering(false);
        }
    };

    // Sort servers by name
    const sortedServers = useMemo(() => {
        return [...discoveredServers].sort((a, b) => 
            a.tournamentName.localeCompare(b.tournamentName));
    }, [discoveredServers]);

    // Render a discovered server item
    const renderServerItem = ({ item }: { item: DiscoveredServer }) => (
        <TouchableOpacity
            style={styles.serverItem}
            onPress={() => handleSelectServer(item)}
            disabled={connecting}
        >
            <Text style={styles.serverName}>{item.tournamentName}</Text>
            <Text style={styles.serverAddress}>{item.hostIp}:{item.port}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Join Tournament</Text>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    {/* Server discovery view */}
                    {!showManualEntry ? (
                        <>
                            {sortedServers.length > 0 ? (
                                <Text style={styles.sectionTitle}>Available Tournaments</Text>
                            ) : (
                                <Text style={styles.emptyText}>
                                    {isDiscovering 
                                        ? 'Searching for tournaments...' 
                                        : 'No tournaments found on your network.\nYou may need to enter the IP address manually.'}
                                </Text>
                            )}

                            <FlatList
                                data={sortedServers}
                                renderItem={renderServerItem}
                                keyExtractor={(item) => `${item.hostIp}:${item.port}`}
                                style={styles.serverList}
                                contentContainerStyle={
                                    sortedServers.length === 0 ? styles.emptyListContent : undefined
                                }
                                ListEmptyComponent={
                                    isDiscovering ? (
                                        <ActivityIndicator size="large" color="#001f3f" />
                                    ) : null
                                }
                            />

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.refreshButton, isDiscovering && styles.disabledButton]}
                                    onPress={handleRefreshServers}
                                    disabled={isDiscovering || connecting}
                                >
                                    {isDiscovering ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.buttonText}>Refresh</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={onClose}
                                    disabled={connecting}
                                >
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.manualConnectButton}
                                    onPress={() => setShowManualEntry(true)}
                                    disabled={connecting}
                                >
                                    <Text style={styles.buttonText}>Enter IP Manually</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        // Manual connection view
                        <>
                            <Text style={styles.sectionTitle}>Manual Connection</Text>

                            <Text style={styles.inputLabel}>Host IP Address:</Text>
                            <TextInput
                                style={styles.input}
                                value={hostIp}
                                onChangeText={setHostIp}
                                placeholder="Enter host IP (e.g., 192.168.1.5)"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="numeric"
                                editable={!connecting}
                            />

                            <Text style={styles.inputLabel}>Port:</Text>
                            <TextInput
                                style={styles.input}
                                value={port}
                                onChangeText={setPort}
                                placeholder="Enter port (default: 9001)"
                                keyboardType="numeric"
                                editable={!connecting}
                            />

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => setShowManualEntry(false)}
                                    disabled={connecting}
                                >
                                    <Text style={styles.buttonText}>Back</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.connectButton, connecting && styles.disabledButton]}
                                    onPress={handleManualConnect}
                                    disabled={connecting}
                                >
                                    {connecting ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.buttonText}>Connect</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginVertical: 20,
        color: '#666',
    },
    serverList: {
        maxHeight: 200,
        marginBottom: 15,
    },
    emptyListContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 150,
    },
    serverItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    serverName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    serverAddress: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 6,
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 15,
    },
    refreshButton: {
        padding: 10,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        width: '50%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#ff3b30',
    },
    backButton: {
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#999',
    },
    connectButton: {
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#001f3f',
    },
    manualConnectButton: {
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#007AFF',
    },
    disabledButton: {
        backgroundColor: '#999',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
});