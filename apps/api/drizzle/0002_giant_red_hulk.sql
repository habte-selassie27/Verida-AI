CREATE TABLE "escrow_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"on_chain_escrow_id" bigint,
	"buyer_address" text NOT NULL,
	"publisher_address" text NOT NULL,
	"dataset_id" integer,
	"amount_octas" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"dispute_reason" text
);
--> statement-breakpoint
CREATE TABLE "on_chain_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"payer_address" text NOT NULL,
	"payee_address" text NOT NULL,
	"amount_octas" bigint NOT NULL,
	"fee_octas" bigint NOT NULL,
	"dataset_id" integer,
	"payment_type" text NOT NULL,
	"tx_hash" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_address" text NOT NULL,
	"dataset_id" integer,
	"tier" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"payments_made" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_sessions" ADD COLUMN "on_chain_granted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "access_sessions" ADD COLUMN "grant_tx_hash" text;--> statement-breakpoint
ALTER TABLE "datasets" ADD COLUMN "on_chain_dataset_id" bigint;--> statement-breakpoint
ALTER TABLE "datasets" ADD COLUMN "on_chain_owner_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "escrow_entries" ADD CONSTRAINT "escrow_entries_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "escrow_buyer_address_idx" ON "escrow_entries" USING btree ("buyer_address");--> statement-breakpoint
CREATE INDEX "escrow_dataset_id_idx" ON "escrow_entries" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "escrow_status_idx" ON "escrow_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "on_chain_payments_payee_idx" ON "on_chain_payments" USING btree ("payee_address");--> statement-breakpoint
CREATE INDEX "on_chain_payments_dataset_idx" ON "on_chain_payments" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "on_chain_payments_timestamp_idx" ON "on_chain_payments" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "on_chain_payments_tx_hash_unique" ON "on_chain_payments" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "subscriptions_subscriber_idx" ON "subscriptions" USING btree ("subscriber_address");--> statement-breakpoint
CREATE INDEX "subscriptions_dataset_idx" ON "subscriptions" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "subscriptions_active_idx" ON "subscriptions" USING btree ("active","expires_at");