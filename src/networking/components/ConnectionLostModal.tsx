import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import tournamentClient from '../TournamentClient';

interface ConnectionLostModalProps {
    visible: boolean;
    clientInfo: any;
    onReconnect: () => Promise<void>;
    onBackToHome: () => void;
}

export const ConnectionLostModal: React.FC<ConnectionLostModalProps> = ({
    visible,
    clientInfo,
    onReconnect,
    onBackToHome,
}) => {
    const { t } = useTranslation();
    const [isReconnecting, setIsReconnecting] = useState(false);

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onBackToHome}>
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{t('home.connectionLost')}</Text>
                    <Text style={styles.modalText}>{t('home.connectionLostMessage')}</Text>

                    {clientInfo && (
                        <Text style={styles.connectionInfo}>
                            {clientInfo.tournamentName} ({clientInfo.hostIp}:{clientInfo.port})
                        </Text>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.reconnectButton]}
                            onPress={async () => {
                                // Prevent showing another modal if reconnection fails
                                if (clientInfo) {
                                    setIsReconnecting(true);
                                    try {
                                        // Set intentional flag to prevent additional modals
                                        tournamentClient.isIntentionalDisconnect = true;
                                        await onReconnect();
                                    } catch (error) {
                                        console.error('Error in reconnect handler:', error);
                                    } finally {
                                        setIsReconnecting(false);
                                    }
                                }
                            }}
                            disabled={isReconnecting}
                        >
                            {isReconnecting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>{t('home.reconnect')}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.homeButton]} onPress={onBackToHome}>
                            <Text style={styles.buttonText}>{t('home.backToHome')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '85%',
        maxWidth: 450,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#cc0000',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 20,
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
    connectionInfo: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        width: '100%',
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    button: {
        borderRadius: 8,
        padding: 12,
        elevation: 2,
        minWidth: 120,
        alignItems: 'center',
    },
    reconnectButton: {
        backgroundColor: '#2196F3',
    },
    homeButton: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
