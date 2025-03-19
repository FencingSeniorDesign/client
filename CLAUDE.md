# TournaFence Development Guidelines

## Build Commands
- `npm run start` - Start Expo development server with dev client
- `npm run web` - Start web version of the app
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator/device
- `npx expo test` - Run tests (single test: `npx expo test -t "test name"`)
- `npx tsc --noEmit` - Run TypeScript type checking

## Code Style Guidelines
- **Formatting**: 2-space indentation, single quotes, semicolons required
- **Types**: Use TypeScript strict mode, prefer explicit types for function parameters/returns
- **Naming**: 
  - PascalCase for components, interfaces, types
  - camelCase for variables, functions, methods
  - snake_case for database fields
- **Imports**: Group imports - React first, then external libraries, then internal modules
- **Components**: Prefer functional components with hooks over class components
- **Error Handling**: Use try/catch for async operations, proper error states in UI components
- **State Management**: Use React Query for server state, Zustand for client state
- **File Structure**: Follow domain-driven design with feature-based organization

## Project Structure
The codebase follows a domain-driven folder structure with features grouped by domain.