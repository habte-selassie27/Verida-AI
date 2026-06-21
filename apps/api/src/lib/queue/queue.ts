// IMPLEMENTER NOTE: Declares the BullMQ upload queue, shared Redis connection, and typed event hooks for upload jobs.
// BUILD.md TASK: STEP 5 — BullMQ Upload Job Queue
// ARCHITECT CONTRACT: UploadQueue with job types UPLOAD_DATASET, VERIFY_INTEGRITY, and GENERATE_PREVIEW
// SHELBY SDK METHODS: None directly; worker modules call Shelby helpers after consuming queue jobs.
// DB TABLES: None directly; queue jobs drive later writes to datasets, dataset_versions, publishers, and provenance_chain.
// HANDOFF TO TESTER: Verify Redis connection setup, job type constants, and upload event hooks are exported consistently.

import { EventEmitter } from 'node:events';

import { Queue, type ConnectionOptions } from 'bullmq';
import type { AccessType, Dataset, DatasetTag } from '@verida/shared';

export const UploadQueueName = 'verida-upload-jobs' as const;

export const UploadJobTypes = {
  GENERATE_PREVIEW: 'GENERATE_PREVIEW',
  UPLOAD_DATASET: 'UPLOAD_DATASET',
  VERIFY_INTEGRITY: 'VERIFY_INTEGRITY',
} as const;

export type UploadJobName = (typeof UploadJobTypes)[keyof typeof UploadJobTypes];

export interface UploadDatasetMetadata {
  accessType: AccessType;
  blobName?: string;
  description: string;
  expirationMicros?: number;
  license: string;
  name: string;
  pricePerAccess?: number | null;
  sizeBytes?: number;
  tags: DatasetTag[];
  version?: number;
}

export interface UploadDatasetJobData {
  contentHash: string;
  filePath: string;
  metadata: UploadDatasetMetadata;
  publisherAddress: string;
}

export interface VerifyIntegrityJobData {
  datasetId: number;
}

export interface GeneratePreviewJobData {
  datasetId: number;
}

export type UploadQueueJobData =
  | UploadDatasetJobData
  | VerifyIntegrityJobData
  | GeneratePreviewJobData;

export interface UploadProgressEvent {
  bytesTotal: number;
  bytesUploaded: number;
  percent: number;
  stage: 'reading' | 'registering' | 'complete' | 'failed';
}

export interface UploadCompleteEvent {
  dataset: Dataset;
  jobId: string;
}

export interface UploadErrorEvent {
  error: string;
  jobId: string;
}

export const UploadQueueEvents = {
  COMPLETE: 'upload:complete',
  ERROR: 'upload:error',
  PROGRESS: 'upload:progress',
} as const;

type UploadQueueEventPayloads = {
  [UploadQueueEvents.COMPLETE]: UploadCompleteEvent;
  [UploadQueueEvents.ERROR]: UploadErrorEvent;
  [UploadQueueEvents.PROGRESS]: {
    jobId: string;
    progress: UploadProgressEvent;
  };
};

const uploadQueueEventEmitter = new EventEmitter();
uploadQueueEventEmitter.setMaxListeners(100);

function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';

  if (redisUrl.length === 0) {
    throw new Error('REDIS_URL is required to initialize the BullMQ upload queue.');
  }

  return redisUrl;
}

function toBullMqConnectionOptions(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const defaultPort = parsed.protocol === 'rediss:' ? 6380 : 6379;
  const parsedPort = Number.parseInt(parsed.port, 10);
  const parsedDb = Number.parseInt(parsed.pathname.replace(/^\/+/, ''), 10);
  const connectionOptions: ConnectionOptions = {
    enableReadyCheck: false,
    host: parsed.hostname,
    maxRetriesPerRequest: null,
    port: Number.isFinite(parsedPort) ? parsedPort : defaultPort,
  };

  if (parsed.username.length > 0) {
    connectionOptions.username = decodeURIComponent(parsed.username);
  }

  if (parsed.password.length > 0) {
    connectionOptions.password = decodeURIComponent(parsed.password);
  }

  if (Number.isFinite(parsedDb)) {
    connectionOptions.db = parsedDb;
  }

  if (parsed.protocol === 'rediss:') {
    connectionOptions.tls = {};
  }

  return connectionOptions;
}

export function createBullMqConnection(): ConnectionOptions {
  return toBullMqConnectionOptions(getRedisUrl());
}

export const uploadQueueConnection = createBullMqConnection();

export const UploadQueue = new Queue<UploadQueueJobData, unknown, UploadJobName>(UploadQueueName, {
  connection: uploadQueueConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 250,
  },
});

export const UploadDatasetQueue = new Queue<
  UploadDatasetJobData,
  unknown,
  typeof UploadJobTypes.UPLOAD_DATASET
>(UploadJobTypes.UPLOAD_DATASET, {
  connection: uploadQueueConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 250,
  },
});

export const VerifyIntegrityQueue = new Queue<
  VerifyIntegrityJobData,
  unknown,
  typeof UploadJobTypes.VERIFY_INTEGRITY
>(UploadJobTypes.VERIFY_INTEGRITY, {
  connection: uploadQueueConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 250,
  },
});

export async function emitUploadProgress(
  jobId: string,
  progress: UploadProgressEvent,
): Promise<void> {
  uploadQueueEventEmitter.emit(UploadQueueEvents.PROGRESS, {
    jobId,
    progress,
  } satisfies UploadQueueEventPayloads[typeof UploadQueueEvents.PROGRESS]);
}

export async function emitUploadComplete(jobId: string, dataset: Dataset): Promise<void> {
  uploadQueueEventEmitter.emit(UploadQueueEvents.COMPLETE, {
    dataset,
    jobId,
  } satisfies UploadQueueEventPayloads[typeof UploadQueueEvents.COMPLETE]);
}

export async function emitUploadError(jobId: string, error: string): Promise<void> {
  uploadQueueEventEmitter.emit(UploadQueueEvents.ERROR, {
    error,
    jobId,
  } satisfies UploadQueueEventPayloads[typeof UploadQueueEvents.ERROR]);
}

export function onUploadProgress(
  listener: (event: UploadQueueEventPayloads[typeof UploadQueueEvents.PROGRESS]) => void,
): () => void {
  uploadQueueEventEmitter.on(UploadQueueEvents.PROGRESS, listener);
  return (): void => {
    uploadQueueEventEmitter.off(UploadQueueEvents.PROGRESS, listener);
  };
}

export function onUploadComplete(
  listener: (event: UploadQueueEventPayloads[typeof UploadQueueEvents.COMPLETE]) => void,
): () => void {
  uploadQueueEventEmitter.on(UploadQueueEvents.COMPLETE, listener);
  return (): void => {
    uploadQueueEventEmitter.off(UploadQueueEvents.COMPLETE, listener);
  };
}

export function onUploadError(
  listener: (event: UploadQueueEventPayloads[typeof UploadQueueEvents.ERROR]) => void,
): () => void {
  uploadQueueEventEmitter.on(UploadQueueEvents.ERROR, listener);
  return (): void => {
    uploadQueueEventEmitter.off(UploadQueueEvents.ERROR, listener);
  };
}

export async function closeUploadQueueConnection(): Promise<void> {
  // BullMQ manages Redis connections internally when plain connection options are used.
}

export async function closeUploadQueue(): Promise<void> {
  await Promise.all([
    UploadQueue.close(),
    UploadDatasetQueue.close(),
    VerifyIntegrityQueue.close(),
  ]);
  await closeUploadQueueConnection();
}
