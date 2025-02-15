import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { CreateTournamentButton } from './CreateTournamentModal';
import { TournamentList } from './TournamentListComponent';
import { dbListTournaments } from '../../db/TournamentDatabaseUtils';
import { useNavigation } from '@react-navigation/native';

// Import the logo image.
// (Do not change the background color or sizing of the logo)
import logo from '../../assets/logo.png';

export function Home() {
  const navigation = useNavigation();
  const [tournaments, setTournaments] = useState<Array<{ id: number, name: string }>>([]);

  // Fake tournament history data for demo purposes
  const fakeTournamentHistory = [
    { id: 1, name: 'Tournament Alpha' },
    { id: 2, name: 'Tournament Beta' },
  ];

  // Function to load tournaments into the state
  const loadTournaments = async () => {
    try {
      const tournamentsList = await dbListTournaments();
      setTournaments(tournamentsList);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  };

  // Load tournaments initially
  useEffect(() => {
    loadTournaments();
  }, []);

  return (
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        {/* Create Tournament Button (functionality preserved) */}
        <CreateTournamentButton onTournamentCreated={loadTournaments} />

        {/* Ongoing Tournaments */}
        <View style={styles.ongoingTournamentsContainer}>
          <TournamentList tournaments={tournaments} onTournamentDeleted={loadTournaments} />
        </View>

        {/* Referee Module Button */}
        <TouchableOpacity style={styles.customButton} onPress={() => navigation.navigate('RefereeModule')}>
          <Text style={styles.customButtonText}>Referee Module</Text>
        </TouchableOpacity>

        {/* Tournament History Section */}
        <Text style={styles.tournamentHistoryTitle}>Tournament History</Text>
        {fakeTournamentHistory.map(tournament => (
            <TouchableOpacity
                key={tournament.id}
                style={styles.tournamentHistoryButton}
                onPress={() => {}}
            >
              <Text style={styles.tournamentHistoryButtonText}>{tournament.name}</Text>
            </TouchableOpacity>
        ))}
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
