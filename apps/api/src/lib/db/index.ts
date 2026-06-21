// IMPLEMENTER NOTE: Exposes the shared Drizzle client and schema for the Verida AI API.
// BUILD.md TASK: STEP 3 — Database Schema (Drizzle ORM)
// ARCHITECT CONTRACT: db instance connected via postgres.js plus schema exports for downstream API modules
// SHELBY SDK METHODS: None directly; this entrypoint supports persistence for Shelby-backed workflows.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify DATABASE_URL is required and the db instance is created from the postgres.js driver.

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from './schema.js';

function getRequiredDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is required to initialize the Verida AI database client.');
  }

  return databaseUrl;
}

export const databaseUrl = getRequiredDatabaseUrl();
export const client = postgres(databaseUrl, {
  max: 10,
});

export const db = drizzle(client, { schema });

export { schema };
export * from './schema.js';
