import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface DataSourceDialogProps {
    visible: boolean;
    onSelectSource: (source: 'app' | 'box') => void;
}

export function DataSourceDialog({ visible, onSelectSource }: DataSourceDialogProps) {
    const { t } = useTranslation();

    return (
        <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={() => onSelectSource('app')}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>{t('ble.initialSync')}</Text>
                    <Text style={styles.subtitle}>{t('ble.syncDescription')}</Text>

                    <TouchableOpacity style={styles.optionButton} onPress={() => onSelectSource('app')}>
                        <FontAwesome5 name="mobile-alt" size={30} color="#1976d2" />
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>{t('ble.syncFromApp')}</Text>
                            <Text style={styles.optionDescription}>{t('ble.syncFromAppDescription')}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton} onPress={() => onSelectSource('box')}>
                        <FontAwesome5 name="box" size={30} color="#f57c00" />
                        <View style={styles.optionTextContainer}>
                            <Text style={styles.optionTitle}>{t('ble.syncFromBox')}</Text>
                            <Text style={styles.optionDescription}>{t('ble.syncFromBoxDescription')}</Text>
                        </View>
                    </TouchableOpacity>
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
        padding: 20,
        elevation: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
        marginVertical: 10,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionTextContainer: {
        flex: 1,
        marginLeft: 20,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
    optionDescription: {
        fontSize: 14,
        color: '#666',
    },
});
