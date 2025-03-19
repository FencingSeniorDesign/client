/**
 * Home screen
 * 
 * This is a simplified version of the home screen that will be replaced
 * with the actual implementation once we migrate all components.
 */
import React, { useState } from 'react';
import { StyleSheet, View, Text, Button, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const Home: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Tournament Management</Text>
        <Text style={styles.subtitle}>New Domain-Based Structure</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Create Tournament"
            onPress={() => {
              // This will be implemented when we migrate the CreateTournamentModal
              navigation.navigate('CreateTournament');
            }}
          />
          
          <View style={styles.spacer} />
          
          <Button
            title="Join Tournament"
            onPress={() => {
              // This will be implemented when we migrate the JoinTournamentModal
              navigation.navigate('JoinTournament');
            }}
          />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            The application has been migrated to a domain-based structure.
            This makes it easier to organize code by feature and maintain
            clear boundaries between different parts of the application.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#6c757d',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  spacer: {
    height: 15,
  },
  infoContainer: {
    padding: 15,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    textAlign: 'center',
  },
});