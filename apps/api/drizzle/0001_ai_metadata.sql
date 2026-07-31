-- Migration: AI metadata columns (Module A / B / C)

ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "schema_profile" jsonb;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "ai_description" text;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "suggested_tags" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "describe_status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "described_at" timestamp with time zone;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "modality" text;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "estimated_row_count" bigint;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "quality_score" real;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "quality_breakdown" jsonb;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "quality_scored_at" timestamp with time zone;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "embedding" jsonb;
ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "embedded_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "datasets_modality_idx" ON "datasets" USING btree ("modality");
CREATE INDEX IF NOT EXISTS "datasets_quality_score_idx" ON "datasets" USING btree ("quality_score");
CREATE INDEX IF NOT EXISTS "datasets_describe_status_idx" ON "datasets" USING btree ("describe_status");
