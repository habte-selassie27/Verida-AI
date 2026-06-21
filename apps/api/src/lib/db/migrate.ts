// IMPLEMENTER NOTE: Runs the Drizzle migrations for the Verida AI API database.
// BUILD.md TASK: STEP 3 — Database Schema (Drizzle ORM)
// ARCHITECT CONTRACT: migration runner for the Drizzle schema defined in apps/api/src/lib/db/schema.ts
// SHELBY SDK METHODS: None directly; migrations persist Shelby upload and provenance metadata.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify the migration folder path points at the API package's generated Drizzle migrations.

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { db } from './index.js';

export async function runMigrations(): Promise<void> {
  const currentFileDirectory = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(currentFileDirectory, '../../../drizzle');
  await migrate(db, { migrationsFolder });
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await runMigrations();
}
