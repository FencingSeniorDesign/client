// DEBracketPage.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { DEBracketData, DEBracketMatch, buildDEBracket } from '../utils/RoundAlgorithms';

type DEBracketRouteProp = RouteProp<RootStackParamList, 'DEBracketPage'>;

const DEBracketPage: React.FC = () => {
    const route = useRoute<DEBracketRouteProp>();
    const navigation = useNavigation();
    const { event, currentRoundIndex, bracketData } = route.params as {
        event: any;
        currentRoundIndex: number;
        bracketData: DEBracketData;
    };

    const [bracket, setBracket] = useState<DEBracketData>(bracketData);

    // Example: once all matches in a round are completed,
    // generate the next round by pairing winners.
    const handleGoToNextRound = () => {
        // 1) check if the current round's matches have winners
        const currentRound = bracket.matches.filter((m: { round: number; }) => m.round === getCurrentRoundNumber());
        const allComplete = currentRound.every(m => m.winner);
        if (!allComplete) {
            Alert.alert("Round not complete", "Please complete all matches first.");
            return;
        }

        // 2) gather winners
        const winners = currentRound.map(m => m.winner!);

        // If there's only one winner, that's the champion
        if (winners.length <= 1) {
            Alert.alert("Tournament Over", "We have a champion!");
            return;
        }

        // 3) Build next round matches
        const nextRoundNum = getCurrentRoundNumber() + 1;
        const nextMatches: DEBracketMatch[] = [];
        for (let i = 0; i < winners.length; i += 2) {
            const fA = winners[i] || null;
            const fB = winners[i + 1] || null;
            nextMatches.push({
                fencerA: fA,
                fencerB: fB,
                round: nextRoundNum,
                matchIndex: i / 2,
            });
        }

        // 4) append them to the bracket
        setBracket((prev) => ({
            ...prev,
            matches: [...prev.matches, ...nextMatches],
        }));
    };

    // figure out the highest round # we have so far
    function getCurrentRoundNumber(): number {
        let max = 1;
        bracket.matches.forEach(m => {
            if (m.round > max) max = m.round;
        });
        return max;
    }

    // user taps a match => set winner, etc.
    const handleMatchPress = (match: DEBracketMatch, winner: 'A' | 'B') => {
        setBracket((prev) => {
            const copy = { ...prev, matches: [...prev.matches] };
            const idx = copy.matches.findIndex(
                m => m.round === match.round && m.matchIndex === match.matchIndex
            );
            if (idx !== -1) {
                const updated = { ...copy.matches[idx] };
                updated.winner = winner === 'A' ? updated.fencerA! : updated.fencerB!;
                updated.scoreA = winner === 'A' ? 15 : 10; // example
                updated.scoreB = winner === 'B' ? 15 : 10;
                copy.matches[idx] = updated;
            }
            return copy;
        });
    };

    // Group matches by round
    const rounds = [];
    for (let r = 1; r <= bracket.roundCount; r++) {
        const roundMatches = bracket.matches.filter(m => m.round === r);
        if (roundMatches.length) {
            rounds.push({ round: r, matches: roundMatches });
        }
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>DE Bracket</Text>

            {rounds.map((rnd) => (
                <View key={rnd.round} style={styles.roundBlock}>
                    <Text style={styles.roundTitle}>Round {rnd.round}</Text>
                    {rnd.matches.map((match) => (
                        <View key={match.matchIndex} style={styles.matchContainer}>
                            <View style={styles.fencerBox}>
                                <Text style={styles.fencerText}>
                                    {match.fencerA?.firstName || 'BYE'}
                                </Text>
                                {match.winner === match.fencerA && <Text>Winner</Text>}
                            </View>
                            <Text style={{ marginHorizontal: 8 }}>vs</Text>
                            <View style={styles.fencerBox}>
                                <Text style={styles.fencerText}>
                                    {match.fencerB?.firstName || 'BYE'}
                                </Text>
                                {match.winner === match.fencerB && <Text>Winner</Text>}
                            </View>
                            {/* Quick Winner Buttons */}
                            {(!match.winner && match.fencerA && match.fencerB) && (
                                <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                                    <TouchableOpacity
                                        style={styles.winButton}
                                        onPress={() => handleMatchPress(match, 'A')}
                                    >
                                        <Text style={styles.winButtonText}>A Wins</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.winButton}
                                        onPress={() => handleMatchPress(match, 'B')}
                                    >
                                        <Text style={styles.winButtonText}>B Wins</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            ))}

            <TouchableOpacity style={styles.nextButton} onPress={handleGoToNextRound}>
                <Text style={styles.nextButtonText}>Go to Next Round</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default DEBracketPage;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    roundBlock: {
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 8,
    },
    roundTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    matchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    fencerBox: {
        borderWidth: 1,
        borderColor: '#888',
        borderRadius: 4,
        padding: 8,
        flex: 1,
        alignItems: 'center',
    },
    fencerText: {
        fontSize: 16,
    },
    winButton: {
        backgroundColor: '#006400',
        marginHorizontal: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
    },
    winButtonText: {
        color: '#fff',
        fontWeight: '600',
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
});
