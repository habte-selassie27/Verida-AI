// IMPLEMENTER NOTE: Uploads Shelby blobs with retryable on-chain registration, RPC confirmation, and temp-file cleanup.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: uploadDataset(filePath, metadata) plus upload progress callbacks and typed Shelby upload errors
// SHELBY SDK METHODS: generateCommitments, ShelbyBlobClient.registerBlob, ShelbyNodeClient.rpc.putBlob, Aptos transaction wait
// DB TABLES: None directly; upload receipts are persisted by the upload job worker after this helper returns.
// HANDOFF TO TESTER: Verify progress events, retry behavior, content hash validation, receipt shape, and temp-file deletion.

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ClayErasureCodingProvider, generateCommitments } from '@shelby-protocol/sdk/node';
import type { ProvenanceReceipt } from '@verida/shared';

import {
  buildBlobId,
  getShelbyAptosClient,
  getShelbyRuntime,
  getShelbyUploadSigner,
  normalizeMerkleRoot,
  ShelbyIntegrationError,
  ShelbyUploadError,
  type ShelbyUploadMetadata,
  type ShelbyUploadProgress,
  type ShelbyUploadResult,
} from './client.js';

export type { ShelbyUploadMetadata, ShelbyUploadProgress, ShelbyUploadResult } from './client.js';

interface ShelbyBlobCommitmentsLike {
  blob_merkle_root: string;
  chunkset_commitments?: Array<{
    chunk_commitments?: unknown[];
  }>;
  raw_data_size?: number;
}

export interface ShelbyUploadOptions {
  onProgress?: (progress: ShelbyUploadProgress) => Promise<void> | void;
}

const MAX_UPLOAD_RETRIES = 3;
const BACKOFF_BASE_MS = 250;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function emitProgress(
  onProgress: ShelbyUploadOptions['onProgress'] | undefined,
  progress: ShelbyUploadProgress,
): Promise<void> {
  if (onProgress === undefined) {
    return;
  }

  await onProgress(progress);
}

async function resolveBlobName(filePath: string, metadata: ShelbyUploadMetadata): Promise<string> {
  if (isNonEmptyString(metadata.blobName)) {
    return metadata.blobName.replaceAll('\\', '/').replace(/^\/+/, '');
  }

  const normalizedContentHash = metadata.contentHash.trim().replace(/^0x/i, '').toLowerCase();
  const fileName = path.basename(filePath).replaceAll('\\', '/');

  return path.posix.join('datasets', metadata.publisherAddress, normalizedContentHash, fileName);
}

async function countChunkCommitments(blobCommitments: ShelbyBlobCommitmentsLike): Promise<number> {
  return (blobCommitments.chunkset_commitments ?? []).reduce((total, chunkset) => {
    const chunkCount = Array.isArray(chunkset.chunk_commitments)
      ? chunkset.chunk_commitments.length
      : 0;

    return total + chunkCount;
  }, 0);
}

async function validateContentHash(
  blobData: Buffer,
  declaredContentHash: string,
): Promise<void> {
  const normalizedDeclaredHash = declaredContentHash.trim().replace(/^0x/i, '').toLowerCase();
  const actualHash = createHash('sha256').update(blobData).digest('hex');

  if (actualHash !== normalizedDeclaredHash) {
    throw new ShelbyUploadError(
      `Declared contentHash does not match the file at upload time. Expected ${normalizedDeclaredHash}, got ${actualHash}.`,
    );
  }
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isTransientShelbyUploadError(cause: unknown): boolean {
  if (cause instanceof ShelbyIntegrationError) {
    return false;
  }

  if (!(cause instanceof Error)) {
    return false;
  }

  const message = cause.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('eai_again') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('429')
  );
}

async function runWithTransientRetries<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (cause: unknown) {
      lastError = cause;

      if (!isTransientShelbyUploadError(cause) || attempt === MAX_UPLOAD_RETRIES) {
        throw cause;
      }

      const delay = BACKOFF_BASE_MS * 2 ** attempt;
      const shouldSkipDelay = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
      await sleep(shouldSkipDelay ? 0 : delay);
    }
  }

  throw lastError;
}

async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (cause: unknown) {
    if (cause instanceof Error && 'code' in cause && (cause as { code?: string }).code === 'ENOENT') {
      return;
    }

    console.warn('Failed to remove Shelby upload temp file.', {
      filePath,
      cause,
    });
  }
}

export async function uploadDataset(
  filePath: string,
  metadata: ShelbyUploadMetadata,
  options: ShelbyUploadOptions = {},
): Promise<ShelbyUploadResult> {
  let writeBlobTransactionHash = '';

  try {
    if (!isNonEmptyString(metadata.publisherAddress)) {
      throw new ShelbyUploadError('publisherAddress is required for Shelby uploads.');
    }

    if (!isNonEmptyString(metadata.contentHash)) {
      throw new ShelbyUploadError('contentHash is required for Shelby uploads.');
    }

    await emitProgress(options.onProgress, {
      percent: 0,
      bytesUploaded: 0,
      bytesTotal: 0,
      stage: 'reading',
    });

    const blobData = await fs.readFile(filePath);
    const fileSizeBytes = blobData.byteLength;

    if (typeof metadata.sizeBytes === 'number' && metadata.sizeBytes !== fileSizeBytes) {
      throw new ShelbyUploadError(
        `Metadata sizeBytes (${metadata.sizeBytes}) does not match the file size (${fileSizeBytes}).`,
      );
    }

    await validateContentHash(blobData, metadata.contentHash);

    const runtime = await getShelbyRuntime();
    const uploadSigner = await getShelbyUploadSigner();
    const aptosClient = await getShelbyAptosClient();
    const provider = await ClayErasureCodingProvider.create();
    const blobCommitments = (await generateCommitments(provider, blobData)) as ShelbyBlobCommitmentsLike;
    const blobName = await resolveBlobName(filePath, metadata);
    const expirationMicros =
      metadata.expirationMicros ??
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000);

    const writeBlobRegistration = await runWithTransientRetries(async () => {
      return runtime.client.coordination.registerBlob({
        account: uploadSigner,
        blobName,
        blobMerkleRoot: blobCommitments.blob_merkle_root,
        size: fileSizeBytes,
        expirationMicros,
      });
    });

    writeBlobTransactionHash = writeBlobRegistration.transaction.hash;

    await runWithTransientRetries(async () => {
      await aptosClient.waitForTransaction({
        transactionHash: writeBlobTransactionHash,
      });
    });

    await emitProgress(options.onProgress, {
      percent: 50,
      bytesUploaded: fileSizeBytes,
      bytesTotal: fileSizeBytes,
      stage: 'registering',
    });

    await runWithTransientRetries(async () => {
      await runtime.client.rpc.putBlob({
        account: uploadSigner.accountAddress,
        blobName,
        blobData,
      });
    });

    let expiresAtMicros = expirationMicros;

    try {
      const blobMetadata = (await runtime.client.coordination.getBlobMetadata({
        account: uploadSigner.accountAddress,
        name: blobName,
      })) as {
        expirationMicros?: number;
        isWritten?: boolean;
        size?: number;
      };

      if (typeof blobMetadata.expirationMicros === 'number') {
        expiresAtMicros = blobMetadata.expirationMicros;
      }
    } catch {
      // Best-effort metadata refresh. The upload is still valid once the RPC write completes.
    }

    const blobId = await buildBlobId(uploadSigner.accountAddress.toString(), blobName);
    const merkleRoot = await normalizeMerkleRoot(blobCommitments.blob_merkle_root);
    const receipt: ProvenanceReceipt = {
      blobId,
      merkleRoot,
      uploadedAt: Date.now(),
      uploaderAddress: uploadSigner.accountAddress.toString(),
      txHash: writeBlobTransactionHash,
      size: fileSizeBytes,
      chunkCount: await countChunkCommitments(blobCommitments),
    };

    await emitProgress(options.onProgress, {
      percent: 100,
      bytesUploaded: fileSizeBytes,
      bytesTotal: fileSizeBytes,
      stage: 'complete',
    });

    return {
      blobId,
      merkleRoot,
      receipt,
      expiresAt: Math.floor(expiresAtMicros / 1000),
    };
  } catch (cause: unknown) {
    if (cause instanceof ShelbyUploadError) {
      throw cause;
    }

    throw new ShelbyUploadError(`Failed to upload ${filePath} to Shelby.`, { cause });
  } finally {
    await cleanupTempFile(filePath);
  }
}
