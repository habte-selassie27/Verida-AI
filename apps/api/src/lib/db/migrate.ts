import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

import { db } from './index.js';

// Idempotent full-table creation for tables added after the original Drizzle
// migrations were written. CREATE TABLE IF NOT EXISTS is safe to run on every
// boot (existing tables no-op), so new tables reach both fresh and deployed
// databases without hand-editing the Drizzle migration journal.
const TABLE_CREATES: string[] = [
  `CREATE TABLE IF NOT EXISTS "community_posts" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "slug" text NOT NULL,
    "category" text NOT NULL,
    "excerpt" text,
    "content" text NOT NULL,
    "author_address" text NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "status" text DEFAULT 'published' NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "community_comments" (
    "id" serial PRIMARY KEY NOT NULL,
    "post_id" integer NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
    "author_address" text,
    "display_name" text,
    "content" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "community_likes" (
    "post_id" integer NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
    "liker_id" text NOT NULL,
    "liker_address" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY ("post_id", "liker_id")
  );`,
];

// Idempotent column definitions for every table in schema.ts. These repair
// tables that were created outside Drizzle tracking (before migrations were
// introduced), where CREATE TABLE IF NOT EXISTS would silently no-op and
// leave newer columns missing.
const TABLE_COLUMNS: Record<string, string[]> = {
  publishers: [
    `"username" text`,
    `"bio" text`,
    `"total_datasets" integer NOT NULL DEFAULT 0`,
    `"total_earnings" bigint NOT NULL DEFAULT 0`,
    `"verified" boolean NOT NULL DEFAULT false`,
    `"created_at" timestamp with time zone DEFAULT now() NOT NULL`,
  ],
  datasets: [
    `"shelby_blob_id" text NOT NULL`,
    `"name" text NOT NULL`,
    `"description" text NOT NULL`,
    `"tags" text[] NOT NULL`,
    `"size_bytes" bigint NOT NULL`,
    `"version" integer NOT NULL`,
    `"publisher_address" text NOT NULL`,
    `"created_at" timestamp with time zone DEFAULT now() NOT NULL`,
    `"access_type" text NOT NULL`,
    `"price_per_access" bigint`,
    `"license" text NOT NULL`,
    `"provenance_receipt" jsonb NOT NULL`,
    `"merkle_root" text NOT NULL`,
    `"verified" boolean`,
    `"tampered" boolean DEFAULT false NOT NULL`,
    `"schema_profile" jsonb`,
    `"ai_description" text`,
    `"suggested_tags" text[] DEFAULT '{}' NOT NULL`,
    `"describe_status" text DEFAULT 'pending' NOT NULL`,
    `"described_at" timestamp with time zone`,
    `"modality" text`,
    `"estimated_row_count" bigint`,
    `"quality_score" real`,
    `"quality_breakdown" jsonb`,
    `"quality_scored_at" timestamp with time zone`,
    `"embedding" jsonb`,
    `"embedded_at" timestamp with time zone`,
  ],
  dataset_versions: [
    `"dataset_id" integer NOT NULL`,
    `"version" integer NOT NULL`,
    `"shelby_blob_id" text NOT NULL`,
    `"changelog" text`,
    `"created_at" timestamp with time zone DEFAULT now() NOT NULL`,
    `"merkle_root" text NOT NULL`,
    `"size_bytes" bigint NOT NULL`,
  ],
  access_sessions: [
    `"dataset_id" integer NOT NULL`,
    `"accessor_address" text NOT NULL`,
    `"session_id" text NOT NULL`,
    `"created_at" timestamp with time zone DEFAULT now() NOT NULL`,
    `"expires_at" timestamp with time zone NOT NULL`,
    `"bytes_consumed" bigint DEFAULT 0 NOT NULL`,
    `"status" text NOT NULL`,
  ],
  provenance_chain: [
    `"dataset_id" integer NOT NULL`,
    `"version" integer NOT NULL`,
    `"event_type" text NOT NULL`,
    `"actor_address" text NOT NULL`,
    `"timestamp" timestamp with time zone DEFAULT now() NOT NULL`,
    `"shelby_receipt" jsonb NOT NULL`,
    `"tx_hash" text NOT NULL`,
    `"metadata" jsonb NOT NULL`,
  ],
};

const TABLE_INDEXES: Record<string, string[]> = {
  community_posts: [
    `CREATE UNIQUE INDEX IF NOT EXISTS "community_posts_slug_unique" ON "community_posts" USING btree ("slug")`,
    `CREATE INDEX IF NOT EXISTS "community_posts_status_idx" ON "community_posts" USING btree ("status", "published_at")`,
    `CREATE INDEX IF NOT EXISTS "community_posts_category_idx" ON "community_posts" USING btree ("category")`,
  ],
  community_comments: [
    `CREATE INDEX IF NOT EXISTS "community_comments_post_idx" ON "community_comments" USING btree ("post_id")`,
    `CREATE INDEX IF NOT EXISTS "community_comments_author_idx" ON "community_comments" USING btree ("author_address")`,
  ],
  community_likes: [
    `CREATE INDEX IF NOT EXISTS "community_likes_post_idx" ON "community_likes" USING btree ("post_id")`,
  ],
  datasets: [
    `CREATE UNIQUE INDEX IF NOT EXISTS "datasets_shelby_blob_id_unique" ON "datasets" USING btree ("shelby_blob_id")`,
    `CREATE INDEX IF NOT EXISTS "datasets_publisher_address_idx" ON "datasets" USING btree ("publisher_address")`,
    `CREATE INDEX IF NOT EXISTS "datasets_tags_idx" ON "datasets" USING btree ("tags")`,
    `CREATE INDEX IF NOT EXISTS "datasets_modality_idx" ON "datasets" USING btree ("modality")`,
    `CREATE INDEX IF NOT EXISTS "datasets_quality_score_idx" ON "datasets" USING btree ("quality_score")`,
    `CREATE INDEX IF NOT EXISTS "datasets_describe_status_idx" ON "datasets" USING btree ("describe_status")`,
  ],
  dataset_versions: [
    `CREATE INDEX IF NOT EXISTS "dataset_versions_dataset_id_idx" ON "dataset_versions" USING btree ("dataset_id")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "dataset_versions_dataset_id_version_unique" ON "dataset_versions" USING btree ("dataset_id", "version")`,
    `CREATE INDEX IF NOT EXISTS "dataset_versions_shelby_blob_id_idx" ON "dataset_versions" USING btree ("shelby_blob_id")`,
  ],
  access_sessions: [
    `CREATE UNIQUE INDEX IF NOT EXISTS "access_sessions_session_id_unique" ON "access_sessions" USING btree ("session_id")`,
    `CREATE INDEX IF NOT EXISTS "access_sessions_dataset_id_idx" ON "access_sessions" USING btree ("dataset_id")`,
    `CREATE INDEX IF NOT EXISTS "access_sessions_accessor_address_idx" ON "access_sessions" USING btree ("accessor_address")`,
  ],
  provenance_chain: [
    `CREATE INDEX IF NOT EXISTS "provenance_chain_dataset_id_idx" ON "provenance_chain" USING btree ("dataset_id")`,
    `CREATE INDEX IF NOT EXISTS "provenance_chain_dataset_timestamp_idx" ON "provenance_chain" USING btree ("dataset_id", "timestamp")`,
    `CREATE INDEX IF NOT EXISTS "provenance_chain_event_type_idx" ON "provenance_chain" USING btree ("event_type")`,
  ],
};

// v2 community schema: likes/comments no longer require a wallet. Comments gain
// a display_name and a nullable author_address; likes are deduplicated by a
// liker_id (wallet address OR guest browser id) instead of by address only.
// Runs as a single DO block so it is atomic and idempotent for databases that
// already have the v1 tables (deployed before this change).
async function repairCommunitySchemaV2(): Promise<void> {
  const statement = `
    DO $verida$
    BEGIN
      ALTER TABLE "community_comments" ADD COLUMN IF NOT EXISTS "display_name" text;
      ALTER TABLE "community_comments" ALTER COLUMN "author_address" DROP NOT NULL;
      ALTER TABLE "community_likes" ADD COLUMN IF NOT EXISTS "liker_id" text;
      UPDATE "community_likes" SET "liker_id" = "liker_address" WHERE "liker_id" IS NULL AND "liker_address" IS NOT NULL;
      UPDATE "community_likes" SET "liker_id" = 'legacy_' || "post_id"::text WHERE "liker_id" IS NULL;
      ALTER TABLE "community_likes" ALTER COLUMN "liker_id" SET NOT NULL;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_likes_pkey') THEN
        ALTER TABLE "community_likes" DROP CONSTRAINT "community_likes_pkey";
      END IF;
      ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_pkey" PRIMARY KEY ("post_id", "liker_id");
      CREATE INDEX IF NOT EXISTS "community_likes_liker_id_idx" ON "community_likes" USING btree ("liker_id");
    END $verida$;
  `;
  try {
    await db.execute(sql.raw(statement));
    console.log('[DB] Community schema v2 repair complete.');
  } catch (cause: unknown) {
    console.error('[DB] Community schema v2 repair failed:', cause);
  }
}

async function repairSchema(): Promise<void> {
  const statements: string[] = [...TABLE_CREATES];

  for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
    for (const column of columns) {
      statements.push(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${column};`,
      );
    }
  }

  for (const indexes of Object.values(TABLE_INDEXES)) {
    statements.push(...indexes.map((statement) => `${statement};`));
  }

  await db.execute(sql.raw(statements.join('\n')));
  console.log('[DB] Schema repair complete.');
}

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

  // Always run the idempotent repair so tables created before Drizzle
  // tracking have every column and index the app expects.
  try {
    await repairSchema();
  } catch (cause: unknown) {
    console.error('[DB] Schema repair failed:', cause);
  }

  // Community schema evolution (web2 likes/comments).
  await repairCommunitySchemaV2();
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await runMigrations();
}
