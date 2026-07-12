// Module A — Multimodal describe pipeline.
//
// Flow:
//   1. Decode base64 sample → Buffer
//   2. Detect content type via magic bytes (file-type)
//   3. Dispatch to the correct analyzer (tabular, image, generic, …)
//   4. Produce a unified DatasetProfile
//
// Old flow was: if/else on mimeType + filename → CSV parser or fallback.
// New flow is: detect → classify → dispatch → standardized output.

import type { DatasetProfile, SchemaProfile } from '@verida/shared';
import { DatasetTag } from '@verida/shared';
import { detectContentType } from '../analyzers/content-type.js';
import { dispatchAnalysis } from '../analyzers/registry.js';
import type { AnalyzerContext } from '../analyzers/types.js';

const SAMPLE_MAX_BYTES = 1_048_576; // 1 MB

function decodeSample(sampleBase64: string): Buffer {
  const buf = Buffer.from(sampleBase64, 'base64');
  return buf.subarray(0, SAMPLE_MAX_BYTES);
}

/**
 * Main entry point. Given a base64 sample, MIME type, and filename,
 * detect the real content type and run the appropriate analyzer.
 * Returns a unified DatasetProfile.
 */
export async function describeDataset(
  sampleBase64: string,
  mimeType: string,
  fileName: string,
  fileSize: number,
): Promise<DatasetProfile> {
  const buffer = decodeSample(sampleBase64);

  // Step 1: Detect real content type from magic bytes
  const detected = await detectContentType(buffer, mimeType, fileName);

  // Step 2: Dispatch to the correct analyzer
  const context: AnalyzerContext = {
    fileName,
    mimeType: detected.mimeType,
    fileSize,
    datasetType: detected.datasetType,
  };

  const profile = await dispatchAnalysis(buffer, context);

  // Enrich with detection metadata
  profile.metadata.detectionSource = detected.source;
  profile.metadata.declaredMimeType = mimeType;

  return profile;
}

/**
 * Backward-compatible wrapper that returns a SchemaProfile
 * (what the old extractSchema() returned).
 */
export async function extractSchema(
  sampleBase64: string,
  mimeType: string,
  fileName: string,
): Promise<SchemaProfile> {
  const profile = await describeDataset(sampleBase64, mimeType, fileName, 0);
  return profile.schema ?? {
    modality: profile.modality === 'other' ? 'other' : profile.modality,
    format: (profile.metadata.format as string) ?? 'unknown',
    qualitySignals: { byteSize: profile.metadata.byteSize },
  };
}

// ── Tag prediction (unchanged) ──────────────────────────────────────

const TAG_KEYWORDS: Record<string, RegExp> = {
  [DatasetTag.NLP]: /\b(nlp|language|text|corpus|sentiment|token|word|chat|dialog|transcript)\b/i,
  [DatasetTag.VISION]: /\b(image|vision|photo|picture|object|face|detect|pixel|cnn|ocr)\b/i,
  [DatasetTag.AUDIO]: /\b(audio|speech|sound|voice|music|wav|acoustic)\b/i,
  [DatasetTag.TABULAR]: /\b(tabular|table|row|column|csv|spreadsheet)\b/i,
  [DatasetTag.TIME_SERIES]: /\b(time.?series|timestamp|forecast|trend|sensor|stream)\b/i,
  [DatasetTag.FINANCE]: /\b(finance|stock|price|trading|market|crypto|transaction|bank)\b/i,
  [DatasetTag.MEDICAL]: /\b(medical|health|clinical|patient|disease|diagnosis|hospital)\b/i,
  [DatasetTag.LEGAL]: /\b(legal|law|court|contract|case|regulation|statute)\b/i,
  [DatasetTag.GEOSPATIAL]: /\b(geo|latitude|longitude|map|gps|spatial|region|city)\b/i,
  [DatasetTag.SCIENCE]: /\b(science|physics|chemistry|biology|research|experiment)\b/i,
  [DatasetTag.ROBOTICS]: /\b(robot|control|manipulation|lidar|trajectory|actuator)\b/i,
  [DatasetTag.GAMING]: /\b(game|player|reward|level|esport|match)\b/i,
  [DatasetTag.EDUCATION]: /\b(education|student|course|exam|learning|school)\b/i,
  [DatasetTag.GOVERNMENT]: /\b(government|census|public|policy|election|demographic)\b/i,
  [DatasetTag.ENERGY]: /\b(energy|power|grid|electric|solar|wind|consumption)\b/i,
  [DatasetTag.CLIMATE]: /\b(climate|weather|temperature|precipitation|co2|emission)\b/i,
  [DatasetTag.WEB]: /\b(web|url|click|session|browse|http|traffic)\b/i,
  [DatasetTag.SYNTHETIC]: /\b(synthetic|simulated|fake|generated|augment)\b/i,
};

export function predictTags(profile: SchemaProfile, description: string): string[] {
  const haystack = `${profile.format ?? ''} ${description} ${
    (profile.columns ?? []).map((c) => `${c.name} ${c.semanticCategory ?? ''}`).join(' ')
  } ${(profile.topNgrams ?? []).join(' ')}`.toLowerCase();
  const hits = new Set<string>();
  for (const [tag, re] of Object.entries(TAG_KEYWORDS)) {
    if (re.test(haystack)) hits.add(tag);
  }
  if (profile.modality === 'text') hits.add(DatasetTag.NLP);
  if (profile.modality === 'tabular' && hits.size === 0) hits.add(DatasetTag.TABULAR);
  if (hits.size === 0) hits.add(DatasetTag.OTHER);
  return [...hits];
}
