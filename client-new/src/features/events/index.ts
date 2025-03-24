/**
 * Events management feature
 * Exports all event-related components, hooks, and services
 */

// Export the event types and service functions
export * from './services/eventService';

// Export the event hooks with optimized implementation
export { default as useEvents } from './hooks/useEvents';

// Export event screens
export { default as EventManagement } from './screens/EventManagement';
export { default as EventSettings } from './screens/EventSettings';

// These will be implemented and exported later
// export * from './components';
// export * from './api';