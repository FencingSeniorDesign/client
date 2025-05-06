import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { dbCreateTournament } from '../../db/DrizzleDatabaseUtils';
import { useTranslation } from 'react-i18next';

interface CreateTournamentButtonProps {
    onTournamentCreated: () => void;
}

export const CreateTournamentButton: React.FC<CreateTournamentButtonProps> = ({ onTournamentCreated }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [tournamentName, setTournamentName] = useState('');
    const { t } = useTranslation();

    const handleSubmit = async () => {
        if (!tournamentName.trim()) {
            Alert.alert(t('common.error'), t('createTournament.errorEmptyName'));
            return;
        }

        try {
            await dbCreateTournament(tournamentName.trim());
            setModalVisible(false);
            setTournamentName('');
            onTournamentCreated(); // Notify the parent component to refresh the list
        } catch (error) {
            Alert.alert(t('common.error'), t('createTournament.errorCreateFailed'));
            console.error(error);
        }
    };

    return (
        <View>
            <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                <MaterialIcons name="add-circle" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>{t('home.createTournament')}</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('createTournament.title')}</Text>

                        <TextInput
                            style={styles.input}
                            value={tournamentName}
                            onChangeText={setTournamentName}
                            placeholder={t('createTournament.enterName')}
                            autoFocus
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setTournamentName('');
                                }}
                            >
                                <Text style={styles.buttonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSubmit}>
                                <Text style={styles.buttonText}>{t('common.submit')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#001f3f',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 50, // Fixed height
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        width: '85%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 10,
        marginBottom: 24,
        fontSize: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        padding: 12,
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cancelButton: {
        backgroundColor: '#ff3b30',
    },
    submitButton: {
        backgroundColor: '#34c759',
    },
});
