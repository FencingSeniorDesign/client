// src/components/ui/AlterScoreModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

interface AlterScoreModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (scoreA: number, scoreB: number, winnerId?: number) => void;
    onResetBout?: () => void;
    onOpenRefereeModule?: () => void;
    fencerAName: string;
    fencerBName: string;
    fencerAId?: number;
    fencerBId?: number;
    initialScoreA?: number;
    initialScoreB?: number;
    title?: string;
    showResetButton?: boolean;
    showRefereeButton?: boolean;
}

interface TieResolutionModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (winnerId: number) => void;
    fencerAName: string;
    fencerBName: string;
    fencerAId: number;
    fencerBId: number;
    scoreA: number;
    scoreB: number;
}

const TieResolutionModal: React.FC<TieResolutionModalProps> = ({
    visible,
    onClose,
    onSubmit,
    fencerAName,
    fencerBName,
    fencerAId,
    fencerBId,
    scoreA,
    scoreB,
}) => {
    const { t } = useTranslation();
    const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(null);

    useEffect(() => {
        if (visible) {
            setSelectedWinnerId(null);
        }
    }, [visible]);

    const handleSubmit = () => {
        if (!selectedWinnerId) {
            Alert.alert(t('common.error'), t('boutOrderPage.selectWinnerForTiedBout'));
            return;
        }
        onSubmit(selectedWinnerId);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.alterModalContent}>
                    <Text style={styles.alterModalTitle}>{t('boutOrderPage.selectWinnerForTiedBout')}</Text>
                    <Text style={styles.tieWarningText}>{t('boutOrderPage.boutsCannotEndInTie')}</Text>
                    <Text style={styles.tieScoreText}>
                        {t('boutOrderPage.finalScore')}: {scoreA} - {scoreB}
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.winnerSelectButton,
                            selectedWinnerId === fencerAId && styles.winnerSelectButtonActive,
                        ]}
                        onPress={() => setSelectedWinnerId(fencerAId)}
                    >
                        <Text style={styles.winnerSelectText}>
                            {fencerAName}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.winnerSelectButton,
                            selectedWinnerId === fencerBId && styles.winnerSelectButtonActive,
                        ]}
                        onPress={() => setSelectedWinnerId(fencerBId)}
                    >
                        <Text style={styles.winnerSelectText}>
                            {fencerBName}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.scoreButtonsRow}>
                        <TouchableOpacity
                            style={[styles.enterButton, !selectedWinnerId && { opacity: 0.5 }]}
                            onPress={handleSubmit}
                            disabled={!selectedWinnerId}
                        >
                            <Text style={styles.enterButtonText}>{t('boutOrderPage.submit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.enterButton, { backgroundColor: '#666' }]}
                            onPress={onClose}
                        >
                            <Text style={styles.enterButtonText}>{t('boutOrderPage.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AlterScoreModal: React.FC<AlterScoreModalProps> = ({
    visible,
    onClose,
    onSubmit,
    onResetBout,
    onOpenRefereeModule,
    fencerAName,
    fencerBName,
    fencerAId,
    fencerBId,
    initialScoreA = 0,
    initialScoreB = 0,
    title,
    showResetButton = false,
    showRefereeButton = false,
}) => {
    const { t } = useTranslation();
    const [scoreA, setScoreA] = useState<string>(initialScoreA.toString());
    const [scoreB, setScoreB] = useState<string>(initialScoreB.toString());
    const [showTieModal, setShowTieModal] = useState<boolean>(false);
    const [tieScoreA, setTieScoreA] = useState<number>(0);
    const [tieScoreB, setTieScoreB] = useState<number>(0);

    useEffect(() => {
        if (visible) {
            setScoreA(initialScoreA.toString());
            setScoreB(initialScoreB.toString());
        }
    }, [visible, initialScoreA, initialScoreB]);

    const handleSubmit = () => {
        const scoreANum = parseInt(scoreA) || 0;
        const scoreBNum = parseInt(scoreB) || 0;

        // Check for tie
        if (scoreANum === scoreBNum && fencerAId && fencerBId) {
            // Show tie resolution modal
            setTieScoreA(scoreANum);
            setTieScoreB(scoreBNum);
            setShowTieModal(true);
            return;
        }

        // Determine winner based on scores
        let winnerId: number | undefined;
        if (scoreANum > scoreBNum && fencerAId) {
            winnerId = fencerAId;
        } else if (scoreBNum > scoreANum && fencerBId) {
            winnerId = fencerBId;
        }

        onSubmit(scoreANum, scoreBNum, winnerId);
    };

    const handleTieResolution = (winnerId: number) => {
        setShowTieModal(false);
        onSubmit(tieScoreA, tieScoreB, winnerId);
    };

    const handleTieModalClose = () => {
        setShowTieModal(false);
    };

    const navyBlue = '#001f3f';

    return (
        <>
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.alterModalContent}>
                        <Text style={styles.alterModalTitle}>
                            {title || t('boutOrderPage.alterBoutScore')}
                        </Text>
                        
                        <View style={styles.boutInfo}>
                            <Text style={styles.boutInfoText}>
                                {fencerAName} vs {fencerBName}
                            </Text>
                        </View>

                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>
                                {fencerAName}:
                            </Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={scoreA}
                                onChangeText={setScoreA}
                                selectTextOnFocus
                            />
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreFencerLabel}>
                                {fencerBName}:
                            </Text>
                            <TextInput
                                style={styles.scoreInput}
                                keyboardType="numeric"
                                value={scoreB}
                                onChangeText={setScoreB}
                                selectTextOnFocus
                            />
                        </View>
                        <View style={styles.scoreButtonsRow}>
                            <TouchableOpacity style={styles.enterButton} onPress={handleSubmit}>
                                <Text style={styles.enterButtonText}>{t('common.submit')}</Text>
                            </TouchableOpacity>
                            {showRefereeButton && onOpenRefereeModule && (
                                <TouchableOpacity style={styles.refereeButton} onPress={onOpenRefereeModule}>
                                    <Text style={styles.refereeButtonText}>{t('scoreInput.refereeModule')}</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.enterButton, { backgroundColor: '#666' }]}
                                onPress={onClose}
                            >
                                <Text style={styles.enterButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                        </View>
                        {showResetButton && onResetBout && (
                            <TouchableOpacity style={styles.resetBoutButton} onPress={onResetBout}>
                                <Text style={styles.resetBoutButtonText}>{t('boutOrderPage.resetBout')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Tie Resolution Modal */}
            {fencerAId && fencerBId && (
                <TieResolutionModal
                    visible={showTieModal}
                    onClose={handleTieModalClose}
                    onSubmit={handleTieResolution}
                    fencerAName={fencerAName}
                    fencerBName={fencerBName}
                    fencerAId={fencerAId}
                    fencerBId={fencerBId}
                    scoreA={tieScoreA}
                    scoreB={tieScoreB}
                />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alterModalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '90%',
        maxWidth: 400,
    },
    alterModalTitle: {
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
        marginRight: 8,
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
    scoreButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        gap: 8,
    },
    enterButton: {
        backgroundColor: '#001f3f',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    enterButtonText: {
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    refereeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    resetBoutButton: {
        backgroundColor: '#FF0000',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    resetBoutButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
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
        justifyContent: 'center',
        alignItems: 'center',
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

export default AlterScoreModal;