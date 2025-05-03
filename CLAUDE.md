# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Run Commands

- `npm start` - Start the development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint on project files
- `npm run format` - Format code with Prettier
- `npm test` - Run all tests
- `npm test -- -t "test name"` - Run a specific test
- `npm test -- --testPathPattern=path/to/test.tsx` - Run tests in specific file
- `npm run test:coverage` - Run tests with coverage report
- `npm run drizzle:generate` - Generate Drizzle ORM artifacts
- `npm run drizzle:studio` - Run Drizzle Studio

## Code Style

- Use TypeScript with strict mode enabled
- Follow Prettier/ESLint configurations:
    - 2 space indentation
    - Single quotes
    - Max line length: 80 chars
    - Arrow function syntax for components
- Import ordering: React/libraries first, then project imports
- Use functional components with hooks
- Define component props with TypeScript interfaces
- Name components with PascalCase, variables/functions with camelCase
- Use named exports/imports when possible
- Handle errors with try/catch blocks and proper logging

## Project Structure

- `src/` - Main application code
- `src/components/` - Reusable React components
- `src/navigation/` - Navigation configuration and screens
- `src/db/` - Database (Drizzle) configuration
- `src/networking/` - Network communication utils
- `src/rbac/` - Role-based access control (CASL)
- `__tests__/` - Test files mirroring src structure
- `assets/` - Static assets (images, fonts)