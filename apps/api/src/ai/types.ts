// AI module shared job types (Module A / B / C).
// COLLOCATION NOTE: these live under apps/api/src/ai (not the root AI/ folder)
// because the API tsconfig uses rootDir=src; keeping AI code in src keeps `tsc`
// builds green. See AI_Integration.md §19 for the intended logical layout.

import type { DatasetModality, SchemaProfile } from '@verida/shared';

export interface DescribeJobData {
  datasetId: number;
  shelbyBlobId: string;
  fileName: string;
  mimeType: string;
  existingDescription?: string;
  // First ~1MB of the uploaded file, base64-encoded, captured in the upload worker
  // so the describe pipeline never needs to re-stream from Shelby.
  sampleBase64: string;
}

export interface EmbedJobData {
  datasetId: number;
}

export interface QualityJobData {
  datasetId: number;
}

export type AiJobName = 'describe' | 'embed' | 'quality';

export type { DatasetModality, SchemaProfile };
