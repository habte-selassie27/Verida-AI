// IMPLEMENTER NOTE: Declares the PostgreSQL schema for Verida AI metadata, provenance, and access records.
// BUILD.md TASK: STEP 3 — Database Schema (Drizzle ORM)
// ARCHITECT CONTRACT: datasets, dataset_versions, access_sessions, publishers, provenance_chain tables and relations
// SHELBY SDK METHODS: None directly; this schema persists Shelby upload, provenance, verification, and access metadata.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify snake_case column names, indexes, cascade relations, and tamper/verified fields match the plan.

import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  AccessSessionStatus,
  AccessType,
  DatasetTag,
  DatasetModality,
  DescribeStatus,
  ProvenanceReceipt,
  QualityBreakdown,
  SchemaProfile,
} from '@verida/shared';

export const provenanceEventTypes = [
  'UPLOAD',
  'VERSION_ADDED',
  'VERIFIED',
  'TAMPER_DETECTED',
  'ACCESSED',
  'OWNERSHIP_TRANSFERRED',
] as const;

export type ProvenanceEventType = (typeof provenanceEventTypes)[number];

type JsonRecord = Record<string, unknown>;

export const publishers = pgTable('publishers', {
  address: text('address').primaryKey(),
  username: text('username'),
  bio: text('bio'),
  totalDatasets: integer('total_datasets').notNull().default(0),
  totalEarnings: bigint('total_earnings', { mode: 'number' }).notNull().default(0),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const datasets = pgTable(
  'datasets',
  {
    id: serial('id').primaryKey(),
    shelbyBlobId: text('shelby_blob_id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    tags: text('tags').array().notNull().$type<DatasetTag[]>(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    version: integer('version').notNull(),
    publisherAddress: text('publisher_address')
      .notNull()
      .references(() => publishers.address, { onDelete: 'restrict', onUpdate: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    accessType: text('access_type').notNull().$type<AccessType>(),
    pricePerAccess: bigint('price_per_access', { mode: 'number' }),
    license: text('license').notNull(),
    provenanceReceipt: jsonb('provenance_receipt').notNull().$type<ProvenanceReceipt>(),
    merkleRoot: text('merkle_root').notNull(),
    verified: boolean('verified'),
    tampered: boolean('tampered').notNull().default(false),
    // AI metadata (Module A / B / C)
    schemaProfile: jsonb('schema_profile').$type<SchemaProfile>(),
    aiDescription: text('ai_description'),
    suggestedTags: text('suggested_tags').array().notNull().default([]),
    describeStatus: text('describe_status').$type<DescribeStatus>().notNull().default('pending'),
    describedAt: timestamp('described_at', { withTimezone: true, mode: 'string' }),
    modality: text('modality').$type<DatasetModality>(),
    estimatedRowCount: bigint('estimated_row_count', { mode: 'number' }),
    qualityScore: real('quality_score'),
    qualityBreakdown: jsonb('quality_breakdown').$type<QualityBreakdown>(),
    qualityScoredAt: timestamp('quality_scored_at', { withTimezone: true, mode: 'string' }),
    embedding: jsonb('embedding').$type<number[]>(),
    embeddedAt: timestamp('embedded_at', { withTimezone: true, mode: 'string' }),
    onChainDatasetId: bigint('on_chain_dataset_id', { mode: 'number' }),
    onChainOwnerVerified: boolean('on_chain_owner_verified').notNull().default(false),
  },
  (table) => ({
    shelbyBlobIdUniqueIdx: uniqueIndex('datasets_shelby_blob_id_unique').on(table.shelbyBlobId),
    publisherAddressIdx: index('datasets_publisher_address_idx').on(table.publisherAddress),
    tagsIdx: index('datasets_tags_idx').on(table.tags),
    modalityIdx: index('datasets_modality_idx').on(table.modality),
    qualityScoreIdx: index('datasets_quality_score_idx').on(table.qualityScore),
    describeStatusIdx: index('datasets_describe_status_idx').on(table.describeStatus),
  }),
);

export const datasetVersions = pgTable(
  'dataset_versions',
  {
    id: serial('id').primaryKey(),
    datasetId: integer('dataset_id')
      .notNull()
      .references(() => datasets.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    version: integer('version').notNull(),
    shelbyBlobId: text('shelby_blob_id').notNull(),
    changelog: text('changelog'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    merkleRoot: text('merkle_root').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  },
  (table) => ({
    datasetIdIdx: index('dataset_versions_dataset_id_idx').on(table.datasetId),
    datasetVersionUniqueIdx: uniqueIndex('dataset_versions_dataset_id_version_unique').on(
      table.datasetId,
      table.version,
    ),
    shelbyBlobIdIdx: index('dataset_versions_shelby_blob_id_idx').on(table.shelbyBlobId),
  }),
);

export const accessSessions = pgTable(
  'access_sessions',
  {
    id: serial('id').primaryKey(),
    datasetId: integer('dataset_id')
      .notNull()
      .references(() => datasets.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    accessorAddress: text('accessor_address').notNull(),
    sessionId: text('session_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    bytesConsumed: bigint('bytes_consumed', { mode: 'number' }).notNull().default(0),
    status: text('status').notNull().$type<AccessSessionStatus>(),
    onChainGranted: boolean('on_chain_granted').notNull().default(false),
    grantTxHash: text('grant_tx_hash'),
  },
  (table) => ({
    sessionIdUniqueIdx: uniqueIndex('access_sessions_session_id_unique').on(table.sessionId),
    datasetIdIdx: index('access_sessions_dataset_id_idx').on(table.datasetId),
    accessorAddressIdx: index('access_sessions_accessor_address_idx').on(table.accessorAddress),
  }),
);

export const provenanceChain = pgTable(
  'provenance_chain',
  {
    id: serial('id').primaryKey(),
    datasetId: integer('dataset_id')
      .notNull()
      .references(() => datasets.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    version: integer('version').notNull(),
    eventType: text('event_type').notNull().$type<ProvenanceEventType>(),
    actorAddress: text('actor_address').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    shelbyReceipt: jsonb('shelby_receipt').notNull().$type<ProvenanceReceipt>(),
    txHash: text('tx_hash').notNull(),
    metadata: jsonb('metadata').notNull().$type<JsonRecord>(),
  },
  (table) => ({
    datasetIdIdx: index('provenance_chain_dataset_id_idx').on(table.datasetId),
    datasetTimestampIdx: index('provenance_chain_dataset_timestamp_idx').on(
      table.datasetId,
      table.timestamp,
    ),
    eventTypeIdx: index('provenance_chain_event_type_idx').on(table.eventType),
  }),
);

export const publisherRelations = relations(publishers, ({ many }) => ({
  datasets: many(datasets),
}));

export const datasetRelations = relations(datasets, ({ one, many }) => ({
  publisher: one(publishers, {
    fields: [datasets.publisherAddress],
    references: [publishers.address],
  }),
  versions: many(datasetVersions),
  accessSessions: many(accessSessions),
  provenanceEvents: many(provenanceChain),
}));

export const datasetVersionRelations = relations(datasetVersions, ({ one }) => ({
  dataset: one(datasets, {
    fields: [datasetVersions.datasetId],
    references: [datasets.id],
  }),
}));

export const accessSessionRelations = relations(accessSessions, ({ one }) => ({
  dataset: one(datasets, {
    fields: [accessSessions.datasetId],
    references: [datasets.id],
  }),
}));

export const provenanceChainRelations = relations(provenanceChain, ({ one }) => ({
  dataset: one(datasets, {
    fields: [provenanceChain.datasetId],
    references: [datasets.id],
  }),
}));

export const escrowEntries = pgTable(
  'escrow_entries',
  {
    id: serial('id').primaryKey(),
    onChainEscrowId: bigint('on_chain_escrow_id', { mode: 'number' }),
    buyerAddress: text('buyer_address').notNull(),
    publisherAddress: text('publisher_address').notNull(),
    datasetId: integer('dataset_id').references(() => datasets.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    amountOctas: bigint('amount_octas', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'string' }),
    disputeReason: text('dispute_reason'),
  },
  (table) => ({
    buyerAddressIdx: index('escrow_buyer_address_idx').on(table.buyerAddress),
    datasetIdIdx: index('escrow_dataset_id_idx').on(table.datasetId),
    statusIdx: index('escrow_status_idx').on(table.status),
  }),
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    subscriberAddress: text('subscriber_address').notNull(),
    datasetId: integer('dataset_id').references(() => datasets.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    tier: text('tier').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    active: boolean('active').notNull().default(true),
    paymentsMade: integer('payments_made').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    subscriberIdx: index('subscriptions_subscriber_idx').on(table.subscriberAddress),
    datasetIdx: index('subscriptions_dataset_idx').on(table.datasetId),
    activeIdx: index('subscriptions_active_idx').on(table.active, table.expiresAt),
  }),
);

export const onChainPayments = pgTable(
  'on_chain_payments',
  {
    id: serial('id').primaryKey(),
    payerAddress: text('payer_address').notNull(),
    payeeAddress: text('payee_address').notNull(),
    amountOctas: bigint('amount_octas', { mode: 'number' }).notNull(),
    feeOctas: bigint('fee_octas', { mode: 'number' }).notNull(),
    datasetId: integer('dataset_id'),
    paymentType: text('payment_type').notNull(),
    txHash: text('tx_hash').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'string' }).notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    payeeIdx: index('on_chain_payments_payee_idx').on(table.payeeAddress),
    datasetIdx: index('on_chain_payments_dataset_idx').on(table.datasetId),
    timestampIdx: index('on_chain_payments_timestamp_idx').on(table.timestamp),
    txHashUniqueIdx: uniqueIndex('on_chain_payments_tx_hash_unique').on(table.txHash),
  }),
);

export const communityPosts = pgTable(
  'community_posts',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    category: text('category').notNull(),
    excerpt: text('excerpt'),
    content: text('content').notNull(),
    // Plain address text (no FK) — authors may not exist in the publishers
    // table, and the seed flow deletes/recreates publishers.
    authorAddress: text('author_address').notNull(),
    featured: boolean('featured').notNull().default(false),
    status: text('status').notNull().default('published'),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex('community_posts_slug_unique').on(table.slug),
    statusIdx: index('community_posts_status_idx').on(table.status, table.publishedAt),
    categoryIdx: index('community_posts_category_idx').on(table.category),
  }),
);

export const communityComments = pgTable(
  'community_comments',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    authorAddress: text('author_address').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    postIdx: index('community_comments_post_idx').on(table.postId),
    authorIdx: index('community_comments_author_idx').on(table.authorAddress),
  }),
);

export const communityLikes = pgTable(
  'community_likes',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    likerAddress: text('liker_address').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (table) => ({
    // One like per wallet per post.
    pk: primaryKey({ columns: [table.postId, table.likerAddress] }),
    postIdx: index('community_likes_post_idx').on(table.postId),
  }),
);

export const escrowEntryRelations = relations(escrowEntries, ({ one }) => ({
  dataset: one(datasets, {
    fields: [escrowEntries.datasetId],
    references: [datasets.id],
  }),
}));

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  dataset: one(datasets, {
    fields: [subscriptions.datasetId],
    references: [datasets.id],
  }),
}));
