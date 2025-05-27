import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from 'expo-sqlite/kv-store';
import { useAbility } from './AbilityContext'; // useAbility now provides { ability, role, refreshAbility }
import { Role } from './ability'; // Remove getRoleFromAbility import
import { getDeviceId } from '../networking/NetworkUtils';
import { useTranslation } from 'react-i18next';

interface PermissionsDisplayProps {
    tournamentName?: string;
    compact?: boolean;
}

/**
 * Component to display the current user's permissions
 */
export const PermissionsDisplay: React.FC<PermissionsDisplayProps> = ({ tournamentName, compact = false }) => {
    // Get ability, role, and refresh function from context
    const { ability, role, refreshAbility } = useAbility();
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const { t } = useTranslation();
    // Remove local role state, as we get it from context now

    // Get the device ID when the component mounts
    useEffect(() => {
        const fetchDeviceId = async () => {
            try {
                const id = await getDeviceId();
                setDeviceId(id);
            } catch (error) {
                //console.error('Error fetching device ID:', error);
            }
        };

        fetchDeviceId();
    }, []);

    // Removed useEffect hook that incorrectly called refreshAbility.
    // AbilityProvider handles initial setup and updates via 'roleAssigned' event.

    // Remove the useEffect hook that inferred the role from ability
    // The role is now directly available from the useAbility() hook

    // Format the role for display
    const getRoleDisplay = (): string => {
        switch (role) {
            case Role.TOURNAMENT_CREATOR:
                return t('permissions.tournamentCreator');
            case Role.OFFICIAL:
                return t('permissions.official');
            case Role.REFEREE:
                return t('permissions.referee');
            case Role.VIEWER:
            default:
                return t('permissions.viewer');
        }
    };

    // Don't show anything if no tournament name
    if (!tournamentName) {
        return null;
    }

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <Text style={styles.roleText}>{getRoleDisplay()}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>{t('permissions.title')}</Text>
                <Text style={styles.roleText}>
                    {t('permissions.role')} <Text style={styles.highlight}>{getRoleDisplay()}</Text>
                </Text>
                <Text style={styles.deviceText}>
                    {t('permissions.deviceId')} {deviceId}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 8,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    compactContainer: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        alignSelf: 'flex-start',
        opacity: 0.9,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    roleText: {
        fontSize: 16,
        marginBottom: 4,
    },
    deviceText: {
        fontSize: 14,
        color: '#666',
    },
    highlight: {
        fontWeight: 'bold',
        color: '#001f3f',
    },
});
