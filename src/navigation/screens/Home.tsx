import React, {useEffect, useState} from 'react';
import {StyleSheet, View, Text, Button, Alert, Modal, TouchableOpacity, FlatList} from 'react-native';
import { CreateTournamentButton } from './CreateTournamentModal';
import { TournamentList } from './TournamentListComponent';
import { dbListTournaments } from '../../db/TournamentDatabaseUtils';
import {useNavigation} from "@react-navigation/native";
import Zeroconf from "react-native-zeroconf";
import TcpSocket from "react-native-tcp-socket";

export function Home() {
  const navigation = useNavigation();
  const [tournaments, setTournaments] = useState<Array<{ id: number, name: string }>>([]);

  const [servers, setServers] = useState<any[]>([]);  // Store found servers
  const [isModalVisible, setIsModalVisible] = useState(false);  // Modal visibility state

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
  useEffect(() => {
    loadTournaments();
  }, []);

  // Initialize Zeroconf to scan for servers
  const zeroconf = new Zeroconf();

  useEffect(() => {
    zeroconf.on('resolved', (service) => {
      console.log("servers resolved")
      setServers((prev) => [...prev, service]);  // Add resolved services to state
    });

    console.log('scanning')
    zeroconf.scan('_fencing-tournament._tcp');  // Search for '_fencing-tournament' services

    return () => {
      zeroconf.stop();  // Clean up when the component unmounts
    };
  }, [isModalVisible]);

  const handleJoinServer = (server: any) => {
    // Handle connection logic here

    // Assuming a function connectToServer exists that will establish a connection
    connectToServer(server, () => {
      // Navigate to the EventManagement screen after successful connection
      navigation.navigate('EventManagement', {
        tournamentName: server.name,  // You can adjust this to pass the necessary data
      });
    });
  };

  // Assuming you have a function to handle server connections
  const connectToServer = (server: any, onSuccess: () => void) => {
    const { host, port } = server; // Use the server's host and port for connection

    const client = TcpSocket.createConnection({ host, port }, () => {
      console.log('Connected to the server!');

      // After connecting, request the events (you could send a specific request to the server)
      client.write('GET /events');  // Placeholder for a message you'd send to request events

      client.on('data', (data) => {
        console.log('Received data from server:', data.toString());

        // Handle the response and navigate to EventManagement
        onSuccess();  // Once the events are retrieved successfully, navigate
      });

      client.on('error', (error) => {
        console.error('Connection error:', error);
        Alert.alert('Error', 'Failed to connect to the server.');
      });
    });

    client.on('close', () => {
      console.log('Connection closed');
    });
  };


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
            title="Join Server"
            onPress={() => setIsModalVisible(true)}
        />

        <Button
            title="Referee Module"
            onPress={() => navigation.navigate('RefereeModule')}
        />

        {/* Modal to display available servers */}
        <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Available Servers</Text>
              <FlatList
                  data={servers}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                      <TouchableOpacity
                          style={styles.serverItem}
                          onPress={() => handleJoinServer(item)}
                      >
                        <Text>{item.name}</Text>
                      </TouchableOpacity>
                  )}
              />
              <Button title="Close" onPress={() => setIsModalVisible(false)} />
            </View>
          </View>
        </Modal>

      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  serverItem: {
    padding: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
});