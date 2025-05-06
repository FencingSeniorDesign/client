# Localization Guide

This document explains how to work with localization in the app using react-i18next.

## Overview

The app uses the following libraries for localization:

- `react-i18next`: React bindings for the i18next library
- `@os-team/i18next-react-native-language-detector`: For automatic language detection in React Native

## Project Structure

- `/src/i18n/i18n.ts`: Configuration for the i18next instance
- `/src/i18n/translations/`: Directory containing translation files for each language
    - `en.ts`: English translations

## Adding a New Language

To add a new language, follow these steps:

1. Create a new translation file in the `/src/i18n/translations` directory (e.g., `fr.ts` for French)
2. Copy the content from `en.ts` and translate the values (keep the keys the same)
3. Update the i18n configuration in `/src/i18n/i18n.ts` to include the new language

Example for adding French:

```typescript
// In /src/i18n/translations/fr.ts
export default {
  common: {
    cancel: "Annuler",
    submit: "Soumettre",
    // ... other translations
  },
  // ... other translation namespaces
};

// In /src/i18n/i18n.ts
import en from './translations/en';
import fr from './translations/fr';

// Update the TypeScript type
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: typeof en;
    };
    defaultNS: 'translation';
  }
}

// Update the i18next configuration
i18n
  .use(RNLanguageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: {
        translation: en
      },
      fr: {
        translation: fr
      }
    },
    fallbackLng: 'en',
    // ... other configuration options
  });
```

## Using Translations in Components

### Basic Translation

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <Text>{t('common.cancel')}</Text>;
}
```

### Translations with Variables

```typescript
// For a translation key like: "Hello, {{name}}"
<Text>{t('greeting', { name: 'John' })}</Text>
```

### Pluralization

```typescript
// For a translation key that handles plurals
<Text>{t('items', { count: 5 })}</Text>
```

### Changing Language Programmatically

```typescript
import i18n from '../i18n';

function changeLanguage(lng: string) {
  i18n.changeLanguage(lng);
}

// Usage
<Button 
  title="Switch to French" 
  onPress={() => changeLanguage('fr')} 
/>
```

## Best Practices

1. **Organize translations logically**: Group related translations under namespaces like 'common', 'home', etc.

2. **Use keys that describe the purpose**: Instead of using the English text as the key, use descriptive keys like '
   common.save' instead of just 'Save'.

3. **Avoid string concatenation**: Always use interpolation for dynamic content.
   ```typescript
   // Bad
   t('greeting') + ' ' + name
   
   // Good
   t('greeting', { name })
   ```

4. **Keep translations DRY**: Reuse common UI elements like button labels in a common namespace.

5. **Handle pluralization properly**: Use the count parameter for pluralized strings.

## Testing Translations

When writing tests for components that use translations, you need to wrap your component with the translation provider:

```typescript
import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../path-to-your-i18n-instance';
import YourComponent from './YourComponent';

test('renders correctly', () => {
  const { getByText } = render(
    <I18nextProvider i18n={i18n}>
      <YourComponent />
    </I18nextProvider>
  );
  
  // Your test assertions
});
```