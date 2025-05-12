# Internationalization (i18n) Testing

This document explains how the test suite handles internationalization (i18n) in our React Native application.

## Overview

Our application uses `react-i18next` for internationalization. In components, we use the `useTranslation` hook to access
translation functions:

```tsx
const { t } = useTranslation();
// Usage: t('namespace.key')
```

## Testing Approach

For testing components that use i18n, we've implemented a Jest mock that simplifies working with translated components.

### Key Features

- All calls to translation functions return the last part of the translation key
- Example: `t('compassDrawPage.tbd')` returns `'tbd'` in tests
- This allows tests to remain simple and focused on component behavior, not translation management

### Implementation

The mock is located at `__mocks__/react-i18next.js` and handles:

1. The `useTranslation` hook
2. The `Trans` component
3. The `withTranslation` HOC
4. The `I18nextProvider` component
5. The `initReactI18next` module

### Writing Tests for i18n Components

When writing tests for components that use translations:

```tsx
// Component code:
const MyComponent = () => {
  const { t } = useTranslation();
  return <Text>{t('myComponent.greeting')}</Text>;
};

// Test code:
it('renders a greeting', () => {
  const { getByText } = render(<MyComponent />);
  // Note: we test for 'greeting', not 'myComponent.greeting'
  expect(getByText('greeting')).toBeTruthy();
});
```

## Advanced Testing

For more comprehensive testing of actual translations, you would need to:

1. Create a fixture with your translation data
2. Render the component with an actual i18n provider containing test data
3. Test against the expected translated strings

However, this approach is more complex and usually unnecessary for component testing.

## Resources

- [Official react-i18next testing documentation](https://react.i18next.com/misc/testing)