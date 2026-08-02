// Module C — Quality worker. Scores a dataset structurally from its SchemaProfile
// and persists the breakdown + overall score.

import { Job, Worker } from 'bullmq';

import { datasets } from '../../lib/db/schema.js';
import { db } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';

import { QualityQueue } from '../queue.js';
import type { QualityJobData } from '../types.js';
import type { SchemaProfile } from '@verida/shared';
import { scoreQuality } from '../pipelines/quality.js';
import { AI_CONFIG } from '../config/ai.config.js';

export const qualityWorker = new Worker<QualityJobData>(
  'ai-quality',
  async (job: Job<QualityJobData>) => {
    const { datasetId } = job.data;

    const row = await db
      .select({ schemaProfile: datasets.schemaProfile, describeStatus: datasets.describeStatus, modality: datasets.modality })
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1)
      .then((r) => r[0]);

    if (!row) throw new Error(`Dataset ${datasetId} not found`);

    // For non-tabular data (images, PDFs, etc.), construct a minimal schemaProfile
    // from the dataset's modality so scoreQuality can still produce a meaningful score.
    // Only skip if describe hasn't completed yet (schema might still be generating).
    const effectiveProfile = row.schemaProfile ?? {
      modality: (row.modality ?? 'other') as SchemaProfile['modality'],
      format: 'unknown',
    };

    const { breakdown, score } = AI_CONFIG.qualityEnabled
      ? scoreQuality(effectiveProfile)
      : { breakdown: null, score: 0 };

    await db
      .update(datasets)
      .set({ qualityScore: score, qualityBreakdown: breakdown, qualityScoredAt: new Date().toISOString() })
      .where(eq(datasets.id, datasetId));

    return { datasetId, score, breakdown };
  },
  { connection: QualityQueue.opts.connection, concurrency: 3 },
);

export async function closeQualityWorker(): Promise<void> {
  await qualityWorker.close();
}
