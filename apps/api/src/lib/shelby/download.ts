// IMPLEMENTER NOTE: Streams Shelby blobs to Node.js callers using the Shelby Node SDK download path.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: streamDataset(blobId, sessionId) returning a Node.js Readable stream
// SHELBY SDK METHODS: ShelbyNodeClient.download, ShelbyBlob.readable/stream
// DB TABLES: None directly; streaming relies on prior session validation and dataset metadata.
// HANDOFF TO TESTER: Verify stream responses are returned as Readable instances and invalid inputs raise typed errors.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { getShelbyRuntime, parseBlobId, ShelbyStreamError } from './client.js';
import { isCloudinaryAvailable, downloadFromCloudinary, getCloudinaryFolder } from './cloudinary.js';

// Mirrors LOCAL_BLOBS_DIR in upload.ts/verify.ts. When the shelbynet RPC is
// unreachable at upload time, uploadDataset stores the file on this instance's
// disk instead of the node, and the DB still records a blob id. Reads must try
// that local copy as a fallback or the dataset looks like its blob vanished.
const LOCAL_BLOBS_DIR = join(process.cwd(), '.shelby-blobs');

// Maximum number of bytes a preview read will pull from storage. Preview reads
// only need the first few rows, so a small cap keeps the request cheap.
export const PREVIEW_MAX_READ_BYTES = 256 * 1024;

interface ShelbyDownloadBlobLike {
  readable?: unknown;
  stream?: unknown;
}

async function* readableStreamToAsyncIterable(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array, void, undefined> {
  const reader = stream.getReader();

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        return;
      }

      if (result.value !== undefined) {
        yield result.value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function toNodeReadable(value: unknown): Readable {
  if (value instanceof Readable) {
    return value;
  }

  if (value !== null && typeof value === 'object' && typeof (value as { pipe?: unknown }).pipe === 'function') {
    return value as Readable;
  }

  if (typeof globalThis.ReadableStream !== 'undefined' && value instanceof globalThis.ReadableStream) {
    return Readable.from(readableStreamToAsyncIterable(value as ReadableStream<Uint8Array>));
  }

  if (value !== null && typeof value === 'object' && Symbol.asyncIterator in value) {
    return Readable.from(value as AsyncIterable<Uint8Array>);
  }

  throw new ShelbyStreamError('Shelby returned a blob stream that cannot be converted to a Node.js Readable.');
}

async function downloadBlob(blobId: string): Promise<unknown> {
  const runtime = await getShelbyRuntime();
  const { accountAddress, blobName } = await parseBlobId(blobId);

  return runtime.client.download({
    account: accountAddress,
    blobName,
  });
}

async function readLocalBlobBytes(blobId: string): Promise<Buffer | null> {
  try {
    const { accountAddress, blobName } = await parseBlobId(blobId);
    // Must match storeBlobLocally in upload.ts (slashes are encoded as __).
    const blobPath = join(LOCAL_BLOBS_DIR, accountAddress, blobName.replaceAll('/', '__'));
    return await readFile(blobPath);
  } catch {
    // Local file missing — try Cloudinary backup
    try {
      const { accountAddress, blobName } = await parseBlobId(blobId);
      if (isCloudinaryAvailable()) {
        const folder = getCloudinaryFolder();
        const publicId = `${accountAddress}/${blobName.replaceAll('/', '__')}`;
        const data = await downloadFromCloudinary(publicId, folder);
        if (data !== null) return data;
      }
    } catch {
      // fall through
    }
    return null;
  }
}

export async function streamDataset(blobId: string, sessionId: string): Promise<Readable> {
  try {
    if (sessionId.trim().length === 0) {
      throw new ShelbyStreamError('sessionId is required to stream a Shelby blob.');
    }

    const blob = (await downloadBlob(blobId)) as ShelbyDownloadBlobLike;
    const readableSource = blob.readable ?? blob.stream;

    if (readableSource === undefined) {
      throw new ShelbyStreamError('Shelby did not return a readable stream for the requested blob.');
    }

    return toNodeReadable(readableSource);
  } catch (cause: unknown) {
    // Local fallback for uploads that were stored on this instance's disk
    // because the RPC was unreachable at upload time.
    const local = await readLocalBlobBytes(blobId);

    if (local !== null) {
      return Readable.from([local]);
    }

    if (cause instanceof ShelbyStreamError) {
      throw cause;
    }

    throw new ShelbyStreamError(`Failed to stream Shelby blob ${blobId}.`, { cause });
  }
}

/**
 * Reads up to `maxBytes` from a Shelby blob and returns the raw bytes. Unlike
 * `streamDataset`, this does NOT require an access session: it is used for the
 * public dataset preview (first few rows), which only touches a tiny prefix of
 * the blob and never the full file.
 */
export async function readBlobBytes(blobId: string, maxBytes: number): Promise<Buffer> {
  try {
    const blob = (await downloadBlob(blobId)) as ShelbyDownloadBlobLike;
    const readableSource = blob.readable ?? blob.stream;

    if (readableSource === undefined) {
      throw new ShelbyStreamError('Shelby did not return a readable stream for the requested blob.');
    }

    const readable = toNodeReadable(readableSource);
    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of readable) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      const remaining = maxBytes - total;

      if (remaining <= 0) {
        break;
      }

      if (buffer.byteLength <= remaining) {
        chunks.push(buffer);
        total += buffer.byteLength;
      } else {
        chunks.push(buffer.subarray(0, remaining));
        total += remaining;
        break;
      }
    }

    return Buffer.concat(chunks, total);
  } catch (cause: unknown) {
    // Local fallback for uploads that were stored on this instance's disk
    // because the RPC was unreachable at upload time.
    const local = await readLocalBlobBytes(blobId);

    if (local !== null) {
      return local.subarray(0, maxBytes);
    }

    if (cause instanceof ShelbyStreamError) {
      throw cause;
    }

    throw new ShelbyStreamError(`Failed to read Shelby blob ${blobId} for preview.`, { cause });
  }
}
