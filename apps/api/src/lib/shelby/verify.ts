// IMPLEMENTER NOTE: Checks Shelby blob integrity, persists tamper evidence, and returns a typed verification result.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: verifyIntegrity(blobId, expectedMerkleRoot) with tamper detection persistence
// SHELBY SDK METHODS: getBlobMetadata via the Shelby coordination client
// DB TABLES: datasets, provenance_chain
// HANDOFF TO TESTER: Verify invalid roots mark datasets.tampered, write provenance events, and return a false result.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';

import { db, datasets } from '../db/index.js';
import { recordProvenanceEvent } from '../provenance/record.js';
import {
  getShelbyRuntime,
  normalizeMerkleRoot,
  parseBlobId,
  ShelbyVerificationError,
} from './client.js';

const LOCAL_BLOBS_DIR = join(process.cwd(), '.shelby-blobs');

interface ShelbyBlobMetadataLike {
  blobMerkleRoot?: unknown;
  creationMicros?: number;
  expirationMicros?: number;
  isWritten?: boolean;
  isDeleted?: boolean;
  name?: string;
  owner?: unknown;
  size?: number;
  storage?: 'local' | 'remote';
}

interface DatasetVerificationLookup {
  id: number;
  version: number;
  publisherAddress: string;
  provenanceReceipt: typeof datasets.$inferSelect['provenanceReceipt'];
  shelbyBlobId: string;
}

async function extractMerkleRoot(metadata: ShelbyBlobMetadataLike): Promise<string> {
  const candidate = metadata.blobMerkleRoot;

  if (typeof candidate === 'string') {
    return candidate;
  }

  if (candidate instanceof Uint8Array) {
    return `0x${Array.from(candidate)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`;
  }

  if (candidate !== null && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>;
    const possibleKeys = ['blobMerkleRoot', 'merkleRoot', 'root', 'hash', 'value'];

    for (const key of possibleKeys) {
      const value = record[key];
      if (typeof value === 'string') {
        return value;
      }
      if (value instanceof Uint8Array) {
        return `0x${Array.from(value)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')}`;
      }
    }
  }

  throw new ShelbyVerificationError('Shelby metadata did not contain a readable merkle root.');
}

async function persistTamperEvidence(
  blobId: string,
  normalizedExpected: string,
  normalizedActual: string,
  checkedAt: number,
  metadata: ShelbyBlobMetadataLike,
): Promise<{ checkedAt: number; details: Record<string, unknown>; valid: boolean }> {
  const datasetRows = await db
    .select({
      id: datasets.id,
      version: datasets.version,
      publisherAddress: datasets.publisherAddress,
      provenanceReceipt: datasets.provenanceReceipt,
      shelbyBlobId: datasets.shelbyBlobId,
    })
    .from(datasets)
    .where(eq(datasets.shelbyBlobId, blobId))
    .limit(1);

  const dataset = datasetRows.at(0) as DatasetVerificationLookup | undefined;

  if (dataset === undefined) {
    throw new ShelbyVerificationError(`No dataset found for Shelby blob id ${blobId}.`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(datasets)
      .set({ tampered: true })
      .where(eq(datasets.shelbyBlobId, blobId));

    // TAMPER_DETECTED events get NO tx hash — the receipt hash belongs to the
    // upload transaction, not this event. A real hash arrives only if/when the
    // outbox worker successfully emits this event on-chain.
    await recordProvenanceEvent(tx, {
      actorAddress: dataset.publisherAddress,
      blobId,
      datasetId: dataset.id,
      eventType: 'TAMPER_DETECTED',
      merkleRoot: normalizedExpected,
      metadata: {
        expectedMerkleRoot: normalizedExpected,
        actualResult: { valid: false, checkedAt, details: { actualMerkleRoot: normalizedActual } },
        checkedAt,
      },
      shelbyReceipt: dataset.provenanceReceipt,
      timestamp: new Date(checkedAt).toISOString(),
      txHash: null,
      version: dataset.version,
    });
  });

  return {
    checkedAt,
    valid: false,
    details: {
      expectedMerkleRoot: normalizedExpected,
      actualMerkleRoot: normalizedActual,
      blobMetadata: metadata,
    },
  };
}

async function verifyOnChain(
  blobId: string,
  expectedMerkleRoot: string,
): Promise<{ checkedAt: number; details: Record<string, unknown>; valid: boolean }> {
  const runtime = await getShelbyRuntime();
  const { accountAddress, blobName } = await parseBlobId(blobId);
  const metadata = (await runtime.client.coordination.getBlobMetadata({
    account: accountAddress,
    name: blobName,
  })) as ShelbyBlobMetadataLike;

  const actualMerkleRoot = await extractMerkleRoot(metadata);
  const normalizedExpected = await normalizeMerkleRoot(expectedMerkleRoot);
  const normalizedActual = await normalizeMerkleRoot(actualMerkleRoot);
  const checkedAt = Date.now();

  if (normalizedExpected !== normalizedActual) {
    return persistTamperEvidence(blobId, normalizedExpected, normalizedActual, checkedAt, metadata);
  }

  return {
    checkedAt,
    valid: true,
    details: {
      expectedMerkleRoot: normalizedExpected,
      actualMerkleRoot: normalizedActual,
      blobMetadata: metadata,
    },
  };
}

async function verifyLocal(
  blobId: string,
  expectedMerkleRoot: string,
): Promise<{ checkedAt: number; details: Record<string, unknown>; valid: boolean }> {
  const { accountAddress, blobName } = await parseBlobId(blobId);
  const blobPath = join(LOCAL_BLOBS_DIR, accountAddress, blobName);

  let blobData: Buffer;
  try {
    blobData = await readFile(blobPath);
  } catch {
    throw new ShelbyVerificationError(
      `Blob not found on-chain or locally: ${blobId}`,
    );
  }

  const actualMerkleRoot = createHash('sha256').update(blobData).digest('hex');
  const normalizedExpected = await normalizeMerkleRoot(expectedMerkleRoot);
  const normalizedActual = await normalizeMerkleRoot(actualMerkleRoot);
  const checkedAt = Date.now();

  if (normalizedExpected !== normalizedActual) {
    return persistTamperEvidence(blobId, normalizedExpected, normalizedActual, checkedAt, {
      name: blobName,
      size: blobData.byteLength,
      storage: 'local',
    });
  }

  return {
    checkedAt,
    valid: true,
    details: {
      expectedMerkleRoot: normalizedExpected,
      actualMerkleRoot: normalizedActual,
      storage: 'local',
    },
  };
}

export async function verifyIntegrity(
  blobId: string,
  expectedMerkleRoot: string,
): Promise<{ checkedAt: number; details: Record<string, unknown>; valid: boolean }> {
  try {
    // Try on-chain verification first
    try {
      return await verifyOnChain(blobId, expectedMerkleRoot);
    } catch (onChainError: unknown) {
      // If on-chain fails, try local blob verification
      console.warn(
        `[Verify] On-chain verification failed, trying local fallback:`,
        onChainError instanceof Error ? onChainError.message : onChainError,
      );
      return await verifyLocal(blobId, expectedMerkleRoot);
    }
  } catch (cause: unknown) {
    if (cause instanceof ShelbyVerificationError) {
      throw cause;
    }

    throw new ShelbyVerificationError(`Failed to verify Shelby blob ${blobId}.`, { cause });
  }
}
