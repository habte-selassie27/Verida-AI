// AI job queues (Module A / B / C). Reuses the BullMQ connection from the
// existing upload queue so we share one Redis connection config.

import { Queue } from 'bullmq';

import { createBullMqConnection } from '../lib/queue/queue.js';
import type { DescribeJobData, EmbedJobData, QualityJobData } from './types.js';

const connection = createBullMqConnection();

export const DescribeQueue = new Queue<DescribeJobData>('ai-describe', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { delay: 5000, type: 'exponential' },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const EmbedQueue = new Queue<EmbedJobData>('ai-embed', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { delay: 3000, type: 'exponential' },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export const QualityQueue = new Queue<QualityJobData>('ai-quality', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { delay: 8000, type: 'exponential' },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

export async function closeAiQueues(): Promise<void> {
  await Promise.all([DescribeQueue.close(), EmbedQueue.close(), QualityQueue.close()]);
}
