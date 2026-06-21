// IMPLEMENTER NOTE: Configures Drizzle Kit to generate and manage the Verida AI API migrations.
// BUILD.md TASK: STEP 3 — Database Schema (Drizzle ORM)
// ARCHITECT CONTRACT: drizzle-kit configuration for apps/api/src/lib/db/schema.ts
// SHELBY SDK METHODS: None directly; this config supports persistence of Shelby-backed metadata.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify the schema path points at the API package and migrations are emitted to apps/api/drizzle.

import type { Config } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL is required to load the Drizzle configuration.');
}

export default {
  schema: './apps/api/src/lib/db/schema.ts',
  out: './apps/api/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
} satisfies Config;
