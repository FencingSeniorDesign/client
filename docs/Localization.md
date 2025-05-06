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

When writing tests for components that use translations, we use a consistent approach that mocks the translation
function to return predictable values.

### Mock Implementation

We've implemented a Jest mock for `react-i18next` at `__mocks__/react-i18next.js` that returns the last part of the
translation key:

```javascript
// Mock for react-i18next
const reactI18next = jest.createMockFromModule('react-i18next');

// This function takes translation keys (like 'compassDrawPage.tbd') 
// and returns just the last part ('tbd') for easier test assertions
const getLastKeyPart = (key) => {
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
  return i18nKey ? getLastKeyPart(i18nKey) : (children || '');
};

// Mock withTranslation HOC
reactI18next.withTranslation = () => (Component) => {
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
```

### Testing Components with Translations

When testing components that use translations, you should expect the last part of the translation key, not the full
translated text:

```tsx
// Component code
const MyComponent = () => {
  const { t } = useTranslation();
  return <Text>{t('myComponent.greeting')}</Text>;
};

// Test code
it('renders a greeting', () => {
  const { getByText } = render(<MyComponent />);
  // Note: we test for 'greeting', not 'myComponent.greeting'
  expect(getByText('greeting')).toBeTruthy();
});
```

### Best Practices for Testing

1. **Always use the last part of the key in tests**:
   ```tsx
   // Component: t('button.submit')
   // Test: expect(getByText('submit')).toBeTruthy();
   ```

2. **Use regular expressions for dynamic content**:
   ```tsx
   // For text that might include variable content
   expect(getByText(/errorMessage/)).toBeTruthy();
   ```

3. **Handle template strings carefully**:
   Components may use template interpolation, so focus on the static parts or use regex patterns in tests.

4. **Remember that the mock returns the key's last part**:
   If you have a key like `common.buttons.save`, the mock will return `save`.

5. **For more complex testing needs**:
   You can still use the traditional approach of wrapping components with the I18nextProvider if you need to test actual
   translation behavior:

   ```typescript
   import { render } from '@testing-library/react-native';
   import { I18nextProvider } from 'react-i18next';
   import i18n from '../path-to-your-i18n-instance';
   import YourComponent from './YourComponent';

   test('renders correctly with real translations', () => {
     const { getByText } = render(
       <I18nextProvider i18n={i18n}>
         <YourComponent />
       </I18nextProvider>
     );
     
     // Your test assertions using actual translated text
   });
   ```

6. **Handling act() warnings**:
   When testing components with async operations or state updates, you may encounter act() warnings. To resolve these:

   ```typescript
   import { render, act } from '@testing-library/react-native';

   test('component with async operations', async () => {
     const { getByText } = render(<MyComponent />);
     
     // Wait for any async operations to complete
     await act(async () => {
       await Promise.resolve();
     });
     
     // Now test the component in its final state
     expect(getByText(/translationKey/)).toBeTruthy();
   });
   ```