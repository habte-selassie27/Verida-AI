CREATE TABLE "access_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_id" integer NOT NULL,
	"accessor_address" text NOT NULL,
	"session_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"bytes_consumed" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dataset_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_id" integer NOT NULL,
	"version" integer NOT NULL,
	"shelby_blob_id" text NOT NULL,
	"changelog" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"merkle_root" text NOT NULL,
	"size_bytes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" serial PRIMARY KEY NOT NULL,
	"shelby_blob_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tags" text[] NOT NULL,
	"size_bytes" integer NOT NULL,
	"version" integer NOT NULL,
	"publisher_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"access_type" text NOT NULL,
	"price_per_access" integer,
	"license" text NOT NULL,
	"provenance_receipt" jsonb NOT NULL,
	"merkle_root" text NOT NULL,
	"verified" boolean,
	"tampered" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provenance_chain" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_id" integer NOT NULL,
	"version" integer NOT NULL,
	"event_type" text NOT NULL,
	"actor_address" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"shelby_receipt" jsonb NOT NULL,
	"tx_hash" text NOT NULL,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"address" text PRIMARY KEY NOT NULL,
	"username" text,
	"bio" text,
	"total_datasets" integer DEFAULT 0 NOT NULL,
	"total_earnings" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_sessions" ADD CONSTRAINT "access_sessions_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_publisher_address_publishers_address_fk" FOREIGN KEY ("publisher_address") REFERENCES "public"."publishers"("address") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "provenance_chain" ADD CONSTRAINT "provenance_chain_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "access_sessions_session_id_unique" ON "access_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "access_sessions_dataset_id_idx" ON "access_sessions" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "access_sessions_accessor_address_idx" ON "access_sessions" USING btree ("accessor_address");--> statement-breakpoint
CREATE INDEX "dataset_versions_dataset_id_idx" ON "dataset_versions" USING btree ("dataset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_versions_dataset_id_version_unique" ON "dataset_versions" USING btree ("dataset_id","version");--> statement-breakpoint
CREATE INDEX "dataset_versions_shelby_blob_id_idx" ON "dataset_versions" USING btree ("shelby_blob_id");--> statement-breakpoint
CREATE UNIQUE INDEX "datasets_shelby_blob_id_unique" ON "datasets" USING btree ("shelby_blob_id");--> statement-breakpoint
CREATE INDEX "datasets_publisher_address_idx" ON "datasets" USING btree ("publisher_address");--> statement-breakpoint
CREATE INDEX "datasets_tags_idx" ON "datasets" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "provenance_chain_dataset_id_idx" ON "provenance_chain" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "provenance_chain_dataset_timestamp_idx" ON "provenance_chain" USING btree ("dataset_id","timestamp");--> statement-breakpoint
CREATE INDEX "provenance_chain_event_type_idx" ON "provenance_chain" USING btree ("event_type");