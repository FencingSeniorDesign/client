// src/navigation/screens/RelayTeamBoutPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Event } from '../navigation/types';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';
import { db } from '../../db/DrizzleClient';
import * as relayBoutUtils from '../../db/utils/teamBoutRelay';
import * as teamUtils from '../../db/utils/team';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

interface LegScoreInputProps {
    onSubmit: (scoreA: number, scoreB: number) => void;
    onCancel: () => void;
    initialScoreA: number;
    initialScoreB: number;
    fencerAName: string;
    fencerBName: string;
    currentTeamAScore: number;
    currentTeamBScore: number;
    legNumber: number;
}

const LegScoreInput: React.FC<LegScoreInputProps> = ({
    onSubmit,
    onCancel,
    initialScoreA,
    initialScoreB,
    fencerAName,
    fencerBName,
    currentTeamAScore,
    currentTeamBScore,
    legNumber,
}) => {
    const [scoreA, setScoreA] = useState<string>(initialScoreA.toString());
    const [scoreB, setScoreB] = useState<string>(initialScoreB.toString());
    const { t } = useTranslation();

    const handleSubmit = () => {
        const numericScoreA = parseInt(scoreA, 10) || 0;
        const numericScoreB = parseInt(scoreB, 10) || 0;

        // Validate individual scores are non-negative
        if (numericScoreA < 0 || numericScoreB < 0) {
            Alert.alert(t('common.error'), 'Scores cannot be negative');
            return;
        }

        // Calculate target score for this leg (5 touches per leg: 5, 10, 15, 20, 25, 30, 35, 40, 45)
        const legTargetScore = legNumber * 5;

        // Calculate what the new total scores would be
        const newTeamAScore = currentTeamAScore + numericScoreA;
        const newTeamBScore = currentTeamBScore + numericScoreB;

        // Validate that neither team would exceed the leg target
        if (newTeamAScore > legTargetScore) {
            const maxScoreA = legTargetScore - currentTeamAScore;
            Alert.alert(
                t('common.error'),
                `Team A score cannot exceed ${legTargetScore} for leg ${legNumber}. Maximum additional score: ${maxScoreA}`
            );
            return;
        }

        if (newTeamBScore > legTargetScore) {
            const maxScoreB = legTargetScore - currentTeamBScore;
            Alert.alert(
                t('common.error'),
                `Team B score cannot exceed ${legTargetScore} for leg ${legNumber}. Maximum additional score: ${maxScoreB}`
            );
            return;
        }

        onSubmit(numericScoreA, numericScoreB);
    };

    return (
        <View style={styles.legScoreInputContainer}>
            <Text style={styles.legScoreInputLabel}>Enter scores for this leg:</Text>

            <View style={styles.fencerScoreRow}>
                <View style={styles.fencerScoreSection}>
                    <Text style={styles.fencerScoreLabel}>{fencerAName}</Text>
                    <TextInput
                        style={styles.legScoreInput}
                        value={scoreA}
                        onChangeText={setScoreA}
                        keyboardType="numeric"
                        placeholder="0"
                        maxLength={2}
                        selectTextOnFocus
                    />
                </View>

                <Text style={styles.scoreSeparator}>-</Text>

                <View style={styles.fencerScoreSection}>
                    <Text style={styles.fencerScoreLabel}>{fencerBName}</Text>
                    <TextInput
                        style={styles.legScoreInput}
                        value={scoreB}
                        onChangeText={setScoreB}
                        keyboardType="numeric"
                        placeholder="0"
                        maxLength={2}
                        selectTextOnFocus
                    />
                </View>
            </View>

            <View style={styles.legScoreButtonsRow}>
                <TouchableOpacity style={styles.legScoreCancelButton} onPress={onCancel}>
                    <Text style={styles.legScoreCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.legScoreSubmitButton} onPress={handleSubmit}>
                    <Text style={styles.legScoreSubmitButtonText}>Submit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

type RelayTeamBoutPageRouteParams = {
    teamBoutId: number;
    event: Event;
    isRemote?: boolean;
};

interface RelayTeam {
    id: number;
    name: string;
    starters: {
        fencerid: number;
        fname: string;
        lname: string;
        nickname?: string;
        position: number;
        touchesScored: number;
    }[];
}

const RelayTeamBoutPage: React.FC = () => {
    const route = useRoute<RouteProp<{ params: RelayTeamBoutPageRouteParams }, 'params'>>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { t } = useTranslation();

    const { teamBoutId, event, isRemote = false } = route.params;
    const [boutStatus, setBoutStatus] = useState<relayBoutUtils.RelayBoutStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [teamA, setTeamA] = useState<RelayTeam | null>(null);
    const [teamB, setTeamB] = useState<RelayTeam | null>(null);

    // Modal state
    const [legScoreModalVisible, setLegScoreModalVisible] = useState(false);
    const [showRostersModal, setShowRostersModal] = useState(false);
    const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
    const [showLegHistoryModal, setShowLegHistoryModal] = useState(false);
    const [substitutionTeamId, setSubstitutionTeamId] = useState<number | null>(null);
    const [selectedLegIndex, setSelectedLegIndex] = useState<number | null>(null);
    const [legHistory, setLegHistory] = useState<relayBoutUtils.RelayLegHistoryEntry[]>([]);

    // Local score state for immediate UI updates
    const [localScoreA, setLocalScoreA] = useState(0);
    const [localScoreB, setLocalScoreB] = useState(0);

    const loadBoutStatus = useCallback(async () => {
        try {
            setLoading(true);
            const client = db;
            const status = await relayBoutUtils.getRelayBoutStatus(client, teamBoutId);

            if (status) {
                setBoutStatus(status);
                setLocalScoreA(status.teamAScore);
                setLocalScoreB(status.teamBScore);

                // Get team information
                const teamBout = await client
                    .select()
                    .from(schema.teamBouts)
                    .where(eq(schema.teamBouts.id, teamBoutId))
                    .limit(1);

                // Load leg history
                const history = await relayBoutUtils.getRelayLegHistory(client, teamBoutId);
                setLegHistory(history);

                if (teamBout[0]) {
                    if (teamBout[0].team_a_id) {
                        const team = await teamUtils.getTeam(client, teamBout[0].team_a_id);
                        const starters = await teamUtils.getTeamStarters(client, teamBout[0].team_a_id);
                        if (team) {
                            setTeamA({
                                id: team.id,
                                name: team.name,
                                starters: starters.map(s => ({ ...s, touchesScored: 0 })), // TODO: Calculate actual touches
                            });
                        }
                    }
                    if (teamBout[0].team_b_id) {
                        const team = await teamUtils.getTeam(client, teamBout[0].team_b_id);
                        const starters = await teamUtils.getTeamStarters(client, teamBout[0].team_b_id);
                        if (team) {
                            setTeamB({
                                id: team.id,
                                name: team.name,
                                starters: starters.map(s => ({ ...s, touchesScored: 0 })), // TODO: Calculate actual touches
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading bout status:', error);
            Alert.alert(t('common.error'), 'Error loading relay bout status');
        } finally {
            setLoading(false);
        }
    }, [teamBoutId, t]);

    useEffect(() => {
        loadBoutStatus();
    }, [loadBoutStatus]);

    const handleSubstitution = async (teamId: number, newFencerId: number) => {
        try {
            await relayBoutUtils.forceRelayRotation(db, teamBoutId, teamId, newFencerId);
            await loadBoutStatus();
            setShowSubstitutionModal(false);
        } catch (error) {
            console.error('Error with substitution:', error);
            Alert.alert(t('common.error'), 'Error with substitution');
        }
    };

    const getTouchesUntilRotation = (): number => {
        return relayBoutUtils.getTouchesUntilRotation(localScoreA, localScoreB);
    };

    const getRotationTouchesInLeg = (): number => {
        if (!boutStatus) return 0;
        return relayBoutUtils.getRotationTouches(localScoreA, localScoreB, boutStatus.lastRotationCombinedScore);
    };

    const getLegHistory = () => {
        if (!boutStatus) return [];

        const legs = legHistory.map(leg => ({
            legNumber: leg.legNumber,
            combinedScore: leg.scoreA + leg.scoreB,
            isComplete: true,
            canEdit: true,
            id: leg.id,
            fencerAName: leg.fencerAName,
            fencerBName: leg.fencerBName,
            scoreA: leg.scoreA,
            scoreB: leg.scoreB,
        }));

        // Add current leg if bout is not complete and there's potential for more legs
        if (!boutStatus.isComplete) {
            const nextLegNumber = legs.length + 1;
            legs.push({
                legNumber: nextLegNumber,
                combinedScore: 0,
                isComplete: false,
                canEdit: true,
                id: -1, // Placeholder ID for new leg
                fencerAName: boutStatus.currentFencerAName,
                fencerBName: boutStatus.currentFencerBName,
                scoreA: 0,
                scoreB: 0,
            });
        }

        return legs;
    };

    const handleLegScoreSubmit = async (scoreA: number, scoreB: number) => {
        if (!boutStatus) return;

        try {
            if (selectedLegIndex === null) {
                // Adding a new leg
                await relayBoutUtils.addRelayLegScore(db, teamBoutId, scoreA, scoreB);
            } else {
                // Check if this is editing an existing completed leg or adding a new leg
                const legs = getLegHistory();
                const selectedLeg = legs[selectedLegIndex];

                if (!selectedLeg) {
                    Alert.alert(t('common.error'), 'Selected leg not found');
                    return;
                }

                if (selectedLeg.isComplete && selectedLeg.id !== -1) {
                    // Update the historical leg
                    await relayBoutUtils.updateRelayLegHistory(db, selectedLeg.id, scoreA, scoreB);

                    // Recalculate all scores from history
                    await relayBoutUtils.recalculateRelayBoutFromHistory(db, teamBoutId);
                } else {
                    // Adding a new leg (current leg)
                    await relayBoutUtils.addRelayLegScore(db, teamBoutId, scoreA, scoreB);
                }
            }

            await loadBoutStatus();
            setLegScoreModalVisible(false);
            setSelectedLegIndex(null);
        } catch (error) {
            console.error('Error updating leg score:', error);
            Alert.alert(t('common.error'), 'Error updating leg score');
        }
    };

    const openRefereeModule = () => {
        if (!boutStatus || !teamA || !teamB) return;

        // Open referee module for current leg
        const legHistory = getLegHistory();
        const currentLegIndex = legHistory.length - 1;

        navigation.navigate('RefereeModule', {
            boutIndex: currentLegIndex,
            fencer1Name: boutStatus.currentFencerAName,
            fencer2Name: boutStatus.currentFencerBName,
            currentScore1: 0, // Leg starts at 0-0
            currentScore2: 0, // Leg starts at 0-0
            weapon: event.weapon || 'epee', // Default to epee if not specified
            isRemote,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    // In relay bouts, each leg can have max 5 combined touches
                    const combinedLegScore = score1 + score2;

                    // Validate the leg score
                    if (combinedLegScore > 5) {
                        Alert.alert(t('common.error'), 'Invalid leg score. Maximum 5 combined touches per leg.');
                        return;
                    }

                    // Add this leg score to history and update bout totals
                    await relayBoutUtils.addRelayLegScore(db, teamBoutId, score1, score2);
                    await loadBoutStatus();
                } catch (error) {
                    console.error('Error saving scores from referee module:', error);
                    Alert.alert(t('common.error'), 'Error saving scores from referee module');
                }
            },
        });
    };

    const openRefereeModuleForLeg = (
        legIndex: number,
        leg: { legNumber: number; combinedScore: number; isComplete: boolean; canEdit: boolean }
    ) => {
        if (!boutStatus || !teamA || !teamB) return;

        const legs = getLegHistory();
        const selectedLeg = legs[legIndex];

        if (!selectedLeg) {
            Alert.alert(t('common.error'), 'Selected leg not found');
            return;
        }

        // Navigate to referee module for this leg
        navigation.navigate('RefereeModule', {
            boutIndex: selectedLeg.legNumber,
            fencer1Name: selectedLeg.fencerAName,
            fencer2Name: selectedLeg.fencerBName,
            currentScore1: selectedLeg.scoreA,
            currentScore2: selectedLeg.scoreB,
            weapon: event.weapon || 'epee',
            isRemote,
            onSaveScores: async (score1: number, score2: number) => {
                try {
                    const combinedLegScore = score1 + score2;
                    if (combinedLegScore > 5) {
                        Alert.alert(t('common.error'), 'Invalid leg score. Maximum 5 combined touches per leg.');
                        return;
                    }

                    if (selectedLeg.isComplete) {
                        // Update historical leg
                        await relayBoutUtils.updateRelayLegHistory(db, selectedLeg.id, score1, score2);
                        await relayBoutUtils.recalculateRelayBoutFromHistory(db, teamBoutId);
                    } else {
                        // Add new leg
                        await relayBoutUtils.addRelayLegScore(db, teamBoutId, score1, score2);
                    }

                    await loadBoutStatus();
                } catch (error) {
                    console.error('Error saving leg score from referee module:', error);
                    Alert.alert(t('common.error'), 'Error saving leg score from referee module');
                }
            },
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#001f3f" />
                <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
        );
    }

    if (!boutStatus || !teamA || !teamB) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Error loading bout data</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadBoutStatus}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const progress = Math.max(localScoreA, localScoreB) / 45;

    return (
        <View style={styles.container}>
            <BLEStatusBar />

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Header Section - Team Scores */}
                <View style={styles.headerSection}>
                    <View style={styles.teamScoreHeader}>
                        <View style={[styles.teamScoreCard, styles.teamACard]}>
                            <Text style={styles.teamName}>{teamA.name}</Text>
                            <Text style={styles.scoreText}>{localScoreA}</Text>
                            <Text style={styles.scoreSubtext}>/ 45</Text>
                            {boutStatus.winnerId === teamA.id && <Text style={styles.winnerBadge}>WINNER</Text>}
                        </View>

                        <View style={styles.vsSection}>
                            <Text style={styles.vsText}>VS</Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                            </View>
                        </View>

                        <View style={[styles.teamScoreCard, styles.teamBCard]}>
                            <Text style={styles.teamName}>{teamB.name}</Text>
                            <Text style={styles.scoreText}>{localScoreB}</Text>
                            <Text style={styles.scoreSubtext}>/ 45</Text>
                            {boutStatus.winnerId === teamB.id && <Text style={styles.winnerBadge}>WINNER</Text>}
                        </View>
                    </View>
                </View>

                {/* Current Bout Display */}
                <View style={styles.currentBoutSection}>
                    <View style={styles.activeFencersCard}>
                        <View style={styles.fencerDisplay}>
                            <View style={[styles.fencerCard, styles.teamAFencer]}>
                                <Text style={styles.fencerName}>{boutStatus.currentFencerAName}</Text>
                                <Text style={styles.fencerTeam}>{teamA.name}</Text>
                            </View>

                            <View style={[styles.fencerCard, styles.teamBFencer]}>
                                <Text style={styles.fencerName}>{boutStatus.currentFencerBName}</Text>
                                <Text style={styles.fencerTeam}>{teamB.name}</Text>
                            </View>
                        </View>

                        <View style={styles.legControlRow}>
                            <TouchableOpacity
                                style={styles.legScoreButton}
                                onPress={() => {
                                    const legHistory = getLegHistory();
                                    setSelectedLegIndex(legHistory.length - 1); // Current leg
                                    setLegScoreModalVisible(true);
                                }}
                            >
                                <Text style={styles.legScoreButtonText}>Enter Fencer Scores</Text>
                                <Text style={styles.legScoreButtonSubtext}>Manual Input</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.refereeModuleButton}
                                onPress={openRefereeModule}
                                disabled={boutStatus.isComplete}
                            >
                                <Text style={styles.refereeModuleText}>Referee Module</Text>
                                <Text style={styles.refereeModuleSubtext}>Current Leg</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Score Control Panel */}
                {!boutStatus.isComplete && (
                    <View style={styles.scoreControlSection}>
                        <Text style={styles.sectionTitle}>Leg Control</Text>

                        <View style={styles.controlActionsRow}>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => setShowLegHistoryModal(true)}
                            >
                                <Text style={styles.secondaryButtonText}>Leg History</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowRostersModal(true)}>
                                <Text style={styles.secondaryButtonText}>View Rosters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Bout Management Actions */}
                <View style={styles.managementSection}>
                    <Text style={styles.sectionTitle}>Bout Management</Text>

                    <View style={styles.managementActionsRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                setSubstitutionTeamId(teamA.id);
                                setShowSubstitutionModal(true);
                            }}
                        >
                            <Text style={styles.actionButtonText}>Sub {teamA.name}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                setSubstitutionTeamId(teamB.id);
                                setShowSubstitutionModal(true);
                            }}
                        >
                            <Text style={styles.actionButtonText}>Sub {teamB.name}</Text>
                        </TouchableOpacity>
                    </View>

                    {boutStatus.isComplete && (
                        <View style={styles.completedSection}>
                            <Text style={styles.completedText}>Bout Complete</Text>
                            <Text style={styles.finalScoreText}>
                                Final Score: {boutStatus.teamAScore} - {boutStatus.teamBScore}
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Leg Score Input Modal */}
            <Modal
                visible={legScoreModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setLegScoreModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter Leg Score</Text>
                        <Text style={styles.modalSubtitle}>
                            {selectedLegIndex !== null && getLegHistory()[selectedLegIndex]
                                ? `Leg ${getLegHistory()[selectedLegIndex].legNumber} - Individual fencer scores`
                                : 'Current Leg - Individual fencer scores'}
                        </Text>

                        <LegScoreInput
                            onSubmit={handleLegScoreSubmit}
                            onCancel={() => {
                                setLegScoreModalVisible(false);
                                setSelectedLegIndex(null);
                            }}
                            initialScoreA={
                                selectedLegIndex !== null && getLegHistory()[selectedLegIndex]
                                    ? getLegHistory()[selectedLegIndex].scoreA
                                    : 0
                            }
                            initialScoreB={
                                selectedLegIndex !== null && getLegHistory()[selectedLegIndex]
                                    ? getLegHistory()[selectedLegIndex].scoreB
                                    : 0
                            }
                            fencerAName={
                                selectedLegIndex !== null && getLegHistory()[selectedLegIndex]
                                    ? getLegHistory()[selectedLegIndex].fencerAName
                                    : boutStatus.currentFencerAName
                            }
                            fencerBName={
                                selectedLegIndex !== null && getLegHistory()[selectedLegIndex]
                                    ? getLegHistory()[selectedLegIndex].fencerBName
                                    : boutStatus.currentFencerBName
                            }
                            currentTeamAScore={localScoreA}
                            currentTeamBScore={localScoreB}
                            legNumber={
                                selectedLegIndex !== null && getLegHistory()[selectedLegIndex]
                                    ? getLegHistory()[selectedLegIndex].legNumber
                                    : legHistory.length + 1
                            }
                        />
                    </View>
                </View>
            </Modal>

            {/* Team Rosters Modal */}
            <Modal
                visible={showRostersModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRostersModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Team Rosters</Text>

                        <View style={styles.rostersContainer}>
                            <View style={styles.rosterSection}>
                                <Text style={styles.rosterTeamTitle}>{teamA.name}</Text>
                                {teamA.starters.map((fencer, index) => (
                                    <View
                                        key={fencer.fencerid}
                                        style={[
                                            styles.rosterFencerRow,
                                            fencer.fencerid === boutStatus.currentFencerAId && styles.currentFencerRow,
                                        ]}
                                    >
                                        <Text style={styles.rosterFencerName}>
                                            {index + 1}. {fencer.fname} {fencer.lname}
                                        </Text>
                                        <Text style={styles.rosterFencerTouches}>{fencer.touchesScored} touches</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.rosterSection}>
                                <Text style={styles.rosterTeamTitle}>{teamB.name}</Text>
                                {teamB.starters.map((fencer, index) => (
                                    <View
                                        key={fencer.fencerid}
                                        style={[
                                            styles.rosterFencerRow,
                                            fencer.fencerid === boutStatus.currentFencerBId && styles.currentFencerRow,
                                        ]}
                                    >
                                        <Text style={styles.rosterFencerName}>
                                            {index + 1}. {fencer.fname} {fencer.lname}
                                        </Text>
                                        <Text style={styles.rosterFencerTouches}>{fencer.touchesScored} touches</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowRostersModal(false)}>
                            <Text style={styles.modalCloseButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Substitution Modal */}
            <Modal
                visible={showSubstitutionModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSubstitutionModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Substitute</Text>

                        {substitutionTeamId && (
                            <View style={styles.substitutionContainer}>
                                {(substitutionTeamId === teamA.id ? teamA.starters : teamB.starters).map(fencer => (
                                    <TouchableOpacity
                                        key={fencer.fencerid}
                                        style={styles.substitutionOption}
                                        onPress={() => handleSubstitution(substitutionTeamId, fencer.fencerid)}
                                    >
                                        <Text style={styles.substitutionOptionText}>
                                            {fencer.fname} {fencer.lname}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowSubstitutionModal(false)}
                        >
                            <Text style={styles.modalCloseButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Leg History Modal */}
            <Modal
                visible={showLegHistoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowLegHistoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Leg History</Text>

                        <ScrollView style={styles.legHistoryContainer}>
                            {getLegHistory().map((leg, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.legHistoryItem, !leg.isComplete && styles.currentLegItem]}
                                    onPress={() => {
                                        setSelectedLegIndex(index);
                                        setShowLegHistoryModal(false);
                                        if (leg.isComplete) {
                                            // For completed legs, offer options: manual edit or referee module
                                            Alert.alert(
                                                'Edit Leg',
                                                `How would you like to edit Leg ${leg.legNumber}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: 'Manual Entry',
                                                        onPress: () => setLegScoreModalVisible(true),
                                                    },
                                                    {
                                                        text: 'Referee Module',
                                                        onPress: () => openRefereeModuleForLeg(index, leg),
                                                    },
                                                ]
                                            );
                                        } else {
                                            // For current leg, use manual entry
                                            setLegScoreModalVisible(true);
                                        }
                                    }}
                                    disabled={!leg.canEdit}
                                >
                                    <View style={styles.legHistoryInfo}>
                                        <Text style={styles.legHistoryNumber}>Leg {leg.legNumber}</Text>
                                        <Text style={styles.legHistoryScore}>
                                            {leg.isComplete
                                                ? `${leg.scoreA}-${leg.scoreB} (${leg.combinedScore} total)`
                                                : 'Current leg'}
                                        </Text>
                                        {leg.isComplete && (
                                            <Text style={styles.legHistoryFencers}>
                                                {leg.fencerAName} vs {leg.fencerBName}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.legHistoryStatus}>
                                        {leg.isComplete ? (
                                            <Text style={styles.legCompleteText}>Complete</Text>
                                        ) : (
                                            <Text style={styles.legInProgressText}>In Progress</Text>
                                        )}
                                        {leg.canEdit && (
                                            <Text style={styles.legEditableText}>
                                                {leg.isComplete ? 'Tap for edit options' : 'Tap to edit'}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowLegHistoryModal(false)}>
                            <Text style={styles.modalCloseButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorText: {
        fontSize: 18,
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#001f3f',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    scrollContainer: {
        flex: 1,
    },

    // Header Section
    headerSection: {
        backgroundColor: '#fff',
        paddingVertical: 20,
        paddingHorizontal: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    teamScoreHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    teamScoreCard: {
        flex: 1,
        alignItems: 'center',
        padding: 15,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    teamACard: {
        backgroundColor: '#e6f3ff',
        borderColor: '#007AFF',
        borderWidth: 2,
    },
    teamBCard: {
        backgroundColor: '#fff0e6',
        borderColor: '#FF8C00',
        borderWidth: 2,
    },
    teamName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#001f3f',
        marginBottom: 5,
        textAlign: 'center',
    },
    scoreText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    scoreSubtext: {
        fontSize: 16,
        color: '#666',
        marginTop: -5,
    },
    winnerBadge: {
        backgroundColor: '#28a745',
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 5,
    },
    vsSection: {
        alignItems: 'center',
        marginHorizontal: 10,
    },
    vsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
        marginBottom: 5,
    },
    progressBarContainer: {
        width: 60,
        height: 6,
        backgroundColor: '#e0e0e0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#28a745',
        borderRadius: 3,
    },

    // Current Bout Section
    currentBoutSection: {
        padding: 15,
    },
    activeFencersCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    fencerDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    fencerCard: {
        flex: 1,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    teamAFencer: {
        backgroundColor: '#e6f3ff',
        marginRight: 10,
    },
    teamBFencer: {
        backgroundColor: '#fff0e6',
        marginLeft: 10,
    },
    fencerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#001f3f',
        textAlign: 'center',
    },
    fencerTeam: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    legTouches: {
        fontSize: 11,
        color: '#007AFF',
        marginTop: 4,
        fontWeight: '500',
    },
    centerInfo: {
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    currentLegScore: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    legLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    combinedScore: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
        marginTop: 4,
    },
    rotationInfo: {
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingTop: 10,
    },
    rotationIndicator: {
        alignItems: 'center',
    },
    rotationText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    rotationWarning: {
        fontSize: 12,
        color: '#FF8C00',
        fontWeight: 'bold',
        marginTop: 3,
    },

    // Score Control Section
    scoreControlSection: {
        backgroundColor: '#fff',
        margin: 15,
        borderRadius: 8,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001f3f',
        marginBottom: 15,
        textAlign: 'center',
    },
    legControlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    legScoreButton: {
        flex: 1,
        paddingVertical: 20,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 10,
    },
    legScoreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    legScoreButtonSubtext: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
        marginTop: 2,
    },
    refereeModuleButton: {
        flex: 1,
        paddingVertical: 20,
        backgroundColor: '#28a745',
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 10,
    },
    refereeModuleText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    refereeModuleSubtext: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
        marginTop: 2,
    },
    controlActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    secondaryButton: {
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Management Section
    managementSection: {
        backgroundColor: '#fff',
        margin: 15,
        marginTop: 0,
        borderRadius: 8,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    managementActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionButton: {
        backgroundColor: '#17a2b8',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        flex: 1,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    completedSection: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#d4edda',
        borderRadius: 6,
        alignItems: 'center',
    },
    completedText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#28a745',
    },
    finalScoreText: {
        fontSize: 16,
        color: '#155724',
        marginTop: 5,
    },

    // Modal Styles
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
        maxWidth: 500,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001f3f',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 15,
    },

    // Leg Score Input Styles
    legScoreInputContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    legScoreInputLabel: {
        fontSize: 16,
        color: '#001f3f',
        marginBottom: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    fencerScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    fencerScoreSection: {
        alignItems: 'center',
        marginHorizontal: 15,
    },
    fencerScoreLabel: {
        fontSize: 14,
        color: '#001f3f',
        marginBottom: 8,
        fontWeight: '600',
        textAlign: 'center',
    },
    legScoreInput: {
        borderWidth: 2,
        borderColor: '#007AFF',
        borderRadius: 8,
        width: 60,
        height: 60,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#001f3f',
    },
    scoreSeparator: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#001f3f',
        marginHorizontal: 10,
    },
    combinedScoreText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
        textAlign: 'center',
    },
    legScoreButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    legScoreCancelButton: {
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 6,
    },
    legScoreCancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    legScoreSubmitButton: {
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 6,
    },
    legScoreSubmitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Leg History Styles
    legHistoryContainer: {
        maxHeight: 400,
        marginBottom: 20,
    },
    legHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    currentLegItem: {
        backgroundColor: '#e6f3ff',
        borderColor: '#007AFF',
        borderWidth: 2,
    },
    legHistoryInfo: {
        flex: 1,
    },
    legHistoryNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#001f3f',
    },
    legHistoryScore: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    legHistoryFencers: {
        fontSize: 12,
        color: '#007AFF',
        marginTop: 2,
        fontStyle: 'italic',
    },
    legHistoryStatus: {
        alignItems: 'flex-end',
    },
    legCompleteText: {
        fontSize: 12,
        color: '#28a745',
        fontWeight: '600',
    },
    legInProgressText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600',
    },
    legEditableText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
        fontStyle: 'italic',
    },
    rostersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rosterSection: {
        flex: 1,
        marginHorizontal: 10,
    },
    rosterTeamTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#001f3f',
        marginBottom: 10,
        textAlign: 'center',
    },
    rosterFencerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
        marginBottom: 5,
    },
    currentFencerRow: {
        backgroundColor: '#e6f3ff',
        borderColor: '#007AFF',
        borderWidth: 1,
    },
    rosterFencerName: {
        fontSize: 14,
        color: '#001f3f',
        flex: 1,
    },
    rosterFencerTouches: {
        fontSize: 12,
        color: '#666',
    },
    substitutionContainer: {
        marginBottom: 20,
    },
    substitutionOption: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 6,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    substitutionOptionText: {
        fontSize: 16,
        color: '#001f3f',
        textAlign: 'center',
    },
    modalCloseButton: {
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 10,
    },
    modalCloseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default RelayTeamBoutPage;
