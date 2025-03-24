/**
 * Direct Elimination (DE) module
 * Provides functionality for DE bracket formats
 */

// Export optimized service and hooks
export * from './services/deBoutService';
export * from './hooks/useDEBouts';

// Export screens
export { default as DEBracketPage } from './screens/DEBracketPage';
export { default as DEBracketPageOptimized } from './screens/DEBracketPageOptimized';
export { default as DoubleEliminationPage } from './double/screens/DoubleEliminationPage';
export { default as CompassDrawPage } from './compass/screens/CompassDrawPage';

// Export components
export { default as DEBoutCard } from './components/DEBoutCard';
export { default as DEHelpModal } from './components/DEHelpModal';
export { default as DEOverview } from './components/DEOverview';

// Export utils
export * from './utils/BracketFormats';
export * from './utils/DENavigationUtil';
export * from './double/utils/DoubleEliminationUtils';
export * from './compass/utils/CompassDrawUtils';

// Legacy exports
export * from './single';
export * from './double';
export * from './compass';
