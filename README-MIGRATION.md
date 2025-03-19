# Domain-Based Migration Guide

This document provides guidance for completing the migration from the old structure to the new domain-based organization.

## Overview

The migration process involves moving from a technology-based structure (where files are organized by their technical role) to a domain-based structure (where files are organized by the business feature they support).

## Migration Tools

1. **migration-plan.md**: Detailed mapping of files from old location to new location
2. **migration-script.sh**: Initial script to copy files to their new locations
3. **This guide**: Step-by-step instructions for completing the migration

## Directory Structure

The new structure follows this pattern:

```
src/
  assets/                     # Static assets
  core/                       # Core utilities and types
  infrastructure/             # Cross-cutting concerns
    database/
    networking/
  features/                   # Feature domains
    tournaments/
    events/
    fencers/
    rounds/
      pool/
      de/
    officials/
    referee/
  navigation/                 # Navigation configuration
  App.tsx                     # Root component
```

## Steps to Complete the Migration

### 1. Run the Initial Migration Script

```bash
chmod +x migration-script.sh
./migration-script.sh
```

This script will copy files to their new locations, but won't modify them.

### 2. Split Monolithic Files

Several files need to be broken down by domain:

#### TournamentDatabaseUtils.ts

This file should be split into domain-specific repositories:

- `src/features/tournaments/repository.ts`
- `src/features/events/repository.ts`
- `src/features/fencers/repository.ts`
- `src/features/rounds/pool/repository.ts`
- `src/features/rounds/de/repository.ts`
- `src/features/officials/repository.ts`
- `src/features/referee/repository.ts`

Each repository should:
- Import the base repository pattern
- Implement domain-specific database operations
- Export a repository instance

#### TournamentDataProvider.ts

This provider should be split into domain-specific services:

- `src/features/tournaments/services/TournamentService.ts`
- `src/features/events/services/EventService.ts`
- `src/features/fencers/services/FencerService.ts`
- `src/features/rounds/pool/services/PoolService.ts`
- `src/features/rounds/de/services/BracketService.ts`
- `src/features/officials/services/OfficialService.ts`
- `src/features/referee/services/RefereeService.ts`

Each service should:
- Import its repository
- Implement domain-specific business logic
- Export service methods

### 3. Update Import Paths

All files need to have their import paths updated to reflect the new structure:

1. Replace technology-based imports with domain-based imports
2. Update relative paths based on new file locations
3. Ensure all imported types are available in the new structure

For example:
```typescript
// Old
import { DEBoutCard } from '../components/DEBoutCard';

// New
import { DEBoutCard } from '../../components/DEBoutCard';
```

### 4. Create Domain-Specific API Clients

Each domain should have its own API module:

- `src/features/tournaments/api/index.ts`
- `src/features/events/api/index.ts`
- etc.

These should follow the pattern in the example API client.

### 5. Update Navigation Structure

Create a new navigation configuration that:
1. Imports screens from their domain locations
2. Builds the same navigation structure as before
3. Uses consistent navigation patterns

### 6. Update App Root

Update `App.tsx` to:
1. Import from the new structure
2. Initialize domain services
3. Set up providers from the infrastructure layer

### 7. Testing

1. Ensure the project builds without errors
2. Run the application and test all features
3. Fix any runtime issues

## Considerations

### Splitting States

When breaking up the monolithic state provider:
1. Identify which state belongs to which domain
2. Create smaller, focused context providers
3. Consider where cross-domain state should live

### Dependency Management

Follow these guidelines for dependencies:
1. Core and infrastructure should not depend on features
2. Features can depend on core and infrastructure
3. Features should minimize dependencies on other features
4. When cross-feature dependencies exist, they should go through public APIs

## Benefits of the New Structure

1. **Improved Developer Experience**: Easier to find and work with related code
2. **Better Onboarding**: New developers can understand the application through its domains
3. **Isolated Testing**: Domains can be tested more independently
4. **Scalability**: New features can be added as new domains without affecting existing code
5. **Clear Boundaries**: Domain responsibilities are better defined