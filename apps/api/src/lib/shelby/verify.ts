// IMPLEMENTER NOTE: Checks Shelby blob integrity by downloading the actual bytes (disk -> Cloudinary -> Shelby RPC), compares SHA-256 to the stored root, and persists tamper evidence. On-chain metadata is best-effort provenance evidence, never the source of truth.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: verifyIntegrity(blobId, expectedMerkleRoot) with tamper detection persistence
// SHELBY SDK METHODS: getFullObjectMetadata + getBlobs via the Shelby coordination client, ShelbyNodeClient.download for byte recovery
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
import { isCloudinaryAvailable, downloadFromCloudinary, getCloudinaryFolder } from './cloudinary.js';

const LOCAL_BLOBS_DIR = join(process.cwd(), '.shelby-blobs');

interface DatasetVerificationLookup {
  id: number;
  version: number;
  publisherAddress: string;
  provenanceReceipt: typeof datasets.$inferSelect['provenanceReceipt'];
  shelbyBlobId: string;
}

async function persistTamperEvidence(
  blobId: string,
  normalizedExpected: string,
  normalizedActual: string,
  checkedAt: number,
  details: Record<string, unknown>,
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
      ...details,
    },
  };
}

/**
 * Best-effort on-chain provenance lookup. The on-chain merkle root is the
 * erasure-coded commitment root (different from the raw SHA-256 stored in the
 * DB), so it is NEVER compared for validity — it exists only as provenance
 * evidence that the blob was registered. Failures are logged, not thrown.
 */
async function fetchOnChainEvidence(
  blobId: string,
): Promise<Record<string, unknown>> {
  try {
    const runtime = await getShelbyRuntime();
    const { accountAddress, blobName } = await parseBlobId(blobId);

    const metadata = await runtime.client.coordination.getFullObjectMetadata({
      account: accountAddress,
      name: blobName,
    });

    if (metadata === undefined) {
      return { onChain: 'not-found' };
    }

    return {
      onChain: {
        uid: metadata.uid?.toString(),
        blobMerkleRoot: metadata.blobMerkleRoot instanceof Uint8Array
          ? `0x${Array.from(metadata.blobMerkleRoot).map((b) => b.toString(16).padStart(2, '0')).join('')}`
          : metadata.blobMerkleRoot,
        size: metadata.size,
        isWritten: metadata.isWritten,
        expirationMicros: metadata.expirationMicros,
        creationMicros: metadata.creationMicros,
      },
    };
  } catch (cause: unknown) {
    console.warn(
      `[Verify] On-chain provenance lookup failed for ${blobId} (best-effort, ignoring):`,
      cause instanceof Error ? cause.message : cause,
    );
    return { onChain: 'unavailable' };
  }
}

async function verifyByBytes(
  blobId: string,
  expectedMerkleRoot: string,
): Promise<{ checkedAt: number; details: Record<string, unknown>; valid: boolean }> {
  const { accountAddress, blobName } = await parseBlobId(blobId);

  // storeBlobLocally encodes '/' as '__' in filenames. Try the encoded name
  // first (matches the stored file), then fall back to the raw name.
  const encodedBlobName = blobName.replaceAll('/', '__');
  const candidates = encodedBlobName === blobName
    ? [blobName]
    : [encodedBlobName, blobName];

  let blobData: Buffer | undefined;
  let storage: 'local' | 'cloudinary' | 'rpc' | undefined;

  // 1. Local disk (temporary buffer — often wiped on Render restarts)
  for (const name of candidates) {
    const tryPath = join(LOCAL_BLOBS_DIR, accountAddress, name);
    try {
      blobData = await readFile(tryPath);
      storage = 'local';
      break;
    } catch {
      // try next candidate
    }
  }

  // 2. Cloudinary backup (persistent)
  if (blobData === undefined && isCloudinaryAvailable()) {
    const folder = getCloudinaryFolder();
    const publicId = `${accountAddress}/${encodedBlobName}`;
    const cloudinaryData = await downloadFromCloudinary(publicId, folder);
    if (cloudinaryData !== null) {
      blobData = cloudinaryData;
      storage = 'cloudinary';
      // Re-cache locally for fast subsequent reads
      const { mkdir, writeFile } = await import('node:fs/promises');
      await mkdir(join(LOCAL_BLOBS_DIR, accountAddress), { recursive: true });
      await writeFile(join(LOCAL_BLOBS_DIR, accountAddress, encodedBlobName), blobData);
    }
  }

  // 3. Shelby RPC (canonical storage)
  if (blobData === undefined) {
    try {
      const runtime = await getShelbyRuntime();
      const { AccountAddress } = await import('@aptos-labs/ts-sdk');
      const shelbyBlob = await runtime.client.download({
        account: AccountAddress.fromString(accountAddress),
        blobName,
      });
      const chunks: Uint8Array[] = [];
      const reader = (shelbyBlob as { readable?: ReadableStream<Uint8Array> }).readable?.getReader();
      if (reader === undefined) {
        throw new ShelbyVerificationError('Shelby download returned no readable stream.');
      }
      let result = await reader.read();
      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }
      blobData = Buffer.concat(chunks);
      storage = 'rpc';

      // Cache locally
      const { mkdir, writeFile } = await import('node:fs/promises');
      await mkdir(join(LOCAL_BLOBS_DIR, accountAddress), { recursive: true });
      await writeFile(join(LOCAL_BLOBS_DIR, accountAddress, encodedBlobName), blobData);
    } catch {
      throw new ShelbyVerificationError(
        `Blob bytes not found for ${blobId} (checked local disk, Cloudinary, and Shelby RPC). ` +
        `The blob may have been uploaded when the RPC was unreachable and never backed up.`,
      );
    }
  }

  const actualMerkleRoot = createHash('sha256').update(blobData).digest('hex');
  const normalizedExpected = await normalizeMerkleRoot(expectedMerkleRoot);
  const normalizedActual = await normalizeMerkleRoot(actualMerkleRoot);
  const checkedAt = Date.now();

  if (normalizedExpected !== normalizedActual) {
    return persistTamperEvidence(blobId, normalizedExpected, normalizedActual, checkedAt, {
      actualBytes: blobData.byteLength,
      storage,
    });
  }

  return {
    checkedAt,
    valid: true,
    details: {
      expectedMerkleRoot: normalizedExpected,
      actualMerkleRoot: normalizedActual,
      storage,
      ...(await fetchOnChainEvidence(blobId)),
    },
  };
}

export async function verifyIntegrity(
  blobId: string,
  expectedMerkleRoot: string,
): Promise<{ checkedAt: number; details: Record<string, unknown>; valid: boolean }> {
  try {
    // Byte-first verification: download the actual bytes (disk -> Cloudinary
    // -> Shelby RPC) and compare SHA-256 against the stored root. This is the
    // authoritative check — on-chain metadata carries the erasure root, not
    // the raw file hash, so it can never validate bytes.
    return await verifyByBytes(blobId, expectedMerkleRoot);
  } catch (cause: unknown) {
    if (cause instanceof ShelbyVerificationError) {
      throw cause;
    }

    throw new ShelbyVerificationError(`Failed to verify Shelby blob ${blobId}.`, { cause });
  }
}
