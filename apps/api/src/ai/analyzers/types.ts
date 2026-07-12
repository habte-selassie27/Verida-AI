// DatasetAnalyzer interface — the contract every format-specific analyzer implements.
// The dispatcher finds the first analyzer whose `supports()` returns true,
// then calls `analyze()`. Output is always a unified DatasetProfile.

import type { DatasetProfile, DatasetType } from '@verida/shared';

export interface DatasetAnalyzer {
  /** Returns true if this analyzer can handle the detected content type. */
  supports(type: DatasetType): boolean;

  /** Analyze the raw file buffer and return a unified profile. */
  analyze(buffer: Buffer, context: AnalyzerContext): Promise<DatasetProfile>;
}

export interface AnalyzerContext {
  fileName: string;
  mimeType: string;
  fileSize: number;
  datasetType: DatasetType;
}
