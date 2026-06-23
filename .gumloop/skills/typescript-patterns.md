---
name: typescript-patterns
description: Common TypeScript patterns used in Verida AI
---

# TypeScript Patterns for Verida AI

## Type Guards
```typescript
function isDataset(obj: unknown): obj is Dataset {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    typeof (obj as Dataset).id === 'number'
  );
}
```

## Zod Schemas
```typescript
import { z } from 'zod';

const DatasetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.nativeEnum(DatasetTag)).optional(),
  sizeBytes: z.number().positive(),
});

type DatasetInput = z.infer<typeof DatasetSchema>;
```

## Async Error Handling
```typescript
async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<[T | null, Error | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}
```

## Database Queries with Drizzle
```typescript
import { eq, desc } from 'drizzle-orm';
import { db } from './db';
import { datasets } from './db/schema';

// Single record
const dataset = await db.query.datasets.findFirst({
  where: eq(datasets.id, id),
});

// Multiple records with ordering
const recentDatasets = await db.query.datasets.findMany({
  orderBy: desc(datasets.createdAt),
  limit: 10,
});
```

## Express Route Handler
```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const ListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export async function listDatasets(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = ListQuerySchema.parse(req.query);
    // ... implementation
    res.json({ data: results, pagination });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query', details: error.errors });
    }
    next(error);
  }
}
```

## React Component Pattern
```typescript
import { useState, useEffect } from 'react';
import { Dataset } from '@verida/shared/types';

interface DatasetCardProps {
  dataset: Dataset;
  onSelect: (id: number) => void;
}

export function DatasetCard({ dataset, onSelect }: DatasetCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      onSelect(dataset.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dataset-card">
      <h3>{dataset.name}</h3>
      <p>{dataset.description}</p>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'View Details'}
      </button>
    </div>
  );
}
```

## BullMQ Worker Pattern
```typescript
import { Worker, Job } from 'bullmq';
import { logger } from '../utils/logger';

const uploadWorker = new Worker(
  'uploads',
  async (job: Job) => {
    logger.info(`Processing upload job ${job.id}`);
    
    try {
      // Process the job
      await processUpload(job.data);
      
      // Update progress
      await job.updateProgress(100);
      
      return { success: true };
    } catch (error) {
      logger.error(`Upload job ${job.id} failed:`, error);
      throw error; // BullMQ will retry
    }
  },
  {
    connection: { host: 'localhost', port: 6379 },
    concurrency: 5,
  }
);

uploadWorker.on('completed', (job) => {
  logger.info(`Upload job ${job.id} completed`);
});

uploadWorker.on('failed', (job, error) => {
  logger.error(`Upload job ${job?.id} failed:`, error);
});
```
