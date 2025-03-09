// src/navigation/screens/Home.tsx with Join Tournament functionality
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CreateTournamentButton } from './CreateTournamentModal';
import { TournamentList } from './TournamentListComponent';
import { dbListCompletedTournaments, dbListOngoingTournaments } from '../../db/TournamentDatabaseUtils';
import { useNavigation } from '@react-navigation/native';
import { Tournament } from "../navigation/types";
import { JoinTournamentModal } from './JoinTournamentModal';
import tournamentClient from '../../networking/TournamentClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Import the logo image
import logo from '../../assets/logo.png';

export function Home() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  // State for join tournament modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [connectedTournament, setConnectedTournament] = useState<string | null>(null);

  // Use TanStack Query for ongoing tournaments
  const ongoingTournamentsQuery = useQuery({
    queryKey: ['tournaments', 'ongoing'],
    queryFn: dbListOngoingTournaments,
    staleTime: 1000 * 60, // 1 minute
  });

  // Use TanStack Query for completed tournaments
  const completedTournamentsQuery = useQuery({
    queryKey: ['tournaments', 'completed'],
    queryFn: dbListCompletedTournaments,
    staleTime: 1000 * 60, // 1 minute
  });

  // Check if we're connected to a tournament on load
  useEffect(() => {
    const checkConnection = async () => {
      await tournamentClient.loadClientInfo();
      const clientInfo = tournamentClient.getClientInfo();
      if (clientInfo && clientInfo.isConnected) {
        setConnectedTournament(clientInfo.tournamentName);
      }
    };

    checkConnection();
  }, []);

  const handleJoinSuccess = (tournamentName: string) => {
    setConnectedTournament(tournamentName);
    Alert.alert('Success', `Connected to tournament: ${tournamentName}`);
  };

  const handleDisconnect = async () => {
    await tournamentClient.disconnect();
    setConnectedTournament(null);
    Alert.alert('Disconnected', 'You have disconnected from the tournament');
  };
  
  const refreshTournaments = () => {
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
  };

  return (
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        {/* Create Tournament Button */}
        <CreateTournamentButton onTournamentCreated={refreshTournaments} />

        {/* Join Tournament Button or Connection Status */}
        {connectedTournament ? (
            <View style={styles.connectedContainer}>
              <Text style={styles.connectedText}>
                Connected to: {connectedTournament}
              </Text>
              <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity
                style={styles.joinButton}
                onPress={() => setJoinModalVisible(true)}
            >
              <Text style={styles.buttonText}>Join Tournament</Text>
            </TouchableOpacity>
        )}

        {/* Ongoing Tournaments */}
        <Text style={styles.tournamentHistoryTitle}>Ongoing Tournaments</Text>
        <View style={styles.ongoingTournamentsContainer}>
          {ongoingTournamentsQuery.isLoading ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : ongoingTournamentsQuery.isError ? (
            <Text style={styles.errorText}>Error loading tournaments</Text>
          ) : (
            <TournamentList 
              tournaments={ongoingTournamentsQuery.data || []} 
              onTournamentDeleted={refreshTournaments} 
              isComplete={false} 
            />
          )}
        </View>

        {/* Tournament History Section */}
        <Text style={styles.tournamentHistoryTitle}>Tournament History</Text>
        {completedTournamentsQuery.isLoading ? (
          <ActivityIndicator size="large" color="#001f3f" />
        ) : completedTournamentsQuery.isError ? (
          <Text style={styles.errorText}>Error loading tournament history</Text>
        ) : (
          <TournamentList 
            tournaments={completedTournamentsQuery.data || []} 
            onTournamentDeleted={refreshTournaments} 
            isComplete={true} 
          />
        )}

        {/* Referee Module Button */}
        <TouchableOpacity style={styles.customButton} onPress={() => navigation.navigate('RefereeModule')}>
          <Text style={styles.buttonText}>Referee Module</Text>
        </TouchableOpacity>

        {/* Join Tournament Modal */}
        <JoinTournamentModal
            visible={joinModalVisible}
            onClose={() => setJoinModalVisible(false)}
            onJoinSuccess={handleJoinSuccess}
        />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    gap: 10,
  },
  logo: {
    width: 400,
    height: 200,
    paddingBottom: 0,
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
  buttonText: {
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
    justifyContent: 'flex-start',
    minHeight: 100,
  },
  tournamentHistoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F4F4F', // Dark grey text
    marginTop: 5,
    marginBottom: 10,
  },
  joinButton: {
    backgroundColor: '#228B22', // Green
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    width: '80%',
    marginVertical: 10,
  },
  connectedContainer: {
    backgroundColor: '#001f3f', // Navy blue
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    width: '80%',
    marginVertical: 10,
  },
  connectedText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  disconnectButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 5,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
  },
});