# Test Localization Fixes

## Approach

To fix the tests broken by the addition of i18n, we implemented the following approach:

1. Created a mock for react-i18next at `__mocks__/react-i18next.js` that:
    - Returns the last part of the translation key when `t()` is called
    - For example, `t('compassDrawPage.tbd')` returns `'tbd'` in tests

2. Updated test files to look for these simplified key parts instead of the actual translated text:
    - Tests looking for `'TBD'` now look for `'tbd'`
    - Tests looking for `'Loading bracket...'` now look for `'loadingBracket'`
    - Tests looking for `'Create Tournament'` now look for `'createTournament'`

## Progress

We've successfully fixed the following test files:

- `__tests__/navigation/screens/CompassDrawPage.test.tsx`
- `__tests__/navigation/screens/DoubleEliminationPage.test.tsx`
- `__tests__/navigation/screens/CreateTournamentModal.test.tsx`
- `__tests__/navigation/screens/DEBracketPage.test.tsx`
- `__tests__/navigation/screens/Home.test.tsx`
- `__tests__/navigation/screens/EventSettings.test.tsx`

## Remaining Files to Fix

The following test files still need to be updated:

- `__tests__/navigation/screens/BoutOrderPage.test.tsx`
- `__tests__/navigation/screens/EventManagement.test.tsx`
- `__tests__/navigation/screens/JoinTournamentModal.test.tsx` (has some act() warnings)
- `__tests__/navigation/screens/ManageOfficials.test.tsx`
- `__tests__/navigation/screens/PoolsPage.test.tsx`
- `__tests__/navigation/screens/RoundResults.test.tsx`
- `__tests__/navigation/screens/TournamentListComponent.test.tsx`
- `__tests__/navigation/screens/TournamentResultsPage.test.tsx`

## Steps to Fix Remaining Tests

For each file:

1. Identify strings that come from translations
2. Replace them with the key's last part (after the dot) in lowercase
3. For example:
    - `'Join Tournament'` -> `'joinTournament'`
    - `'Loading results...'` -> `'loadingResults'`
    - `'Failed to load'` -> `'failedToLoad'`

For tests with act() warnings:

- These warnings are unrelated to the i18n changes
- Consider wrapping state changes with `act()` or skipping assertions that cause warnings

## Running Tests

Use the following command to run specific tests:

```bash
npm test -- --testPathPattern="__tests__/navigation/screens/[FileName].test.tsx" --watchAll=false
```

Or run all tests:

```bash
npm test -- --watchAll=false
```