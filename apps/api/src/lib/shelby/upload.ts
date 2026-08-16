// IMPLEMENTER NOTE: Uploads Shelby blobs via the v2 chunkset protocol (register -> uid -> putBlobChunksets -> commitObject), verifies the blob is retrievable, and backs it up to Cloudinary.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: uploadDataset(filePath, metadata) plus upload progress callbacks and typed Shelby upload errors
// SHELBY SDK METHODS: generateCommitments, ShelbyBlobClient.registerBlob/registeredBlobUids, ShelbyNodeClient.rpc.putBlobChunksets, ShelbyNodeClient.coordination.commitObject, ShelbyNodeClient.download, Aptos transaction wait
// DB TABLES: None directly; upload receipts are persisted by the upload job worker after this helper returns.
// HANDOFF TO TESTER: Verify progress events, retry behavior, content hash validation, receipt shape, and temp-file deletion.

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  createBlobKey,
  createDefaultErasureCodingProvider,
  generateCommitments,
  requiredAckCount,
  SHELBY_DEPLOYER,
  ShelbyBlobClient,
} from '@shelby-protocol/sdk/node';
import type { BlobCommitments } from '@shelby-protocol/sdk/node';
import { AccountAddress, isUserTransactionResponse } from '@aptos-labs/ts-sdk';
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
import { isCloudinaryAvailable, uploadToCloudinary, getCloudinaryFolder } from './cloudinary.js';

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

const MAX_BLOB_NAME_LENGTH = 64;

function truncateToMax(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max);
}

async function resolveBlobName(filePath: string, metadata: ShelbyUploadMetadata): Promise<string> {
  if (isNonEmptyString(metadata.blobName)) {
    return truncateToMax(metadata.blobName.replaceAll('\\', '/').replace(/^\/+/, ''), MAX_BLOB_NAME_LENGTH);
  }

  const normalizedContentHash = metadata.contentHash.trim().replace(/^0x/i, '').toLowerCase();
  const hashPrefix = normalizedContentHash.slice(0, 12);
  const fileName = path.basename(filePath).replaceAll('\\', '/');
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const ts = Date.now().toString(36);

  const candidate = `${hashPrefix}-${baseName}-${ts}`;

  return truncateToMax(candidate, MAX_BLOB_NAME_LENGTH);
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

const LOCAL_BLOBS_DIR = path.join(process.cwd(), '.shelby-blobs');

async function isShelbyRpcAvailable(rpcBaseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${rpcBaseUrl}/v1/blobs/0x1/__healthcheck__`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    // IMPORTANT: the shelbynet storage RPC has NO /healthcheck endpoint. It
    // answers every /v1/blobs/<account>/<name> probe with HTTP 404
    // ("Blob __healthcheck__ does not exist") when it is up. Treating any
    // non-2xx as "down" made EVERY upload fall back to local storage in
    // production: register_blob and the data PUT were skipped, and the DB got
    // a blob id that never existed on the node (reads then 404'd).
    //
    // A structured HTTP response (4xx included) proves the node is reachable;
    // only a network failure (fetch throws) or a 5xx means it is down.
    return res.status < 500;
  } catch {
    return false;
  }
}

async function storeBlobLocally(
  accountHex: string,
  blobName: string,
  blobData: Buffer,
): Promise<void> {
  const destDir = path.join(LOCAL_BLOBS_DIR, accountHex);
  await fs.mkdir(destDir, { recursive: true });
  const destPath = path.join(destDir, blobName.replaceAll('/', '__'));
  await fs.writeFile(destPath, blobData);

  // Also persist to Cloudinary so blobs survive Render ephemeral storage wipes
  if (isCloudinaryAvailable()) {
    const publicId = `${accountHex}/${blobName.replaceAll('/', '__')}`;
    const folder = getCloudinaryFolder();
    const url = await uploadToCloudinary(publicId, blobData, folder);
    if (url) {
      console.log(`[Cloudinary] Blob persisted: ${url}`);
    }
  }
}

/**
 * Downloads the blob back from the Shelby RPC and compares its SHA-256 to the
 * raw file hash. This is the final gate of the v2 upload: a blob only becomes
 * retrievable by name after `commit_object`, so a successful download proves
 * the data actually landed on storage providers (and not just on-chain).
 */
async function verifyDownloadedBlob(
  runtime: Awaited<ReturnType<typeof getShelbyRuntime>>,
  accountAddress: string,
  blobName: string,
  expectedSha256: string,
): Promise<void> {
  const shelbyBlob = await runtime.client.download({
    account: accountAddress,
    blobName,
  });

  const readableSource = (shelbyBlob as { readable?: unknown }).readable
    ?? (shelbyBlob as { stream?: unknown }).stream;

  if (readableSource === undefined || typeof (readableSource as ReadableStream<Uint8Array>).getReader !== 'function') {
    throw new ShelbyUploadError('Shelby download verification returned no readable stream.');
  }

  const reader = (readableSource as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let result = await reader.read();
  while (!result.done) {
    chunks.push(result.value);
    result = await reader.read();
  }

  const downloadedBytes = Buffer.concat(chunks);
  const downloadedHash = createHash('sha256').update(downloadedBytes).digest('hex');

  if (downloadedHash !== expectedSha256) {
    throw new ShelbyUploadError(
      `Post-upload download verification failed: expected sha256 ${expectedSha256}, got ${downloadedHash} ` +
      `(${downloadedBytes.byteLength} bytes downloaded).`,
    );
  }

  console.log(`[Shelby] Download verification passed (${downloadedBytes.byteLength} bytes, sha256 ${downloadedHash}).`);
}

export async function uploadDataset(
  filePath: string,
  metadata: ShelbyUploadMetadata,
  options: ShelbyUploadOptions = {},
): Promise<ShelbyUploadResult> {
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

    const blobName = await resolveBlobName(filePath, metadata);
    const expirationMicros =
      metadata.expirationMicros ??
      Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000);

    // The DB merkle root is the RAW file SHA-256, not the erasure-coded
    // commitment root. Verification downloads the blob bytes and compares
    // sha256(bytes) to this value, so it must be the raw hash for every
    // upload (RPC and local fallback alike). The erasure root still goes
    // on-chain via register_blob as the provenance proof.
    const rawFileHash = createHash('sha256').update(blobData).digest('hex');

    let uploadSignerAddress: string;
    let writeBlobTransactionHash = '';
    let blobCommitments: ShelbyBlobCommitmentsLike | null = null;
    let erasureN = 16;
    let shelbyAvailable = false;
    let runtime: Awaited<ReturnType<typeof getShelbyRuntime>> | null = null;

    // Try to initialize the Shelby runtime — if ANYTHING in init fails
    // (missing API key, RPC unreachable, commitments fail), fall back to
    // local + Cloudinary storage. The v2 upload itself, once started, is NOT
    // allowed to silently fall back: a failure there throws and the job is
    // retried, so the DB never records a blob the RPC cannot serve.
    try {
      runtime = await getShelbyRuntime();
      const uploadSigner = await getShelbyUploadSigner();
      uploadSignerAddress = uploadSigner.accountAddress.toString();

      const rpcBaseUrl = runtime.rpcBaseUrl.replace(/\/+$/, '');
      shelbyAvailable = await isShelbyRpcAvailable(rpcBaseUrl);

      const aptosClient = await getShelbyAptosClient();
      const provider = await createDefaultErasureCodingProvider();
      erasureN = provider.config.erasure_n;
      blobCommitments = (await generateCommitments(provider, blobData)) as ShelbyBlobCommitmentsLike;

      await emitProgress(options.onProgress, {
        percent: 10,
        bytesUploaded: 0,
        bytesTotal: fileSizeBytes,
        stage: 'encoding',
      });
    } catch (runtimeErr) {
      // Shelby/Aptos unavailable — fall back to local-only storage
      console.warn('[Shelby] Runtime init failed, using local storage:', runtimeErr instanceof Error ? runtimeErr.message : runtimeErr);
      shelbyAvailable = false;

      // Generate a deterministic address from the publisher address
      const pubHash = createHash('sha256').update(metadata.publisherAddress).digest('hex');
      uploadSignerAddress = `0x${pubHash.slice(0, 64)}`;

      // Local mode stores the raw SHA-256 as the merkle root so byte
      // verification (sha256 of the raw file) can match.
      blobCommitments = { blob_merkle_root: rawFileHash } as ShelbyBlobCommitmentsLike;
    }

    await emitProgress(options.onProgress, {
      percent: 50,
      bytesUploaded: fileSizeBytes,
      bytesTotal: fileSizeBytes,
      stage: 'registering',
    });

    // ── Shelby v2 upload: register -> uid -> chunksets -> commit -> verify ──
    let rpcUploadSucceeded = false;
    if (shelbyAvailable && runtime) {
      const uploadSigner = await getShelbyUploadSigner();
      const aptosClient = await getShelbyAptosClient();
      const deployer = AccountAddress.fromString(SHELBY_DEPLOYER);

      // 1. Register the blob on-chain. This creates a *pending* blob — it is
      //    NOT retrievable yet. The on-chain UID is published only in the
      //    BlobRegisteredEvent of this transaction.
      const registration = await runWithTransientRetries(async () => {
        return await runtime!.client.coordination.registerBlob({
          account: uploadSigner,
          blobName,
          blobMerkleRoot: blobCommitments!.blob_merkle_root,
          size: fileSizeBytes,
          expirationMicros,
        });
      });
      writeBlobTransactionHash = registration.transaction.hash;

      const committedRegistration = await runWithTransientRetries(async () => {
        return await aptosClient.waitForTransaction({
          transactionHash: writeBlobTransactionHash,
          options: { timeoutSecs: 60 },
        });
      });

      if (!isUserTransactionResponse(committedRegistration)) {
        throw new ShelbyUploadError(
          `Registration tx ${writeBlobTransactionHash} did not commit as a user transaction.`,
        );
      }

      // 2. Extract the UID assigned to this blob.
      const registeredBlobs = ShelbyBlobClient.registeredBlobUids(
        committedRegistration.events,
        deployer,
      );
      const expectedObjectName = createBlobKey({
        account: uploadSignerAddress,
        blobName,
      });
      const registrationMatch = registeredBlobs.find(
        (entry) => entry.objectName === expectedObjectName,
      ) ?? registeredBlobs[0];

      if (registrationMatch === undefined) {
        throw new ShelbyUploadError(
          `No BlobRegisteredEvent found in registration tx ${writeBlobTransactionHash}. ` +
          `The blob may already exist (overwrite is not allowed).`,
        );
      }
      const blobUid = registrationMatch.uid;

      console.log(`[Shelby] On-chain registration complete: ${writeBlobTransactionHash} (uid ${blobUid})`);

      // 3. Upload the blob data via the v2 chunkset API. Storage providers
      //    ack each chunkset with an inclusion-proof signature; those acks are
      //    required by commit_object, so commit can only succeed if the data
      //    actually landed.
      const uploadResult = await runWithTransientRetries(async () => {
        return await runtime!.client.rpc.putBlobChunksets({
          account: uploadSigner,
          uid: blobUid,
          blobData,
          commitments: blobCommitments as unknown as BlobCommitments,
        });
      });

      // Fail fast if the storage providers did not ack enough chunksets to
      // finalize on-chain (erasure_d acks are required by commit_object).
      const requiredAcks = requiredAckCount(erasureN);
      if (uploadResult.spAcks.length < requiredAcks) {
        throw new ShelbyUploadError(
          `Insufficient storage provider acknowledgements for '${blobName}': ` +
          `got ${uploadResult.spAcks.length}, need ${requiredAcks} (erasure_d) to finalize on chain.`,
        );
      }

      // 4. Commit the blob on-chain so it becomes retrievable by name.
      //    overwrite: true matches the SDK's canonical upload() flow.
      const commit = await runWithTransientRetries(async () => {
        return await runtime!.client.coordination.commitObject({
          account: uploadSigner,
          uid: blobUid,
          blobName,
          overwrite: true,
          storageProviderAcks: uploadResult.spAcks,
        });
      });
      writeBlobTransactionHash = commit.transaction.hash;

      await runWithTransientRetries(async () => {
        await aptosClient.waitForTransaction({
          transactionHash: writeBlobTransactionHash,
          options: { timeoutSecs: 60 },
        });
      });

      // 5. Verify retrievability: download the committed blob and compare its
      //    SHA-256 against the raw file hash. Only after this passes do we
      //    report the upload as stored on Shelby.
      await runWithTransientRetries(async () => {
        await verifyDownloadedBlob(runtime!, uploadSignerAddress, blobName, rawFileHash);
      });

      rpcUploadSucceeded = true;
      console.log(`[Shelby] v2 upload complete: ${writeBlobTransactionHash}`);
    }

    if (!rpcUploadSucceeded) {
      await storeBlobLocally(uploadSignerAddress, blobName, blobData);
      console.warn(
        shelbyAvailable
          ? `[Shelby] RPC upload failed — stored blob locally: ${LOCAL_BLOBS_DIR}/${uploadSignerAddress}/${blobName}`
          : `[Shelby] RPC unavailable — stored blob locally: ${LOCAL_BLOBS_DIR}/${uploadSignerAddress}/${blobName}`,
      );
    }

    await emitProgress(options.onProgress, {
      percent: 90,
      bytesUploaded: fileSizeBytes,
      bytesTotal: fileSizeBytes,
      stage: 'confirming',
    });

    let expiresAtMicros = expirationMicros;

    // Best-effort metadata refresh — skip in local mode
    if (runtime) {
      try {
        const blobMetadata = await runtime.client.coordination.getFullObjectMetadata({
          account: uploadSignerAddress,
          name: blobName,
        });

        if (typeof blobMetadata?.expirationMicros === 'number') {
          expiresAtMicros = blobMetadata.expirationMicros;
        }
      } catch {
        // Best-effort metadata refresh. The upload is still valid once the RPC write completes.
      }
    }

    const blobId = await buildBlobId(uploadSignerAddress, blobName);
    const merkleRoot = await normalizeMerkleRoot(rawFileHash);
    const receipt: ProvenanceReceipt = {
      blobId,
      merkleRoot,
      uploadedAt: Date.now(),
      uploaderAddress: uploadSignerAddress,
      // Only ever a REAL Aptos transaction hash (the commit, or the
      // registration for failed commits). Local/demo uploads (Shelby RPC or
      // Aptos unavailable) get NULL — never a fabricated 'local-*' hash.
      txHash: writeBlobTransactionHash || null,
      size: fileSizeBytes,
      chunkCount: blobCommitments ? await countChunkCommitments(blobCommitments) : 1,
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

    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    throw new ShelbyUploadError(`Failed to upload ${filePath} to Shelby: ${causeMessage}`, { cause });
  }
  // NOTE: temp-file cleanup is owned by the caller (upload worker) so the file
  // survives BullMQ job retries instead of being deleted after the first attempt.
}
