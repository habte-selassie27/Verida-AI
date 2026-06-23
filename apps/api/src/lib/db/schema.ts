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
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AccessSessionStatus, AccessType, DatasetTag, ProvenanceReceipt } from '@verida/shared';

export const provenanceEventTypes = [
  'UPLOAD',
  'VERSION_ADDED',
  'VERIFIED',
  'TAMPER_DETECTED',
  'ACCESSED',
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
  },
  (table) => ({
    shelbyBlobIdUniqueIdx: uniqueIndex('datasets_shelby_blob_id_unique').on(table.shelbyBlobId),
    publisherAddressIdx: index('datasets_publisher_address_idx').on(table.publisherAddress),
    tagsIdx: index('datasets_tags_idx').on(table.tags),
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
