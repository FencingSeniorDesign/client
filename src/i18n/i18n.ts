import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations
import en from './translations/en';
import es from './translations/es';
import fr from './translations/fr';
import zh from './translations/zh';

// Define namespace and resource type
declare module 'i18next' {
    interface CustomTypeOptions {
        resources: {
            translation: typeof en;
        };
        defaultNS: 'translation';
    }
}

// Initialize i18next
i18n
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        compatibilityJSON: 'v3',
        resources: {
            en: {
                translation: en,
            },
            es: {
                translation: es,
            },
            fr: {
                translation: fr,
            },
            zh: {
                translation: zh,
            },
        },
        lng: 'en', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
