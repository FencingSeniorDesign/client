// screens/RefereeModule/CustomTimeModal.tsx
import React from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
    TextInput,
} from 'react-native';

interface CustomTimeModalProps {
    visible: boolean;
    onClose: () => void;
    onSetTime: (minutes: number) => void;
    onSetCustomTime: (minutes: number, seconds: number) => void;
    customMinutes: string;
    customSeconds: string;
    setCustomMinutes: (value: string) => void;
    setCustomSeconds: (value: string) => void;
}

export function CustomTimeModal({
                                    visible,
                                    onClose,
                                    onSetTime,
                                    onSetCustomTime,
                                    customMinutes,
                                    customSeconds,
                                    setCustomMinutes,
                                    setCustomSeconds,
                                }: CustomTimeModalProps) {
    const handleCustomTime = () => {
        const minutes = parseInt(customMinutes) || 0;
        const seconds = parseInt(customSeconds) || 0;
        onSetCustomTime(minutes, seconds);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Set Timer Duration</Text>

                    <Pressable
                        style={styles.modalButton}
                        onPress={() => onSetTime(1)}
                    >
                        <Text style={styles.modalButtonText}>1 Minute</Text>
                    </Pressable>

                    <Pressable
                        style={styles.modalButton}
                        onPress={() => onSetTime(3)}
                    >
                        <Text style={styles.modalButtonText}>3 Minutes</Text>
                    </Pressable>

                    <Pressable
                        style={styles.modalButton}
                        onPress={() => onSetTime(5)}
                    >
                        <Text style={styles.modalButtonText}>5 Minutes</Text>
                    </Pressable>

                    <View style={styles.customTimeContainer}>
                        <Text style={styles.customTimeLabel}>Custom Time:</Text>
                        <View style={styles.customTimeInputs}>
                            <TextInput
                                style={styles.customTimeInput}
                                placeholder="Min"
                                keyboardType="number-pad"
                                value={customMinutes}
                                onChangeText={setCustomMinutes}
                                maxLength={2}
                            />
                            <Text>:</Text>
                            <TextInput
                                style={styles.customTimeInput}
                                placeholder="Sec"
                                keyboardType="number-pad"
                                value={customSeconds}
                                onChangeText={setCustomSeconds}
                                maxLength={2}
                            />
                        </View>
                        <Pressable
                            style={styles.modalButton}
                            onPress={handleCustomTime}
                        >
                            <Text style={styles.modalButtonText}>Set Custom Time</Text>
                        </Pressable>
                    </View>

                    <Pressable
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonText}>Cancel</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginVertical: 5,
    },
    modalButtonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
    },
    cancelButton: {
        backgroundColor: '#FF3B30',
        marginTop: 10,
    },
    customTimeContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 20,
    },
    customTimeLabel: {
        fontSize: 16,
        marginBottom: 10,
    },
    customTimeInputs: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    customTimeInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        width: 60,
        marginHorizontal: 5,
        textAlign: 'center',
    },
});