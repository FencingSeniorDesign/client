import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useScoringBoxContext } from '../ble/ScoringBoxContext';
import { ConnectionState } from '../ble/types';

interface BLEStatusBarProps {
    compact?: boolean;
}

export function BLEStatusBar({ compact = false }: BLEStatusBarProps) {
    const { t } = useTranslation();
    const { connectionState, connectedDeviceName } = useScoringBoxContext();

    if (connectionState !== ConnectionState.CONNECTED) {
        return null;
    }

    return (
        <View style={[styles.container, compact && styles.compactContainer]}>
            <FontAwesome5 
                name="mobile-alt" 
                size={compact ? 14 : 16} 
                color="#4CAF50" 
            />
            <Text style={[styles.text, compact && styles.compactText]}>
                {t('ble.connectedToBox', { boxName: connectedDeviceName })}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E8F5E9',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#C8E6C9',
    },
    compactContainer: {
        padding: 8,
    },
    text: {
        color: '#2E7D32',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
    compactText: {
        fontSize: 12,
    },
});