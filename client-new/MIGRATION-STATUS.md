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
- ⬜ Migrate official-related screens and components
- ⬜ Migrate referee module
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
      base-repository.ts      # Base repository implementation
      live-query.ts           # Live query hooks for real-time updates
      migrations/             # Database migration files
    
    query/
      provider.tsx            # Tanstack Query provider setup
      utils.ts                # Query utilities
    
    networking/
      client.ts               # Base API client setup
      server.ts               # Server implementation
      types.ts                # Common network types
      components/             # Shared networking components
  
  features/                   # Feature modules
    tournaments/              # Tournament management
      components/             # Tournament-specific components
      screens/                # Tournament screens
      hooks/                  # Tournament data hooks with Tanstack Query
        useTournamentQueries.ts  # Query hooks for tournaments (including live queries)
      services/               # Tournament-specific business logic
      api/                    # Tournament-specific API calls
      repository.ts           # Tournament-specific Drizzle ORM operations
    
    events/                   # Event management
      components/             # Event-specific components
      screens/                # Event screens
        EventManagement.tsx   # Event management screen with live updates
      hooks/                  # Event data hooks with Tanstack Query
        useEventQueries.ts    # Query hooks for events (including live queries)
      repository.ts           # Event-specific Drizzle ORM operations
    
    fencers/                  # Fencer management
      ...
    
    rounds/                   # Round management
      pool/                   # Pool rounds
        ...
      
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

## Next Steps

1. Complete migration of tournament screens and components:
   - Test tournament creation, deletion, and list refreshing
   - Fix any remaining issues with the tournament components

2. Complete tests for event-related screens:
   - Test EventManagement and EventSettings with live data
   - Verify that fencer search, add, and remove functionality works correctly
   - Test round creation and configuration with various tournament sizes
   - Ensure all DB operations are atomic and properly cached

3. ✅ Create a reusable fencer selection component:
   - ✅ Extract fencer selection functionality from EventSettings into a reusable component
   - ✅ Add search functionality and improved UI for large fencer lists
   - ✅ Support multiple selection modes with configuration options

4. Migrate round-related screens and components:
   - ✅ Create pool repository pattern with hooks and queries
   - ✅ Update PoolsPage to use the repository pattern
   - ⬜ Update BoutOrderPage to use the pool bout repository
   - ⬜ Update DE bracket pages to use the round repository and queries
   - ⬜ Test round creation and management

5. Complete the referee module:
   - Finish implementing the bout scoring with real-time updates
   - Test the live updates on multiple devices

6. Testing:
   - Test database operations with Drizzle ORM
   - Validate that live queries are properly updating the UI