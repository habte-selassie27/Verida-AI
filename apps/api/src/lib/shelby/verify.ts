// IMPLEMENTER NOTE: Checks Shelby blob integrity, persists tamper evidence, and returns a typed verification result.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: verifyIntegrity(blobId, expectedMerkleRoot) with tamper detection persistence
// SHELBY SDK METHODS: getBlobMetadata via the Shelby coordination client
// DB TABLES: datasets, provenance_chain
// HANDOFF TO TESTER: Verify invalid roots mark datasets.tampered, write provenance events, and return a false result.

import { eq } from 'drizzle-orm';

import { db, datasets, provenanceChain } from '../db/index.js';
import type { ProvenanceEventType } from '../db/schema.js';
import {
  getShelbyRuntime,
  normalizeMerkleRoot,
  parseBlobId,
  ShelbyVerificationError,
} from './client.js';

interface ShelbyBlobMetadataLike {
  blobMerkleRoot?: unknown;
  creationMicros?: number;
  expirationMicros?: number;
  isWritten?: boolean;
  isDeleted?: boolean;
  name?: string;
  owner?: unknown;
  size?: number;
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

  if (candidate !== null && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>;
    const possibleKeys = ['blobMerkleRoot', 'merkleRoot', 'root', 'hash', 'value'];

    for (const key of possibleKeys) {
      const value = record[key];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  throw new ShelbyVerificationError('Shelby metadata did not contain a readable merkle root.');
}

export async function verifyIntegrity(
  blobId: string,
  expectedMerkleRoot: string,
): Promise<{ checkedAt: number; details: Record<string, unknown>; valid: boolean }> {
  try {
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
          .set({
            tampered: true,
          })
          .where(eq(datasets.shelbyBlobId, blobId));

        await tx.insert(provenanceChain).values({
          datasetId: dataset.id,
          version: dataset.version,
          eventType: 'TAMPER_DETECTED' as ProvenanceEventType,
          actorAddress: dataset.publisherAddress,
          timestamp: new Date(checkedAt).toISOString(),
          shelbyReceipt: dataset.provenanceReceipt,
          txHash: dataset.provenanceReceipt.txHash,
          metadata: {
            expectedMerkleRoot: normalizedExpected,
            actualResult: {
              valid: false,
              checkedAt,
              details: {
                actualMerkleRoot: normalizedActual,
              },
            },
            checkedAt,
          },
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

    return {
      checkedAt,
      valid: true,
      details: {
        expectedMerkleRoot: normalizedExpected,
        actualMerkleRoot: normalizedActual,
        blobMetadata: metadata,
      },
    };
  } catch (cause: unknown) {
    if (cause instanceof ShelbyVerificationError) {
      throw cause;
    }

    throw new ShelbyVerificationError(`Failed to verify Shelby blob ${blobId}.`, { cause });
  }
}
