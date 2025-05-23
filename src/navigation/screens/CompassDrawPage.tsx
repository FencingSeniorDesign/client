// src/navigation/screens/CompassDrawPage.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';

const CompassDrawPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <View style={styles.container} testID="compass-container">
            <BLEStatusBar compact={true} />
            <Text style={styles.text}>{t('compassDrawPage.tbd')}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
    },
});

export default CompassDrawPage;
