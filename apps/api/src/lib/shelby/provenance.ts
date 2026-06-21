// IMPLEMENTER NOTE: Reads and writes provenance events for Shelby-backed datasets using the metadata database.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: readProvenance(blobId) and writeProvenanceMetadata(blobId, meta)
// SHELBY SDK METHODS: Shelby metadata lookups via the shared runtime client when needed
// DB TABLES: datasets, provenance_chain
// HANDOFF TO TESTER: Verify provenance events are returned in timestamp order and inserts preserve the Shelby receipt payload.

import { asc, eq } from 'drizzle-orm';

import { db, datasets, provenanceChain } from '../db/index.js';
import type { ProvenanceEventType } from '../db/schema.js';
import { buildBlobId, getShelbyRuntime, parseBlobId, ShelbyProvenanceError } from './client.js';

interface DatasetProvenanceLookup {
  id: number;
  version: number;
  publisherAddress: string;
  provenanceReceipt: typeof datasets.$inferSelect['provenanceReceipt'];
}

interface ProvenanceChainRow {
  id: number;
  datasetId: number;
  version: number;
  eventType: ProvenanceEventType;
  actorAddress: string;
  timestamp: string;
  shelbyReceipt: typeof datasets.$inferSelect['provenanceReceipt'];
  txHash: string;
  metadata: Record<string, unknown>;
}

export async function readProvenance(blobId: string): Promise<ProvenanceChainRow[]> {
  try {
    const datasetRows = await db
      .select({
        id: datasets.id,
        version: datasets.version,
        publisherAddress: datasets.publisherAddress,
        provenanceReceipt: datasets.provenanceReceipt,
      })
      .from(datasets)
      .where(eq(datasets.shelbyBlobId, blobId))
      .limit(1);

    const dataset = datasetRows.at(0) as DatasetProvenanceLookup | undefined;

    if (dataset === undefined) {
      throw new ShelbyProvenanceError(`No dataset found for Shelby blob id ${blobId}.`);
    }

    return await db
      .select({
        id: provenanceChain.id,
        datasetId: provenanceChain.datasetId,
        version: provenanceChain.version,
        eventType: provenanceChain.eventType,
        actorAddress: provenanceChain.actorAddress,
        timestamp: provenanceChain.timestamp,
        shelbyReceipt: provenanceChain.shelbyReceipt,
        txHash: provenanceChain.txHash,
        metadata: provenanceChain.metadata,
      })
      .from(provenanceChain)
      .where(eq(provenanceChain.datasetId, dataset.id))
      .orderBy(asc(provenanceChain.timestamp));
  } catch (cause: unknown) {
    if (cause instanceof ShelbyProvenanceError) {
      throw cause;
    }

    throw new ShelbyProvenanceError(`Failed to read provenance for ${blobId}.`, { cause });
  }
}

export async function writeProvenanceMetadata(
  blobId: string,
  input: {
    actorAddress?: string;
    eventType?: ProvenanceEventType;
    metadata?: Record<string, unknown>;
    shelbyReceipt?: typeof datasets.$inferSelect['provenanceReceipt'];
    txHash?: string;
    version?: number;
  } = {},
): Promise<ProvenanceChainRow> {
  try {
    const datasetRows = await db
      .select({
        id: datasets.id,
        version: datasets.version,
        publisherAddress: datasets.publisherAddress,
        provenanceReceipt: datasets.provenanceReceipt,
      })
      .from(datasets)
      .where(eq(datasets.shelbyBlobId, blobId))
      .limit(1);

    const dataset = datasetRows.at(0) as DatasetProvenanceLookup | undefined;

    if (dataset === undefined) {
      throw new ShelbyProvenanceError(`No dataset found for Shelby blob id ${blobId}.`);
    }

    const timestamp = new Date().toISOString();
    const insertedRows = await db
      .insert(provenanceChain)
      .values({
        datasetId: dataset.id,
        version: input.version ?? dataset.version,
        eventType: input.eventType ?? 'UPLOAD',
        actorAddress: input.actorAddress ?? dataset.publisherAddress,
        timestamp,
        shelbyReceipt: input.shelbyReceipt ?? dataset.provenanceReceipt,
        txHash: input.txHash ?? dataset.provenanceReceipt.txHash,
        metadata: input.metadata ?? {},
      })
      .returning({
        id: provenanceChain.id,
        datasetId: provenanceChain.datasetId,
        version: provenanceChain.version,
        eventType: provenanceChain.eventType,
        actorAddress: provenanceChain.actorAddress,
        timestamp: provenanceChain.timestamp,
        shelbyReceipt: provenanceChain.shelbyReceipt,
        txHash: provenanceChain.txHash,
        metadata: provenanceChain.metadata,
      });

    const insertedRow = insertedRows.at(0);

    if (insertedRow === undefined) {
      throw new ShelbyProvenanceError('Shelby provenance insert did not return a row.');
    }

    return insertedRow;
  } catch (cause: unknown) {
    if (cause instanceof ShelbyProvenanceError) {
      throw cause;
    }

    throw new ShelbyProvenanceError(`Failed to write provenance for ${blobId}.`, { cause });
  }
}

export async function buildDatasetBlobId(
  accountAddress: string,
  blobName: string,
): Promise<string> {
  return buildBlobId(accountAddress, blobName);
}

export async function resolveBlobCoordinates(
  blobId: string,
): Promise<{ accountAddress: string; blobName: string }> {
  return parseBlobId(blobId);
}

export async function getShelbyRuntimeForProvenance(): Promise<Awaited<ReturnType<typeof getShelbyRuntime>>> {
  return getShelbyRuntime();
}
