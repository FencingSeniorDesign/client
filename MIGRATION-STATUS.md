# Migration Status

This document tracks the progress of migrating the codebase to the new domain-based structure.

## Overview

The migration involves moving from a technology-centric structure to a domain-based structure where code is organized by feature rather than by technical layer.

## Completed Items

- ✅ Created domain-based directory structure
- ✅ Set up core typings in `src/core/types.ts`
- ✅ Set up navigation types in `src/navigation/types.ts`
- ✅ Created placeholder for base repository pattern
- ✅ Created infrastructure networking (simplified versions)
- ✅ Migrated App.tsx to new structure
- ✅ Created tournament list component in the new structure
- ✅ Created placeholder home screen and modals
- ✅ Set up basic navigation with proper imports from domain folders

## To Do Items

- ⬜ Migrate tournament database functionality with Drizzle ORM
- ⬜ Migrate all tournament screens and components
- ⬜ Migrate event-related screens and components
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
      init.ts                 # Database initialization
      base-repository.ts      # Base repository patterns/classes
      types.ts                # Common database types
    
    networking/
      client.ts               # Base API client setup
      server.ts               # Server implementation
      types.ts                # Common network types
      components/             # Shared networking components
  
  features/                   # Feature modules
    tournaments/              # Tournament management
      components/             # Tournament-specific components
      screens/                # Tournament screens
      hooks.ts                # Tournament data hooks
      services/               # Tournament-specific business logic
      api/                    # Tournament-specific API calls
      repository.ts           # Tournament-specific database operations
    
    events/                   # Event management
      ...

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
      ...
  
  navigation/                 # App navigation configuration
  
  App.tsx                     # Root component
```

## Next Steps

1. Focus on completing the migration of one domain at a time
2. Start with the tournament domain, as it's the most foundational
3. Move on to events, rounds, officials, and referee domains
4. Finally, implement the Drizzle ORM integration
5. Test the complete migration