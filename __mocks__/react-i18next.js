// Mock for react-i18next
const reactI18next = jest.createMockFromModule('react-i18next');

// This function takes translation keys (like 'compassDrawPage.tbd')
// and returns just the last part ('tbd') for easier test assertions
const getLastKeyPart = key => {
    if (typeof key !== 'string') return key;
    const parts = key.split('.');
    return parts[parts.length - 1];
};

// Mock useTranslation hook
reactI18next.useTranslation = () => {
    return {
        t: jest.fn(getLastKeyPart),
        i18n: {
            changeLanguage: jest.fn(() => Promise.resolve()),
            language: 'en',
        },
    };
};

// Mock Trans component
reactI18next.Trans = ({ i18nKey, children }) => {
    return i18nKey ? getLastKeyPart(i18nKey) : children || '';
};

// Mock withTranslation HOC
reactI18next.withTranslation = () => Component => {
    Component.defaultProps = {
        ...Component.defaultProps,
        t: getLastKeyPart,
    };
    return Component;
};

// Mock I18nextProvider
reactI18next.I18nextProvider = ({ children }) => children;

// Mock initReactI18next module
reactI18next.initReactI18next = {
    type: '3rdParty',
    init: () => {},
};

module.exports = reactI18next;
