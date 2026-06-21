// IMPLEMENTER NOTE: Streams Shelby blobs to Node.js callers using the Shelby Node SDK download path.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: streamDataset(blobId, sessionId) returning a Node.js Readable stream
// SHELBY SDK METHODS: ShelbyNodeClient.download, ShelbyBlob.readable/stream
// DB TABLES: None directly; streaming relies on prior session validation and dataset metadata.
// HANDOFF TO TESTER: Verify stream responses are returned as Readable instances and invalid inputs raise typed errors.

import { Readable } from 'node:stream';

import { getShelbyRuntime, parseBlobId, ShelbyStreamError } from './client.js';

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

export async function streamDataset(blobId: string, sessionId: string): Promise<Readable> {
  try {
    if (sessionId.trim().length === 0) {
      throw new ShelbyStreamError('sessionId is required to stream a Shelby blob.');
    }

    const runtime = await getShelbyRuntime();
    const { accountAddress, blobName } = await parseBlobId(blobId);
    const blob = (await runtime.client.download({
      account: accountAddress,
      blobName,
    })) as ShelbyDownloadBlobLike;

    const readableSource = blob.readable ?? blob.stream;

    if (readableSource === undefined) {
      throw new ShelbyStreamError('Shelby did not return a readable stream for the requested blob.');
    }

    return toNodeReadable(readableSource);
  } catch (cause: unknown) {
    if (cause instanceof ShelbyStreamError) {
      throw cause;
    }

    throw new ShelbyStreamError(`Failed to stream Shelby blob ${blobId}.`, { cause });
  }
}
