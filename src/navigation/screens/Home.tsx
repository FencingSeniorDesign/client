// src/navigation/screens/Home.tsx with Join Tournament functionality
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CreateTournamentButton } from './CreateTournamentModal';
import { TournamentList } from './TournamentListComponent';
import { useNavigation } from '@react-navigation/native';
import { Tournament } from "../navigation/types";
import { JoinTournamentModal } from './JoinTournamentModal';
import tournamentClient from '../../networking/TournamentClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import { useOngoingTournaments, useCompletedTournaments } from '../../data/TournamentDataHooks';
import { getDeviceId } from '../../networking/NetworkUtils';

// Import the logo image
import logo from '../../assets/logo.png';

export function Home() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  // State for join tournament modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [connectedTournament, setConnectedTournament] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  // Use TanStack Query hooks for tournaments
  const ongoingTournamentsQuery = useOngoingTournaments();
  const completedTournamentsQuery = useCompletedTournaments();

  // Check if we're connected to a tournament on load and get device ID
  useEffect(() => {
    const checkConnection = async () => {
      await tournamentClient.loadClientInfo();
      const clientInfo = tournamentClient.getClientInfo();
      if (clientInfo && clientInfo.isConnected) {
        setConnectedTournament(clientInfo.tournamentName);
      }

      // Get and set device ID
      const id = await getDeviceId();
      setDeviceId(id);
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

        <View style={styles.buttonContainer}>
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
                <MaterialIcons name="people" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Join Tournament</Text>
              </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentContainer}>
          {/* Ongoing Tournaments */}
          <Text style={styles.tournamentHistoryTitle}>Ongoing Tournaments</Text>
          <View style={styles.ongoingTournamentsContainer}>
            {ongoingTournamentsQuery.isLoading ? (
              <ActivityIndicator size="large" color="#001f3f" />
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
          <View style={styles.historyContainer}>
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
          </View>
        </View>

        {/* Device ID display */}
        <Text style={styles.deviceIdText}>Device ID: {deviceId}</Text>
        
        {/* Referee Module Button */}
        <TouchableOpacity style={styles.refereeButton} onPress={() => navigation.navigate('RefereeModule')}>
          <MaterialIcons name="timer" size={24} color="#fff" style={styles.buttonIcon} />
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
    paddingHorizontal: 20,
    paddingTop: 60,
    backgroundColor: '#f8f9fa',
  },
  logo: {
    width: 280,
    height: 140,
    marginBottom: 20,
  },
  deviceIdText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    alignSelf: 'center',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    marginBottom: 15,
    gap: 10,
  },
  contentContainer: {
    width: '100%',
    flex: 1,
  },
  customButton: {
    backgroundColor: '#001f3f',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    height: 50, // Fixed height
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  refereeButton: {
    backgroundColor: '#001f3f',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    height: 50, // Match other buttons
    marginVertical: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  ongoingTournamentsContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 100,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tournamentHistoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingLeft: 5,
  },
  joinButton: {
    backgroundColor: '#228B22',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50, // Match the Create Tournament button height
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  connectedContainer: {
    backgroundColor: '#e1f5fe',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    height: 50, // Match button height
    borderWidth: 1,
    borderColor: '#b3e5fc',
  },
  connectedText: {
    color: '#0277bd',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  disconnectButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 5,
    elevation: 2,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
    fontWeight: '500',
  },
});