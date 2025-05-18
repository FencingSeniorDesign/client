// src/navigation/screens/DoubleEliminationPage.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BLEStatusBar } from '../../networking/components/BLEStatusBar';

const DoubleEliminationPage: React.FC = () => {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <BLEStatusBar compact={true} />
            <Text style={styles.text}>{t('doubleEliminationPage.tbd')}</Text>
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

export default DoubleEliminationPage;
