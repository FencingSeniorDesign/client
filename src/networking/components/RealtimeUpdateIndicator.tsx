// src/networking/components/RealtimeUpdateIndicator.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import tournamentClient from '../TournamentClient';
import { isEntityUpdateMessage, isBulkEntityUpdateMessage } from '../MessageTypes';

interface RealtimeUpdateIndicatorProps {
    compact?: boolean;
}

/**
 * Component that shows a visual indicator when real-time updates are received
 */
const RealtimeUpdateIndicator: React.FC<RealtimeUpdateIndicatorProps> = ({ compact = false }) => {
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);
    const [updateCount, setUpdateCount] = useState<number>(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Animate the indicator when updates are received
    const pulseIndicator = () => {
        pulseAnim.setValue(1);
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.5,
                duration: 150,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 150,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            })
        ]).start();
    };

    useEffect(() => {
        // Define a handler for real-time messages
        const handleUpdate = (data: any) => {
            // Check if this is a real-time update message
            const isRealtimeUpdate = isEntityUpdateMessage(data) || isBulkEntityUpdateMessage(data);

            if (isRealtimeUpdate) {
                // Format current timestamp
                const now = new Date();
                const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                // Update state
                setLastUpdate(timestamp);
                setUpdateCount(prev => prev + 1);

                // Trigger animation
                pulseIndicator();
            }
        };

        // Listen for all message types
        tournamentClient.on('message', handleUpdate);

        // Cleanup
        return () => {
            tournamentClient.removeListener('message', handleUpdate);
        };
    }, []);

    // If not connected to a tournament server, don't show the indicator
    if (!tournamentClient.isConnected()) {
        return null;
    }

    if (compact) {
        return (
            <Animated.View
                style={[
                    styles.compactContainer,
                    { transform: [{ scale: pulseAnim }] }
                ]}
            >
                <View style={styles.indicatorDot} />
                <Text style={styles.compactText}>
                    {updateCount > 0 ? `${updateCount} updates` : 'Realtime ready'}
                </Text>
            </Animated.View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Animated.View
                    style={[
                        styles.indicatorDot,
                        { transform: [{ scale: pulseAnim }] }
                    ]}
                />
                <Text style={styles.headerText}>Real-time Updates</Text>
            </View>
            <Text style={styles.statsText}>
                {updateCount > 0
                    ? `${updateCount} updates received${lastUpdate ? ` (Last: ${lastUpdate})` : ''}`
                    : 'Waiting for updates...'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginVertical: 4,
        marginHorizontal: 8,
    },
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicatorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4CD964',
        marginRight: 6,
    },
    headerText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    statsText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    compactText: {
        fontSize: 12,
    },
});

export default RealtimeUpdateIndicator;