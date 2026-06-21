// IMPLEMENTER NOTE: Processes integrity verification jobs and updates the dataset verification status in the database.
// BUILD.md TASK: STEP 5 — BullMQ Upload Job Queue
// ARCHITECT CONTRACT: VERIFY_INTEGRITY worker that calls Shelby integrity checks and updates datasets.verified
// SHELBY SDK METHODS: verifyIntegrity from the Shelby integration layer
// DB TABLES: datasets, provenance_chain
// HANDOFF TO TESTER: Verify valid datasets are marked verified, tampered datasets are marked false, and missing rows fail cleanly.

import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';

import { db, datasets } from '../../db/index.js';
import { createBullMqConnection, UploadJobTypes, type VerifyIntegrityJobData } from '../queue.js';
import { verifyIntegrity } from '../../shelby/verify.js';

export interface VerifyWorkerResult {
  checkedAt: number;
  datasetId: number;
  tampered: boolean;
  verified: boolean;
}

class VerifyWorkerError extends Error {
  public override readonly cause: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = new.target.name;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface DatasetVerificationRecord {
  id: number;
  merkleRoot: string;
  shelbyBlobId: string;
}

async function loadDatasetForVerification(datasetId: number): Promise<DatasetVerificationRecord> {
  const datasetRows = await db
    .select({
      id: datasets.id,
      merkleRoot: datasets.merkleRoot,
      shelbyBlobId: datasets.shelbyBlobId,
    })
    .from(datasets)
    .where(eq(datasets.id, datasetId))
    .limit(1);

  const dataset = datasetRows.at(0);

  if (dataset === undefined) {
    throw new VerifyWorkerError(`No dataset found for datasetId ${datasetId}.`);
  }

  return dataset;
}

export function createVerifyWorker(): Worker<VerifyIntegrityJobData, VerifyWorkerResult, typeof UploadJobTypes.VERIFY_INTEGRITY> {
  return new Worker<VerifyIntegrityJobData, VerifyWorkerResult, typeof UploadJobTypes.VERIFY_INTEGRITY>(
    UploadJobTypes.VERIFY_INTEGRITY,
    async (job) => {
      try {
        const dataset = await loadDatasetForVerification(job.data.datasetId);
        const verificationResult = await verifyIntegrity(dataset.shelbyBlobId, dataset.merkleRoot);

        if (verificationResult.valid) {
          await db
            .update(datasets)
            .set({
              verified: true,
            })
            .where(eq(datasets.id, dataset.id));

          return {
            checkedAt: verificationResult.checkedAt,
            datasetId: dataset.id,
            tampered: false,
            verified: true,
          };
        }

        await db
          .update(datasets)
          .set({
            tampered: true,
            verified: false,
          })
          .where(eq(datasets.id, dataset.id));

        return {
          checkedAt: verificationResult.checkedAt,
          datasetId: dataset.id,
          tampered: true,
          verified: false,
        };
      } catch (cause: unknown) {
        const message = cause instanceof Error ? cause.message : 'Verification job failed.';
        console.error('VERIFY_INTEGRITY job failed.', {
          cause,
          jobId: job.id,
          datasetId: job.data.datasetId,
        });

        if (cause instanceof Error) {
          throw cause;
        }

        throw new VerifyWorkerError(message, { cause });
      }
    },
    {
      connection: createBullMqConnection(),
      concurrency: 1,
    },
  );
}

export const VerifyWorker = createVerifyWorker();

export async function closeVerifyWorker(): Promise<void> {
  await VerifyWorker.close();
}
