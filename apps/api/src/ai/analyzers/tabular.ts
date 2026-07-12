// Tabular Analyzer — handles CSV, TSV, JSON arrays, JSONL, and plain text.
// Reuses the existing extraction logic from the original describe pipeline.

import { DatasetType, DatasetModality } from '@verida/shared';
import type { DatasetProfile, SchemaProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';

// ── Helpers (ported from original describe.ts) ──────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function inferColumnType(values: string[]): string {
  const nonEmpty = values.filter((v) => v.trim().length > 0);
  if (nonEmpty.length === 0) return 'string';
  let allInt = true;
  let allFloat = true;
  let allBool = true;
  let allDate = true;
  for (const v of nonEmpty) {
    const t = v.trim();
    if (!/^-?\d+$/.test(t)) allInt = false;
    if (!/^-?\d*\.?\d+$/.test(t)) allFloat = false;
    if (!/^(true|false|yes|no|0|1)$/i.test(t)) allBool = false;
    if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(t) && !/^\d{4}-\d{2}-\d{2}T/.test(t)) {
      allDate = false;
    }
  }
  if (allBool) return 'boolean';
  if (allDate) return 'datetime';
  if (allInt) return 'integer';
  if (allFloat) return 'float';
  return 'string';
}

const SEMANTIC_HINTS: Record<string, string[]> = {
  identifier: ['id', 'uuid', 'guid', 'user_id', 'userid', 'customer_id', 'product_id', 'session_id'],
  datetime: ['date', 'time', 'timestamp', 'created', 'updated', 'published', 'birth'],
  email: ['email', 'e-mail', 'mail'],
  name: ['name', 'firstname', 'lastname', 'username', 'fullname'],
  price: ['price', 'cost', 'amount', 'fee', 'salary', 'revenue'],
  currency: ['currency', 'ccy'],
  category: ['category', 'type', 'class', 'label', 'tag', 'genre', 'status'],
  location: ['country', 'city', 'state', 'region', 'zip', 'postal', 'lat', 'lon', 'latitude', 'longitude', 'address'],
  text: ['description', 'comment', 'review', 'message', 'title', 'content', 'body'],
  rating: ['rating', 'score', 'stars', 'rank'],
  url: ['url', 'link', 'uri', 'website', 'href'],
  boolean: ['is_', 'has_', 'flag'],
};

function inferSemanticCategory(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [category, hints] of Object.entries(SEMANTIC_HINTS)) {
    if (hints.some((h) => (category === 'boolean' ? lower.startsWith(h) : lower.includes(h)))) {
      return category;
    }
  }
  return undefined;
}

function computeDistributionStats(values: string[]): Record<string, number> {
  const nums = values.map((v) => Number.parseFloat(v)).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return {};
  const sorted = [...nums].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
  return { min, max, mean: Math.round(mean * 1000) / 1000, median };
}

// ── Tabular Analyzer ────────────────────────────────────────────────

export class TabularAnalyzer implements DatasetAnalyzer {
  supports(type: DatasetType): boolean {
    return type === DatasetType.TABULAR || type === DatasetType.TEXT;
  }

  async analyze(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    const text = buffer.toString('utf-8');

    // Try CSV first
    if (this.looksLikeCsv(text)) {
      return this.analyzeCsv(buffer, ctx);
    }

    // Try JSON / JSONL
    if (this.looksLikeJson(text)) {
      return this.analyzeJson(buffer, ctx);
    }

    // Fall back to plain text analysis
    return this.analyzeText(buffer, ctx);
  }

  private looksLikeCsv(text: string): boolean {
    const trimmed = text.trimStart();
    // JSON always starts with { or [ — never treat it as CSV
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
    const firstLine = trimmed.split(/\r?\n/)[0];
    if (!firstLine) return false;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const tabCount = (firstLine.match(/\t/g) ?? []).length;
    return commaCount >= 2 || tabCount >= 2;
  }

  private looksLikeJson(text: string): boolean {
    const trimmed = text.trimStart();
    return trimmed.startsWith('{') || trimmed.startsWith('[');
  }

  private async analyzeCsv(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 2000);
    const delimiter = (lines[0] ?? '').includes('\t') ? '\t' : ',';
    const headers = (lines[0] ?? '')
      .split(delimiter)
      .map((h) => h.trim().replace(/^"|"$/g, ''))
      .filter((h) => h.length > 0);

    const columns = headers.map((header, idx) => {
      const values = lines
        .slice(1)
        .map((line) => line.split(delimiter)[idx] ?? '')
        .filter((v): v is string => v !== undefined);
      const nonNull = values.filter((v) => v.trim().length > 0 && !/^(null|na|n\/a|none)$/i.test(v.trim()));
      const nullRate = values.length === 0 ? 1 : 1 - nonNull.length / values.length;
      const cardinality = new Set(values).size;
      return {
        name: header,
        inferredType: inferColumnType(values),
        nullRate: Math.round(nullRate * 1000) / 1000,
        cardinality,
        sampleValues: [...new Set(nonNull.filter(Boolean))].slice(0, 5),
        semanticCategory: inferSemanticCategory(header),
        distributionStats: computeDistributionStats(values),
      };
    });

    const avgLineBytes = buffer.length / lines.length;
    const estimatedRowCount = avgLineBytes > 0 ? Math.round(buffer.length / avgLineBytes) : undefined;

    const schema: SchemaProfile = {
      modality: 'tabular',
      format: delimiter === '\t' ? 'tsv' : 'csv',
      estimatedRowCount,
      columns,
      qualitySignals: { sampledRows: lines.length - 1, columnCount: columns.length },
      sampledRows: lines.length - 1,
    };

    return {
      title: ctx.fileName,
      description: `Tabular dataset with ${columns.length} columns and ~${lines.length - 1} sampled rows.`,
      modality: 'tabular',
      datasetType: DatasetType.TABULAR,
      tags: [],
      metadata: { format: schema.format, columnCount: columns.length, rowCount: estimatedRowCount },
      schema,
    };
  }

  private async analyzeJson(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    const text = buffer.toString('utf-8');
    let data: unknown;
    let format = 'json';
    try {
      data = JSON.parse(text);
    } catch {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 1000);
      data = lines
        .map((l) => {
          try { return JSON.parse(l); } catch { return null; }
        })
        .filter((v): v is unknown => v !== null);
      format = 'jsonl';
    }

    const isArray = Array.isArray(data);
    const record = isArray ? (data as unknown[])[0] : data;
    const keys = record && typeof record === 'object' ? Object.keys(record as object) : [];

    const columns = keys.slice(0, 50).map((key) => {
      const sample = isArray
        ? (data as unknown[])
            .slice(0, 200)
            .map((d) => (d && typeof d === 'object' ? (d as Record<string, unknown>)[key] : undefined))
            .filter((v): v is unknown => v !== undefined && v !== null)
            .map(String)
        : [String((record as Record<string, unknown>)[key] ?? '')];
      return {
        name: key,
        inferredType: inferColumnType(sample),
        nullRate: sample.length === 0 ? 1 : Math.round((1 - sample.length / Math.max(sample.length, 1)) * 1000) / 1000,
        cardinality: new Set(sample).size,
        sampleValues: [...new Set(sample)].slice(0, 5),
        semanticCategory: inferSemanticCategory(key),
      };
    });

    const schema: SchemaProfile = {
      modality: isArray ? 'tabular' : 'hierarchical',
      format,
      estimatedRowCount: isArray ? (data as unknown[]).length : 1,
      columns,
      qualitySignals: { recordCount: isArray ? (data as unknown[]).length : 1, fieldCount: keys.length },
      sampledRows: isArray ? Math.min((data as unknown[]).length, 1000) : 1,
    };

    return {
      title: ctx.fileName,
      description: isArray
        ? `JSON array with ${(data as unknown[]).length} records and ${keys.length} fields.`
        : `JSON object with ${keys.length} fields.`,
      modality: schema.modality,
      datasetType: DatasetType.TABULAR,
      tags: [],
      metadata: { format, recordCount: schema.estimatedRowCount, fieldCount: keys.length },
      schema,
    };
  }

  private async analyzeText(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    const text = buffer.toString('utf-8');
    const sample = text.slice(0, 200_000);
    const STOPWORDS = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are',
      'was', 'were', 'be', 'this', 'that', 'it', 'as', 'at', 'by', 'from', 'we', 'you',
    ]);
    const words = sample
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));
    const sentences = sample.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    const vocab = new Set(words);

    const bigramCounts = new Map<string, number>();
    for (let i = 1; i < words.length; i++) {
      const bigram = `${words[i - 1]} ${words[i]}`;
      bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
    }
    const topBigrams = [...bigramCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k]) => k);

    const hasCjk = /[一-鿿]/.test(sample);
    const hasFrench = /[àâäéèêëïîôöùûüçñ]/i.test(sample) && /\b(le|la|les|un|une|et|de|que)\b/i.test(sample);
    const language = hasCjk ? 'zh' : hasFrench ? 'fr' : 'en';

    const schema: SchemaProfile = {
      modality: 'text',
      format: 'plain_text',
      estimatedTokenCount: Math.round(buffer.length / 4),
      language,
      avgSentenceLength:
        sentences.length > 0
          ? Math.round(sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) / sentences.length)
          : 0,
      lexicalDiversity: words.length > 0 ? Math.round((vocab.size / words.length) * 1000) / 1000 : 0,
      topNgrams: topBigrams,
      qualitySignals: { wordCount: words.length, uniqueWords: vocab.size },
      sampledRows: sentences.length,
    };

    return {
      title: ctx.fileName,
      description: `Text document with ~${words.length} words in ${language.toUpperCase()}.`,
      modality: 'text',
      datasetType: DatasetType.TEXT,
      tags: [],
      metadata: { wordCount: words.length, language, sentenceCount: sentences.length },
      schema,
    };
  }
}
