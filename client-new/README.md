# Tournament Management Application

## Domain-Based Directory Structure

This codebase has been reorganized to follow a domain-driven design approach, making it easier to work on specific features and understand the application architecture.

## Directory Structure

```
src/
  assets/                     # Images, fonts, and other static assets
    icons/
    fonts/
  
  core/                       # Core utilities, types, and shared functionality
    types.ts                  # Shared type definitions
    components/               # Shared UI components
    hooks/                    # Shared hooks like usePersistentState
    utils/                    # Utility functions
  
  infrastructure/             # Cross-cutting infrastructure concerns
    database/
      client.ts               # Drizzle ORM database client
      schema.ts               # Database schema definitions
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
        useTournamentQueries.ts  # Query hooks for tournaments
      services/               # Tournament-specific business logic
      api/                    # Tournament-specific API calls
      repository.ts           # Tournament-specific Drizzle ORM operations
    
    events/                   # Event management
      components/             
      screens/                
      hooks/                  # Event data hooks with Tanstack Query 
        useEventQueries.ts    # Query hooks for events
      services/               # Event-specific business logic
      api/                    # Event-specific API calls
      repository.ts           # Event-specific Drizzle ORM operations
    
    fencers/                  # Fencer management
      components/             
      screens/                
      hooks.ts                
      services/               # Fencer-specific business logic
      api/                    # Fencer-specific API calls
      repository.ts           # Fencer-specific database operations
    
    rounds/                   # Round management
      pool/                   # Pool rounds
        components/  
        screens/
        services/             # Pool-specific business logic
        api/                  # Pool-specific API calls
        repository.ts         # Pool-specific database operations
      
      de/                     # Direct elimination
        components/
        screens/
        utils/                # DE algorithm utilities
        services/             # DE-specific business logic
        api/                  # DE-specific API calls
        repository.ts         # DE-specific database operations
        single/               # Single elimination
        double/               # Double elimination 
        compass/              # Compass draw
    
    officials/                # Officials management
      components/
      screens/
      services/               # Officials-specific business logic
      api/                    # Officials-specific API calls
      repository.ts           # Officials-specific database operations
    
    referee/                  # Referee module
      components/
      screens/
      services/               # Referee-specific business logic
      api/                    # Referee-specific API calls
      repository.ts           # Referee-specific database operations
  
  navigation/                 # App navigation configuration
  
  App.tsx                     # Root component
```

## Benefits of Domain-Based Structure

1. **Feature Cohesion**: Files related to the same business domain are grouped together
2. **Improved Developer Experience**: Focus on specific domains without navigating through unrelated code  
3. **Better Onboarding**: New developers can quickly understand the application structure
4. **Isolated Testing**: Domains can be tested more independently
5. **Scalability**: New features can be added as new domains without affecting existing code
6. **Clear Boundaries**: Domain responsibilities are more clearly defined

## Migration Status

This project is currently being migrated from a technology-based structure to a domain-based structure. For detailed information on the migration progress, please refer to:

- [MIGRATION-STATUS.md](./MIGRATION-STATUS.md) - Current status and checklist
- [migration-plan.md](./migration-plan.md) - Detailed mapping of files from old structure to new structure
- [README-MIGRATION.md](./README-MIGRATION.md) - Step-by-step guide for completing the migration

The migration process involves:

1. Moving components, screens, and logic from the old structure to their new domain-specific locations
2. Updating imports to match the new structure
3. Migrating from the current database implementation to Drizzle ORM with live queries
4. Implementing Tanstack Query for React data fetching and state management
5. Adapting API calls and database operations to use the new domain-based organization
6. Updating the navigation to reference the new component locations

The project has been moved from its original location to `/Users/luka/Documents/DevFolder/client/client-new`.

## Development Guidelines

When developing with this structure:

1. **Add new features as domains**: Create a new feature folder with all related components, screens, and logic
2. **Keep infrastructure clean**: Only add infrastructure code that's truly shared; move domain-specific code to feature folders
3. **Use index.ts files**: Export public APIs from each domain through index.ts files
4. **Respect domain boundaries**: Avoid cross-domain imports; go through public APIs instead