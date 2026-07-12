// One-shot backfill script: re-fetches a sample from Shelby for every dataset
// with describe_status='pending' and enqueues a describe job.
//
// Usage:
//   npx tsx --env-file ../../.env src/scripts/backfill-describe.ts

import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import { db } from '../lib/db/index.js';
import { datasets } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { DescribeQueue } from '../ai/queue.js';
import type { DescribeJobData } from '../ai/types.js';
import { getShelbyRuntime, parseBlobId } from '../lib/shelby/client.js';

const SAMPLE_BYTES = 1_024 * 1024; // 1 MB

async function fetchSampleBase64(shelbyBlobId: string): Promise<string> {
  const runtime = await getShelbyRuntime();
  const { accountAddress, blobName } = await parseBlobId(shelbyBlobId);

  const blob = (await runtime.client.download({
    account: accountAddress,
    blobName,
  })) as { readable?: unknown; stream?: unknown };

  const source = blob.readable ?? blob.stream;
  if (source === undefined) {
    throw new Error(`Shelby did not return a stream for blob ${shelbyBlobId}`);
  }

  // Convert the web ReadableStream / async iterable to a Buffer
  let nodeStream: Readable;
  if (source instanceof Readable) {
    nodeStream = source;
  } else if (
    typeof globalThis.ReadableStream !== 'undefined' &&
    source instanceof globalThis.ReadableStream
  ) {
    const reader = (source as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    nodeStream = Readable.from(Buffer.concat(chunks));
  } else if (Symbol.asyncIterator in (source as object)) {
    nodeStream = Readable.from(source as AsyncIterable<Uint8Array>);
  } else {
    throw new Error(`Unsupported stream type for blob ${shelbyBlobId}`);
  }

  // Read up to SAMPLE_BYTES
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    nodeStream.on('data', (chunk: Buffer) => {
      if (totalBytes >= SAMPLE_BYTES) return;
      const remaining = SAMPLE_BYTES - totalBytes;
      const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
      chunks.push(slice);
      totalBytes += slice.length;
      if (totalBytes >= SAMPLE_BYTES) nodeStream.destroy();
    });
    nodeStream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    nodeStream.on('error', reject);
  });
}

function inferMime(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.json') || lower.endsWith('.jsonl')) return 'application/json';
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain';
  if (lower.endsWith('.xml')) return 'text/xml';
  if (lower.endsWith('.parquet')) return 'application/octet-stream';
  // Never default to text/csv — magic bytes will detect the real type
  return 'application/octet-stream';
}

async function main() {
  console.log('[backfill] Starting describe backfill…');

  // 1. Find all pending datasets
  const pending = await db
    .select({
      id: datasets.id,
      shelbyBlobId: datasets.shelbyBlobId,
      name: datasets.name,
      description: datasets.description,
      describeStatus: datasets.describeStatus,
    })
    .from(datasets)
    .where(eq(datasets.describeStatus, 'pending'));

  console.log(`[backfill] Found ${pending.length} dataset(s) with describe_status='pending'.`);

  if (pending.length === 0) {
    console.log('[backfill] Nothing to do.');
    await DescribeQueue.close();
    return;
  }

  // 2. For each dataset, fetch a sample and enqueue a describe job
  let success = 0;
  let failed = 0;

  for (const ds of pending) {
    console.log(`[backfill] Processing dataset #${ds.id} (${ds.name})…`);
    try {
      const sampleBase64 = await fetchSampleBase64(ds.shelbyBlobId);
      const jobData: DescribeJobData = {
        datasetId: ds.id,
        shelbyBlobId: ds.shelbyBlobId,
        fileName: ds.name,
        mimeType: inferMime(ds.name),
        existingDescription: ds.description ?? undefined,
        sampleBase64,
      };
      await DescribeQueue.add(`backfill-${ds.id}`, jobData, {
        jobId: `backfill-${ds.id}`,
      });
      success++;
      console.log(`[backfill]   ✓ Enqueued describe job for dataset #${ds.id}.`);
    } catch (err) {
      failed++;
      console.error(`[backfill]   ✗ Failed for dataset #${ds.id}:`, err);
    }
  }

  console.log(`[backfill] Done. Enqueued: ${success}, Failed: ${failed}`);
  await DescribeQueue.close();
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((err) => {
    console.error('[backfill] Fatal error:', err);
    process.exit(1);
  });
}
