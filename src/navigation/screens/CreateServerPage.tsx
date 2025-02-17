// CreateServerPage.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import ServerManager from '../../services/ServerManager';

export const CreateServerPage = () => {
    const [serverStarted, setServerStarted] = useState<boolean>(false);

    // On mount, check the current server status from the global manager
    useEffect(() => {
        setServerStarted(ServerManager.isServerRunning());
    }, []);

    const handleToggleServer = () => {
        if (serverStarted) {
            // Stop the server
            ServerManager.stopServer(() => {
                setServerStarted(false);
            });
        } else {
            // Start the server
            ServerManager.startServer(
                () => {
                    setServerStarted(true);
                },
                (error) => {
                    Alert.alert('Error', 'Failed to start the server.');
                }
            );
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Create Server</Text>
            <Button
                title={serverStarted ? 'Stop Server' : 'Start Server'}
                onPress={handleToggleServer}
            />
            {serverStarted && (
                <Text>Server is now running and visible on the local network.</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        fontSize: 24,
        marginBottom: 20,
    },
});
