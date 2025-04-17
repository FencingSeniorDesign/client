# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Run Commands

- `npm start` - Start the development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint on project files
- `npm run format` - Format code with Prettier
- `npm run drizzle:generate` - Generate Drizzle ORM artifacts
- `npm run drizzle:studio` - Run Drizzle Studio

## Code Style

- Use TypeScript strictly with proper typing
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

## Project Structure

- `src/` - Main application code
- `src/components/` - Reusable React components
- `src/navigation/` - Navigation configuration
- `src/db/` - Database (Drizzle) configuration
- `src/networking/` - Network communication utils
- `assets/` - Static assets (images, fonts)
