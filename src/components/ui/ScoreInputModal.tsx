// src/components/ui/ScoreInputModal.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface ScoreInputModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (scoreA: number, scoreB: number, winnerId?: number) => void;
    fencerAName: string;
    fencerBName: string;
    fencerAId?: number;
    fencerBId?: number;
    initialScoreA?: number;
    initialScoreB?: number;
    title?: string;
    allowTies?: boolean; // For team events, ties might be allowed
    onOpenRefereeModule?: () => void; // Optional callback to open referee module
    showRefereeButton?: boolean; // Whether to show the referee module button
}

const ScoreInputModal: React.FC<ScoreInputModalProps> = ({
    visible,
    onClose,
    onSubmit,
    fencerAName,
    fencerBName,
    fencerAId,
    fencerBId,
    initialScoreA = 0,
    initialScoreB = 0,
    title,
    allowTies = false,
    onOpenRefereeModule,
    showRefereeButton = true,
}) => {
    const { t } = useTranslation();
    const [scoreA, setScoreA] = useState<string>(initialScoreA.toString());
    const [scoreB, setScoreB] = useState<string>(initialScoreB.toString());
    const [showTieSelector, setShowTieSelector] = useState<boolean>(false);
    const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);

    React.useEffect(() => {
        if (visible) {
            setScoreA(initialScoreA.toString());
            setScoreB(initialScoreB.toString());
            setShowTieSelector(false);
            setSelectedWinnerId(null);
        }
    }, [visible, initialScoreA, initialScoreB]);

    const handleSubmit = () => {
        const scoreANum = parseInt(scoreA) || 0;
        const scoreBNum = parseInt(scoreB) || 0;

        // Check for tie
        if (scoreANum === scoreBNum && !allowTies) {
            // Show tie selector
            setShowTieSelector(true);
            return;
        }

        // Determine winner based on scores
        let winnerId: number | undefined;
        if (scoreANum > scoreBNum && fencerAId) {
            winnerId = fencerAId;
        } else if (scoreBNum > scoreANum && fencerBId) {
            winnerId = fencerBId;
        } else if (scoreANum === scoreBNum && selectedWinnerId) {
            winnerId = selectedWinnerId;
        }

        onSubmit(scoreANum, scoreBNum, winnerId);
        onClose();
    };

    const handleTieWinnerSubmit = () => {
        if (!selectedWinnerId) {
            Alert.alert(t('common.error'), t('scoreInput.selectWinnerForTie'));
            return;
        }

        const scoreANum = parseInt(scoreA) || 0;
        const scoreBNum = parseInt(scoreB) || 0;
        onSubmit(scoreANum, scoreBNum, selectedWinnerId);
        onClose();
    };

    const navyBlue = '#001f3f';

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                        {title || t('scoreInput.enterScores')}
                    </Text>
                    
                    <View style={styles.boutInfo}>
                        <Text style={styles.boutInfoText}>
                            {fencerAName} vs {fencerBName}
                        </Text>
                    </View>

                    {!showTieSelector ? (
                        <>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreFencerLabel}>{fencerAName}:</Text>
                                <TextInput
                                    style={styles.scoreInput}
                                    keyboardType="numeric"
                                    value={scoreA}
                                    onChangeText={setScoreA}
                                    selectTextOnFocus
                                />
                            </View>
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreFencerLabel}>{fencerBName}:</Text>
                                <TextInput
                                    style={styles.scoreInput}
                                    keyboardType="numeric"
                                    value={scoreB}
                                    onChangeText={setScoreB}
                                    selectTextOnFocus
                                />
                            </View>
                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                                    <Text style={styles.submitButtonText}>{t('common.submit')}</Text>
                                </TouchableOpacity>
                                {showRefereeButton && onOpenRefereeModule && (
                                    <TouchableOpacity style={styles.refereeButton} onPress={onOpenRefereeModule}>
                                        <Text style={styles.refereeButtonText}>{t('scoreInput.refereeModule')}</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.tieWarningText}>
                                {t('scoreInput.boutsCannotEndInTie')}
                            </Text>
                            <Text style={styles.tieScoreText}>
                                {t('scoreInput.finalScore')}: {scoreA} - {scoreB}
                            </Text>
                            
                            <TouchableOpacity
                                style={[
                                    styles.winnerSelectButton,
                                    selectedWinnerId === fencerAId && styles.winnerSelectButtonActive,
                                ]}
                                onPress={() => setSelectedWinnerId(fencerAId!)}
                            >
                                <Text style={styles.winnerSelectText}>{fencerAName}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.winnerSelectButton,
                                    selectedWinnerId === fencerBId && styles.winnerSelectButtonActive,
                                ]}
                                onPress={() => setSelectedWinnerId(fencerBId!)}
                            >
                                <Text style={styles.winnerSelectText}>{fencerBName}</Text>
                            </TouchableOpacity>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.submitButton} onPress={handleTieWinnerSubmit}>
                                    <Text style={styles.submitButtonText}>{t('common.submit')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.cancelButton} 
                                    onPress={() => setShowTieSelector(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{t('common.back')}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#001f3f',
    },
    boutInfo: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 6,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#001f3f',
    },
    boutInfoText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#001f3f',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    scoreFencerLabel: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#001f3f',
    },
    scoreInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 8,
        width: 80,
        textAlign: 'center',
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        gap: 8,
    },
    submitButton: {
        backgroundColor: '#001f3f',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        flex: 1,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    refereeButton: {
        backgroundColor: '#007acc',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        flex: 1,
    },
    refereeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    cancelButton: {
        backgroundColor: '#666',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        flex: 1,
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    tieWarningText: {
        fontSize: 14,
        color: '#d9534f',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '600',
    },
    tieScoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#001f3f',
    },
    winnerSelectButton: {
        backgroundColor: '#f0f0f0',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    winnerSelectButtonActive: {
        backgroundColor: '#001f3f',
        borderColor: '#001f3f',
    },
    winnerSelectText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        color: '#001f3f',
    },
});

export default ScoreInputModal;