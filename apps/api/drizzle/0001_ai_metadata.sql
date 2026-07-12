-- Migration: AI metadata columns (Module A / B / C)
-- Note: bigint type migrations are tracked separately (0001_p0_8_bigint_migration.sql);
-- this migration only adds the AI enrichment columns and their indexes.

ALTER TABLE "datasets" ADD COLUMN "schema_profile" jsonb;
ALTER TABLE "datasets" ADD COLUMN "ai_description" text;
ALTER TABLE "datasets" ADD COLUMN "suggested_tags" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "datasets" ADD COLUMN "describe_status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "datasets" ADD COLUMN "described_at" timestamp with time zone;
ALTER TABLE "datasets" ADD COLUMN "modality" text;
ALTER TABLE "datasets" ADD COLUMN "estimated_row_count" bigint;
ALTER TABLE "datasets" ADD COLUMN "quality_score" real;
ALTER TABLE "datasets" ADD COLUMN "quality_breakdown" jsonb;
ALTER TABLE "datasets" ADD COLUMN "quality_scored_at" timestamp with time zone;
ALTER TABLE "datasets" ADD COLUMN "embedding" jsonb;
ALTER TABLE "datasets" ADD COLUMN "embedded_at" timestamp with time zone;
CREATE INDEX "datasets_modality_idx" ON "datasets" USING btree ("modality");
CREATE INDEX "datasets_quality_score_idx" ON "datasets" USING btree ("quality_score");
CREATE INDEX "datasets_describe_status_idx" ON "datasets" USING btree ("describe_status");
