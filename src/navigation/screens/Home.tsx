import React, { useState } from 'react';
import {StyleSheet, View, Text, Button} from 'react-native';
import { CreateTournamentButton } from './CreateTournamentModal';
import { TournamentList } from './TournamentListComponent';
import { dbListTournaments } from '../../db/TournamentDatabaseUtils';
import {useNavigation} from "@react-navigation/native";

export function Home() {
  const navigation = useNavigation();
  const [tournaments, setTournaments] = useState<Array<{ id: number, name: string }>>([]);

  // Function to load tournaments into the state
  const loadTournaments = async () => {
    try {
      const tournamentsList = await dbListTournaments();
      setTournaments(tournamentsList);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  };

  // Load tournaments initially (this would be handled by the CreateTournamentButton or tournament changes)
  React.useEffect(() => {
    loadTournaments();
  }, []);

  return (
      <View style={styles.container}>
        <Text style={styles.header}>Home Screen</Text>
        {/* Pass the loadTournaments function to CreateTournamentButton */}
        <CreateTournamentButton onTournamentCreated={loadTournaments} />
        {/* Pass the tournament list as props */}
        <TournamentList
            tournaments={tournaments}
            onTournamentDeleted={loadTournaments}
        />

        <Button
            title="Referee Module"
            onPress={() => navigation.navigate('RefereeModule')}
        />


      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
    gap: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 120,
  },
});