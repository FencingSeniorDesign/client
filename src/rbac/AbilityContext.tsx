import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppAbility, defineAbilityFor, defaultAbility, Role } from './ability';
import dataProvider from '../data/DrizzleDataProvider';
import { getDeviceId } from '../networking/NetworkUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tournamentClient from '../networking/TournamentClient'; // Import the client instance

// Create a context for the ability instance and the refresh function
interface AbilityContextType {
  ability: AppAbility;
  role: Role;
  refreshAbility: (tournamentName?: string) => Promise<void>;
  setTournamentContext: (tournamentName: string | null) => void; // Add function to set context
}

const defaultContext: AbilityContextType = {
  ability: defaultAbility,
  role: Role.VIEWER,
  refreshAbility: async () => {},
  setTournamentContext: () => {} // Add default empty function
};

export const AbilityContext = createContext<AbilityContextType>(defaultContext);

// Custom hook to use the ability context
export const useAbility = () => useContext(AbilityContext);

interface AbilityProviderProps {
  children: React.ReactNode;
}

// Cache key for storing the user's role
const USER_ROLE_CACHE_KEY = 'user_role';

export const AbilityProvider: React.FC<AbilityProviderProps> = ({ children }) => {
  const [ability, setAbility] = useState<AppAbility>(defaultAbility);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentTournament, setCurrentTournament] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(Role.VIEWER); // Add state for the current role
  
  // Initialize device ID
  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const id = await getDeviceId();
        setDeviceId(id);
      } catch (error) {
        console.error('Error fetching device ID:', error);
      }
    };
    
    fetchDeviceId();
  }, []);

  // Function to determine role based on device ID and tournament
  const determineRole = async (tournamentName?: string): Promise<Role> => {
    try {
      console.log(`Determining role for tournament: ${tournamentName || 'none'}`);
      
      // If no tournamentName is provided, we're not in a tournament context
      if (!tournamentName) {
        console.log('No tournament name provided, defaulting to VIEWER role');
        return Role.VIEWER;
      }
      
      // First check if this is the tournament creator (local device storing tournament)
      const isRemote = dataProvider.isRemoteConnection();
      console.log(`Is this a remote connection? ${isRemote}`);
      
      // --- Revised Logic ---
      
      // 1. Handle Local Creator
      if (!isRemote) {
        console.log('Local device detected - assigning TOURNAMENT_CREATOR role');
        // Optionally cache this role if needed elsewhere, though it's determined directly
        // await AsyncStorage.setItem(USER_ROLE_CACHE_KEY, Role.TOURNAMENT_CREATOR);
        return Role.TOURNAMENT_CREATOR;
      }
      
      // 2. Handle Remote Connection
      else { // isRemote is true
        console.log('Remote connection detected.');
        // For remote connections, the role *should* be provided by the server,
        // likely upon joining. This function shouldn't try to determine it locally.
        // We also should NOT trust the local cache for remote connections.
        
        // Check cache ONLY as a temporary measure if server doesn't provide role yet?
        // **Decision:** Let's NOT check cache for remote. Default to VIEWER until server confirms role.
        // Consider clearing cache on remote connect: await AsyncStorage.removeItem(USER_ROLE_CACHE_KEY);
        
        console.log('Defaulting remote connection role to VIEWER until confirmed by server.');
        return Role.VIEWER;
        
        // --- Old logic below (kept for reference during diff, will be removed) ---
        /*
        // If we have a cached role, use that first (applies to both local and remote scenarios if needed)
        const cachedRole = await AsyncStorage.getItem(USER_ROLE_CACHE_KEY);
        if (cachedRole && Object.values(Role).includes(cachedRole as Role)) {
          console.log('Using cached role:', cachedRole);
          return cachedRole as Role;
        }

        // If local connection and we have a device ID, check the role against the tournament data
        if (!isRemote && deviceId) { // This block is unreachable now due to the `if (!isRemote)` check above
          try {
            // Use the new method to check role based on device and tournament name
            const determinedRole = await dataProvider.getTournamentRoleForDevice(deviceId, tournamentName);
            
            // Cache the determined role
            await AsyncStorage.setItem(USER_ROLE_CACHE_KEY, determinedRole);
            return determinedRole;
          } catch (error) {
            console.error('Error checking tournament role for device:', error);
            // Fall through to default VIEWER on error
          }
        }
        
        // If remote, or local check failed, or no deviceId, default to VIEWER
        console.log('Defaulting role to VIEWER (remote connection, no cache, or error)');
        */
      }
      
      // Default to viewer if we can't determine the role
      return Role.VIEWER;
    } catch (error) {
      console.error('Error determining role:', error);
      return Role.VIEWER;
    }
  };

  // Function to refresh the ability based on the determined role
  const refreshAbility = async (tournamentName?: string) => {
    console.log(`refreshAbility called with tournament: ${tournamentName || 'none'}`);
    
    const targetTournament = tournamentName !== undefined ? tournamentName : currentTournament;
    console.log(`Target tournament for refresh: ${targetTournament || 'none'}`);
    
    // Update the current tournament if provided
    if (tournamentName !== undefined) {
      setCurrentTournament(tournamentName);
    }
    
    const determinedRole = await determineRole(targetTournament || undefined);
    console.log('Setting role to:', determinedRole);
    setRole(determinedRole); // Update the role state
    
    const newAbility = defineAbilityFor(determinedRole);
    console.log('Created new ability with permissions:',
      'Can manage all?', newAbility.can('manage', 'all'),
      'Can manage Tournament?', newAbility.can('manage', 'Tournament')
    );
    
    setAbility(newAbility);
  };

  // Initialize ability when device ID changes
  useEffect(() => {
    if (deviceId) {
      refreshAbility();
    }
  }, [deviceId]); // End of useEffect for deviceId

  // Listen for role assignment from the server via tournamentClient event
  useEffect(() => {
    const handleRoleAssigned = ({ role: roleString, tournamentName }: { role: string, tournamentName?: string }) => {
      console.log(`AbilityProvider: Received roleAssigned event: role=${roleString}, tournament=${tournamentName}`);

      // Map role string to enum
      let assignedRole: Role = Role.VIEWER; // Default
      if (roleString === 'tournament_official') {
        assignedRole = Role.OFFICIAL;
      } else if (roleString === 'referee') {
        assignedRole = Role.REFEREE;
      } else if (roleString === 'tournament_creator') {
        assignedRole = Role.TOURNAMENT_CREATOR;
      } else if (roleString === 'viewer') {
         assignedRole = Role.VIEWER;
      } else {
        console.warn(`AbilityProvider: Received unknown role string '${roleString}' from server.`);
      }

      console.log('AbilityProvider: Setting role based on server assignment:', assignedRole);
      setRole(assignedRole); // Update role state

      const newAbility = defineAbilityFor(assignedRole); // Create ability based on assigned role
      console.log('AbilityProvider: Updating ability based on server assigned role:',
        'Can manage all?', newAbility.can('manage', 'all'),
        'Can score Bout?', newAbility.can('score', 'Bout')
      );
      setAbility(newAbility); // Update ability state

      // Update current tournament if provided in the event
      if (tournamentName && tournamentName !== currentTournament) {
          console.log(`AbilityProvider: Updating current tournament from roleAssigned event: ${tournamentName}`);
          setCurrentTournament(tournamentName);
      }
    };

    // Subscribe to the event
    tournamentClient.on('roleAssigned', handleRoleAssigned);

    // Cleanup listener on component unmount
    return () => {
      tournamentClient.off('roleAssigned', handleRoleAssigned);
    };
  }, []);

  // Function to explicitly set the tournament context and refresh ability
  const setTournamentContext = (tournamentName: string | null) => {
    console.log(`AbilityProvider: Setting tournament context to: ${tournamentName}`);
    // We only refresh if the name actually changes to avoid unnecessary calls
    // or if the current role is still the initial default (Viewer) - handles initial load for creator
    if (tournamentName !== currentTournament || role === Role.VIEWER) {
       refreshAbility(tournamentName || undefined); // Pass undefined if null
    } else {
       console.log(`AbilityProvider: Tournament context already set to ${tournamentName}, skipping refresh.`);
    }
  };

  // Define the context value *inside* the component function body
  const contextValue: AbilityContextType = {
    ability,
    role,
    refreshAbility,
    setTournamentContext // Include the new function in the context value
  };

  // Return the Provider *inside* the component function body
  return (
    <AbilityContext.Provider value={contextValue}>
      {children}
    </AbilityContext.Provider>
  );
}; // End of AbilityProvider component function