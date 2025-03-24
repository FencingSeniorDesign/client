import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNetworkStatus } from '../status';
import { MaterialIcons } from '@expo/vector-icons';

interface NetworkStatusBarProps {
  showAlways?: boolean;
  onRefresh?: () => void;
}

/**
 * Network Status Bar component
 * Displays the current network status in a bar at the top of the screen
 * Enhanced with animations, detailed status, and refresh button
 */
export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({
  showAlways = false,
  onRefresh
}) => {
  const { isConnected, isInternetReachable, type, isWifi, isCellular, refresh } = useNetworkStatus();
  
  // Animation for smooth appearance/disappearance
  const [opacity] = React.useState(new Animated.Value(0));
  const [barHeight] = React.useState(new Animated.Value(0));
  
  useEffect(() => {
    // Animate the status bar in/out
    if (!isConnected || showAlways) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(barHeight, {
          toValue: 40,
          duration: 300,
          useNativeDriver: false,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(barHeight, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [isConnected, showAlways, opacity, barHeight]);
  
  // Determine status color and message
  const getStatusInfo = () => {
    if (!isConnected) {
      return {
        color: '#ff3b30',
        message: 'You are offline',
        icon: 'signal-wifi-off'
      };
    }
    
    if (isConnected && isInternetReachable === false) {
      return {
        color: '#ff9500',
        message: 'No internet connection',
        icon: 'wifi-off'
      };
    }
    
    if (isConnected && isWifi) {
      return {
        color: '#34c759',
        message: 'Connected to WiFi',
        icon: 'wifi'
      };
    }
    
    if (isConnected && isCellular) {
      return {
        color: '#5ac8fa',
        message: 'Connected to mobile data',
        icon: 'signal-cellular-4-bar'
      };
    }
    
    return {
      color: '#8e8e93',
      message: `Connected (${type})`,
      icon: 'network-check'
    };
  };
  
  const status = getStatusInfo();
  
  // Only render visible part of component if needed (for performance)
  if (!showAlways && isConnected) {
    return null;
  }
  
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      refresh();
    }
  };
  
  return (
    <Animated.View 
      style={[
        styles.statusBar, 
        { 
          backgroundColor: status.color,
          opacity: opacity,
          height: barHeight,
        }
      ]}
    >
      <MaterialIcons name={status.icon} size={16} color="#fff" style={styles.icon} />
      <Text style={styles.statusText}>{status.message}</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <MaterialIcons name="refresh" size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  icon: {
    marginRight: 6,
  },
  refreshButton: {
    padding: 6,
  }
});

export default NetworkStatusBar;