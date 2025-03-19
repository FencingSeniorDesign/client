/**
 * CreateTournamentModal component
 * 
 * This is a placeholder for the actual component that will be migrated.
 */
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const CreateTournamentModal: React.FC = () => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Tournament</Text>
      <Text style={styles.subtitle}>This is a placeholder for the CreateTournamentModal component</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Go Back" 
          onPress={() => navigation.goBack()} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
});
