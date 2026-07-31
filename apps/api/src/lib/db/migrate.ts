import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

import { db } from './index.js';

export async function runMigrations(): Promise<void> {
  const currentFileDirectory = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(currentFileDirectory, '../../../drizzle');

  try {
    await migrate(db, { migrationsFolder });
    console.log('[DB] Migrations applied successfully.');
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);

    if (message.includes('already exists')) {
      console.log('[DB] Tables already exist. Marking Drizzle migrations as applied...');

      try {
        // Get all migration tags from the drizzle folder
        const fs = await import('node:fs/promises');
        const journalPath = path.resolve(migrationsFolder, 'meta/_journal.json');
        const journal = JSON.parse(await fs.readFile(journalPath, 'utf-8'));

        for (const entry of journal.entries) {
          await db.execute(sql`
            INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
            VALUES (${entry.tag}, ${entry.when})
            ON CONFLICT DO NOTHING
          `);
        }

        console.log(`[DB] Marked ${journal.entries.length} migrations as applied.`);
      } catch (markErr) {
        console.error('[DB] Failed to mark migrations:', markErr);
      }
    } else {
      console.error('[DB] Migration error (non-idempotent):', cause);
    }
  }
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await runMigrations();
}
