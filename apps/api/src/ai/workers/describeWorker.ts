// Module A — Describe worker. Consumes a captured file sample, detects its
// content type, dispatches to the correct analyzer, then persists a unified
// DatasetProfile to the database and fans out to downstream workers.

import { Job, Worker } from 'bullmq';

import { datasets } from '../../lib/db/schema.js';
import { db } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';

import { DescribeQueue, EmbedQueue, QualityQueue } from '../queue.js';
import type { DescribeJobData } from '../types.js';
import { describeDataset, predictTags } from '../pipelines/describe.js';
import { generateDescription } from '../serving/client.js';
import { AI_CONFIG } from '../config/ai.config.js';

export const describeWorker = new Worker<DescribeJobData>(
  'ai-describe',
  async (job: Job<DescribeJobData>) => {
    const { datasetId, shelbyBlobId, fileName, mimeType, existingDescription, sampleBase64 } =
      job.data;

    await job.updateProgress(10);

    // Step 1: Detect content type + dispatch to correct analyzer
    const profile = await describeDataset(sampleBase64, mimeType, fileName, 0);
    await job.updateProgress(35);

    // Step 2: Generate AI description (optional — degrades gracefully without LLM SDK)
    const aiDescription = AI_CONFIG.describeEnabled
      ? await generateDescription({
          schemaProfile: profile.schema ?? { modality: profile.modality, format: 'unknown' },
          fileName,
          existingDescription,
        })
      : null;
    await job.updateProgress(60);

    // Step 3: Predict tags from schema + description
    const suggestedTags = predictTags(
      profile.schema ?? { modality: profile.modality, format: 'unknown' },
      aiDescription ?? existingDescription ?? profile.description ?? '',
    );
    await job.updateProgress(80);

    // Step 4: Persist to database
    await db
      .update(datasets)
      .set({
        schemaProfile: profile.schema ?? null,
        aiDescription,
        suggestedTags,
        modality: profile.modality,
        estimatedRowCount: profile.schema?.estimatedRowCount ?? null,
        describeStatus: 'completed',
        describedAt: new Date().toISOString(),
      })
      .where(eq(datasets.id, datasetId));
    await job.updateProgress(92);

    // Step 5: Fan out to downstream workers (embed + quality)
    if (AI_CONFIG.embedEnabled) {
      await EmbedQueue.add('embed', { datasetId }, { delay: 1000 });
    }
    if (AI_CONFIG.qualityEnabled) {
      await QualityQueue.add('quality', { datasetId }, { delay: 2000 });
    }

    await job.updateProgress(100);
    return {
      datasetId,
      shelbyBlobId,
      modality: profile.modality,
      datasetType: profile.datasetType,
      tags: suggestedTags.length,
    };
  },
  { connection: DescribeQueue.opts.connection, concurrency: 3 },
);

export async function closeDescribeWorker(): Promise<void> {
  await describeWorker.close();
}
