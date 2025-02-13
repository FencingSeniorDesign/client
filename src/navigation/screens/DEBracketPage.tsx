// DEBracketPage.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList, DEBracketData, DEBracketMatch } from '../navigation/types';

type DEBracketRouteProp = RouteProp<RootStackParamList, 'DEBracketPage'>;

const DEBracketPage: React.FC = () => {
    const route = useRoute<DEBracketRouteProp>();
    const navigation = useNavigation();
    const { event, currentRoundIndex, bracketData } = route.params;
    const [currentRound, setCurrentRound] = useState(currentRoundIndex);
    const [bracket, setBracket] = useState(bracketData);
    const [expandedMatchKey, setExpandedMatchKey] = useState<string | null>(null);
    const [tempScoreA, setTempScoreA] = useState('0');
    const [tempScoreB, setTempScoreB] = useState('0');

    const updateMatchScores = (match: DEBracketMatch, scoreA: number, scoreB: number) => {
        if (scoreA === scoreB) {
            Alert.alert("Invalid Scores", "Scores cannot be tied in a DE bracket.");
            return;
        }
        setBracket(prev => ({
            rounds: prev.rounds.map(round => ({
                ...round,
                matches: round.matches.map(m => {
                    if (m.round === match.round && m.matchIndex === match.matchIndex) {
                        return {
                            ...m,
                            scoreA,
                            scoreB,
                            winner: scoreA > scoreB ? m.fencerA : m.fencerB,
                        };
                    }
                    return m;
                }),
            })),
        }));
        setExpandedMatchKey(null);
    };

    const toggleExpand = (match: DEBracketMatch) => {
        if (!match.fencerA || !match.fencerB) return;
        const key = `${match.round}-${match.matchIndex}`;
        if (expandedMatchKey === key) {
            setExpandedMatchKey(null);
        } else {
            setExpandedMatchKey(key);
            setTempScoreA(match.scoreA !== undefined ? String(match.scoreA) : '0');
            setTempScoreB(match.scoreB !== undefined ? String(match.scoreB) : '0');
        }
    };

    const handleEnterScores = (match: DEBracketMatch) => {
        const scoreA = parseInt(tempScoreA, 10) || 0;
        const scoreB = parseInt(tempScoreB, 10) || 0;
        updateMatchScores(match, scoreA, scoreB);
    };

    const handleRefModule = (match: DEBracketMatch) => {
        navigation.navigate('RefereeModule', {
            round: match.round,
            matchIndex: match.matchIndex,
            fencer1Name: match.fencerA?.firstName || 'Fencer 1',
            fencer2Name: match.fencerB?.firstName || 'Fencer 2',
            currentScore1: match.scoreA || 0,
            currentScore2: match.scoreB || 0,
            onSaveScores: (score1: number, score2: number) => {
                setBracket(prev => ({
                    rounds: prev.rounds.map(round => ({
                        ...round,
                        matches: round.matches.map(m => {
                            if (m.round === match.round && m.matchIndex === match.matchIndex) {
                                return {
                                    ...m,
                                    scoreA: score1,
                                    scoreB: score2,
                                    winner: score1 > score2 ? m.fencerA : m.fencerB,
                                };
                            }
                            return m;
                        }),
                    })),
                }));
            },
        });
        setExpandedMatchKey(null);
    };

    const isCurrentRoundComplete = (): boolean => {
        const currentRoundMatches = bracket.rounds.find(r => r.round === currentRound)?.matches;
        return currentRoundMatches?.every(m => m.winner || (!m.fencerA && !m.fencerB)) || false;
    };

    const goToNextRound = () => {
        if (isCurrentRoundComplete()) {
            setCurrentRound(prev => prev + 1);
        } else {
            Alert.alert("Incomplete Round", "Please complete all matches in the current round first.");
        }
    };

    const currentRoundMatches = bracket.rounds.find(r => r.round === currentRound)?.matches || [];

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>DE Bracket</Text>
            <TouchableOpacity
                style={styles.viewBracketButton}
                onPress={() => navigation.navigate('BracketViewPage', { bracketData: bracket, event })}
            >
                <Text style={styles.viewBracketButtonText}>View Full Bracket</Text>
            </TouchableOpacity>

            {/* Display matches for the current round */}
            <Text style={styles.roundTitle}>Round {currentRound}</Text>
            {currentRoundMatches.map(match => {
                const key = `${match.round}-${match.matchIndex}`;
                const isMatchExpanded = expandedMatchKey === key;
                const winner = match.winner;
                return (
                    <TouchableOpacity
                        key={key}
                        style={styles.matchContainer}
                        onPress={() => toggleExpand(match)}
                    >
                        <View style={styles.fencerBox}>
                            <Text
                                style={[
                                    styles.fencerText,
                                    winner && winner.id === match.fencerA?.id && styles.winnerText,
                                    winner && winner.id !== match.fencerA?.id && styles.loserText,
                                ]}
                            >
                                {match.fencerA ? match.fencerA.firstName : 'BYE'}
                            </Text>
                        </View>
                        <Text style={styles.vsText}>vs</Text>
                        <View style={styles.fencerBox}>
                            <Text
                                style={[
                                    styles.fencerText,
                                    winner && winner.id === match.fencerB?.id && styles.winnerText,
                                    winner && winner.id !== match.fencerB?.id && styles.loserText,
                                ]}
                            >
                                {match.fencerB ? match.fencerB.firstName : 'BYE'}
                            </Text>
                        </View>
                        {isMatchExpanded && (
                            <View style={styles.scoreEntryContainer}>
                                <Text style={styles.scoreEntryTitle}>Enter Scores</Text>
                                <View style={styles.scoreRow}>
                                    <Text style={styles.scoreFencerLabel}>{match.fencerA ? match.fencerA.firstName : 'BYE'}:</Text>
                                    <TextInput
                                        style={styles.scoreInput}
                                        value={tempScoreA}
                                        onChangeText={setTempScoreA}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.scoreRow}>
                                    <Text style={styles.scoreFencerLabel}>{match.fencerB ? match.fencerB.firstName : 'BYE'}:</Text>
                                    <TextInput
                                        style={styles.scoreInput}
                                        value={tempScoreB}
                                        onChangeText={setTempScoreB}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.scoreButtonsRow}>
                                    <TouchableOpacity
                                        style={styles.enterButton}
                                        onPress={() => handleEnterScores(match)}
                                    >
                                        <Text style={styles.enterButtonText}>Enter</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.refModuleButton}
                                        onPress={() => handleRefModule(match)}
                                    >
                                        <Text style={styles.refModuleButtonText}>Ref Module</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}

            {/* Show "Go to Next Round" button if the current round is complete */}
            {isCurrentRoundComplete() && currentRound < bracket.rounds.length && (
                <TouchableOpacity style={styles.nextButton} onPress={goToNextRound}>
                    <Text style={styles.nextButtonText}>Go to Next Round</Text>
                </TouchableOpacity>
            )}

            {/* Show "Tournament Over" message if all rounds are complete */}
            {isCurrentRoundComplete() && currentRound >= bracket.rounds.length && (
                <Text style={styles.tournamentOverText}>Tournament Over! We have a champion!</Text>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    viewBracketButton: {
        backgroundColor: '#000080',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignSelf: 'center',
        marginBottom: 16,
    },
    viewBracketButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    roundTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    matchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#d3d3d3',
        borderRadius: 8,
        marginBottom: 12,
    },
    fencerBox: {
        flex: 1,
        padding: 8,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#888',
    },
    fencerText: {
        fontSize: 16,
    },
    vsText: {
        marginHorizontal: 8,
        fontSize: 16,
        fontWeight: 'bold',
    },
    scoreEntryContainer: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 6,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    scoreEntryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    scoreFencerLabel: {
        fontSize: 16,
        marginRight: 8,
    },
    scoreInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        width: 60,
        padding: 6,
        textAlign: 'center',
        fontSize: 16,
    },
    scoreButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    enterButton: {
        backgroundColor: '#000080',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        flex: 1,
        marginRight: 4,
    },
    enterButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    refModuleButton: {
        backgroundColor: 'green', // Changed to green
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        alignItems: 'center',
        flex: 1,
        marginLeft: 4,
    },
    refModuleButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    nextButton: {
        backgroundColor: 'orange',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 20,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    tournamentOverText: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        color: 'green',
    },
    winnerText: {
        color: 'green',
    },
    loserText: {
        color: 'red',
    },
});

export default DEBracketPage;