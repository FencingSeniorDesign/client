// src/navigation/screens/BracketViewPage.tsx

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { DEBracketData, DEBracketMatch } from '../utils/RoundAlgorithms';

type BracketViewPageRouteProp = RouteProp<RootStackParamList, 'BracketViewPage'>;

const BracketViewPage: React.FC = () => {
    // Expect bracketData of type DEBracketData and event from route params.
    const route = useRoute<BracketViewPageRouteProp>();
    const { bracketData, event } = route.params as { bracketData: DEBracketData; event: any };

    return (
        <ScrollView
            horizontal
            contentContainerStyle={styles.zoomContainer}
            minimumZoomScale={0.5}
            maximumZoomScale={2}
            showsHorizontalScrollIndicator
        >
            {bracketData.rounds.map(round => (
                <View key={round.round} style={styles.roundColumn}>
                    <Text style={styles.roundHeader}>{round.label}</Text>
                    {round.matches.map((match: DEBracketMatch, index) => {
                        const isByeA = !match.fencerA;
                        const isByeB = !match.fencerB;
                        const fencerAName = match.fencerA ? match.fencerA.firstName : 'BYE';
                        const fencerBName = match.fencerB ? match.fencerB.firstName : 'BYE';
                        const isWinnerA = match.winner && match.fencerA && match.winner.id === match.fencerA.id;
                        const isWinnerB = match.winner && match.fencerB && match.winner.id === match.fencerB.id;
                        return (
                            <View key={index} style={styles.matchBox}>
                                <View style={styles.matchRow}>
                                    <Text
                                        style={[
                                            styles.fencerName,
                                            isWinnerA && styles.winnerName,
                                            isByeA && styles.byeText,
                                        ]}
                                    >
                                        {fencerAName}
                                    </Text>
                                    <Text style={[styles.scoreText, isWinnerA && styles.winnerScore]}>
                                        {match.scoreA}
                                    </Text>
                                </View>
                                <View style={styles.matchRow}>
                                    <Text
                                        style={[
                                            styles.fencerName,
                                            isWinnerB && styles.winnerName,
                                            isByeB && styles.byeText,
                                        ]}
                                    >
                                        {fencerBName}
                                    </Text>
                                    <Text style={[styles.scoreText, isWinnerB && styles.winnerScore]}>
                                        {match.scoreB}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );
};

export default BracketViewPage;

const styles = StyleSheet.create({
    zoomContainer: {
        flexDirection: 'row',
        padding: 10,
    },
    roundColumn: {
        width: 200,
        marginHorizontal: 10,
        alignItems: 'center',
    },
    roundHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    matchBox: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 6,
        padding: 8,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    matchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 2,
    },
    fencerName: {
        fontSize: 14,
        color: '#000',
        textAlign: 'left',
    },
    scoreText: {
        fontSize: 14,
        color: '#000',
        textAlign: 'right',
    },
    winnerName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    winnerScore: {
        color: 'red',
        fontWeight: 'bold',
    },
    byeText: {
        fontStyle: 'italic',
        color: '#555',
    },
});
