# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TournaFence is a React Native (Expo) application for managing fencing tournaments. It provides features for tournament creation, management, scoring, and Bluetooth connectivity with fencing scoring boxes.

## Common Development Commands

### Running the Application

```bash
npm start          # Start development server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
```

### Database Management

```bash
npm run drizzle:generate  # Generate migrations after schema changes
npm run drizzle:studio    # Open visual database interface
```

### Code Quality

```bash
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run test              # Run all tests
npm run test:coverage     # Run tests with coverage report
```

### Testing Specific Files

```bash
npx jest path/to/test.tsx           # Run a specific test file
npx jest --watch                    # Run tests in watch mode
npx jest -u                         # Update snapshots
```

## Architecture Overview

### Technology Stack

- **Framework**: React Native with Expo (SDK 52)
- **Navigation**: React Navigation (native-stack, bottom-tabs)
- **State Management**: React Query (TanStack Query) for server state
- **Database**: SQLite with Drizzle ORM
- **Networking**: TCP sockets for tournament server/client, Bluetooth LE for scoring boxes
- **Authentication/Authorization**: CASL for role-based access control
- **Internationalization**: react-i18next with support for EN, ES, FR, ZH
- **Testing**: Jest with React Native Testing Library

### Key Architectural Components

#### Database Layer (Drizzle ORM)

- Schema definitions: `src/db/schema/index.ts`
- Database client: `src/db/DrizzleClient.ts`
- All database operations: `src/db/DrizzleDatabaseUtils.ts`
- Utility modules in `src/db/utils/` for entity-specific operations

#### Networking Architecture

1. **Tournament Server/Client** (`src/networking/`)

    - TCP-based communication using NDJSON format
    - Server discovery via Zeroconf/Bonjour
    - Automatic reconnection and message queuing
    - Event-based architecture using EventEmitter

2. **Bluetooth LE Integration** (`src/networking/ble/`)
    - Context-based state management (`ScoringBoxContext.tsx`)
    - Support for multiple scoring box types (TournaFence, EnPointe, Skewered)
    - Service interfaces for each box type
    - Persistent connections across app navigation

#### State Management

- **Server State**: React Query for caching and synchronization
- **Local State**: React hooks and context
- **Persistent State**: Custom hook (`usePersistentStateHook`) using AsyncStorage
- **Tournament Sync**: Real-time updates via `TournamentDataHooks.ts`

#### RBAC System

- CASL-based ability definitions (`src/rbac/ability.ts`)
- Context provider for ability management
- `Can` component for UI permission checks

### Project Structure Patterns

#### Screen Organization

- Screens in `src/navigation/screens/`
- Complex screens have their own directories with components and hooks
- Utility functions grouped in `src/navigation/utils/`

#### Component Patterns

- UI components in `src/components/ui/`
- Screen-specific components in screen directories
- Network-related components in `src/networking/components/`

#### Testing Structure

- Tests mirror source structure in `__tests__/`
- Mocks in `__mocks__/` for external dependencies
- Snapshot tests for UI components

## Important Development Notes

### Drizzle ORM Usage

- Always use utility functions in `DrizzleDatabaseUtils.ts` for database operations
- Run `npm run drizzle:generate` after schema changes
- Migrations are managed in the `drizzle/` directory

### Bluetooth Development

- The app uses react-native-ble-plx for BLE communication
- BLE operations must handle connection state changes gracefully
- Different scoring box types have different service UUIDs and characteristics

### Network Communication

- Tournament client/server use NDJSON format for streaming
- Messages have request IDs for tracking responses
- Automatic reconnection is built into TournamentClient

### Testing Approach

- Jest is configured with React Native Testing Library
- Coverage reports are generated in `./coverage/`
- Mocks are provided for platform-specific modules

### Platform-Specific Considerations

- iOS and Android native directories are gitignored (Continuous Native Generation)
- Use config plugins for native modifications
- Edge-to-edge display is configured for Android
- Requires development builds (cannot run with Expo Go)
