// Module C — Dataset quality scoring pipeline (structural, no external deps).
// Produces a 6-dimensional breakdown and a weighted overall score in [0, 1].
// The weights are the documented defaults; once buyer ratings accumulate they
// are replaced by a learned model (see AI_Integration.md §7.3 / §14).

import type { QualityBreakdown, SchemaProfile } from '@verida/shared';

const DEFAULT_WEIGHTS: Record<keyof QualityBreakdown, number> = {
  completeness: 0.25,
  consistency: 0.2,
  uniqueness: 0.2,
  validity: 0.15,
  timeliness: 0.1,
  coverage: 0.1,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function computeCompleteness(profile: SchemaProfile): number {
  const columns = profile.columns;
  if (!columns || columns.length === 0) {
    // Non-tabular: completeness inferred from lexical diversity / signal presence.
    if (profile.modality === 'text') {
      return clamp01((profile.lexicalDiversity ?? 0.4) * 0.8 + 0.2);
    }
    return 0.6;
  }
  const avg = columns.reduce((a, c) => a + (1 - (c.nullRate ?? 0)), 0) / columns.length;
  return clamp01(avg);
}

function computeValidity(profile: SchemaProfile): number {
  const columns = profile.columns;
  if (!columns || columns.length === 0) {
    return profile.modality === 'text' ? clamp01((profile.lexicalDiversity ?? 0.5)) : 0.7;
  }
  // Validity proxy: low null-rate + non-trivial cardinality suggests parseable values.
  const score = columns.reduce((a, c) => {
    const nullPenalty = c.nullRate ?? 0;
    const typeOk = c.inferredType !== 'string' || (c.cardinality ?? 0) > 1 ? 1 : 0.6;
    return a + (1 - nullPenalty) * typeOk;
  }, 0) / columns.length;
  return clamp01(score);
}

function computeConsistency(profile: SchemaProfile): number {
  const columns = profile.columns;
  if (!columns || columns.length === 0) return 0.7;
  // Consistency: columns with a clear, non-generic inferred type and coherent cardinality.
  const score = columns.reduce((a, c) => {
    let s = 1;
    if (c.inferredType === 'string' && (c.cardinality ?? 0) > 500) s -= 0.3; // loosely typed blob column
    if ((c.nullRate ?? 0) > 0.5) s -= 0.3;
    if (c.name.trim().length === 0) s -= 0.5;
    return a + clamp01(s);
  }, 0) / columns.length;
  return clamp01(score);
}

function computeUniqueness(profile: SchemaProfile): number {
  const columns = profile.columns;
  if (!columns || columns.length === 0) return 0.8;
  const sampledRows = Math.max(profile.sampledRows ?? 1, 1);
  // Estimated uniqueness: few near-constant columns => likely not duplicated.
  const constantColumns = columns.filter((c) => (c.cardinality ?? 0) <= 1).length;
  const ratio = constantColumns / columns.length;
  return clamp01(1 - ratio * 0.8);
}

function entropyNormalized(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let h = 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / total;
    h -= p * Math.log2(p);
  }
  const maxH = Math.log2(counts.length || 2);
  return maxH === 0 ? 0 : h / maxH;
}

function computeCoverage(profile: SchemaProfile): number {
  const columns = profile.columns;
  if (!columns || columns.length === 0) {
    return profile.modality === 'text' ? clamp01((profile.lexicalDiversity ?? 0.6)) : 0.6;
  }
  const categorical = columns.filter((c) => (c.cardinality ?? 0) > 1 && (c.cardinality ?? 0) <= 50);
  if (categorical.length === 0) return 0.7;
  // Approximate entropy from cardinality as a proxy for uniformity.
  const entropies = categorical.map((c) => {
    const k = Math.min(c.cardinality ?? 2, 50);
    return Math.log2(k) / Math.log2(50);
  });
  return clamp01(entropies.reduce((a, b) => a + b, 0) / entropies.length);
}

function computeTimeliness(profile: SchemaProfile): number {
  const columns = profile.columns ?? [];
  const hasTemporal = columns.some(
    (c) => c.semanticCategory === 'datetime' || c.inferredType === 'datetime',
  );
  if (hasTemporal) return 0.9;
  // Timeless data (reference tables, static vocabularies) is not penalized hard.
  return 0.75;
}

export function scoreQuality(profile: SchemaProfile): {
  breakdown: QualityBreakdown;
  score: number;
} {
  const breakdown: QualityBreakdown = {
    completeness: computeCompleteness(profile),
    consistency: computeConsistency(profile),
    uniqueness: computeUniqueness(profile),
    validity: computeValidity(profile),
    timeliness: computeTimeliness(profile),
    coverage: computeCoverage(profile),
  };
  const score = (Object.keys(DEFAULT_WEIGHTS) as (keyof QualityBreakdown)[]).reduce(
    (acc, key) => acc + DEFAULT_WEIGHTS[key] * breakdown[key],
    0,
  );
  return { breakdown, score: Math.round(score * 1000) / 1000 };
}

export { DEFAULT_WEIGHTS, entropyNormalized };
