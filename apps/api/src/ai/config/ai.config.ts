// AI configuration — feature flags and thresholds (Module A/B/C).
// Mirrors the env-var contract in AI_Integration.md §19.2.

export const AI_CONFIG = {
  describeEnabled: (process.env.AI_DESCRIBE_ENABLED ?? 'true') !== 'false',
  embedEnabled: (process.env.AI_EMBED_ENABLED ?? 'true') !== 'false',
  qualityEnabled: (process.env.AI_QUALITY_ENABLED ?? 'true') !== 'false',
  // Quality thresholds
  fraudAutoBlockThreshold: Number(process.env.FRAUD_AUTO_BLOCK_THRESHOLD ?? 0.9),
  fraudHumanReviewThreshold: Number(process.env.FRAUD_HUMAN_REVIEW_THRESHOLD ?? 0.7),
  // Blending for hybrid search (semantic vs lexical). Tune via click-through later.
  semanticWeight: Number(process.env.AI_SEMANTIC_WEIGHT ?? 0.7),
  // Sample size captured from uploads for the describe pipeline.
  sampleMaxBytes: 1_048_576,
} as const;

export type AiConfig = typeof AI_CONFIG;
