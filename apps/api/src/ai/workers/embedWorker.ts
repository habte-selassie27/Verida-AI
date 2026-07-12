// Module B — Embed worker. Builds a document string from the enriched dataset
// and stores an embedding vector (jsonb). If no embedder is configured the
// embedding is left null and semantic search falls back to lexical search.

import { Job, Worker } from 'bullmq';

import { datasets } from '../../lib/db/schema.js';
import { db } from '../../lib/db/index.js';
import { eq } from 'drizzle-orm';

import { EmbedQueue } from '../queue.js';
import type { EmbedJobData } from '../types.js';
import { embedText } from '../serving/client.js';
import { AI_CONFIG } from '../config/ai.config.js';

function buildDocumentText(row: {
  name: string;
  aiDescription: string | null;
  description: string;
  tags: string[];
  suggestedTags: string[];
  modality: string | null;
  schemaProfile: unknown;
}): string {
  const parts: string[] = [
    row.name,
    row.aiDescription ?? row.description,
    ...row.tags,
    ...row.suggestedTags,
  ];
  if (row.modality) parts.push(`modality:${row.modality}`);
  const sp = row.schemaProfile as { columns?: { name: string; semanticCategory?: string }[] } | null;
  if (sp?.columns) {
    parts.push(
      `schema: ${sp.columns
        .slice(0, 30)
        .map((c) => `${c.name}${c.semanticCategory ? `(${c.semanticCategory})` : ''}`)
        .join(', ')}`,
    );
  }
  return parts.filter(Boolean).join(' | ');
}

export const embedWorker = new Worker<EmbedJobData>(
  'ai-embed',
  async (job: Job<EmbedJobData>) => {
    const { datasetId } = job.data;

    const row = await db
      .select({
        name: datasets.name,
        aiDescription: datasets.aiDescription,
        description: datasets.description,
        tags: datasets.tags,
        suggestedTags: datasets.suggestedTags,
        modality: datasets.modality,
        schemaProfile: datasets.schemaProfile,
        describeStatus: datasets.describeStatus,
      })
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1)
      .then((r) => r[0]);

    if (!row) throw new Error(`Dataset ${datasetId} not found`);
    if (row.describeStatus !== 'completed') {
      await EmbedQueue.add('embed', { datasetId }, { delay: 10_000 });
      return { skipped: true, reason: 'describe_not_complete' };
    }

    const embedding = AI_CONFIG.embedEnabled ? await embedText(buildDocumentText(row)) : null;

    await db
      .update(datasets)
      .set({ embedding, embeddedAt: embedding ? new Date().toISOString() : null })
      .where(eq(datasets.id, datasetId));

    return { datasetId, dims: embedding?.length ?? 0 };
  },
  { connection: EmbedQueue.opts.connection, concurrency: 5 },
);

export async function closeEmbedWorker(): Promise<void> {
  await embedWorker.close();
}
