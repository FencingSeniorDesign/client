import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, TextInput } from 'react-native';

interface CustomTimeModalProps {
    visible: boolean;
    onClose: () => void;
    onSetTime: (minutes: number) => void;
    onSetCustomTime: (minutes: number, seconds: number) => void;
    customMinutes: string;
    customSeconds: string;
    setCustomMinutes: (value: string) => void;
    setCustomSeconds: (value: string) => void;
    onKawaiiMode?: () => void;
    onRevertLastPoint?: () => void; // New prop for reverting the last point
    kawaiiMode?: boolean; // Indicates if kawaii mode is active
    canRevertLastPoint?: boolean; // Whether there is a point to revert
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
    onKawaiiMode,
    onRevertLastPoint,
    kawaiiMode = false,
    canRevertLastPoint = false,
}: CustomTimeModalProps) {
    const handleCustomTime = () => {
        const minutes = parseInt(customMinutes) || 0;
        const seconds = parseInt(customSeconds) || 0;
        onSetCustomTime(minutes, seconds);
    };

    // Determine colors for preset and cancel buttons.
    const buttonBackgroundColor = kawaiiMode ? '#ff69b4' : '#001f3f';
    const cancelButtonBackgroundColor = kawaiiMode ? '#ba55d3' : '#FF3B30';

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Set Timer Duration</Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.modalButton,
                            { backgroundColor: buttonBackgroundColor },
                            pressed && { opacity: 0.6 },
                        ]}
                        onPress={() => onSetTime(1)}
                    >
                        <Text style={styles.modalButtonText}>1 Minute</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.modalButton,
                            { backgroundColor: buttonBackgroundColor },
                            pressed && { opacity: 0.6 },
                        ]}
                        onPress={() => onSetTime(3)}
                    >
                        <Text style={styles.modalButtonText}>3 Minutes</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.modalButton,
                            { backgroundColor: buttonBackgroundColor },
                            pressed && { opacity: 0.6 },
                        ]}
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
                            style={({ pressed }) => [
                                styles.modalButton,
                                { backgroundColor: buttonBackgroundColor },
                                pressed && { opacity: 0.6 },
                            ]}
                            onPress={handleCustomTime}
                        >
                            <Text style={styles.modalButtonText}>Set Custom Time</Text>
                        </Pressable>
                    </View>

                    {onKawaiiMode && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.modalButton,
                                { backgroundColor: '#ff69b4' }, // Always pink for Kawaii Mode
                                pressed && { opacity: 0.6 },
                            ]}
                            onPress={onKawaiiMode}
                        >
                            <Text style={[styles.modalButtonText, styles.kawaiiButtonText]}>Kawaii Mode</Text>
                        </Pressable>
                    )}

                    {onRevertLastPoint && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.modalButton,
                                { backgroundColor: '#CCAA00' }, // Darker yellow for revert
                                pressed && { opacity: 0.6 },
                                !canRevertLastPoint && styles.disabledButton,
                            ]}
                            onPress={onRevertLastPoint}
                            disabled={!canRevertLastPoint}
                        >
                            <Text
                                style={[
                                    styles.modalButtonText,
                                    { color: 'black' },
                                    !canRevertLastPoint && styles.disabledButtonText,
                                ]}
                            >
                                Revert Last Point
                            </Text>
                        </Pressable>
                    )}

                    <Pressable
                        style={({ pressed }) => [
                            styles.modalButton,
                            styles.cancelButton,
                            { backgroundColor: cancelButtonBackgroundColor },
                            pressed && { opacity: 0.6 },
                        ]}
                        onPress={onClose}
                    >
                        <Text style={styles.modalButtonText}>Back</Text>
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
        padding: 15,
        borderRadius: 8,
        marginVertical: 5,
    },
    modalButtonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
    },
    kawaiiButtonText: {
        color: 'black',
        fontFamily: 'Comic Sans MS',
    },
    cancelButton: {
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
    disabledButton: {
        backgroundColor: '#d3d3d3', // Light gray for disabled state
        opacity: 0.7,
    },
    disabledButtonText: {
        color: '#666', // Darker gray for disabled text
    },
});
