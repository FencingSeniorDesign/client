// src/navigation/screens/JoinTournamentModal.tsx - Updated with navigation
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import tournamentClient from '../../networking/TournamentClient';
import { isValidIpAddress, isValidPort } from '../../networking/NetworkUtils';
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
    const [hostIp, setHostIp] = useState('');
    const [port, setPort] = useState('9001');
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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

    const handleConnect = async () => {
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
                            style={styles.cancelButton}
                            onPress={onClose}
                            disabled={connecting}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.connectButton, connecting && styles.disabledButton]}
                            onPress={handleConnect}
                            disabled={connecting}
                        >
                            {connecting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Connect</Text>
                            )}
                        </TouchableOpacity>
                    </View>
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
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
        textAlign: 'center',
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
    connectButton: {
        padding: 10,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#001f3f',
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