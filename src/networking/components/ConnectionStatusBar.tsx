// src/networking/components/ConnectionStatusBar.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import tournamentClient from '../TournamentClient';

interface ConnectionStatusBarProps {
    tournamentName?: string;
    compact?: boolean;
    onDisconnect?: () => void;
}

export const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({
                                                                            tournamentName,
                                                                            compact = false,
                                                                            onDisconnect
                                                                        }) => {
    const [connected, setConnected] = useState(false);
    const [activeTournament, setActiveTournament] = useState<string | null>(null);

    useEffect(() => {
        // Set initial state
        setConnected(tournamentClient.isConnected());
        const clientInfo = tournamentClient.getClientInfo();
        setActiveTournament(clientInfo?.tournamentName || null);

        // Add event listeners
        const handleConnected = (name: string) => {
            setConnected(true);
            setActiveTournament(name);
        };

        const handleDisconnected = () => {
            setConnected(false);
            setActiveTournament(null);
        };

        tournamentClient.on('connected', handleConnected);
        tournamentClient.on('disconnected', handleDisconnected);

        // Clean up event listeners
        return () => {
            tournamentClient.removeListener('connected', handleConnected);
            tournamentClient.removeListener('disconnected', handleDisconnected);
        };
    }, [tournamentName]);

    // Don't render anything if we're not connected and not showing a specific tournament
    if (!connected && !tournamentName) {
        return null;
    }

    const displayName = tournamentName || activeTournament;

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <View style={[styles.statusDot, connected ? styles.connectedDot : styles.disconnectedDot]} />
                <Text style={styles.compactText}>
                    {connected ? 'Connected' : 'Disconnected'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.infoContainer}>
                <View style={[styles.statusDot, connected ? styles.connectedDot : styles.disconnectedDot]} />
                <Text style={styles.statusText}>
                    {connected
                        ? `Connected to: ${displayName}`
                        : `Not connected to ${displayName}`}
                </Text>
            </View>
            {onDisconnect && connected && (
                <TouchableOpacity style={styles.disconnectButton} onPress={onDisconnect}>
                    <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginVertical: 4,
        marginHorizontal: 8,
    },
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 4,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    connectedDot: {
        backgroundColor: '#4CD964',
    },
    disconnectedDot: {
        backgroundColor: '#FF3B30',
    },
    statusText: {
        fontSize: 14,
    },
    compactText: {
        fontSize: 12,
    },
    disconnectButton: {
        backgroundColor: '#FF3B30',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    disconnectText: {
        color: 'white',
        fontSize: 12,
    },
});

export default ConnectionStatusBar;