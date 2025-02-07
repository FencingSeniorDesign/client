import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';

type EditTournamentRouteProp = RouteProp<{ params: { tournamentName: string } }, 'params'>;

type Props = {
  route: EditTournamentRouteProp;
};

export const EditTournament = ({ route }: Props) => {
  const { tournamentName } = route.params;

  return (
      <View style={styles.container}>
        <Text style={styles.title}>Edit Tournament</Text>
        <Text style={styles.tournamentName}>{tournamentName}</Text>
        {/* Additional tournament editing features can be added here */}
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 15,
  },
  tournamentName: {
    fontSize: 20,
    color: '#333',
  },
});