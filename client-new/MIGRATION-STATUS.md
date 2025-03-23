# Migration Status

This document tracks the progress of migrating the codebase to the new domain-based structure.

## Overview

The migration involves moving from a technology-centric structure to a domain-based structure where code is organized by feature rather than by technical layer.

## Completed Items

- ✅ Update migration documents to reflect new project location at `/Users/luka/Documents/DevFolder/client/client-new`
- ✅ Create migration script (migration-script.sh)
- ✅ Define domain-based directory structure
- ✅ Execute migration script to create directory structure
- ✅ Create placeholder for base repository pattern
- ✅ Set up Drizzle ORM schema and SQLite database configuration
- ✅ Configure Tanstack Query provider in the application
- ✅ Update App.tsx to use new QueryProvider and initialize database
- ✅ Implement core tournament domain with Drizzle ORM and Tanstack Query
- ✅ Implement live queries for critical data (events, bouts, scores)
- ✅ Implement event repository and query hooks
- ✅ Migrate event management screen to use live queries
- ✅ Set up core typings in `src/core/types.ts`
- ✅ Set up navigation types in `src/navigation/types.ts`
- ✅ Create infrastructure networking (client, server, types, utils, components)

## To Do Items
- ✅ Create tournament list component in the new structure
- ✅ Implement fencer repository and query hooks
- ✅ Create placeholder home screen and modals
- ✅ Set up basic navigation with proper imports from domain folders
- ✅ Implement round repository and query hooks
- ✅ Implement official repository and query hooks
- ✅ Implement referee repository and query hooks
- ✅ Start migrating tournament screens and components
  - ✅ Fix TournamentList to use correct delete method
  - ✅ Update tournament API to match core types
  - ✅ Review TournamentListContainer (already has proper loading/error handling)
- ⬜ Complete migration of tournament screens and components
  - ⬜ Test tournament creation, deletion, and list refreshing
  - ✅ Added offline mode warning when not connected to network
- ✅ Migrate event-related screens and components
  - ✅ Updated EventManagement.tsx to use event repository and queries
  - ✅ Added network status hook to display offline warning
  - ✅ Updated EventSettings.tsx to use the repository pattern
  - ✅ Implemented fencer-event relationship in useFencerEventQueries.ts
  - ✅ Added input validation and better error handling
- ⬜ Migrate round/pool/bracket-related screens and components
  - ✅ Create pool services with pure functions for data access
  - ✅ Create pool hooks layer using Tanstack Query with the service functions
  - ✅ Update PoolsPage to use the new service + hooks approach
  - ✅ Update BoutOrderPage to use the pool bout service + hooks
  - ✅ Create round services with prepared statements and optimized queries
  - ✅ Create round hooks layer with live queries and optimistic updates
  - ✅ Create example RoundManagement screen using the new pattern
  - ✅ Create DE bout service with optimized data access and prepared statements
  - ✅ Create DE bout hooks with live queries and optimistic updates
  - ✅ Create optimized DEBracketPage using the new pattern
  - ⬜ Test round creation and management
- ✅ Migrate official-related screens and components
  - ✅ Create official services with optimized data access and prepared statements
  - ✅ Create official hooks using Tanstack Query with optimistic updates
  - ✅ Update ManageOfficials screen to use the new pattern
- ✅ Migrate referee module
  - ✅ Create referee services with optimized data access and prepared statements
  - ✅ Create referee hooks using Tanstack Query with optimistic updates
  - ⬜ Update RefereeModule screen to use the new pattern
- ⬜ Migrate networking infrastructure fully
- ⬜ Update all imports to use new structure
- ⬜ Add unit tests for domain-specific functionality
- ⬜ Validate that everything works end-to-end

## Structure Reference

```
src/
  assets/                     # Static assets
  core/                       # Core utilities, types, and shared functionality
    types.ts                  # Shared type definitions
    components/               # Shared UI components
    hooks/                    # Shared hooks like usePersistentState
    utils/                    # Utility functions
  
  infrastructure/             # Cross-cutting infrastructure concerns
    database/
      client.ts               # Drizzle ORM database client with live queries enabled
      schema.ts               # Database schema definitions
      base-repository.ts      # Base repository implementation (legacy)
      live-query.ts           # Live query hooks for real-time updates
      migrations/             # Database migration files
      persist.ts              # New: Database persistence configuration
      advanced/               # New: Advanced Drizzle ORM features
    
    query/
      provider.tsx            # Tanstack Query provider setup
      utils.ts                # Query utilities
      persist.ts              # New: Query client persistence configuration
      advanced.ts             # New: Advanced query features and utilities
    
    networking/
      client.ts               # Base API client setup
      server.ts               # Server implementation
      types.ts                # Common network types
      components/             # Shared networking components
      status.ts               # New: Network status management
  
  features/                   # Feature modules
    tournaments/              # Tournament management
      components/             # Tournament-specific components
      screens/                # Tournament screens
      hooks/                  # Tournament hooks using Tanstack Query
      services/               # Tournament-specific business logic and data access
      api/                    # Tournament-specific API calls
    
    events/                   # Event management
      components/             # Event-specific components
      screens/                # Event screens
        EventManagement.tsx   # Event management screen with live updates
      hooks/                  # Event hooks layer using Tanstack Query
      services/               # Event services for data access
    
    fencers/                  # Fencer management
      ...
    
    rounds/                   # Round management
      pool/                   # Pool rounds
        hooks/                # React hooks for pool data (using Tanstack Query)
          usePools.ts         # Hooks for pool operations
          usePoolBouts.ts     # Hooks for pool bout operations
        services/             # Pure functions for data access
          poolService.ts      # Pool data access services
          poolBoutService.ts  # Pool bout data access services
        screens/              # Pool UI components
          PoolsPage.tsx       # Pool management screen
          BoutOrderPage.tsx   # Bout order and scoring screen
      
      de/                     # Direct elimination
        ...
    
    officials/                # Officials management
      ...
    
    referee/                  # Referee module
      components/             # Referee-specific components
        LiveScoreDisplay.tsx  # Component that displays live-updating scores
      hooks/                  # Referee data hooks with live queries
        useRefereeQueries.ts  # Referee-specific query hooks with live updates
  
  navigation/                 # App navigation configuration
  
  App.tsx                     # Root component with database initialization and query provider
```

## Architecture Notes

We've migrated from the repository pattern to a simpler service + hooks approach:

1. **Services Layer**: Pure functions that handle database operations using Drizzle ORM.
   - Located in `features/[domain]/services/`
   - Example: `poolBoutService.ts` with functions like `getBoutsForPool`
   - No classes or instances, just exported functions
   - Throws errors instead of returning complex result objects

2. **Hooks Layer**: React hooks that use the services and Tanstack Query.
   - Located in `features/[domain]/hooks/`
   - Example: `usePoolBouts.ts` exporting hooks like `useGetBoutsForPool`
   - Uses Tanstack Query for caching, loading states, and error handling
   - Handles Drizzle live queries for real-time updates

This approach provides several benefits:
- Less boilerplate than the repository pattern
- More aligned with React's functional paradigm
- Better separation of concerns
- Easier testing of pure service functions
- Simpler mental model for developers

## Tanstack Query Advanced Features

We are implementing the following Tanstack Query features to enhance our application:

1. **Query Invalidation Strategies**
   - ✅ Implement precise cache updates after mutations
   - ✅ Set up cascade invalidation for related data
   - ✅ Configure targeted refetching to minimize network requests

2. **Optimistic Updates**
   - ✅ Add optimistic UI updates for scoring
   - ✅ Implement rollback for failed mutations
   - ✅ Create optimistic update patterns for common operations

3. **Background Fetching with Silent UI**
   - ✅ Configure stale-while-revalidate pattern
   - ✅ Set up silent background refetching
   - ✅ Implement unobtrusive data refresh strategies

4. **Persistent Storage**
   - ✅ Set up AsyncStorage persister
   - ✅ Configure persistent query client
   - ✅ Implement persistence for offline support

5. **Hydration and Dehydration**
   - ⬜ Create hydration utilities for state transfer
   - ⬜ Set up dehydration for efficient storage
   - ⬜ Configure preloaded state handling

6. **Query Data Transformations with select**
   - ⬜ Add data transformation to query hooks
   - ⬜ Implement memoization for transformed results
   - ⬜ Create reusable selector patterns

7. **Network Status Management Integration**
   - ✅ Connect network status to query behavior
   - ✅ Configure automatic query pausing when offline
   - ✅ Set up intelligent refetching on reconnect

8. **Dependent Queries**
   - ⬜ Implement sequential data loading for related entities
   - ⬜ Configure conditional query execution
   - ⬜ Create cascading data fetch patterns

9. **Parallel Queries with useQueries**
   - ⬜ Set up batch data fetching
   - ⬜ Implement combined loading states
   - ⬜ Create hooks for related data fetching

10. **Query Cancelation**
    - ⬜ Add abort signal support to services
    - ⬜ Implement automatic query cancelation on navigation
    - ⬜ Configure timeout-based cancelation

11. **App State and Focus Management**
    - ⬜ Connect app state to query refetching
    - ⬜ Implement focus-based data refresh
    - ⬜ Configure background behavior for queries

12. **Enhanced TypeScript Type Safety**
    - ⬜ Create typed query key factories
    - ⬜ Implement typed error handling
    - ⬜ Set up type-safe query results

13. **Screen-Specific Query Control**
    - ⬜ Add navigation-aware query refreshing
    - ⬜ Implement screen focus detection
    - ⬜ Configure query behavior based on screen visibility

14. **Query Suspense Mode**
    - ⬜ Set up suspense-enabled queries
    - ⬜ Create fallback UI components
    - ⬜ Implement coordinated loading states

15. **Infinite Queries for Larger Datasets**
    - ⬜ Configure pagination for large lists
    - ⬜ Implement cursor-based infinite loading
    - ⬜ Create load-more UI patterns

## Drizzle ORM Advanced Features

We are also enhancing our use of Drizzle ORM with the following features:

1. **Optimized Query Building**
   - ✅ Replace raw SQL with Drizzle query builder
   - ✅ Implement join optimization strategies
   - ✅ Create reusable query patterns

2. **Transaction Support**
   - ✅ Implement atomic operations with transactions
   - ✅ Set up rollback handling for complex mutations
   - ✅ Create transaction wrappers for multi-step operations

3. **Prepared Statements**
   - ✅ Use prepared statements for common queries
   - ✅ Implement parameterized queries for security
   - ✅ Create prepared query utilities

4. **Relational Query Enhancements**
   - ✅ Improve joins with table aliases
   - ✅ Implement relation-based querying using Drizzle's relations API
   - ✅ Create utilities for working with relations

5. **Advanced Filtering**
   - ✅ Implement complex filter conditions
   - ✅ Create query composers for dynamic filters
   - ✅ Set up filter utilities for common patterns

6. **Bulk Operations**
   - ✅ Optimize batch inserts and updates
   - ✅ Implement efficient batch operations in repositories
   - ✅ Create utilities for working with data sets

7. **Custom Migrations**
   - ⬜ Set up versioned schema migrations
   - ⬜ Replace auto-create tables with proper migration system
   - ⬜ Create utilities for managing migrations

8. **Query Performance Profiling**
   - ⬜ Add query execution timing
   - ⬜ Set up performance logging
   - ⬜ Create utilities for identifying slow queries

9. **Indexing Strategy**
   - ⬜ Add strategic indexes on frequently queried fields
   - ⬜ Implement composite indexes for query patterns
   - ⬜ Monitor and tune index performance

10. **SQL Views**
   - ⬜ Create SQL views for common complex queries
   - ⬜ Implement views for reporting and analytics
   - ⬜ Use views for read-optimization

11. **COUNT Optimization**
   - ✅ Fix and optimize COUNT queries
   - ✅ Implement efficient counting strategies
   - ⬜ Add pagination with proper count methods

12. **Live Query Efficiency**
   - ✅ Improve live query configuration
   - ✅ Optimize change detection sensitivity
   - ✅ Implement targeted refreshing for live queries

## Next Steps

1. Update UI screens to use new hooks and services pattern:
   - ✅ Update ManageOfficials screen to use useOfficials hooks
   - Update RefereeModule screen to use useReferees hooks
   - Update DEBracketPage to use useDEBouts hooks
   - Create example screens for testing the new functionality

2. Implement remaining high-priority Tanstack Query features:
   - ✅ Query Invalidation Strategies
   - ✅ Optimistic Updates
   - ✅ Background Fetching with Silent UI
   - ✅ Persistent Storage
   - ⬜ Hydration and Dehydration
   - ⬜ Query Data Transformations with select

3. Enhance Drizzle ORM usage further:
   - ✅ Replace raw SQL with the query builder
   - ✅ Implement transactions for multi-step operations
   - ✅ Optimize joins and relations
   - ✅ Use prepared statements for common operations
   - ✅ Add batch operations support
   - ✅ Fix COUNT queries implementation
   - ⬜ Add strategic indexes on frequently queried fields
   - ⬜ Create SQL views for complex queries
   - ⬜ Implement proper database migrations

4. Testing:
   - Test database operations with the enhanced Drizzle ORM features
   - Validate that Tanstack Query features are working correctly
   - Test offline functionality with persistent storage
   - Test synchronization between devices
   - Verify performance improvements with profiling
   
5. Documentation:
   - Create a comprehensive README with the new architecture
   - Document the service/hook pattern with examples
   - Create a migration guide for remaining components
   - Document best practices for querying and mutations