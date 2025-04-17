// src/navigation/components/DEHelpModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DE_FORMATS } from '../utils/BracketFormats';

interface DEHelpModalProps {
    visible: boolean;
    onClose: () => void;
    format: 'single' | 'double' | 'compass';
}

/**
 * Help modal that explains the different DE bracket formats
 */
const DEHelpModal: React.FC<DEHelpModalProps> = ({ visible, onClose, format }) => {
    // Get the current format info
    const currentFormat = DE_FORMATS.find(f => f.id === format) || DE_FORMATS[0];

    // Format-specific help content
    const getFormatHelp = () => {
        switch (format) {
            case 'single':
                return (
                    <>
                        <Text style={styles.helpTitle}>Single Elimination Format</Text>
                        <Text style={styles.helpText}>In a single elimination tournament:</Text>
                        <View style={styles.bulletList}>
                            <Text style={styles.bulletPoint}>
                                • Fencers are seeded according to their initial rankings.
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • Each fencer fences until they lose once, at which point they are eliminated.
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • The bracket is structured to delay matches between top seeds until later rounds.
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • If a fencer can't fence, their opponent receives a "bye" and advances automatically.
                            </Text>
                        </View>
                        <Text style={styles.helpText}>The winner is the fencer who wins all their bouts.</Text>
                    </>
                );

            case 'double':
                return (
                    <>
                        <Text style={styles.helpTitle}>Double Elimination Format</Text>
                        <Text style={styles.helpText}>In a double elimination tournament:</Text>
                        <View style={styles.bulletList}>
                            <Text style={styles.bulletPoint}>• Fencers start in the Winners Bracket.</Text>
                            <Text style={styles.bulletPoint}>
                                • When a fencer loses for the first time, they move to the Losers Bracket.
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • A second loss in either bracket eliminates the fencer completely.
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • The winner of the Losers Bracket faces the winner of the Winners Bracket in the
                                Finals.
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • If the Losers Bracket winner defeats the Winners Bracket winner, a "bracket reset"
                                bout is required (since the Winners Bracket winner now has one loss).
                            </Text>
                        </View>
                        <Text style={styles.helpText}>
                            This format gives fencers a second chance and is more forgiving of a single bad performance.
                        </Text>
                    </>
                );

            case 'compass':
                return (
                    <>
                        <Text style={styles.helpTitle}>Compass Draw Format</Text>
                        <Text style={styles.helpText}>
                            The compass draw has four brackets, named after compass directions:
                        </Text>
                        <View style={styles.bulletList}>
                            <Text style={styles.bulletPoint}>• East: The main bracket (original seeding)</Text>
                            <Text style={styles.bulletPoint}>
                                • North: For fencers who lose in the first round of East
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • West: For fencers who lose in the second round of East
                            </Text>
                            <Text style={styles.bulletPoint}>
                                • South: For fencers who lose in the first round of North
                            </Text>
                        </View>
                        <Text style={styles.helpText}>
                            This format ensures all fencers get to fence multiple bouts, regardless of their initial
                            performance. It's particularly valuable for developmental tournaments and provides good
                            classification opportunities.
                        </Text>
                    </>
                );

            default:
                return <Text style={styles.helpText}>Select a format to see details.</Text>;
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView style={styles.scrollContent}>
                        {getFormatHelp()}

                        <Text style={styles.helpTitle}>All Available Formats</Text>
                        {DE_FORMATS.map(formatInfo => (
                            <View key={formatInfo.id} style={styles.formatInfo}>
                                <Text style={styles.formatName}>{formatInfo.name}</Text>
                                <Text style={styles.formatDescription}>{formatInfo.description}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    scrollContent: {
        maxHeight: '90%',
    },
    helpTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#001f3f',
    },
    helpText: {
        fontSize: 16,
        marginBottom: 10,
        lineHeight: 22,
    },
    bulletList: {
        marginLeft: 10,
        marginBottom: 10,
    },
    bulletPoint: {
        fontSize: 16,
        marginBottom: 5,
        lineHeight: 22,
    },
    formatInfo: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    formatName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    formatDescription: {
        fontSize: 14,
        color: '#555',
    },
    closeButton: {
        backgroundColor: '#001f3f',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 15,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DEHelpModal;
