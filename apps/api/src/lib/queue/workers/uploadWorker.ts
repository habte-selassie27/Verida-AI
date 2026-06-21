// IMPLEMENTER NOTE: Processes upload jobs by calling Shelby, persisting the dataset atomically, and forwarding job events.
// BUILD.md TASK: STEP 5 — BullMQ Upload Job Queue
// ARCHITECT CONTRACT: UPLOAD_DATASET worker that inserts dataset rows and emits upload completion/error events
// SHELBY SDK METHODS: uploadDataset from the Shelby integration layer
// DB TABLES: datasets, dataset_versions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify upload success persists the dataset once, failure marks the job failed, and temp files are removed.

import fs from 'node:fs/promises';

import { Worker } from 'bullmq';
import { AccessType, type Dataset } from '@verida/shared';

import { db, datasets, datasetVersions, provenanceChain, publishers } from '../../db/index.js';
import {
  emitUploadComplete,
  emitUploadError,
  emitUploadProgress,
  createBullMqConnection,
  UploadJobTypes,
  type UploadDatasetJobData,
  type UploadDatasetMetadata,
  type UploadProgressEvent,
} from '../queue.js';
import { uploadDataset } from '../../shelby/upload.js';
import type { ShelbyUploadMetadata, ShelbyUploadProgress } from '../../shelby/client.js';

export interface UploadWorkerResult {
  blobId: string;
  dataset: Dataset;
  jobId: string;
  merkleRoot: string;
}

class UploadWorkerError extends Error {
  public override readonly cause: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = new.target.name;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertUploadJobData(metadata: UploadDatasetMetadata): void {
  if (!isNonEmptyString(metadata.name)) {
    throw new UploadWorkerError('Upload job metadata.name is required.');
  }

  if (!isNonEmptyString(metadata.description)) {
    throw new UploadWorkerError('Upload job metadata.description is required.');
  }

  if (!isNonEmptyString(metadata.license)) {
    throw new UploadWorkerError('Upload job metadata.license is required.');
  }

  if (metadata.tags.length === 0) {
    throw new UploadWorkerError('Upload job metadata.tags must contain at least one tag.');
  }

  if (
    metadata.accessType !== AccessType.FREE &&
    metadata.accessType !== AccessType.PAY_PER_ACCESS &&
    metadata.accessType !== AccessType.SUBSCRIPTION
  ) {
    throw new UploadWorkerError(`Invalid upload job accessType: ${metadata.accessType}.`);
  }
}

async function removeTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (cause: unknown) {
    if (cause instanceof Error && 'code' in cause && (cause as { code?: string }).code === 'ENOENT') {
      return;
    }

    console.warn('Failed to remove temp file after upload job processing.', {
      cause,
      filePath,
    });
  }
}

async function reportUploadProgress(
  jobId: string,
  progress: UploadProgressEvent,
  workerJob: {
    updateProgress: (progress: UploadProgressEvent) => Promise<void>;
  },
): Promise<void> {
  try {
    await workerJob.updateProgress(progress);
  } catch (cause: unknown) {
    console.warn('Failed to update BullMQ upload job progress.', {
      cause,
      jobId,
      progress,
    });
  }

  await emitUploadProgress(jobId, progress);
}

function mapShelbyProgressToUploadProgress(progress: ShelbyUploadProgress): UploadProgressEvent {
  return {
    bytesTotal: progress.bytesTotal,
    bytesUploaded: progress.bytesUploaded,
    percent: progress.percent,
    stage:
      progress.stage === 'reading' || progress.stage === 'registering' || progress.stage === 'complete'
        ? progress.stage
        : 'registering',
  };
}

async function persistUploadedDataset(
  jobData: UploadDatasetJobData,
  uploadResult: Awaited<ReturnType<typeof uploadDataset>>,
  jobId: string,
): Promise<Dataset> {
  const datasetVersion = jobData.metadata.version ?? 1;
  const uploadedAtIso = new Date(uploadResult.receipt.uploadedAt).toISOString();

  return await db.transaction(async (tx) => {
    await tx
      .insert(publishers)
      .values({
        address: jobData.publisherAddress,
      })
      .onConflictDoNothing();

    const insertedDatasets = await tx
      .insert(datasets)
      .values({
        accessType: jobData.metadata.accessType,
        description: jobData.metadata.description.trim(),
        license: jobData.metadata.license.trim(),
        merkleRoot: uploadResult.merkleRoot,
        name: jobData.metadata.name.trim(),
        pricePerAccess:
          jobData.metadata.accessType === 'pay_per_access'
            ? jobData.metadata.pricePerAccess ?? null
            : null,
        provenanceReceipt: uploadResult.receipt,
        publisherAddress: jobData.publisherAddress,
        shelbyBlobId: uploadResult.blobId,
        sizeBytes: uploadResult.receipt.size,
        tags: jobData.metadata.tags,
        tampered: false,
        version: datasetVersion,
      })
      .returning({
        access_type: datasets.accessType,
        created_at: datasets.createdAt,
        description: datasets.description,
        id: datasets.id,
        license: datasets.license,
        merkle_root: datasets.merkleRoot,
        name: datasets.name,
        price_per_access: datasets.pricePerAccess,
        provenance_receipt: datasets.provenanceReceipt,
        publisher_address: datasets.publisherAddress,
        shelby_blob_id: datasets.shelbyBlobId,
        size_bytes: datasets.sizeBytes,
        tags: datasets.tags,
        tampered: datasets.tampered,
        verified: datasets.verified,
        version: datasets.version,
      });

    const insertedDataset = insertedDatasets.at(0);

    if (insertedDataset === undefined) {
      throw new UploadWorkerError('Dataset insert did not return a row.');
    }

    await tx.insert(datasetVersions).values({
      changelog: null,
      datasetId: insertedDataset.id,
      merkleRoot: uploadResult.merkleRoot,
      sizeBytes: uploadResult.receipt.size,
      shelbyBlobId: uploadResult.blobId,
      version: datasetVersion,
    });

    await tx.insert(provenanceChain).values({
      actorAddress: jobData.publisherAddress,
      datasetId: insertedDataset.id,
      eventType: 'UPLOAD',
      metadata: {
        contentHash: jobData.contentHash,
        jobId,
        metadata: jobData.metadata,
      },
      shelbyReceipt: uploadResult.receipt,
      timestamp: uploadedAtIso,
      txHash: uploadResult.receipt.txHash,
      version: datasetVersion,
    });

    return insertedDataset;
  });
}

async function handleUploadJobFailure(
  jobId: string,
  filePath: string,
  cause: unknown,
): Promise<never> {
  const errorMessage = cause instanceof Error ? cause.message : 'Upload job failed.';

  await emitUploadError(jobId, errorMessage);
  await removeTempFile(filePath);

  if (cause instanceof Error) {
    throw cause;
  }

  throw new UploadWorkerError('Upload job failed.', { cause });
}

export function createUploadWorker(): Worker<UploadDatasetJobData, UploadWorkerResult, typeof UploadJobTypes.UPLOAD_DATASET> {
  return new Worker<UploadDatasetJobData, UploadWorkerResult, typeof UploadJobTypes.UPLOAD_DATASET>(
    UploadJobTypes.UPLOAD_DATASET,
    async (job) => {
      const jobId = job.id ?? `${job.data.publisherAddress}:${job.data.contentHash}`;

      try {
        assertUploadJobData(job.data.metadata);

        const shelbyMetadata: ShelbyUploadMetadata = {
          ...job.data.metadata,
          contentHash: job.data.contentHash,
          publisherAddress: job.data.publisherAddress,
        };

        const uploadResult = await uploadDataset(job.data.filePath, shelbyMetadata, {
          onProgress: async (progress: ShelbyUploadProgress): Promise<void> => {
            await reportUploadProgress(jobId, mapShelbyProgressToUploadProgress(progress), job);
          },
        });

        const dataset = await persistUploadedDataset(job.data, uploadResult, jobId);

        await emitUploadComplete(jobId, dataset);

        return {
          blobId: dataset.shelby_blob_id,
          dataset,
          jobId,
          merkleRoot: dataset.merkle_root,
        };
      } catch (cause: unknown) {
        try {
          await job.updateProgress({
            bytesTotal: 0,
            bytesUploaded: 0,
            percent: 0,
            stage: 'failed',
          });
        } catch (progressCause: unknown) {
          console.warn('Failed to mark BullMQ upload job as failed.', {
            cause: progressCause,
            jobId,
          });
        }

        return await handleUploadJobFailure(jobId, job.data.filePath, cause);
      } finally {
        await removeTempFile(job.data.filePath);
      }
    },
    {
      connection: createBullMqConnection(),
      concurrency: 1,
    },
  );
}

export const UploadWorker = createUploadWorker();

export async function closeUploadWorker(): Promise<void> {
  await UploadWorker.close();
}
