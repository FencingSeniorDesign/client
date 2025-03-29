# Drizzle ORM Integration

This document describes how Drizzle ORM is integrated into the TournaFence application and how to use it for database operations.

## Overview

Drizzle ORM is a TypeScript ORM that provides type-safe database queries. In this application, it's used with Expo SQLite to manage the tournament database.

## Project Structure

- `src/db/schema/index.ts` - Contains all database table definitions and relationships
- `src/db/DrizzleClient.ts` - Sets up the Drizzle ORM instance with Expo SQLite
- `src/db/DrizzleDatabaseUtils.ts` - Contains all database utility functions for performing CRUD operations
- `drizzle.config.ts` - Configuration for Drizzle Kit (migrations and studio)

## Usage

### Database Schema

Database tables are defined in `src/db/schema/index.ts`. Each table is defined using Drizzle's schema builders, such as `sqliteTable`, `text`, `integer`, etc.

Example:
```typescript
// Tournaments table
export const tournaments = sqliteTable('Tournaments', {
  name: text('name').primaryKey(),
  iscomplete: integer('iscomplete', { mode: 'boolean' }).default(false),
});
```

### Database Client

The database client is initialized in `src/db/DrizzleClient.ts`. It opens the SQLite database and provides a Drizzle instance.

```typescript
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'tf.db';
const expoDb = openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDb, { schema });
```

### Performing Queries

All database operations should be performed using the `DrizzleDatabaseUtils.ts` module. This provides a consistent interface and error handling for all database operations.

Examples:

```typescript
// Creating a tournament
await dbCreateTournament("My Tournament");

// Listing ongoing tournaments
const tournaments = await dbListOngoingTournaments();

// Getting fencers in an event
const fencers = await dbGetFencersInEventById(event);
```

## Migrations

Drizzle supports database migrations for schema changes. These are managed using Drizzle Kit.

### Generating Migrations

After making changes to the schema in `src/db/schema/index.ts`, run:

```bash
npm run drizzle:generate
```

This will generate migration files in the `drizzle` directory.

### Applying Migrations

Migrations are applied in the `initializeDatabase` function in `src/db/DrizzleClient.ts`.

```typescript
// This is commented out by default, but can be uncommented to enable migrations
await migrate(db, { migrationsFolder: './drizzle' });
```

## Drizzle Studio

Drizzle provides a visual interface for exploring and modifying your database. Run:

```bash
npm run drizzle:studio
```

This will start a web server that you can access to view and edit your database.

## Best Practices

1. Always use the utility functions in `DrizzleDatabaseUtils.ts` rather than making direct database calls
2. Add TypeScript types to function parameters and return values for better type safety
3. Use relations defined in the schema to maintain data integrity
4. When possible, use the Drizzle query builder instead of raw SQL for type safety
5. For complex queries that are difficult to express with the query builder, SQL template literals can be used