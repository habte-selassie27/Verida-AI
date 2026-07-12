// Generic Analyzer — fallback for unsupported or unknown file types.
// Produces a minimal DatasetProfile so the pipeline never fails.

import { DatasetType } from '@verida/shared';
import type { DatasetProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';

export class GenericAnalyzer implements DatasetAnalyzer {
  supports(_type: DatasetType): boolean {
    return true; // catches everything — must be registered last
  }

  async analyze(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    const sizeKb = (buffer.length / 1024).toFixed(1);
    const isBinary = !isReadableText(buffer.subarray(0, Math.min(buffer.length, 1024)));

    return {
      title: ctx.fileName,
      description: isBinary
        ? `Binary file (${sizeKb} KB). Content type not yet supported for AI analysis.`
        : `Text file (${sizeKb} KB).`,
      modality: 'other',
      datasetType: DatasetType.UNKNOWN,
      tags: [],
      metadata: {
        byteSize: buffer.length,
        mimeType: ctx.mimeType,
        isBinary,
      },
    };
  }
}

function isReadableText(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    if (buffer[i] === 0) return false;
  }
  let printable = 0;
  const check = Math.min(buffer.length, 1024);
  for (let i = 0; i < check; i++) {
    const b = buffer[i]!;
    if (b >= 0x20 && b <= 0x7e) printable++;
    else if (b === 0x09 || b === 0x0a || b === 0x0d) printable++;
    else if (b >= 0xc0) printable++;
  }
  return printable / check > 0.9;
}
