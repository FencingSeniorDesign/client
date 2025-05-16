import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ConnectionState, ScoringBoxType } from '../../../../networking/ble/types';

interface ConnectionStatusIndicatorProps {
  connectionState: ConnectionState;
  connectedBoxType?: ScoringBoxType | null;
  connectedDeviceName?: string | null;
  dataSource?: 'app' | 'box';
}

export function ConnectionStatusIndicator({
  connectionState,
  connectedBoxType,
  connectedDeviceName,
  dataSource,
}: ConnectionStatusIndicatorProps) {
  const { t } = useTranslation();

  if (connectionState !== ConnectionState.CONNECTED || !connectedBoxType) {
    return null;
  }

  const getBoxName = () => {
    switch (connectedBoxType) {
      case ScoringBoxType.TOURNAFENCE:
        return t('ble.tournafence.name');
      case ScoringBoxType.ENPOINTE:
        return t('ble.enpointe.name');
      case ScoringBoxType.SKEWERED:
        return t('ble.skewered.name');
      default:
        return connectedDeviceName || 'Unknown Box';
    }
  };

  const getDataSourceIcon = () => {
    return dataSource === 'app' ? 'mobile-alt' : 'box';
  };

  const getDataSourceText = () => {
    return dataSource === 'app' ? t('ble.appDataSource') : t('ble.boxDataSource');
  };

  return (
    <View style={styles.container}>
      <View style={styles.connectionInfo}>
        <FontAwesome5 name="bluetooth-b" size={16} color="#4CAF50" />
        <Text style={styles.connectedText}>{getBoxName()}</Text>
      </View>
      {dataSource && (
        <View style={styles.dataSourceInfo}>
          <FontAwesome5 name={getDataSourceIcon()} size={14} color="#666" />
          <Text style={styles.dataSourceText}>{getDataSourceText()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'column',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectedText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dataSourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataSourceText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
});