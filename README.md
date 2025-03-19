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
      components/             
      screens/                
      hooks.ts                
      services/               # Event-specific business logic
      api/                    # Event-specific API calls
      repository.ts           # Event-specific database operations
    
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

## Migration Path

This structure is set up as a skeleton for migrating the existing codebase. The migration process would involve:

1. Moving components, screens, and logic from the old structure to their new domain-specific locations
2. Updating imports to match the new structure
3. Adapting API calls and database operations to use the new domain-based organization
4. Updating the navigation to reference the new component locations

## Development Guidelines

When developing with this structure:

1. **Add new features as domains**: Create a new feature folder with all related components, screens, and logic
2. **Keep infrastructure clean**: Only add infrastructure code that's truly shared; move domain-specific code to feature folders
3. **Use index.ts files**: Export public APIs from each domain through index.ts files
4. **Respect domain boundaries**: Avoid cross-domain imports; go through public APIs instead