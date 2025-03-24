# Test Plan for Optimized Components

This document outlines the testing approach for components that have been migrated to the service/hook pattern.

## Test Categories

### 1. Basic Functionality Tests
- Verify all basic functionalities work the same as original components
- Check that data loading, display, and interactions work correctly
- Validate that UI components render properly

### 2. Tanstack Query Features
- Test live queries update in real-time when data changes
- Verify optimistic updates work correctly
- Test stale-while-revalidate pattern displays fresh data appropriately
- Verify query invalidation cascades properly
- Test query persistence between navigation

### 3. Offline Support
- Test application behavior when starting in offline mode
- Verify persisted data can be retrieved when offline
- Test that mutations queue properly when offline
- Verify data synchronizes when coming back online

### 4. Network Status Integration
- Test that components show appropriate offline indicators
- Verify queries pause correctly when network disconnects
- Test that background fetching occurs when reconnected
- Verify data consistency after reconnection

### 5. Performance Testing
- Measure render time compared to original components
- Check memory usage for potential improvements
- Test responsiveness with large data sets
- Verify improved batching of database operations

## Components to Test

### 1. Officials Module
**Component:** `ManageOfficials.tsx`
**Hooks:** `useOfficials.ts`
**Services:** `officialService.ts`

**Test Cases:**
- Load official list and verify rendering
- Create a new official and verify optimistic update
- Edit an official and verify changes persist
- Delete an official and verify UI updates immediately
- Test offline creation/editing
- Check performance with 50+ officials

### 2. Referee Module
**Component:** `RefereeModuleOptimized.tsx`
**Hooks:** `useReferees.ts`
**Services:** `refereeService.ts`

**Test Cases:**
- Load bout data correctly
- Update scores with optimistic UI updates
- Test timer functionality
- Verify card assignments update properly
- Test offline score submission
- Verify live scoring updates from multiple devices
- Test performance during rapid score changes

### 3. DE Bracket
**Component:** `DEBracketPageOptimized.tsx`
**Hooks:** `useDEBouts.ts`
**Services:** `deBoutService.ts`

**Test Cases:**
- Verify bracket renders correctly for different table sizes
- Test bout selection and navigation to referee module
- Verify winner advancement works correctly
- Test optimistic updates to bout scores
- Verify cascading invalidation updates connected bouts
- Test offline scoring and advancement
- Verify performance with large brackets (table of 64+)
- Test real-time updates across multiple devices

## Test Environment Setup

1. **Development Environment**
   - Use React Native development build with dev server
   - Enable React Query Devtools for query debugging
   - Enable SQLite debugging for database operations

2. **Simulated Network Environment**
   - Use network throttling to simulate slow connections
   - Implement network on/off switches for offline testing
   - Test transition between online/offline states

3. **Multiple Device Testing**
   - Test synchronization across at least 2 devices
   - Verify real-time updates propagate correctly
   - Test multi-user scoring and updates

## Test Execution Plan

1. Create data fixtures for each component
2. Develop test scripts for consistent execution
3. Test each component individually
4. Test component interactions
5. Document issues and improvement opportunities
6. Prioritize fixes based on impact
7. Retest after implementing fixes

## Success Criteria

- All basic functionality works same as original
- Components update live when database changes
- UI is responsive and performance is acceptable
- Offline support works correctly
- Network transitions are handled gracefully
- No regressions in existing functionality