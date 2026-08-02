// IMPLEMENTER NOTE: Exposes the shared Drizzle client and schema for the Verida AI API.
// BUILD.md TASK: STEP 3 — Database Schema (Drizzle ORM)
// ARCHITECT CONTRACT: db instance connected via postgres.js plus schema exports for downstream API modules
// SHELBY SDK METHODS: None directly; this entrypoint supports persistence for Shelby-backed workflows.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify DATABASE_URL is required and the db instance is created from the postgres.js driver.

import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from './schema.js';

function getRequiredDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is required to initialize the Verida AI database client.');
  }

  return databaseUrl;
}

// Lazy database initialization — only connects on first use
let _db: PostgresJsDatabase<typeof schema> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function initDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;

  const databaseUrl = getRequiredDatabaseUrl();
  _client = postgres(databaseUrl, {
    max: 10,
    ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  _db = drizzle(_client, { schema });
  return _db;
}

// Proxy that lazily initializes the database on first access
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, _receiver) {
    const instance = initDb();
    const value = Reflect.get(instance, prop, instance);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL;
  return url && url.length > 0 ? url : null;
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = null;
    _db = null;
  }
}

export { schema };
export * from './schema.js';
