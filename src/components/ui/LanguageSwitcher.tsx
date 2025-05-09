import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

interface Language {
    code: string;
    name: string;
}

const LANGUAGES: Language[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'zh', name: '中文' },
];

export const LanguageSwitcher: React.FC = () => {
    const { t } = useTranslation();
    const currentLang = i18n.language;

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
    };

    return (
        <View style={styles.container}>
            {LANGUAGES.map(lang => (
                <TouchableOpacity
                    key={lang.code}
                    style={[styles.languageButton, currentLang === lang.code && styles.activeLanguageButton]}
                    onPress={() => changeLanguage(lang.code)}
                    disabled={currentLang === lang.code}
                >
                    <Text style={[styles.languageText, currentLang === lang.code && styles.activeLanguageText]}>
                        {lang.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    languageButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 5,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    activeLanguageButton: {
        backgroundColor: '#001f3f',
    },
    languageText: {
        color: '#444',
        fontWeight: '500',
    },
    activeLanguageText: {
        color: '#fff',
    },
});

export default LanguageSwitcher;