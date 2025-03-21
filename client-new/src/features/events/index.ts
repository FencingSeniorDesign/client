/**
 * Events management feature
 * Exports all event-related components, hooks, and services
 */

// Export the event repository and types
export * from './repository';

// Export the event query hooks
export { default as useEventQueries } from './hooks/useEventQueries';

// Export event screens
export { default as EventManagement } from './screens/EventManagement';
export { default as EventSettings } from './screens/EventSettings';

// These will be implemented and exported later
// export * from './components';
// export * from './api';