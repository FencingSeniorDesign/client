import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { CreateTournamentButton } from './CreateTournamentModal';
import { TournamentList } from './TournamentListComponent';
import {dbListCompletedTournaments, dbListOngoingTournaments} from '../../db/TournamentDatabaseUtils';
import { useNavigation } from '@react-navigation/native';
import { Tournament } from "../navigation/types";

// Import the logo image.
// (Do not change the background color or sizing of the logo)
import logo from '../../assets/logo.png';

export function Home() {
  const navigation = useNavigation();
  const [ongoingTournaments, setOngoingTournaments] = useState<Tournament[]>([]);
  const [completedTournaments, setCompletedTournaments] = useState<Tournament[]>([]);

  // Function to load tournaments into the state
  const loadOngoingTournaments = async () => {
    try {
      const tournamentsList = await dbListOngoingTournaments();
      setOngoingTournaments(tournamentsList);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  };

  const loadCompletedTournaments = async () => {
    try {
      const tournamentsList = await dbListCompletedTournaments();
      setCompletedTournaments(tournamentsList);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  }

  // Load tournaments initially
  useEffect(() => {
    loadOngoingTournaments();
    loadCompletedTournaments();
  }, []);

  return (
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        {/* Create Tournament Button (functionality preserved) */}
        <CreateTournamentButton onTournamentCreated={loadOngoingTournaments} />

        {/* Ongoing Tournaments */}
        <Text style={styles.tournamentHistoryTitle}>Ongoing Tournaments</Text>
        <View style={styles.ongoingTournamentsContainer}>
          <TournamentList tournaments={ongoingTournaments} onTournamentDeleted={loadOngoingTournaments} isComplete={false} />
        </View>

        {/* Tournament History Section */}
        <Text style={styles.tournamentHistoryTitle}>Tournament History</Text>

        <TournamentList tournaments={completedTournaments} onTournamentDeleted={loadCompletedTournaments} isComplete={true} />

        {/* Referee Module Button */}
        <TouchableOpacity style={styles.customButton} onPress={() => navigation.navigate('RefereeModule')}>
          <Text style={styles.customButtonText}>Referee Module</Text>
        </TouchableOpacity>

      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Align items at the top
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50, // Reduce top padding so the logo sits closer to the
    gap: 10,
  },
  logo: {
    width: 400,
    height: 200,
    paddingBottom : 0,
  },
  customButton: {
    backgroundColor: '#001f3f', // Navy blue
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    width: '80%',
    marginVertical: 10,
  },
  customButtonText: {
    color: '#fff', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },
  ongoingTournamentsContainer: {
    width: '100%',
    backgroundColor: '#001f3f', // Navy blue background
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-start', // Ensure items are aligned at the top
    minHeight: 100, // Set a minimum height so it's always visible
  },
  tournamentHistoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F4F4F', // Dark grey text
    marginTop: 5,
    marginBottom: 10,
  },
  tournamentHistoryButton: {
    backgroundColor: '#4F4F4F', // Dark grey inside
    borderColor: '#001f3f', // Navy blue border
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '80%',
    alignItems: 'center',
    marginVertical: 5,
  },
  tournamentHistoryButtonText: {
    color: '#fff', // White text
    fontSize: 16,
  },
});

export default Home;
