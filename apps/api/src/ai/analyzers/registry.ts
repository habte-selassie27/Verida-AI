// Analyzer Registry — manages registered analyzers and dispatches
// to the correct one based on detected content type.

import type { DatasetType } from '@verida/shared';
import type { DatasetProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';
import { TabularAnalyzer } from './tabular.js';
import { ImageAnalyzer } from './image.js';
import { PdfAnalyzer } from './pdf.js';
import { VideoAnalyzer } from './video.js';
import { AudioAnalyzer } from './audio.js';
import { ArchiveAnalyzer } from './archive.js';
import { GenericAnalyzer } from './generic.js';

// Registry — order matters: first match wins. GenericAnalyzer must be last.
const analyzers: DatasetAnalyzer[] = [
  new TabularAnalyzer(),
  new ImageAnalyzer(),
  new PdfAnalyzer(),
  new VideoAnalyzer(),
  new AudioAnalyzer(),
  new ArchiveAnalyzer(),
  new GenericAnalyzer(), // always last — catches everything
];

export function getAnalyzer(type: DatasetType): DatasetAnalyzer {
  const match = analyzers.find((a) => a.supports(type));
  if (!match) throw new Error(`No analyzer registered for type: ${type}`);
  return match;
}

export async function dispatchAnalysis(
  buffer: Buffer,
  context: AnalyzerContext,
): Promise<DatasetProfile> {
  const analyzer = getAnalyzer(context.datasetType);
  return analyzer.analyze(buffer, context);
}

export function registerAnalyzer(analyzer: DatasetAnalyzer): void {
  // Insert before the generic fallback
  const genericIdx = analyzers.findIndex((a) => a instanceof GenericAnalyzer);
  if (genericIdx >= 0) {
    analyzers.splice(genericIdx, 0, analyzer);
  } else {
    analyzers.push(analyzer);
  }
}
