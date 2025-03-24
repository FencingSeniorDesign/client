# Migration Plan: Moving to Domain-Based Structure

This document outlines the step-by-step plan for migrating the current codebase to the new domain-based structure in `/Users/luka/Documents/DevFolder/client/client-new`.

## 1. Issues with Current Structure

1. **Illogical Location of Files**: Most components are under `navigation/` regardless of their domain
2. **Monolithic Files**: Several large files handle multiple concerns (e.g., TournamentDatabaseUtils)
3. **Mixed Domain Logic**: Features from different domains are mixed together
4. **Unclear Boundaries**: Lack of clear separation between domains

## 2. Migration Steps by Domain

### Core

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/types.d.ts` | `/src/core/types.ts` | Core type definitions |
| `/src/navigation/navigation/types.tsx` | `/src/core/types/navigation.ts` | Navigation types |
| `/src/hooks/usePersistentStateHook.ts` | `/src/core/hooks/usePersistentStateHook.ts` | Generic persistence hook |

### Infrastructure: Database

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/db/TournamentDatabaseUtils.ts` | `/src/infrastructure/database/base-repository.ts` + domain-specific implementations | Split monolithic database file by domain |

### Infrastructure: Networking

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/networking/TournamentClient.ts` | `/src/infrastructure/networking/client.ts` | Base client implementation |
| `/src/networking/TournamentServer.ts` | `/src/infrastructure/networking/server.ts` | Server implementation |
| `/src/networking/NetworkUtils.ts` | `/src/infrastructure/networking/utils.ts` | Network utilities |
| `/src/networking/MessageTypes.ts` | `/src/infrastructure/networking/types.ts` | Network message types |
| `/src/networking/NetworkErrors.ts` | `/src/infrastructure/networking/errors.ts` | Network error definitions |
| `/src/networking/components/ConnectionStatusBar.tsx` | `/src/infrastructure/networking/components/ConnectionStatusBar.tsx` | UI component for connection status |

### Tournament Domain

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/navigation/screens/Home.tsx` | `/src/features/tournaments/screens/Home.tsx` | Home screen with tournament list |
| `/src/navigation/screens/TournamentListComponent.tsx` | `/src/features/tournaments/components/TournamentList.tsx` | Tournament listing component |
| `/src/navigation/screens/CreateTournamentModal.tsx` | `/src/features/tournaments/components/CreateTournamentModal.tsx` | Tournament creation modal |
| `/src/navigation/screens/JoinTournamentModal.tsx` | `/src/features/tournaments/components/JoinTournamentModal.tsx` | Tournament joining modal |
| Portions of `/src/db/TournamentDatabaseUtils.ts` | `/src/features/tournaments/repository.ts` | Tournament-specific database operations |
| Portions of `/src/hooks/useTournamentQueries.ts` | `/src/features/tournaments/hooks.ts` | Tournament-specific hooks |
| Portions of `/src/data/TournamentDataProvider.ts` | `/src/features/tournaments/services/TournamentService.ts` | Tournament business logic |

### Events Domain

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/navigation/screens/EventManagement.tsx` | `/src/features/events/screens/EventManagement.tsx` | Event management screen |
| `/src/navigation/screens/EventSettings.tsx` | `/src/features/events/screens/EventSettings.tsx` | Event settings screen |
| Portions of `/src/db/TournamentDatabaseUtils.ts` | `/src/features/events/repository.ts` | Event-specific database operations |
| Portions of `/src/data/TournamentDataProvider.ts` | `/src/features/events/services/EventService.ts` | Event business logic |

### Fencers Domain

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| Portions of `/src/db/TournamentDatabaseUtils.ts` | `/src/features/fencers/repository.ts` | Fencer-specific database operations |
| Portions of `/src/data/TournamentDataProvider.ts` | `/src/features/fencers/services/FencerService.ts` | Fencer business logic |

### Rounds Domain: Pool

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/navigation/screens/PoolsPage.tsx` | `/src/features/rounds/pool/screens/PoolsPage.tsx` | Pools management screen |
| `/src/navigation/screens/BoutOrderPage.tsx` | `/src/features/rounds/pool/screens/BoutOrderPage.tsx` | Bout order screen |
| Portions of `/src/navigation/utils/RoundAlgorithms.tsx` | `/src/features/rounds/pool/utils/PoolUtils.ts` | Pool-specific algorithms |
| Portions of `/src/db/TournamentDatabaseUtils.ts` | `/src/features/rounds/pool/repository.ts` | Pool-specific database operations |

### Rounds Domain: Direct Elimination (DE)

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/navigation/screens/DEBracketPage.tsx` | `/src/features/rounds/de/screens/DEBracketPage.tsx` | DE bracket page |
| `/src/navigation/screens/DoubleEliminationPage.tsx` | `/src/features/rounds/de/double/screens/DoubleEliminationPage.tsx` | Double elimination page |
| `/src/navigation/screens/CompassDrawPage.tsx` | `/src/features/rounds/de/compass/screens/CompassDrawPage.tsx` | Compass draw page |
| `/src/navigation/components/DEBoutCard.tsx` | `/src/features/rounds/de/components/DEBoutCard.tsx` | DE bout card component |
| `/src/navigation/components/DEHelpModal.tsx` | `/src/features/rounds/de/components/DEHelpModal.tsx` | DE help modal |
| `/src/navigation/components/DEOverview.tsx` | `/src/features/rounds/de/components/DEOverview.tsx` | DE overview component |
| `/src/navigation/utils/BracketFormats.ts` | `/src/features/rounds/de/utils/BracketFormats.ts` | Bracket format utilities |
| `/src/navigation/utils/CompassDrawUtils.ts` | `/src/features/rounds/de/compass/utils/CompassDrawUtils.ts` | Compass draw utilities |
| `/src/navigation/utils/DoubleEliminationUtils.ts` | `/src/features/rounds/de/double/utils/DoubleEliminationUtils.ts` | Double elimination utilities |
| `/src/navigation/utils/DENavigationUtil.ts` | `/src/features/rounds/de/utils/DENavigationUtil.ts` | DE navigation utilities |
| `/src/navigation/screens/RoundResults.tsx` | `/src/features/rounds/results/screens/RoundResults.tsx` | Round results screen |
| Portions of `/src/db/TournamentDatabaseUtils.ts` | `/src/features/rounds/de/repository.ts` | DE-specific database operations |

### Officials Domain

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/navigation/screens/ManageOfficials.tsx` | `/src/features/officials/screens/ManageOfficials.tsx` | Officials management screen |
| Portions of `/src/db/TournamentDatabaseUtils.ts` | `/src/features/officials/repository.ts` | Officials-specific database operations |
| Portions of `/src/data/TournamentDataProvider.ts` | `/src/features/officials/services/OfficialService.ts` | Officials business logic |

### Referee Domain

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/navigation/screens/RefereeModule/RefereeModule.tsx` | `/src/features/referee/screens/RefereeModule.tsx` | Referee module screen |
| `/src/navigation/screens/RefereeModule/CustomTimeModal.tsx` | `/src/features/referee/components/CustomTimeModal.tsx` | Custom time modal component |
| Portions of `/src/db/TournamentDatabaseUtils.ts` | `/src/features/referee/repository.ts` | Referee-specific database operations |

### Data Management

| Current Location | New Location | Notes |
|------------------|--------------|-------|
| `/src/data/TournamentDataProvider.ts` | Domain-specific service files | Split by domain |
| `/src/data/TournamentDataHooks.ts` | Domain-specific hook files | Split by domain |
| `/src/hooks/useTournamentQueries.ts` | Domain-specific hook files | Split by domain |

## 3. Migration Process

1. **Phase 1: Copy Base Structure**
   - Create domain directory structure
   - Create core infrastructure files

2. **Phase 2: Move Core & Infrastructure Files**
   - Move and adapt core type definitions
   - Move networking infrastructure

3. **Phase 3: Migrate Domain by Domain**
   - Start with the Tournament domain (most foundational)
   - Move Events domain
   - Move Rounds domain (pools, DE)
   - Move Officials and Referee domains
   - Move Fencers domain

4. **Phase 4: Database Migration & Split Monolithic Files**
   - Implement Drizzle ORM schema for database tables
   - Set up Tanstack Query integration for React components
   - Configure live queries with Drizzle ORM
   - Split `TournamentDatabaseUtils.ts` into domain repositories using Drizzle ORM
   - Split `TournamentDataProvider.ts` into domain services
   - Replace existing query hooks with Tanstack Query hooks

5. **Phase 5: Update Imports & Fix References**
   - Update all import paths
   - Fix any broken references
   - Ensure type compatibility

6. **Phase 6: Navigation Setup**
   - Create new navigation structure that connects all domains

7. **Phase 7: Testing**
   - Build and test the application
   - Fix any runtime issues

## 4. Implementation Strategy for Monolithic File Splitting

### Database Migration to Drizzle ORM with Tanstack Query

The existing database implementation will be replaced with Drizzle ORM and Tanstack Query:

1. Define Drizzle ORM schema for all database tables
2. Configure SQLite database with Drizzle ORM
3. Set up live query functionality with Drizzle
4. Integrate Tanstack Query for React data fetching
5. Create repository pattern that leverages Drizzle ORM
6. Implement proper database migrations instead of auto-create tables
7. Add strategic indexes on frequently queried fields
8. Create SQL views for common complex queries
9. Implement proper relation queries using Drizzle's relation API
10. Add batch operation support in repositories
11. Use prepared statements for frequently executed queries
12. Fix and optimize COUNT queries
13. Improve live query efficiency with optimized configurations

### Splitting TournamentDatabaseUtils.ts

This file needs to be broken down into domain repositories using Drizzle ORM:

1. Identify database operations by domain
2. Create Drizzle ORM schemas for each domain's tables
3. Extract domain-specific operations to relevant repository files
4. Implement repositories using Drizzle ORM queries
5. Use Tanstack Query hooks to expose data to components
6. Keep domain-specific database logic with its feature

### Splitting TournamentDataProvider.ts

This provider handles state across domains and will be updated to work with Tanstack Query:

1. Identify state management by domain
2. Replace state management with Tanstack Query where applicable
3. Extract domain-specific state to relevant service files
4. Create focused providers for each domain
5. Use React Context only for complex cross-domain state
6. Leverage Tanstack Query's built-in caching and state management

## 5. Success Criteria

The migration is successful when:

1. All code is organized by domain/feature
2. No domain has unnecessary dependencies on other domains
3. Infrastructure code is cleanly separated from domain code
4. The application works with the same functionality as before
5. Developer experience is improved when working on specific features