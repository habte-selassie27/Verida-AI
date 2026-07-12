# Verida AI — AI Integration Master Specification
# Principal AI Scientist & Chief AI Architect Document
# Version 1.0.0 — Production Research Grade

---

> *"The goal is not a marketplace with AI features. The goal is an intelligent decentralized AI ecosystem where datasets understand themselves, models understand datasets, and the entire system improves through continual learning."*

---

## Table of Contents

1. [Executive Vision](#1-executive-vision)
2. [Intelligence Levels Framework](#2-intelligence-levels-framework)
3. [Current System Audit](#3-current-system-audit)
4. [AI Architecture Philosophy](#4-ai-architecture-philosophy)
5. [Module A — Dataset Preview & Auto-Describer](#5-module-a--dataset-preview--auto-describer)
6. [Module B — Semantic Search & Neural Retrieval](#6-module-b--semantic-search--neural-retrieval)
7. [Module C — Dataset Quality Scoring Engine](#7-module-c--dataset-quality-scoring-engine)
8. [Module D — Intelligent Pricing Optimizer](#8-module-d--intelligent-pricing-optimizer)
9. [Module E — Fraud & Anomaly Detection](#9-module-e--fraud--anomaly-detection)
10. [Module F — Publisher AI Assistant](#10-module-f--publisher-ai-assistant)
11. [Module G — Knowledge Graph & Graph Neural Network](#11-module-g--knowledge-graph--graph-neural-network)
12. [Module H — Recommendation Engine](#12-module-h--recommendation-engine)
13. [Module I — On-Platform Inference Sandbox](#13-module-i--on-platform-inference-sandbox)
14. [Module J — Continual Learning Pipeline](#14-module-j--continual-learning-pipeline)
15. [Module K — Federated Intelligence Layer](#15-module-k--federated-intelligence-layer)
16. [MLOps & AI Infrastructure](#16-mlops--ai-infrastructure)
17. [AI Security & Trustworthy AI](#17-ai-security--trustworthy-ai)
18. [Blockchain-AI Integration Layer](#18-blockchain-ai-integration-layer)
19. [Codebase Integration Map](#19-codebase-integration-map)
20. [Implementation Roadmap](#20-implementation-roadmap)
21. [Research Directions & Future Work](#21-research-directions--future-work)
22. [Appendix — Mathematical Foundations](#22-appendix--mathematical-foundations)

---

## 1. Executive Vision

### 1.1 The Transformation Thesis

Verida AI currently operates as a **Level 0 Static Marketplace**: publishers upload raw datasets,
buyers browse by keyword, and the system provides immutable provenance via Merkle trees and Aptos
anchoring. The product is trusted but unintelligent.

The thesis of this document is that **trust is necessary but not sufficient**. A buyer who finds a
cryptographically verified dataset that is irrelevant, low quality, or poorly described has gained
nothing from the verification. Trust without intelligence produces verified garbage.

The transformation goal is to move Verida AI from a trusted file storage layer to a **living,
self-improving AI data ecosystem** — one where:

- Datasets describe themselves through learned representations.
- Buyers discover data through intent, not keywords.
- Quality is assessed by neural models, not human tags.
- Pricing is optimized through online learning.
- Knowledge about dataset relationships compounds over time.
- The entire platform grows smarter with every upload, access, and interaction.

This is not "adding AI features." This is **rebuilding the intelligence substrate** of the platform.

### 1.2 What Makes This Hard

Several properties of Verida AI's architecture create unique ML engineering challenges:

**Decentralization constraint**: Datasets live on Shelby Protocol. You cannot load the full dataset
into a GPU server on demand. AI must work with metadata, streamed samples, and Merkle-verified
subsets. This rules out naive approaches and forces architecturally novel solutions.

**Privacy constraint**: Publisher and buyer addresses are pseudonymous. Collaborative filtering and
user-level behavioral models must be designed with privacy budgets in mind.

**Heterogeneous data types**: The marketplace hosts tabular CSV, JSON records, image archives,
audio clips, NLP corpora, and multimodal datasets. No single model family handles all of these
naturally. The AI layer must be **modality-aware**.

**Cold start problem**: New publishers and new datasets have no interaction history. The
recommendation and quality systems must perform well with zero prior data for a given entity.

**On-chain verifiability**: Where possible, AI decisions (quality scores, access grants, price
recommendations) should be verifiably derived — meaning the computation is transparent, the inputs
are anchored on-chain, and the output can be reproduced by any party.

### 1.3 Guiding Principles

Throughout all AI modules defined in this document, the following principles govern every design
decision:

1. **Own the intelligence**: External API calls are acceptable as prototypes. Production systems
   must train, host, and fine-tune their own models wherever economically feasible.

2. **Verifiability over accuracy**: A 90%-accurate model whose decisions can be audited is more
   valuable in a decentralized context than a 99%-accurate black box.

3. **Incremental improvement**: Every user interaction is a training signal. The platform must be
   architected to capture and use these signals continuously.

4. **Modality-first design**: Design separate processing heads for tabular, text, image, and audio
   data; unify through a shared embedding space.

5. **Fail safe**: AI features must degrade gracefully. If the quality scorer fails, the dataset is
   still accessible. If semantic search fails, keyword search takes over. No AI module should be a
   single point of failure.

6. **Privacy by design**: Behavioral models must be built with differential privacy guarantees.
   No raw wallet address-level data should be used in user-facing model outputs.

7. **Research quality code**: Every AI module ships with unit tests, integration tests, and an
   eval harness. ML without evals is guesswork.

---

## 2. Intelligence Levels Framework

### 2.1 The Six Levels

The following levels define the maturity trajectory of Verida AI's intelligence. Each level is a
superset of the one below it.

```
Level 0 — Static Marketplace
    Datasets stored, verified, sold. No intelligence.
    Current state of Verida AI.
    ──────────────────────────────────────────────
Level 1 — Metadata Intelligence
    Datasets have auto-generated descriptions, tags, schema profiles.
    Quality inferred from structural analysis.
    Search is enriched by inferred metadata.
    ──────────────────────────────────────────────
Level 2 — Semantic Intelligence
    Datasets are embedded into a shared vector space.
    Search operates on meaning, not keywords.
    Related datasets are linked by learned similarity.
    ──────────────────────────────────────────────
Level 3 — Predictive Intelligence
    Usage patterns predict future demand.
    Quality predicted before human validation.
    Price recommendations adapt to market signals.
    Fraud detected before it completes.
    ──────────────────────────────────────────────
Level 4 — Autonomous Intelligence
    Publisher AI assistant writes descriptions, selects licenses, recommends prices.
    Buyers receive proactive dataset recommendations.
    Dataset relationships discovered autonomously via knowledge graph.
    Inference sandbox runs models against purchased data.
    ──────────────────────────────────────────────
Level 5 — Self-Improving Intelligence
    Continual learning pipeline updates models as new data arrives.
    Recommendation accuracy improves with each access event.
    Quality models retrain on newly validated datasets.
    The platform curates its own training data from its marketplace.
    ──────────────────────────────────────────────
Level 6 — Decentralized AI Infrastructure
    Federated learning across publishers without data centralization.
    On-chain proof of AI computation via ZK-ML.
    Autonomous agents discover, package, and negotiate dataset access.
    The marketplace becomes an AI operating system.
```

### 2.2 Module-to-Level Mapping

| Module | Level Unlocked | Phase |
|--------|---------------|-------|
| A — Dataset Preview & Auto-Describer | Level 1 | 1 |
| B — Semantic Search | Level 2 | 1 |
| C — Quality Scoring Engine | Level 1 → 3 | 1 |
| D — Intelligent Pricing Optimizer | Level 3 | 2 |
| E — Fraud & Anomaly Detection | Level 3 | 2 |
| F — Publisher AI Assistant | Level 4 | 2 |
| G — Knowledge Graph & GNN | Level 2 → 4 | 2 |
| H — Recommendation Engine | Level 3 → 5 | 3 |
| I — On-Platform Inference Sandbox | Level 4 | 3 |
| J — Continual Learning Pipeline | Level 5 | 3 |
| K — Federated Intelligence Layer | Level 6 | 4 |

### 2.3 Priority Sequencing

The implementation sequencing follows a dependency graph, not arbitrary priority:

```
Phase 1 (Foundation):      A → B → C
Phase 2 (Intelligence):    D → E → F → G
Phase 3 (Autonomy):        H → I → J
Phase 4 (Decentralization): K
```

A must come before B because embeddings depend on enriched metadata.
C must come before D because pricing optimization uses quality signals as input features.
G must come before H because the recommendation engine uses the knowledge graph as a structural prior.
J must come before K because continual learning infrastructure is a prerequisite for federated variants.

---

## 3. Current System Audit

### 3.1 AI Readiness Assessment

Before integrating AI, the existing codebase must be audited for readiness across five dimensions:

**Data availability**: Verida AI has `datasets`, `access_sessions`, `provenance_chain`, and
`publishers` tables. The access_sessions table accumulates buyer-dataset interactions — this is
the behavioral signal required for recommendation models. Data is available but sparse in early
deployment.

**Compute infrastructure**: The backend runs on Express 5 + BullMQ. BullMQ is the correct
integration point for CPU/GPU-intensive AI jobs. The queue abstraction already handles the
uploadWorker and verifyWorker patterns, which are exactly the right model for AI processing jobs.
**AI workers will follow the exact same pattern.**

**Storage infrastructure**: PostgreSQL with Drizzle ORM. The primary schema change required for
AI is the addition of `pgvector` extension for vector embeddings. This is a one-line Postgres
extension install, not an infrastructure overhaul. A `schema_profile` JSONB column on `datasets`
will store structured metadata extracted by the preview worker.

**Model serving**: No model serving infrastructure exists today. This is the largest gap. The AI/
directory is empty. The first priority in infrastructure is establishing a model serving layer —
initially via API (OpenAI/Anthropic), then migrated to self-hosted models as the platform matures.

**Feature engineering**: No feature pipelines, no embedding store, no vector index. These must be
built as part of Phase 1.

### 3.2 Integration Points in Existing Code

The following existing files are the primary integration surfaces for AI modules:

```
apps/api/src/lib/queue/workers/uploadWorker.ts
    → AI hook: after Shelby upload succeeds, enqueue describeJob + embedJob + qualityJob

apps/api/src/routes/datasets.ts
    → AI hook: add GET /api/datasets/search?q= for semantic search
    → AI hook: add GET /api/datasets/:id/similar for related datasets
    → AI hook: add quality_score, schema_profile, ai_description to dataset detail response
    → AI hook: add GET /api/datasets/:id/quality for quality breakdown

apps/api/src/routes/access.ts
    → AI hook: record access events as behavioral signals for recommendation model
    → AI hook: fraud risk check before session creation

apps/api/src/lib/db/schema.ts
    → AI additions: schema_profile (jsonb), embedding vector(1536), quality_score float,
      suggested_price_octas bigint, fraud_flags jsonb, ai_description text,
      suggested_tags text[], modality text, estimated_row_count bigint

apps/web/src/pages/DatasetDetail.tsx
    → UI hook: quality badge with breakdown, schema preview panel, similar datasets panel
    → UI hook: "AI Summary" tab showing auto-generated description vs publisher description

apps/web/src/pages/Home.tsx
    → UI hook: semantic search bar replacing keyword search
    → UI hook: AI-powered "Recommended for You" section

apps/web/src/pages/Upload.tsx
    → UI hook: AI assistant sidebar for description/tag/price suggestion
    → UI hook: live quality pre-check on file select
```

### 3.3 New Directory Structure

The `AI/` directory will be structured as follows:

```
AI/
├── models/
│   ├── embedder/           # Text + schema embedding models
│   ├── quality/            # Dataset quality scoring model
│   ├── fraud/              # Anomaly detection model
│   ├── recommender/        # Collaborative + content-based recommender
│   └── gnn/                # Graph neural network for dataset relationships
├── pipelines/
│   ├── describe.ts         # Schema extraction + LLM description
│   ├── embed.ts            # Embedding generation pipeline
│   ├── quality.ts          # Quality scoring pipeline
│   ├── price.ts            # Price optimization pipeline
│   └── recommend.ts        # Recommendation generation pipeline
├── workers/
│   ├── describeWorker.ts   # BullMQ worker: generates description + schema
│   ├── embedWorker.ts      # BullMQ worker: generates + stores embeddings
│   ├── qualityWorker.ts    # BullMQ worker: scores dataset quality
│   └── recommendWorker.ts  # BullMQ worker: generates recommendations
├── serving/
│   ├── client.ts           # Model serving client (local + API fallback)
│   ├── cache.ts            # Redis-backed inference cache
│   └── health.ts           # Model health monitoring
├── registry/
│   ├── modelRegistry.ts    # Model versioning and registry
│   └── experimentTracker.ts # Experiment tracking
├── knowledge/
│   ├── graphBuilder.ts     # Knowledge graph construction
│   ├── gnnTrainer.ts       # GNN training pipeline
│   └── graphQuery.ts       # Graph query interface
├── eval/
│   ├── embedderEval.ts     # Embedding quality evaluation
│   ├── qualityEval.ts      # Quality scorer evaluation
│   ├── searchEval.ts       # Semantic search NDCG evaluation
│   └── recommenderEval.ts  # Recommendation hit rate evaluation
└── config/
    ├── ai.config.ts        # AI configuration (model paths, thresholds)
    └── prompts/            # Prompt templates for LLM calls
        ├── describe.ts
        ├── assistant.ts
        └── quality.ts
```

---

## 4. AI Architecture Philosophy

### 4.1 The Three-Layer AI Stack

Every AI module in Verida AI operates across three conceptual layers:

**Layer 1 — Perception Layer** (What the data is)

This layer handles raw signal ingestion: parsing CSV headers, reading JSON schemas, sampling file
bytes, extracting token-level statistics from text corpora, reading EXIF data from images. The
perception layer converts raw heterogeneous datasets into structured feature vectors that higher
layers can reason about. The perception layer never makes decisions. It only transforms.

**Layer 2 — Intelligence Layer** (What the data means)

This layer applies machine learning models to the structured features from Layer 1. Embeddings are
computed, quality scores are inferred, fraud patterns are detected, prices are optimized. The
intelligence layer operates on representations, not raw bytes. It produces scores, vectors, and
classifications — not final actions.

**Layer 3 — Action Layer** (What to do about it)

This layer translates intelligence layer outputs into platform actions: updating database records,
modifying search indices, sending recommendations to users, blocking fraudulent uploads, adjusting
price displays. The action layer is always auditable: every action records its source intelligence
layer output and the model version that produced it.

### 4.2 Unified Embedding Space Design

The most fundamental architectural decision in this document is the design of Verida AI's
**unified dataset embedding space**.

Every dataset — regardless of modality — will be mapped into a shared 1536-dimensional vector
space. This enables cross-modal similarity, unified semantic search, and knowledge graph
construction that spans all data types.

The embedding is computed as a **late fusion** of modality-specific encoders:

```
                    ┌─────────────────────────────────────┐
                    │       UNIFIED EMBEDDING SPACE        │
                    │             (1536 dims)              │
                    └──────────────┬──────────────────────┘
                                   │ Late Fusion (Attention)
                    ┌──────────────┼──────────────────────┐
                    │              │                       │
             ┌──────▼──────┐ ┌────▼─────────┐ ┌─────────▼──────┐
             │ Text Encoder│ │Schema Encoder│ │ Stat Encoder   │
             │(transformer)│ │(structural)  │ │(distributions) │
             └──────┬──────┘ └────┬─────────┘ └─────────┬──────┘
                    │              │                       │
             ┌──────▼──────┐ ┌────▼─────────┐ ┌─────────▼──────┐
             │ name +      │ │ column types │ │ row count,     │
             │ description │ │ null rates   │ │ cardinalities  │
             │ + tags      │ │ nesting depth│ │ value ranges   │
             └─────────────┘ └──────────────┘ └────────────────┘
```

The fusion operation is a learned weighted average with an attention mechanism:

```
e_unified = Attention([e_text, e_schema, e_stats]) · W_fusion + b_fusion
```

Where W_fusion ∈ ℝ^(3×1536×1536) is learned during self-supervised pre-training on the
marketplace's own dataset catalog.

### 4.3 Self-Supervised Pre-Training Strategy

Rather than relying entirely on labeled data (which is expensive), Verida AI will pre-train its
embedding models using **self-supervised objectives** derived from the marketplace's natural
structure:

**Objective 1 — Contrastive Dataset Pairs**: Two versions of the same dataset (from
`dataset_versions`) should have high cosine similarity. A random unrelated dataset should have low
cosine similarity. This is a natural contrastive learning signal that requires no human labels.

**Objective 2 — Masked Schema Reconstruction**: Given a dataset's column names with some masked,
predict the masked column names. This forces the schema encoder to learn semantic relationships
between column types (e.g., "age" and "birth_date" co-occur; "price" and "currency" co-occur).

**Objective 3 — Tag Prediction**: Given dataset structure and description, predict which tags were
applied. This aligns the text and schema encoders in a shared space where semantic similarity
matches structural similarity.

**Objective 4 — Access Pattern Correlation**: Datasets frequently accessed together by the same
buyer in the same session should be pulled closer in the embedding space. This is a behavioral
contrastive signal that becomes available as the marketplace grows.

### 4.4 The Verida AI Model Registry

All trained models must be versioned, tracked, and reproducible. The model registry maintains:

```typescript
// AI/registry/modelRegistry.ts

interface ModelRegistryEntry {
  modelId: string;           // e.g., "embedder-v1.2.0"
  modelType: ModelType;      // EMBEDDER | QUALITY | FRAUD | RECOMMENDER | GNN | PRICER
  version: string;           // semantic version
  trainingDatasetHash: string; // hash of training data snapshot
  trainedAt: Date;
  trainingMetrics: {
    loss: number;
    validationLoss: number;
    [key: string]: number;   // task-specific metrics
  };
  inferenceLatencyP50Ms: number;
  inferenceLatencyP99Ms: number;
  modelSizeBytes: number;
  modelHash: string;         // SHA-256 of model weights — anchored on Aptos
  isActive: boolean;
  deprecatedAt?: Date;
  aptosAnchorTxHash?: string; // on-chain proof of model version
  notes: string;
}

export class ModelRegistry {
  async register(entry: Omit<ModelRegistryEntry, 'modelId'>): Promise<string>;
  async getActive(modelType: ModelType): Promise<ModelRegistryEntry | null>;
  async rollback(modelType: ModelType, version: string): Promise<void>;
  async listVersions(modelType: ModelType): Promise<ModelRegistryEntry[]>;
  async anchorOnChain(modelId: string): Promise<string>; // returns tx hash
}
```

The `modelHash` is published to Aptos via a `ModelRegistryContract`, making every AI decision
traceable to a specific, immutable model version. This is the critical link between AI decisions
and blockchain verifiability.

---

## 5. Module A — Dataset Preview & Auto-Describer

### 5.1 Problem Formulation

**Current state**: A buyer viewing a dataset detail page sees `name`, `description`
(publisher-written, often terse), `tags` (publisher-chosen, often missing), `size_bytes`, and
`price`. They have no structural understanding of the data. They must purchase access to discover
whether the dataset is actually useful.

**Problem**: Information asymmetry between publisher and buyer creates trust deficit and purchase
hesitation. The buyer's willingness to pay is suppressed by uncertainty about data quality and
structure.

**ML formulation**: Given raw dataset bytes D, produce:
1. A structured schema profile P(D) describing column names, types, cardinalities, null rates,
   sample distributions
2. A natural language description T(D) summarizing the dataset's content, purpose, and suitability
3. A canonical tag set G(D) ⊆ TAG_VOCABULARY predicted from the profile

### 5.2 Mathematical Abstraction

Let D be a dataset represented as a collection of records. Let Φ: D → F be the feature extraction
function mapping raw data to a feature matrix F ∈ ℝ^(n×d) where n is the number of columns and d
is the feature dimension per column.

The schema profile extraction is:

```
P(D) = {
  columns: [{name, type, null_rate, cardinality, sample_values, distribution_stats}],
  row_count: |D|,
  estimated_memory_mb: sizeof(D),
  modality: classify_modality(D),
  quality_signals: extract_quality_signals(D)
}
```

The auto-description is a conditional generation task:

```
T* = argmax_{T} P(T | P(D), name, existing_description, tags)
```

Tag prediction is a multi-label classification:

```
G(D) = {t ∈ TAG_VOCABULARY : σ(W_tags · φ(P(D)) + b_tags)[t] > θ_tags}
```

Where θ_tags is a threshold calibrated on the precision-recall tradeoff for the tag vocabulary.

### 5.3 Upload Worker Integration

The describe pipeline integrates into the existing upload flow at a specific seam in
`uploadWorker.ts`:

```typescript
// apps/api/src/lib/queue/workers/uploadWorker.ts (modified)
// After the existing "persist to DB" block, add:

import { describeQueue } from '../../AI/workers/describeWorker';
import { embedQueue } from '../../AI/workers/embedWorker';
import { qualityQueue } from '../../AI/workers/qualityWorker';

// Inside the worker, after DB transaction commits:
await Promise.all([
  describeQueue.add('describe', {
    datasetId: insertedDataset.id,
    shelbyBlobId: result.blobId,
    fileName: job.data.fileName,
    mimeType: job.data.mimeType,
    sizeBytes: job.data.sizeBytes,
    existingDescription: job.data.description,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
  }),
]);
// Note: embedWorker and qualityWorker are triggered by describeWorker
// completion event, not directly here. This ensures ordering.
```

### 5.4 Describe Worker

```typescript
// AI/workers/describeWorker.ts

import { Worker, Job, Queue } from 'bullmq';
import { extractSchema } from '../pipelines/describe';
import { generateDescription } from '../serving/client';
import { predictTags } from '../models/quality/tagClassifier';
import { streamSample } from '../../apps/api/src/lib/shelby/download';
import { db } from '../../apps/api/src/lib/db';
import { datasets } from '../../apps/api/src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { embedQueue } from './embedWorker';
import { qualityQueue } from './qualityWorker';

export const describeQueue = new Queue('describe', { connection: redisConnection });

interface DescribeJob {
  datasetId: string;
  shelbyBlobId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  existingDescription?: string;
}

export const describeWorker = new Worker<DescribeJob>(
  'describe',
  async (job: Job<DescribeJob>) => {
    const { datasetId, shelbyBlobId, fileName, mimeType } = job.data;

    // Step 1: Stream a sample of the dataset from Shelby (first 1MB max)
    const sample = await streamSample(shelbyBlobId, { maxBytes: 1_048_576 });
    await job.updateProgress(15);

    // Step 2: Extract schema profile from sample
    const schemaProfile = await extractSchema(sample, mimeType, fileName);
    await job.updateProgress(30);

    // Step 3: Generate natural language description via LLM
    const generatedDescription = await generateDescription({
      schemaProfile,
      fileName,
      existingDescription: job.data.existingDescription,
    });
    await job.updateProgress(60);

    // Step 4: Predict tags from schema + description
    const predictedTags = await predictTags(schemaProfile, generatedDescription);
    await job.updateProgress(80);

    // Step 5: Persist all AI-generated metadata to DB
    await db.update(datasets)
      .set({
        schemaProfile,
        aiDescription: generatedDescription,
        suggestedTags: predictedTags,
        modality: schemaProfile.modality,
        estimatedRowCount: schemaProfile.estimatedRowCount ?? null,
        describeStatus: 'completed',
        describedAt: new Date(),
      })
      .where(eq(datasets.id, datasetId));
    await job.updateProgress(90);

    // Step 6: Trigger downstream workers now that schema is available
    await embedQueue.add('embed', { datasetId }, { delay: 1000 });
    await qualityQueue.add('quality', { datasetId }, { delay: 2000 });
    await job.updateProgress(100);

    return { datasetId, tagsCount: predictedTags.length, modality: schemaProfile.modality };
  },
  { connection: redisConnection, concurrency: 3 }
);
```

### 5.5 Schema Extraction Engine

The schema extractor handles four primary modalities detected from file extension and MIME type:

```typescript
// AI/pipelines/describe.ts

export async function extractSchema(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<SchemaProfile> {
  const ext = path.extname(fileName).toLowerCase();

  if (mimeType.includes('csv') || ext === '.csv' || ext === '.tsv') {
    return extractCsvSchema(buffer);
  }
  if (mimeType.includes('json') || ext === '.json' || ext === '.jsonl') {
    return extractJsonSchema(buffer);
  }
  if (mimeType.includes('text') || ext === '.txt' || ext === '.md') {
    return extractTextSchema(buffer);
  }
  if (mimeType.includes('parquet') || ext === '.parquet') {
    return extractParquetSchema(buffer);
  }
  if (mimeType.includes('image') || ['.zip','.tar'].includes(ext)) {
    return extractImageArchiveSchema(buffer, fileName);
  }
  return extractFallbackSchema(buffer, mimeType, fileName);
}

// CSV / Tabular extraction
export async function extractCsvSchema(buffer: Buffer): Promise<SchemaProfile> {
  const text = buffer.toString('utf-8');
  const lines = text.split('\n').slice(0, 2000);
  const headers = parseHeaders(lines[0]);

  const columns: ColumnProfile[] = headers.map((header, idx) => {
    const values = lines.slice(1)
      .map(line => parseCsvLine(line)[idx])
      .filter(v => v !== undefined);

    const nullCount = values.filter(v =>
      !v || v.trim() === '' || v.toLowerCase() === 'null' || v === 'NA' || v === 'N/A'
    ).length;

    return {
      name: header.trim(),
      inferredType: inferColumnType(values),
      nullRate: nullCount / values.length,
      cardinality: new Set(values).size,
      sampleValues: [...new Set(values.filter(Boolean))].slice(0, 5),
      distributionStats: computeDistributionStats(values),
      semanticCategory: inferSemanticCategory(header, values),
    };
  });

  return {
    modality: 'tabular',
    format: 'csv',
    estimatedRowCount: estimateRowCount(buffer.length, lines.slice(0, 20)),
    columns,
    qualitySignals: extractQualitySignals(columns),
    sampledRows: lines.length - 1,
  };
}

// JSON / Hierarchical extraction
export async function extractJsonSchema(buffer: Buffer): Promise<SchemaProfile> {
  const text = buffer.toString('utf-8');
  let data: unknown;
  let format = 'json';

  try {
    data = JSON.parse(text);
  } catch {
    // Try JSONL (newline-delimited JSON)
    const lines = text.split('\n').filter(Boolean).slice(0, 1000);
    data = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    format = 'jsonl';
  }

  const schema = inferJsonSchema(data, { maxDepth: 6, maxSamples: 200 });
  const isArray = Array.isArray(data);

  return {
    modality: isArray ? 'tabular' : 'hierarchical',
    format,
    estimatedRowCount: isArray ? (data as unknown[]).length : 1,
    schema,
    nestingDepth: computeNestingDepth(schema),
    qualitySignals: extractJsonQualitySignals(schema),
    sampledRows: isArray ? Math.min((data as unknown[]).length, 1000) : 1,
  };
}

// Text / NLP corpus extraction
export async function extractTextSchema(buffer: Buffer): Promise<SchemaProfile> {
  const text = buffer.toString('utf-8');
  const sample = text.slice(0, 200_000);
  const words = tokenize(sample);
  const sentences = splitSentences(sample);

  return {
    modality: 'text',
    format: 'plain_text',
    estimatedTokenCount: Math.round((buffer.length / 4)),
    estimatedSentenceCount: sentences.length,
    vocabulary: computeVocabularyStats(words),
    languageDetection: detectLanguage(text.slice(0, 10_000)),
    avgSentenceLength: sentences.reduce((a, s) => a + s.split(' ').length, 0) / (sentences.length || 1),
    lexicalDiversity: words.length > 0 ? new Set(words).size / words.length : 0,
    topNgrams: extractTopNgrams(words, { n: 2, top: 20 }),
    qualitySignals: extractTextQualitySignals(text, words, sentences),
  };
}
```

### 5.6 LLM Description Generation

```typescript
// AI/config/prompts/describe.ts

export function buildDescriptionPrompt(params: {
  schemaProfile: SchemaProfile;
  fileName: string;
  existingDescription?: string;
}): string {
  const { schemaProfile, fileName, existingDescription } = params;
  const colSummary = schemaProfile.columns
    ? schemaProfile.columns.slice(0, 20).map(c =>
        `  - ${c.name} (${c.inferredType}, ${(c.nullRate * 100).toFixed(1)}% null, ` +
        `${c.cardinality} unique values, category: ${c.semanticCategory ?? 'unknown'})`
      ).join('\n')
    : 'No column schema available.';

  return `You are a senior data scientist writing a marketplace listing for an AI training dataset.

Dataset file: ${fileName}
Modality: ${schemaProfile.modality}
Format: ${schemaProfile.format}
Estimated records: ${schemaProfile.estimatedRowCount?.toLocaleString() ?? 'unknown'}
${schemaProfile.estimatedTokenCount ? `Estimated tokens: ~${schemaProfile.estimatedTokenCount.toLocaleString()}` : ''}
${schemaProfile.languageDetection ? `Language: ${schemaProfile.languageDetection.language}` : ''}

${schemaProfile.columns ? `Schema (${schemaProfile.columns.length} columns):\n${colSummary}` : ''}
${existingDescription ? `\nPublisher's existing description: "${existingDescription}"` : ''}

Write a concise (100-150 word) dataset description for AI practitioners who want to know:
1. What the dataset contains
2. What ML tasks it is suitable for (classification, regression, NLP, CV, RL, etc.)
3. Notable structural features (size, time coverage, geographic coverage if apparent)
4. Any quality caveats you can infer from the schema

Rules:
- Do not invent information. Only state what the schema supports.
- Write in present tense, third person.
- Do not start with "This dataset".
- Do not repeat the file name verbatim.
- Be specific about ML use cases, not generic ("can be used for machine learning").`;
}

// AI/serving/client.ts
export async function generateDescription(params: {
  schemaProfile: SchemaProfile;
  fileName: string;
  existingDescription?: string;
}): Promise<string> {
  const prompt = buildDescriptionPrompt(params);
  const cacheKey = `desc:${hashPrompt(prompt)}`;

  // Check Redis cache first (avoid re-describing identical schemas)
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  // Call LLM (Anthropic claude-haiku for speed + cost at this stage)
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const description = response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : '';

  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, description);
  return description;
}
```

### 5.7 Database Schema Changes

```sql
-- Migration: 0005_ai_metadata.sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add AI metadata columns to datasets table
ALTER TABLE datasets
  ADD COLUMN IF NOT EXISTS schema_profile        JSONB,
  ADD COLUMN IF NOT EXISTS ai_description        TEXT,
  ADD COLUMN IF NOT EXISTS suggested_tags        TEXT[],
  ADD COLUMN IF NOT EXISTS describe_status       TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS described_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS modality              TEXT,
  ADD COLUMN IF NOT EXISTS estimated_row_count   BIGINT,
  ADD COLUMN IF NOT EXISTS quality_score         FLOAT,
  ADD COLUMN IF NOT EXISTS quality_breakdown     JSONB,
  ADD COLUMN IF NOT EXISTS quality_scored_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS embedding             vector(1536),
  ADD COLUMN IF NOT EXISTS embedded_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suggested_price_octas BIGINT,
  ADD COLUMN IF NOT EXISTS fraud_flags           JSONB,
  ADD COLUMN IF NOT EXISTS fraud_risk_score      FLOAT,
  ADD COLUMN IF NOT EXISTS fraud_reviewed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS minhash_signature     INTEGER[];

-- Indexes
CREATE INDEX IF NOT EXISTS idx_datasets_modality
  ON datasets(modality);

CREATE INDEX IF NOT EXISTS idx_datasets_quality_score
  ON datasets(quality_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_datasets_describe_status
  ON datasets(describe_status);

CREATE INDEX IF NOT EXISTS idx_datasets_fraud_risk
  ON datasets(fraud_risk_score DESC NULLS LAST);

-- Vector similarity index (IVFFlat — use HNSW once dataset count > 10k)
CREATE INDEX IF NOT EXISTS idx_datasets_embedding_cosine
  ON datasets USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Full-text search index (augments semantic search)
CREATE INDEX IF NOT EXISTS idx_datasets_fts
  ON datasets USING GIN(
    to_tsvector('english',
      coalesce(name,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(ai_description,'') || ' ' ||
      coalesce(array_to_string(tags,' '),'') || ' ' ||
      coalesce(array_to_string(suggested_tags,' '),'')
    )
  );
```

### 5.8 Evaluation Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Description Relevance | Human rating 1-5 of description accuracy | ≥ 4.0 |
| Tag Precision@5 | % of top-5 predicted tags that are correct | ≥ 0.70 |
| Tag Recall@5 | % of correct tags appearing in top-5 predictions | ≥ 0.65 |
| Schema Extraction Accuracy | % of columns with correctly inferred type | ≥ 0.92 |
| E2E Latency P95 | Time from upload complete to describe complete | ≤ 30s |
| Worker Failure Rate | % of describe jobs that fail after 3 retries | ≤ 2% |
| LLM Cost Per Dataset | API cost in USD per describe job | ≤ $0.005 |

---

## 6. Module B — Semantic Search & Neural Retrieval

### 6.1 Problem Formulation

**Current state**: `GET /api/datasets` accepts a `search` query parameter that performs a
PostgreSQL `ILIKE '%query%'` on `name`, `description`, and `tags`. This is a bag-of-words exact
match that fails silently on synonyms, intent variation, and cross-lingual queries.

**Problem**: A buyer searching for "customer sentiment data" will not find a dataset named
"Twitter opinion mining corpus" even though they are functionally equivalent. The keyword gap
between buyer intent and publisher vocabulary is a systematic conversion killer.

**ML formulation**: Given a query q and a dataset corpus D = {d₁, d₂, ..., dₙ}, produce a ranked
list using a hybrid dense-sparse retrieval score:

```
score(q, d) = λ · cos(e_q, e_d) + (1-λ) · BM25(q, d)
```

Where e_q = Encode(q), e_d = the stored embedding for dataset d, and λ ∈ [0,1] is a tunable
blending parameter (start at 0.7, optimize via offline A/B on click-through data).

### 6.2 Embedding Architecture

**Query encoder**: A lightweight transformer fine-tuned on data science terminology maps the
query string to a 1536-dimensional vector. Requirements:
- Fast (< 10ms per query on CPU)
- Domain-adapted to ML/data science vocabulary
- Handles short queries (2-5 words) without performance degradation

**Document encoder** (shared weights with query encoder for symmetric retrieval):

```
e_d = Normalize(
  MeanPool(
    TransformerEncoder(
      [CLS] + tokenize(name ⊕ ai_description ⊕ tags ⊕ schema_summary)
    )
  )
)
```

Where `schema_summary` is a structured text representation of the schema profile:
```
"tabular dataset, 52 columns including: user_id (identifier), timestamp (datetime),
 product_name (text), price (float), rating (integer 1-5)"
```

### 6.3 Semantic Search Route

```typescript
// apps/api/src/routes/datasets.ts (new endpoint added)

// GET /api/datasets/semantic-search?q=...&limit=20&modality=tabular&min_quality=0.6
router.get('/semantic-search', optionalAuth, asyncHandler(async (req, res) => {
  const { q, limit = 20, modality, min_quality, offset = 0 } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query parameter q must be at least 2 characters' });
  }

  // 1. Embed the query (with Redis cache, ~2ms for cached queries)
  const queryEmbedding = await embeddingClient.embed(q.trim());

  // 2. Build filter conditions
  const filters: SQL[] = [sql`embedding IS NOT NULL`];
  if (modality && typeof modality === 'string') {
    filters.push(sql`modality = ${modality}`);
  }
  if (min_quality) {
    filters.push(sql`quality_score >= ${Number(min_quality)}`);
  }
  if (!req.user) {
    // Unauthenticated users only see non-sensitive datasets
    filters.push(sql`access_type != 'private'`);
  }

  const whereClause = sql.join(filters, sql` AND `);

  // 3. Hybrid semantic + lexical retrieval
  const results = await db.execute(sql`
    WITH semantic AS (
      SELECT
        d.id,
        d.name,
        d.description,
        d.ai_description,
        d.tags,
        d.suggested_tags,
        d.quality_score,
        d.modality,
        d.size_bytes,
        d.price_per_access,
        d.access_type,
        d.verified,
        d.tampered,
        d.estimated_row_count,
        p.username   AS publisher_username,
        p.address    AS publisher_address,
        1 - (d.embedding <=> ${queryEmbedding}::vector) AS semantic_score,
        ts_rank(
          to_tsvector('english',
            coalesce(d.name,'') || ' ' ||
            coalesce(d.ai_description,'') || ' ' ||
            coalesce(array_to_string(d.tags,' '),'')
          ),
          plainto_tsquery('english', ${q})
        ) AS lexical_score
      FROM datasets d
      JOIN publishers p ON d.publisher_address = p.address
      WHERE ${whereClause}
    )
    SELECT *,
      (0.7 * semantic_score + 0.3 * LEAST(lexical_score * 10, 1.0)) AS hybrid_score
    FROM semantic
    ORDER BY hybrid_score DESC
    LIMIT ${Number(limit)}
    OFFSET ${Number(offset)}
  `);

  // 4. Cross-encoder re-ranking for top results (if >= 10 results)
  const reranked = results.length >= 10
    ? await reranker.rerank(q, results, { topK: Number(limit) })
    : results;

  return res.json({
    results: reranked,
    query: q,
    searchType: 'semantic_hybrid',
    totalReturned: reranked.length,
    embeddingModel: embeddingClient.modelId,
  });
}));
```

### 6.4 Similar Datasets Endpoint

```typescript
// GET /api/datasets/:id/similar?limit=6
router.get('/:id/similar', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(Number(req.query.limit) || 6, 20);

  const target = await db.query.datasets.findFirst({
    where: eq(datasets.id, id),
    columns: { embedding: true, modality: true },
  });

  if (!target?.embedding) {
    return res.json({ results: [], reason: 'embedding_not_ready' });
  }

  const similar = await db.execute(sql`
    SELECT
      id, name, ai_description, quality_score, modality,
      price_per_access, access_type, size_bytes, tags, suggested_tags,
      1 - (embedding <=> ${target.embedding}::vector) AS similarity
    FROM datasets
    WHERE id != ${id}
      AND embedding IS NOT NULL
      AND tampered = false
    ORDER BY embedding <=> ${target.embedding}::vector
    LIMIT ${limit}
  `);

  return res.json({
    results: similar,
    sourceDatasetId: id,
    sourceModality: target.modality,
  });
}));
```

### 6.5 Embed Worker

```typescript
// AI/workers/embedWorker.ts

export const embedQueue = new Queue('embed', { connection: redisConnection });

interface EmbedJob { datasetId: string; }

export const embedWorker = new Worker<EmbedJob>(
  'embed',
  async (job: Job<EmbedJob>) => {
    const { datasetId } = job.data;

    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, datasetId),
    });

    if (!dataset) throw new Error(`Dataset ${datasetId} not found`);

    if (dataset.describeStatus !== 'completed') {
      // Re-enqueue with delay — describe hasn't finished
      await embedQueue.add('embed', { datasetId }, { delay: 10_000 });
      return { skipped: true, reason: 'describe_not_complete' };
    }

    // Build the document text for embedding
    const documentText = [
      dataset.name,
      dataset.aiDescription || dataset.description || '',
      ...(dataset.tags ?? []),
      ...(dataset.suggestedTags ?? []),
      dataset.modality ? `modality:${dataset.modality}` : '',
      dataset.schemaProfile
        ? buildSchemaTextSummary(dataset.schemaProfile)
        : '',
    ].filter(Boolean).join(' | ');

    const embedding = await embeddingClient.embed(documentText);

    await db.update(datasets)
      .set({ embedding, embeddedAt: new Date() })
      .where(eq(datasets.id, datasetId));

    return { datasetId, embeddingDims: embedding.length };
  },
  { connection: redisConnection, concurrency: 5 }
);
```

### 6.6 Evaluation Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| NDCG@10 | Normalized Discounted Cumulative Gain at rank 10 | ≥ 0.72 |
| MRR | Mean Reciprocal Rank on curated query set | ≥ 0.65 |
| Recall@20 | % of relevant datasets retrieved in top 20 | ≥ 0.80 |
| Query Latency P95 | End-to-end search latency | ≤ 150ms |
| Embed Latency P95 | Time to embed a query string | ≤ 20ms |
| Index Build Time | Time to rebuild HNSW index (n=50k) | ≤ 45min |

---

## 7. Module C — Dataset Quality Scoring Engine

### 7.1 Research Motivation

In the ML training data supply chain, data quality is the single largest determinant of model
performance. Kaplan et al. (2020) showed that compute-optimal scaling depends as much on data
quality as on model size. Yet in current marketplaces, "quality" is entirely self-reported by
publishers. Tag-based quality ("clean", "curated") is unverifiable. File size is a proxy but
conflates quantity with quality. Access count is a popularity signal, not a quality signal.

### 7.2 Multi-Dimensional Quality Framework

Define a quality function Q: D → [0, 1] decomposed as:

```
Q(D) = w_completeness · Q_c(D)
     + w_consistency  · Q_k(D)
     + w_uniqueness   · Q_u(D)
     + w_validity     · Q_v(D)
     + w_timeliness   · Q_t(D)
     + w_coverage     · Q_cov(D)
```

**Completeness** Q_c: Fraction of expected values that are present.
```
Q_c(D) = 1 - mean_null_rate_across_columns
```

**Consistency** Q_k: Internal consistency of data types and value ranges. Violations include
mixed types in a single column, values outside declared ranges, broken referential integrity.

**Uniqueness** Q_u: Fraction of records that are non-duplicate.
```
Q_u(D) = 1 - (estimated_duplicate_rows / total_rows)
```
Estimated via MinHash LSH on sampled rows.

**Validity** Q_v: Fraction of values conforming to their inferred semantic type. A "date"
column where 30% of values are unparseable has validity = 0.70.

**Coverage** Q_cov: How uniformly the data covers its domain, measured via entropy of categorical
distributions:
```
Q_cov(D) = (1/|C|) · Σ_{c ∈ C} H(dist(c)) / log₂(|unique_values(c)|)
```

**Timeliness** Q_t: How recent the data is relative to the domain. Estimated from timestamp
columns and publication date metadata. Returns 1.0 if no temporal columns detected (timeless data).

### 7.3 Quality Worker

```typescript
// AI/workers/qualityWorker.ts

export const qualityQueue = new Queue('quality', { connection: redisConnection });

interface QualityJob { datasetId: string; }

export const qualityWorker = new Worker<QualityJob>(
  'quality',
  async (job: Job<QualityJob>) => {
    const { datasetId } = job.data;

    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, datasetId),
    });

    if (!dataset?.schemaProfile) {
      await qualityQueue.add('quality', { datasetId }, { delay: 15_000 });
      return { skipped: true, reason: 'schema_not_ready' };
    }

    const sp = dataset.schemaProfile as SchemaProfile;

    // Compute all six quality dimensions
    const breakdown = {
      completeness: computeCompleteness(sp),
      consistency:  computeConsistency(sp),
      uniqueness:   await computeUniqueness(dataset.shelbyBlobId),
      validity:     computeValidity(sp),
      timeliness:   computeTimeliness(sp, dataset.createdAt),
      coverage:     computeCoverage(sp),
    };

    // Default weights (will be replaced by learned model once labels accumulate)
    const DEFAULT_WEIGHTS = {
      completeness: 0.25,
      consistency:  0.20,
      uniqueness:   0.20,
      validity:     0.15,
      timeliness:   0.10,
      coverage:     0.10,
    };

    const qualityScore = Object.entries(breakdown).reduce(
      (acc, [key, val]) => acc + (DEFAULT_WEIGHTS[key as keyof typeof DEFAULT_WEIGHTS] * val),
      0
    );

    await db.update(datasets)
      .set({
        qualityScore,
        qualityBreakdown: breakdown,
        qualityScoredAt: new Date(),
      })
      .where(eq(datasets.id, datasetId));

    return { datasetId, qualityScore, breakdown };
  },
  { connection: redisConnection, concurrency: 3 }
);
```

### 7.4 Quality Display in UI — DatasetDetail.tsx

```
┌─────────────────────────────────────────────┐
│  Data Quality Score           8.4 / 10  ✓  │
├─────────────────────────────────────────────┤
│  Completeness   ████████░░  82%              │
│  Consistency    █████████░  91%              │
│  Uniqueness     ██████████  98%              │
│  Validity       ███████░░░  74%              │
│  Coverage       ████████░░  80%              │
│  Timeliness     █████████░  95%              │
├─────────────────────────────────────────────┤
│  Scored by Verida AI v1.2.0                 │
│  Model anchored on Aptos ↗                  │
└─────────────────────────────────────────────┘
```

### 7.5 Buyer Feedback Loop

After accessing a dataset, buyers see a quality feedback prompt:

```
How was the data quality?
  ★☆☆☆☆  ★★☆☆☆  ★★★☆☆  ★★★★☆  ★★★★★
  Poor    Fair    Good    Great   Excellent
```

These ratings (stored in a new `quality_ratings` table keyed on
`(dataset_id, accessor_address)`) form the supervised training signal for the learned quality MLP
that will eventually replace the handcrafted linear weighted average.

---

## 8. Module D — Intelligent Pricing Optimizer

### 8.1 Research Motivation

Pricing in current dataset marketplaces is arbitrary — publishers pick a number that "feels right."
This leads to systematic under-pricing (publishers leave money on the table) and over-pricing
(demand is suppressed). An intelligent pricing system should maximize publisher revenue while
maintaining competitive market access for buyers.

### 8.2 MDP Formulation

This is a dynamic pricing problem formalized as a Markov Decision Process:

```
State s_t    = (quality_score, size_bytes, modality, tag_vector, category_median_price,
                category_volume_7d, publisher_reputation, days_since_publish)

Action a_t   = price_octas ∈ [MIN_PRICE, MAX_PRICE]  (continuous action space)

Reward r_t   = Σ_{accesses in period t} price_per_access
               - α · access_count_drop_from_prior_period  (churn penalty)
               - β · max(0, quality_score_expectation - actual_rating)  (quality mismatch penalty)

Policy π*    = argmax_π E[Σ_{t=0}^{T} γ^t · r_t | s_0]
```

### 8.3 Offline RL via Conservative Q-Learning

Because live pricing experiments cannot be run at launch, we use **offline RL** (batch RL) trained
on the behavioral policy of publishers' past pricing decisions.

The Conservative Q-Learning (CQL) objective prevents the policy from exploiting out-of-distribution
(never-seen) price levels:

```
L_CQL(Q) = α · (E_{s~D}[log Σ_a exp(Q(s,a))] - E_{(s,a)~D}[Q(s,a)])
           + (1/2) · E_{(s,a,r,s')~D}[(Q(s,a) - r - γ · max_{a'} Q(s',a'))²]
```

### 8.4 Price Suggestion Feature Vector

```typescript
interface PricingFeatures {
  // Dataset intrinsic
  qualityScore: number;
  logSizeBytes: number;           // log10-transformed
  logEstimatedRowCount: number;   // log10-transformed
  modalityOneHot: number[];       // [tabular, text, image, audio, video, other]
  columnCount: number;            // 0 if non-tabular
  hasTemporalColumns: boolean;
  hasGeospatialColumns: boolean;
  isMultilingual: boolean;

  // Market signals
  categoryMedianPriceOctas: number;
  categoryP75PriceOctas: number;
  categoryAccessVolume7d: number;
  categoryDatasetCount: number;

  // Publisher signals
  publisherReputationScore: number;  // normalized 0-1
  publisherAvgQualityScore: number;
  publisherDatasetCount: number;
  publisherTotalEarnings: number;    // log-transformed

  // Temporal
  daysSincePublish: number;
  weekOfYear: number;
  isFreshUpload: boolean;            // < 7 days old
}
```

### 8.5 Price Output Distribution

The model outputs a distribution, not a point estimate:

```
P(price | features) ~ LogNormal(μ(features), σ(features))

Suggested price = exp(μ)
Lower bound     = exp(μ - 1.28σ)  (10th percentile)
Upper bound     = exp(μ + 1.28σ)  (90th percentile)
```

The UI in `Upload.tsx` presents this as a confidence interval:

```
┌──────────────────────────────────────────────┐
│  AI Price Recommendation                     │
│  Suggested:     0.15 APT  (~$0.82 USD)       │
│                                              │
│  Conservative   Suggested   Aggressive       │
│  0.08 APT    ───●───────────  0.28 APT       │
│                                              │
│  Category median: 0.12 APT                   │
│  Based on 847 similar datasets               │
└──────────────────────────────────────────────┘
```

---

## 9. Module E — Fraud & Anomaly Detection

### 9.1 Threat Model

Verida AI faces several distinct fraud vectors:

| Threat | Description | Detection Approach |
|--------|-------------|-------------------|
| Duplicate datasets | Same data uploaded multiple times | MinHash LSH fingerprinting |
| Content spoofing | Small file claims massive record count | Size vs declared metadata cross-check |
| Schema inflation | Many columns of random noise | Column entropy analysis |
| Wash trading | Publisher and buyer are same entity | Graph anomaly detection |
| Plagiarism | Public dataset sold without disclosure | Reference fingerprint database |
| Sybil publishing | One actor controlling many addresses | Address clustering + behavioral analysis |

### 9.2 Duplicate Detection via MinHash LSH

For each dataset upload, compute a MinHash signature from k-shingles of the content sample:

```typescript
// AI/pipelines/describe.ts

export async function computeMinHash(
  sample: Buffer,
  mimeType: string,
  numHashes: number = 128
): Promise<number[]> {
  const tokens = extractShingles(sample, mimeType, { k: 5 });
  const signature: number[] = new Array(numHashes).fill(Number.MAX_SAFE_INTEGER);

  for (const token of tokens) {
    for (let i = 0; i < numHashes; i++) {
      const hashValue = murmurhash3_32(token, HASH_SEEDS[i]) >>> 0;
      if (hashValue < signature[i]) {
        signature[i] = hashValue;
      }
    }
  }
  return signature;
}

// Jaccard similarity estimate from MinHash signatures
export function estimateJaccard(sig1: number[], sig2: number[]): number {
  const matches = sig1.reduce((acc, val, i) => acc + (val === sig2[i] ? 1 : 0), 0);
  return matches / sig1.length;
}
```

When a new dataset's MinHash matches an existing one with Jaccard > 0.85, a duplicate alert is
triggered and set in `fraud_flags`.

### 9.3 Wash Trading Detection via Graph Analysis

```typescript
// AI/pipelines/fraud.ts

interface AccessGraph {
  nodes: Map<string, { address: string; isPublisher: boolean; isAccessor: boolean }>;
  edges: Array<{ from: string; to: string; datasetId: string; timestamp: Date; amount: bigint }>;
}

export async function detectWashTrading(
  publisherAddress: string,
  recentAccessEvents: AccessSession[]
): Promise<WashTradingSignal> {
  const graph = await buildAccessGraph(publisherAddress, { windowDays: 30 });

  const signals: WashTradingSignal = {
    circularTradingScore: detectCircularPatterns(graph, publisherAddress),
    concentrationScore:   detectAccessConcentration(graph),
    velocityAnomalyScore: detectAccessVelocityAnomaly(graph, recentAccessEvents),
    newAddressRatio:      detectNewAddressDominance(graph),
    overallRisk: 0,
  };

  signals.overallRisk = (
    0.35 * signals.circularTradingScore +
    0.25 * signals.concentrationScore +
    0.25 * signals.velocityAnomalyScore +
    0.15 * signals.newAddressRatio
  );

  return signals;
}
```

### 9.4 Unified Fraud Risk Score

```typescript
export async function computeFraudRisk(params: {
  datasetId: string;
  publisherAddress: string;
  schemaProfile: SchemaProfile;
  minHashSignature: number[];
  sizeBytes: number;
  declaredRowCount?: number;
}): Promise<FraudAssessment> {
  const [
    duplicateSimilarity,
    plagiarismSimilarity,
    schemaInflationScore,
    contentSpoofScore,
    washTradingSignal,
    publisherReputation,
  ] = await Promise.all([
    findMostSimilarExisting(params.minHashSignature),
    checkPlagiarismDatabase(params.minHashSignature, params.schemaProfile),
    detectSchemaInflation(params.schemaProfile),
    detectContentSpoof(params.sizeBytes, params.declaredRowCount),
    detectWashTrading(params.publisherAddress, []),
    getPublisherReputationScore(params.publisherAddress),
  ]);

  const riskScore = sigmoid(
    2.0 * duplicateSimilarity
    + 1.5 * plagiarismSimilarity
    + 1.0 * schemaInflationScore
    + 1.2 * contentSpoofScore
    + 0.8 * washTradingSignal.overallRisk
    - 1.5 * publisherReputation       // Good reputation reduces risk score
  );

  const flags: string[] = [];
  if (duplicateSimilarity > 0.85)   flags.push('POTENTIAL_DUPLICATE');
  if (plagiarismSimilarity > 0.80)  flags.push('POTENTIAL_PLAGIARISM');
  if (schemaInflationScore > 0.70)  flags.push('SCHEMA_INFLATION');
  if (contentSpoofScore > 0.75)     flags.push('CONTENT_SPOOF');
  if (washTradingSignal.overallRisk > 0.65) flags.push('WASH_TRADING_SUSPECTED');

  return {
    riskScore,
    flags,
    requiresHumanReview: riskScore > 0.70,
    autoBlock: riskScore > 0.90,
    breakdown: { duplicateSimilarity, plagiarismSimilarity, schemaInflationScore,
                 contentSpoofScore, washTradingRisk: washTradingSignal.overallRisk },
  };
}
```

---

## 10. Module F — Publisher AI Assistant

### 10.1 Product Vision

The Publisher AI Assistant is a conversational AI integrated into the `Upload.tsx` flow that helps
publishers create better dataset listings. It acts as a senior data scientist reviewing the upload
before submission, addressing four specific publisher pain points:

1. **Description writing**: Most publishers write poor descriptions. The assistant rewrites them
   to be buyer-focused and technically accurate.
2. **Tag selection**: Publishers often miss important tags. The assistant suggests canonical tags
   from the TAG_VOCABULARY that match the schema and inferred content.
3. **License selection**: Publishers frequently choose inappropriate licenses. The assistant
   recommends appropriate licenses based on content type and inferred data source.
4. **Price optimization**: Publishers price arbitrarily. The assistant shows the market range and
   suggests an optimal price from Module D.

### 10.2 Multi-Turn Conversation Design

```typescript
// AI/serving/assistant.ts

interface AssistantSession {
  sessionId: string;
  uploadDraftId: string;
  publisherAddress: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  schemaProfile?: SchemaProfile;
  currentDraft: Partial<DatasetDraft>;
  stage: 'schema_review' | 'description' | 'tags' | 'license' | 'pricing' | 'complete';
}

const ASSISTANT_SYSTEM_PROMPT = `You are an expert data scientist and marketplace specialist
helping AI practitioners publish high-quality training datasets.

You have access to the dataset's schema profile and can make specific, schema-grounded
recommendations. Your role is to maximize the dataset's discoverability, credibility, and
commercial success on the Verida AI marketplace.

When making suggestions:
- Be concrete and schema-grounded, never generic
- Cite specific columns, types, or statistics when relevant
- Suggest specific tags from the provided vocabulary, don't invent new ones
- Keep descriptions to 100-150 words, buyer-focused
- License recommendations must match content type and inferred data source
- Price recommendations cite the category range and your reasoning

Stage flow: schema_review → description → tags → license → pricing → complete
Current stage: {STAGE}
Schema profile: {SCHEMA_JSON}
TAG_VOCABULARY: {TAGS}`;

export async function chatWithAssistant(
  session: AssistantSession,
  userMessage: string
): Promise<{ reply: string; updatedDraft: Partial<DatasetDraft>; nextStage: string }> {
  const systemPrompt = ASSISTANT_SYSTEM_PROMPT
    .replace('{STAGE}', session.stage)
    .replace('{SCHEMA_JSON}', JSON.stringify(session.schemaProfile ?? {}, null, 2))
    .replace('{TAGS}', TAG_VOCABULARY.join(', '));

  const messages = [
    ...session.messages,
    { role: 'user' as const, content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse structured suggestions from assistant reply
  const draftUpdates = parseAssistantSuggestions(reply, session.stage);
  const nextStage = determineNextStage(session.stage, userMessage, reply);

  return { reply, updatedDraft: { ...session.currentDraft, ...draftUpdates }, nextStage };
}
```

### 10.3 Assistant API Route

```typescript
// apps/api/src/routes/assistant.ts

// POST /api/assistant/chat
router.post('/chat', requireAuth, asyncHandler(async (req, res) => {
  const { sessionId, message, uploadDraftId } = req.body;

  // Load or create session from Redis
  let session = await loadAssistantSession(sessionId);
  if (!session) {
    session = await createAssistantSession(uploadDraftId, req.user.walletAddress);
  }

  const { reply, updatedDraft, nextStage } = await chatWithAssistant(session, message);

  // Save updated session
  session.messages.push(
    { role: 'user', content: message },
    { role: 'assistant', content: reply }
  );
  session.currentDraft = updatedDraft;
  session.stage = nextStage as AssistantSession['stage'];
  await saveAssistantSession(session);

  return res.json({ reply, updatedDraft, stage: nextStage, sessionId: session.sessionId });
}));
```

---

## 11. Module G — Knowledge Graph & Graph Neural Network

### 11.1 Why a Knowledge Graph

The embedding space (Module B) captures pairwise similarity between datasets. A knowledge graph
captures **structured relationships** between datasets, publishers, topics, and ML tasks.

Examples of knowledge graph edges:
- Dataset A `is_version_of` Dataset B
- Dataset C `is_augmented_from` Dataset D
- Dataset E `is_suitable_for` Task(NLP/Sentiment Analysis)
- Publisher X `is_expert_in` Domain(Financial Time Series)
- Dataset F `requires_preprocessing_before` Dataset G (dependency)
- Dataset H `was_used_to_train` Model(BERT-finance-v1)

These relationships enable reasoning that pure embedding similarity cannot: "find me all datasets
that were used to train models in the biomedical NLP domain and have been verified by at least 3
researchers."

### 11.2 Graph Schema

```typescript
// AI/knowledge/graphBuilder.ts

type NodeType = 'Dataset' | 'Publisher' | 'MLTask' | 'Domain' | 'License' | 'Model';

type EdgeType =
  | 'IS_VERSION_OF'
  | 'IS_SIMILAR_TO'
  | 'IS_SUITABLE_FOR'
  | 'WAS_PUBLISHED_BY'
  | 'BELONGS_TO_DOMAIN'
  | 'REQUIRES'
  | 'COMPLEMENTS'
  | 'WAS_ACCESSED_BY'
  | 'WAS_USED_TO_TRAIN';

interface KGNode {
  id: string;
  type: NodeType;
  properties: Record<string, unknown>;
  embedding?: number[];
}

interface KGEdge {
  from: string;
  to: string;
  type: EdgeType;
  weight: number;        // learned or heuristic edge weight
  confidence: number;    // 0-1 confidence in the edge
  source: 'heuristic' | 'learned' | 'manual';
  createdAt: Date;
}
```

### 11.3 Automatic Edge Discovery

Edges are added to the knowledge graph through multiple automated processes:

**Embedding similarity edges**: Pairs with cosine similarity > 0.85 automatically receive
`IS_SIMILAR_TO` edges weighted by similarity score.

**Version edges**: The existing `dataset_versions` table directly maps to `IS_VERSION_OF` edges.

**Task inference edges**: The schema profile and AI description are classified against a taxonomy
of ML tasks. A dataset with a sentiment label column gets `IS_SUITABLE_FOR → SentimentAnalysis`
with confidence proportional to the clarity of the label column.

**Co-access edges**: Datasets frequently accessed together in the same session get `COMPLEMENTS`
edges. These are behavioral signals that reveal practical dataset relationships unknown to the
publisher.

### 11.4 Graph Neural Network for Link Prediction

The GNN is trained to predict missing or future edges in the knowledge graph:

```
Architecture: R-GCN (Relational Graph Convolutional Network)
              — handles heterogeneous node and edge types

Input:        Node embeddings (from Module B) + structural features
Output:       Edge existence probability for any (head, relation, tail) triple

Loss:         Binary cross-entropy with negative sampling
              (corrupt either head or tail for each positive edge)

Training:     Mini-batch gradient descent on the existing KG edges
              Evaluated on held-out test edges
```

The trained GNN enables queries like "which datasets would complement dataset X in a training
pipeline?" — a question that pure similarity search cannot answer because complementarity is not
the same as similarity.

---

## 12. Module H — Recommendation Engine

### 12.1 Architecture: Hybrid Collaborative + Content-Based

The recommendation engine combines three signals:

**Content-based filtering**: Recommend datasets similar to what the user has accessed, using
the embedding space from Module B.

**Collaborative filtering**: Recommend datasets accessed by users with similar behavioral
profiles, using matrix factorization on the `access_sessions` interaction matrix.

**Graph-based recommendations**: Use the knowledge graph (Module G) to recommend datasets
that are structurally related to the user's interests.

### 12.2 Matrix Factorization for Collaborative Filtering

The interaction matrix M ∈ ℝ^(|users| × |datasets|) where M[u][d] = 1 if user u accessed
dataset d (implicit feedback). Factorized as:

```
M ≈ U · V^T

Where:
  U ∈ ℝ^(|users| × k)    — user latent factor matrix
  V ∈ ℝ^(|datasets| × k) — dataset latent factor matrix
  k = 64                  — latent dimension

Loss: BPR (Bayesian Personalized Ranking)
  L_BPR = -Σ_{(u,i,j) ∈ DS} log σ(x_ui - x_uj) + λ||Θ||²
  Where i is accessed, j is not accessed by user u
```

### 12.3 Cold Start Strategy

For new users with no access history (most users at launch):
1. Ask the user their ML domain(s) of interest during onboarding (1-3 selections)
2. Use domain selection to initialize the user embedding as the centroid of datasets in that domain
3. Fall back to global popularity-weighted quality-adjusted ranking

For new datasets with no access history:
1. Use the content embedding (from Module B) directly as the dataset factor
2. Weight new datasets slightly higher in recommendations to bootstrap their access history

### 12.4 Recommendation Worker

```typescript
// AI/workers/recommendWorker.ts

export const recommendWorker = new Worker<RecommendJob>(
  'recommend',
  async (job: Job<RecommendJob>) => {
    const { accessorAddress, trigger } = job.data;

    // Load user's access history
    const history = await db.query.accessSessions.findMany({
      where: eq(accessSessions.accessorAddress, accessorAddress),
      orderBy: [desc(accessSessions.createdAt)],
      limit: 50,
    });

    const accessedIds = history.map(s => s.datasetId);

    // Content-based: embed user's history centroid
    const historyEmbeddings = await Promise.all(
      accessedIds.slice(0, 10).map(id => getDatasetEmbedding(id))
    );
    const userCentroid = computeCentroid(historyEmbeddings);

    // Retrieve content-based candidates (nearest neighbors to centroid)
    const contentCandidates = await findNearestNeighbors(userCentroid, {
      limit: 50,
      exclude: accessedIds,
    });

    // Collaborative: get CF-based candidates from model
    const cfCandidates = await cfModel.recommend(accessorAddress, { limit: 50 });

    // Merge and re-rank candidates
    const allCandidates = deduplicateMerge(contentCandidates, cfCandidates);
    const reranked = await reranker.rankForUser(accessorAddress, allCandidates);

    // Cache recommendations
    await redis.setex(
      `recommendations:${accessorAddress}`,
      3600,
      JSON.stringify(reranked.slice(0, 20))
    );

    return { accessorAddress, count: reranked.length, trigger };
  },
  { connection: redisConnection, concurrency: 10 }
);
```

---

## 13. Module I — On-Platform Inference Sandbox

### 13.1 Vision

The Inference Sandbox closes the loop between data and value: buyers purchase access to a dataset
and immediately run a model against it, paying per-access on-chain. This transforms Verida AI from
a "data file store" into an "AI experiment platform."

### 13.2 Supported Inference Types (Phase 1)

| Type | Description | Example |
|------|-------------|---------|
| Schema Exploration | Run SQL-like queries on the dataset | COUNT, GROUP BY, WHERE |
| Statistical Profiling | Compute descriptive statistics | mean, std, correlation matrix |
| Model Fit Preview | Fit a simple baseline model (LogReg, LightGBM) | Quick AUC on labeled data |
| Embedding Preview | Embed a text corpus sample, show t-SNE | Semantic cluster visualization |
| Image Distribution | Sample + display image distribution | Class balance, resolution dist |

### 13.3 Sandbox Architecture

```
Buyer requests inference job
         │
         ▼
POST /api/inference/jobs
  { datasetId, jobType, params, sessionId }
         │
         ▼
┌─────────────────────────┐
│   Inference Queue       │
│   (BullMQ)              │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   Inference Worker      │
│   (sandboxed process)   │
│   - Memory limit: 2GB   │
│   - CPU limit: 2 cores  │
│   - Timeout: 120s       │
│   - No network access   │
└──────────┬──────────────┘
           │ Streams Shelby data
           ▼
┌─────────────────────────┐
│   Compute Engine        │
│   (DuckDB in-process)   │
└──────────┬──────────────┘
           │
           ▼
     Results stored
     in PostgreSQL
     (job_results table)
           │
           ▼
     WebSocket push
     to buyer UI
```

### 13.4 DuckDB as the Compute Engine

DuckDB is the ideal compute engine for the sandbox because:
- Runs entirely in-process (no separate service to manage)
- Columnar execution engine (fast analytics on streaming data)
- Supports Parquet, CSV, JSON natively
- Allows SQL queries on streamed data via `read_csv_auto`, `read_json_auto`
- Memory-bounded: can process datasets larger than RAM via streaming

```typescript
// AI/pipelines/sandbox.ts

import * as duckdb from 'duckdb';

export async function runSqlExploration(
  dataStream: NodeJS.ReadableStream,
  query: string,
  limits: SandboxLimits
): Promise<QueryResult> {
  const db = new duckdb.Database(':memory:');
  const conn = db.connect();

  // Load streamed data into DuckDB
  await streamToTempFile(dataStream, '/tmp/sandbox_data');

  // Execute query with row limit enforcement
  const safeQuery = injectRowLimit(sanitizeSql(query), limits.maxOutputRows);
  const result = await conn.run(safeQuery);

  db.close();
  return formatQueryResult(result);
}
```

---

## 14. Module J — Continual Learning Pipeline

### 14.1 Why Continual Learning

Static models decay. As the Verida AI marketplace grows:
- The distribution of dataset types shifts (new modalities emerge)
- Buyer preferences evolve (different ML domains become trendy)
- Quality standards change (what was "good" in 2024 may be "poor" in 2026)
- New fraud patterns emerge that the original fraud model didn't see

The continual learning pipeline ensures that all AI models in Verida AI improve over time without
requiring full retraining from scratch.

### 14.2 Continual Learning Strategies by Module

| Module | Strategy | Trigger | Frequency |
|--------|----------|---------|-----------|
| Embedder | Periodic full fine-tune on new dataset catalog | n_new_datasets > 500 | Monthly |
| Quality Scorer | Online SGD on new buyer ratings | Every 100 new ratings | Weekly |
| Fraud Detector | Sliding window retraining on last 90 days | New fraud pattern detected | Bi-weekly |
| Pricing Model | Offline RL update on new access-price-outcome tuples | Every 1000 new access events | Weekly |
| Recommender | Incremental matrix factorization update | Every 500 new access sessions | Daily |

### 14.3 Catastrophic Forgetting Prevention

The main risk in continual learning is **catastrophic forgetting**: the model improves on new data
but forgets knowledge from old data. Mitigations:

**Elastic Weight Consolidation (EWC)**: For the embedder and quality scorer, add a regularization
term that penalizes large changes to weights that were important for previous tasks:

```
L_EWC = L_new + Σ_i (λ/2) · F_i · (θ_i - θ*_i)²

Where F_i is the Fisher information of parameter i (estimated on old data),
and θ*_i is the value of parameter i after the previous training run.
```

**Experience Replay**: For the recommender, maintain a replay buffer of past interaction
samples that are mixed into each new training batch:

```
L_total = (1-α) · L_new_data + α · L_replay_buffer
```

### 14.4 Model Validation Before Deployment

No model is deployed without passing a validation gate:

```typescript
// AI/registry/modelRegistry.ts

interface ValidationGate {
  metricName: string;
  operator: '>=' | '<=' | '==' | '>';
  threshold: number;
  isBlocker: boolean;  // if true, fail stops deployment
}

const EMBEDDER_VALIDATION_GATES: ValidationGate[] = [
  { metricName: 'ndcg_at_10',     operator: '>=', threshold: 0.70, isBlocker: true },
  { metricName: 'mrr',            operator: '>=', threshold: 0.63, isBlocker: true },
  { metricName: 'p95_latency_ms', operator: '<=', threshold: 25,   isBlocker: true },
  { metricName: 'regression_rate',operator: '<=', threshold: 0.03, isBlocker: true },
];

export async function validateAndDeploy(
  newModel: ModelRegistryEntry,
  gates: ValidationGate[]
): Promise<{ deployed: boolean; failures: string[] }> {
  const evalResults = await runEvalSuite(newModel);
  const failures = gates
    .filter(gate => !checkGate(gate, evalResults[gate.metricName]))
    .map(gate => `${gate.metricName} ${gate.operator} ${gate.threshold}: got ${evalResults[gate.metricName]}`);

  const blockerFailures = gates
    .filter(g => g.isBlocker)
    .filter(gate => !checkGate(gate, evalResults[gate.metricName]));

  if (blockerFailures.length > 0) {
    await alertSlack(`Model ${newModel.modelId} failed validation gates: ${failures.join(', ')}`);
    return { deployed: false, failures };
  }

  await deployModel(newModel);
  await anchorModelHashOnAptos(newModel);
  return { deployed: true, failures: [] };
}
```

---

## 15. Module K — Federated Intelligence Layer

### 15.1 Vision

At Level 6, Verida AI's intelligence does not live in centralized servers — it is distributed
across the network of publishers and buyers. Federated learning enables model training without
any participant sharing their raw data.

### 15.2 Federated Quality Scoring

Publishers can opt into a **federated quality evaluation consortium**: their local models train
on their private datasets, only gradient updates are shared, and the consortium produces a better
global quality model than any single party could train alone.

```
Round r of Federated Averaging (FedAvg):

1. Server broadcasts current global quality model θ_r to K participants
2. Each participant k computes local gradient:
   g_k = ∇L(θ_r; D_k)  on their private dataset D_k
3. Participants send g_k to server (with optional differential privacy noise)
4. Server aggregates:
   θ_{r+1} = θ_r - η · (1/K) · Σ_k g_k
5. Repeat until convergence
```

The differential privacy guarantee prevents any single gradient from revealing private data:

```
Each gradient is clipped to max norm C and noised:
g_k_private = g_k / max(1, ||g_k||₂/C) + N(0, σ²C²I)

Privacy budget: (ε, δ)-DP with ε ≤ 1.0, δ = 1e-5
```

### 15.3 ZK-ML: On-Chain Proof of Correct Inference

The most ambitious component of Level 6 is **ZK-ML**: generating a zero-knowledge proof that a
specific quality score was computed correctly by a specific model version on a specific dataset
hash.

```
Prove: (quality_score = Q) given (model = M, dataset_hash = H)
Without revealing: the model weights M or the dataset contents

Verification: any party with (quality_score, model_hash, dataset_hash) can verify in O(1)
              using the on-chain verifier contract
```

Current feasible ZK-ML approaches:
- **EZKL**: Export ONNX model, generate plonk proof of inference
- **Risc Zero**: Run model inference in a RISC-V zkVM, generate proof of execution
- **Aztec Noir**: Write quality scoring logic in Noir (ZK DSL), compile to circuit

This is research-frontier territory. Target for Phase 4 (2026+).

---

## 16. MLOps & AI Infrastructure

### 16.1 Experiment Tracking

```typescript
// AI/registry/experimentTracker.ts

interface Experiment {
  experimentId: string;
  name: string;
  hypothesis: string;
  modelType: ModelType;
  hyperparameters: Record<string, unknown>;
  trainingConfig: {
    learningRate: number;
    batchSize: number;
    epochs: number;
    optimizer: string;
    lossFunction: string;
  };
  datasetVersion: string;
  startedAt: Date;
  completedAt?: Date;
  metrics: Record<string, number[]>;  // metric name → values per epoch
  artifacts: {
    modelPath?: string;
    checkpointPaths?: string[];
    evalReportPath?: string;
  };
  status: 'running' | 'completed' | 'failed' | 'killed';
  tags: string[];
}

export class ExperimentTracker {
  async startExperiment(config: Omit<Experiment, 'experimentId' | 'startedAt' | 'status'>): Promise<string>;
  async logMetric(experimentId: string, metric: string, value: number, step: number): Promise<void>;
  async logArtifact(experimentId: string, key: string, path: string): Promise<void>;
  async completeExperiment(experimentId: string, finalMetrics: Record<string, number>): Promise<void>;
  async compareExperiments(ids: string[]): Promise<ComparisonReport>;
}
```

### 16.2 Model Monitoring & Drift Detection

```typescript
// AI/serving/health.ts

interface ModelHealthReport {
  modelId: string;
  checkedAt: Date;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  errorRate: number;
  requestsPerMinute: number;

  // Data drift signals
  inputDistributionDrift: {
    detected: boolean;
    driftScore: number;          // 0 = no drift, 1 = complete drift
    driftedFeatures: string[];
    detectionMethod: 'ks_test' | 'chi_squared' | 'mmd';
  };

  // Prediction drift signals
  outputDistributionDrift: {
    detected: boolean;
    driftScore: number;
    currentMeanPrediction: number;
    baselineMeanPrediction: number;
  };

  // Performance drift (requires labeled data)
  performanceDrift?: {
    detected: boolean;
    currentMetricValue: number;
    baselineMetricValue: number;
    metricName: string;
    degradationPercent: number;
  };
}
```

### 16.3 Redis Inference Cache

All model inference results are cached in Redis with TTLs tuned per model type:

```typescript
// AI/serving/cache.ts

const CACHE_CONFIG: Record<ModelType, { ttlSeconds: number; keyBuilder: (input: unknown) => string }> = {
  EMBEDDER:    { ttlSeconds: 86_400,   keyBuilder: (text: string) => `emb:${sha256(text).slice(0,16)}` },
  QUALITY:     { ttlSeconds: 3_600,    keyBuilder: (id: string)   => `qual:${id}` },
  FRAUD:       { ttlSeconds: 1_800,    keyBuilder: (id: string)   => `fraud:${id}` },
  RECOMMENDER: { ttlSeconds: 3_600,    keyBuilder: (addr: string) => `rec:${addr}` },
  PRICER:      { ttlSeconds: 7_200,    keyBuilder: (feats: string) => `price:${sha256(feats).slice(0,16)}` },
  GNN:         { ttlSeconds: 43_200,   keyBuilder: (id: string)   => `gnn:${id}` },
};

export async function cachedInference<T>(
  modelType: ModelType,
  input: unknown,
  computeFn: () => Promise<T>
): Promise<T> {
  const config = CACHE_CONFIG[modelType];
  const key = config.keyBuilder(JSON.stringify(input));

  const cached = await redis.get(key);
  if (cached) {
    metrics.increment('inference.cache.hit', { model: modelType });
    return JSON.parse(cached) as T;
  }

  const result = await computeFn();
  await redis.setex(key, config.ttlSeconds, JSON.stringify(result));
  metrics.increment('inference.cache.miss', { model: modelType });
  return result;
}
```

### 16.4 BullMQ Queue Configuration for AI Jobs

```typescript
// AI/config/ai.config.ts

export const AI_QUEUE_CONFIG = {
  describe: {
    concurrency: 3,
    limiter: { max: 50, duration: 60_000 },  // 50 per minute
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  },
  embed: {
    concurrency: 5,
    limiter: { max: 200, duration: 60_000 },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 3_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  },
  quality: {
    concurrency: 3,
    limiter: { max: 30, duration: 60_000 },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 8_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  },
  recommend: {
    concurrency: 10,
    limiter: { max: 500, duration: 60_000 },
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed' as const, delay: 2_000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  },
};
```

---

## 17. AI Security & Trustworthy AI

### 17.1 Adversarial Attacks on AI Systems

The AI layer of Verida AI introduces new attack surfaces that must be explicitly defended:

**Embedding poisoning**: A malicious publisher uploads datasets crafted to cause their content to
appear similar to high-quality, popular datasets in the embedding space. Defense: anomaly
detection on embedding distances — legitimate datasets cluster naturally; adversarial datasets
appear in implausible locations.

**Quality score gaming**: A publisher reverse-engineers the quality scorer and uploads datasets
with artificially high completeness/uniqueness scores but low actual utility. Defense: the buyer
rating feedback loop catches this and updates the quality model; publishers with high AI scores but
low buyer ratings get a penalty.

**Prompt injection in descriptions**: A malicious publisher includes instructions in the dataset
description that try to manipulate the Publisher AI Assistant's behavior for other users. Defense:
the assistant's system prompt treats all dataset content as untrusted data, never as instructions.

**Recommendation poisoning**: An attacker creates many fake access sessions (sybil attack) to
boost a malicious dataset into recommendations. Defense: the fraud detection system (Module E)
flags sybil-like access patterns and excludes them from the recommendation training signal.

### 17.2 Explainability Requirements

Every AI decision exposed to users must have an explanation:

| AI Decision | Explanation Shown to User |
|-------------|--------------------------|
| Quality Score | Breakdown by dimension (completeness, validity, etc.) |
| Price Suggestion | "Similar datasets in this category sell for X-Y APT" |
| Fraud Flag | Flagged for: [POTENTIAL_DUPLICATE | SCHEMA_INFLATION | ...] |
| Recommendation | "Because you accessed: [dataset names]" |
| Similar Datasets | Similarity score + matching tags/schema features |
| Tag Suggestion | "Inferred from column types and schema analysis" |

### 17.3 Privacy Budget

Behavioral models (recommender, fraud detector) operate on wallet addresses which are pseudonymous
but potentially linkable. Privacy controls:

- User-level recommendation data is stored with address-level access controls
- Federated learning in Phase 4 prevents raw address data from leaving the client
- Differential privacy noise is added to all behavioral training signals
- Users can opt out of behavioral modeling with a Settings toggle

---

## 18. Blockchain-AI Integration Layer

### 18.1 On-Chain AI Transparency

The blockchain layer of Verida AI enables a unique capability: **AI decisions can be made
permanently verifiable on-chain**. Three types of on-chain AI records are planned:

**Model anchoring**: Each time a new model version is deployed, its SHA-256 hash is published
to Aptos via a `ModelRegistryModule`. Any party can verify that a quality score shown today was
produced by model X, and retrieve the model hash to verify independently.

**Quality score anchoring**: For datasets with high access volume, the quality score, breakdown,
and producing model version are anchored to Aptos as a provenance event (extending the existing
`provenance_chain` table with QUALITY_SCORED event type).

**Inference proof anchoring** (Phase 4): ZK-ML proofs of correct inference are submitted on-chain,
enabling any buyer to verify that a quality score was honestly computed.

### 18.2 Smart Contract: ModelRegistry Module (Move)

```move
// contracts/sources/ModelRegistry.move

module verida_ai::model_registry {
    use std::string::String;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    struct ModelRecord has key, store {
        model_id: String,
        model_type: String,
        version: String,
        weights_hash: vector<u8>,   // SHA-256 of model weights
        training_data_hash: vector<u8>,
        registered_at: u64,
        is_active: bool,
    }

    #[event]
    struct ModelRegistered has drop, store {
        model_id: String,
        model_type: String,
        version: String,
        weights_hash: vector<u8>,
        registered_at: u64,
    }

    #[event]
    struct ModelDeprecated has drop, store {
        model_id: String,
        deprecated_at: u64,
        replaced_by: String,
    }

    public entry fun register_model(
        admin: &signer,
        model_id: String,
        model_type: String,
        version: String,
        weights_hash: vector<u8>,
        training_data_hash: vector<u8>,
    ) {
        let record = ModelRecord {
            model_id: copy model_id,
            model_type: copy model_type,
            version: copy version,
            weights_hash: copy weights_hash,
            training_data_hash,
            registered_at: timestamp::now_microseconds(),
            is_active: true,
        };

        event::emit(ModelRegistered {
            model_id,
            model_type,
            version,
            weights_hash,
            registered_at: timestamp::now_microseconds(),
        });
    }
}
```

### 18.3 QualityScore Provenance Event

The existing `provenance_chain` table gains a new event type:

```typescript
// Extend provenance event types in packages/shared/src/types.ts

export type ProvenanceEventType =
  | 'UPLOAD'
  | 'VERSION_ADDED'
  | 'VERIFIED'
  | 'TAMPER_DETECTED'
  | 'ACCESSED'
  | 'QUALITY_SCORED'        // NEW
  | 'FRAUD_FLAGGED'         // NEW
  | 'AI_DESCRIPTION_ADDED'; // NEW

// Quality score provenance payload
interface QualityScoredPayload {
  qualityScore: number;
  breakdown: QualityBreakdown;
  modelId: string;
  modelHash: string;
  aptosAnchorTxHash?: string;
  scoredAt: string;
}
```

---

## 19. Codebase Integration Map

### 19.1 File-by-File Changes

The following table maps every AI module to the specific files it adds or modifies:

```
ADDS:
  AI/workers/describeWorker.ts         (Module A)
  AI/workers/embedWorker.ts            (Module B)
  AI/workers/qualityWorker.ts          (Module C)
  AI/workers/priceWorker.ts            (Module D)
  AI/workers/fraudWorker.ts            (Module E)
  AI/workers/recommendWorker.ts        (Module H)
  AI/pipelines/describe.ts             (Module A)
  AI/pipelines/embed.ts                (Module B)
  AI/pipelines/quality.ts              (Module C)
  AI/pipelines/fraud.ts                (Module E)
  AI/pipelines/recommend.ts            (Module H)
  AI/pipelines/sandbox.ts              (Module I)
  AI/serving/client.ts                 (All)
  AI/serving/cache.ts                  (All)
  AI/serving/health.ts                 (MLOps)
  AI/serving/assistant.ts              (Module F)
  AI/registry/modelRegistry.ts         (MLOps)
  AI/registry/experimentTracker.ts     (MLOps)
  AI/knowledge/graphBuilder.ts         (Module G)
  AI/knowledge/gnnTrainer.ts           (Module G)
  AI/knowledge/graphQuery.ts           (Module G)
  AI/eval/embedderEval.ts              (Module B)
  AI/eval/qualityEval.ts               (Module C)
  AI/eval/searchEval.ts                (Module B)
  AI/eval/recommenderEval.ts           (Module H)
  AI/config/ai.config.ts               (All)
  AI/config/prompts/describe.ts        (Module A)
  AI/config/prompts/assistant.ts       (Module F)
  AI/config/prompts/quality.ts         (Module C)
  apps/api/src/routes/assistant.ts     (Module F)
  apps/api/src/routes/inference.ts     (Module I)
  apps/api/src/routes/recommendations.ts (Module H)
  migrations/0005_ai_metadata.sql      (All)
  migrations/0006_knowledge_graph.sql  (Module G)

MODIFIES:
  apps/api/src/lib/queue/workers/uploadWorker.ts  (Module A: enqueue describe job)
  apps/api/src/routes/datasets.ts                 (Modules B, C: new endpoints)
  apps/api/src/routes/access.ts                   (Module E: fraud check)
  apps/api/src/lib/db/schema.ts                   (All: new columns)
  apps/api/src/index.ts                           (All: mount new routes)
  apps/web/src/pages/DatasetDetail.tsx            (Modules A, B, C)
  apps/web/src/pages/Home.tsx                     (Module B: semantic search)
  apps/web/src/pages/Upload.tsx                   (Module F: AI assistant)
  packages/shared/src/types.ts                    (All: new types)
```

### 19.2 Environment Variables Added

```env
# apps/api/.env additions

# LLM API (prototype phase)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...         # fallback embedder

# AI model paths (self-hosted phase)
EMBEDDER_MODEL_PATH=/models/embedder-v1.0.0
QUALITY_MODEL_PATH=/models/quality-v1.0.0
FRAUD_MODEL_PATH=/models/fraud-v1.0.0
RECOMMENDER_MODEL_PATH=/models/recommender-v1.0.0

# AI feature flags
AI_DESCRIBE_ENABLED=true
AI_EMBED_ENABLED=true
AI_QUALITY_ENABLED=true
AI_FRAUD_ENABLED=true
AI_RECOMMEND_ENABLED=false      # enable after 1000+ datasets
AI_ASSISTANT_ENABLED=true
AI_SANDBOX_ENABLED=false        # enable in Phase 3

# Quality thresholds
FRAUD_AUTO_BLOCK_THRESHOLD=0.90
FRAUD_HUMAN_REVIEW_THRESHOLD=0.70
QUALITY_MIN_DISPLAY_SCORE=0.0   # show all scores to buyers

# Pricing
PRICING_MIN_PRICE_OCTAS=1000000      # 0.01 APT
PRICING_MAX_PRICE_OCTAS=100000000000 # 1000 APT
```

---

## 20. Implementation Roadmap

### 20.1 Phase 1 — Foundation (Weeks 1-6)

**Goal**: Get Module A, B, C into production. Every dataset uploaded from this point forward
is enriched with schema profile, AI description, tags, embedding, and quality score.

```
Week 1:
  [ ] Run migration 0005_ai_metadata.sql (adds pgvector, new columns)
  [ ] Implement AI/pipelines/describe.ts (CSV, JSON, text extractors)
  [ ] Implement AI/workers/describeWorker.ts
  [ ] Modify uploadWorker.ts to enqueue describe job
  [ ] Unit tests: extractCsvSchema, extractJsonSchema, extractTextSchema

Week 2:
  [ ] Integrate Anthropic API for description generation
  [ ] Implement AI/config/prompts/describe.ts
  [ ] Implement AI/serving/client.ts (with Redis caching)
  [ ] Integration test: full upload → describe pipeline
  [ ] Deploy to staging, test with 10 real datasets

Week 3:
  [ ] Implement AI/workers/embedWorker.ts
  [ ] Implement AI/pipelines/embed.ts
  [ ] Test pgvector similarity queries
  [ ] Add GET /api/datasets/semantic-search endpoint
  [ ] Add GET /api/datasets/:id/similar endpoint
  [ ] Update Home.tsx search bar to use semantic search

Week 4:
  [ ] Implement AI/workers/qualityWorker.ts
  [ ] Implement AI/pipelines/quality.ts (6 quality dimensions)
  [ ] Update DatasetDetail.tsx to show quality score + breakdown
  [ ] Add quality score to dataset list API response

Week 5:
  [ ] Implement AI/serving/health.ts (latency monitoring)
  [ ] Implement AI/serving/cache.ts (Redis inference cache)
  [ ] Add AI worker monitoring to BullMQ dashboard
  [ ] Set up eval harnesses for embedder and quality scorer
  [ ] Performance test: describe + embed + quality for 100 concurrent uploads

Week 6:
  [ ] Run eval suite on staging with real dataset sample
  [ ] Fix issues found in eval
  [ ] Deploy Phase 1 to production
  [ ] Monitor error rates and latencies for 1 week
  [ ] Retrospective and Phase 2 planning
```

### 20.2 Phase 2 — Intelligence (Weeks 7-14)

```
Week 7-8:   Module D — Pricing Optimizer
Week 9-10:  Module E — Fraud Detection
Week 11-12: Module F — Publisher AI Assistant
Week 13-14: Module G — Knowledge Graph (basic, no GNN yet)
```

### 20.3 Phase 3 — Autonomy (Weeks 15-24)

```
Week 15-17: Module H — Recommendation Engine (CF + content-based)
Week 18-20: Module I — Inference Sandbox (DuckDB, SQL + stat profiling)
Week 21-24: Module J — Continual Learning Pipeline
```

### 20.4 Phase 4 — Decentralization (Month 7+)

```
Month 7-9:  Module K — Federated Learning prototype
Month 10+:  ZK-ML proof of inference (research phase)
            GNN training on full knowledge graph
            On-chain model registry (Move contract deployment)
```

---

## 21. Research Directions & Future Work

### 21.1 Foundation Model for Dataset Understanding

The long-term vision is a **Verida Dataset Foundation Model (VDFM)**: a large transformer
pre-trained on the entire Verida AI dataset catalog. Unlike general-purpose LLMs, VDFM would
understand the structure, semantics, and relationships of AI training data as a first-class
concept.

Inspired by:
- TabPFN (Hollmann et al., 2022): in-context learning for tabular data
- TableGPT (Zha et al., 2023): GPT pre-trained on structured tables
- UniTabE (Yang et al., 2023): universal tabular encoder

VDFM would be trained on:
- Dataset schemas and profiles (structured)
- Publisher descriptions and AI-generated descriptions (text)
- Buyer access patterns and ratings (behavioral)
- Dataset version histories (temporal)

Fine-tuned on:
- Quality prediction (supervised, buyer ratings)
- Dataset-to-ML-task mapping (weakly supervised)
- Cross-dataset schema alignment (self-supervised)

### 21.2 Autonomous Dataset Curation Agents

An autonomous agent that:
1. Monitors public data sources (arxiv datasets, Hugging Face, government data portals)
2. Identifies high-quality datasets not yet in the Verida AI marketplace
3. Contacts publishers via on-chain messaging to invite them to list
4. Pre-generates descriptions and quality scores for prospective datasets
5. Negotiates access terms via smart contracts

This converts the marketplace from passive (wait for publishers) to active (discover and recruit).

### 21.3 Dataset-to-Model Lineage Tracking

Track which models were trained on which datasets, with on-chain provenance:

```
Dataset A (v1.2) ──trained──► Model X (BERT-finance-v1)
Dataset A (v2.0) ──trained──► Model X (BERT-finance-v2)
Dataset B        ──trained──► Model Y (LLaMA-medical-finetuned)
```

This creates a new marketplace layer: buyers can discover datasets by the quality of models trained
on them. A dataset that produced a model achieving SOTA on a benchmark becomes dramatically more
valuable.

### 21.4 Cross-Platform Dataset Interoperability

Define a **Verida Dataset Standard (VDS)**: a schema specification for describing AI datasets in a
way that is interoperable with Hugging Face Datasets, TensorFlow Datasets, and PyTorch DataLoader.

A VDS-compliant dataset on Verida AI can be loaded directly with:

```python
from verida import load_dataset
dataset = load_dataset("verida://0xAbc123.../dataset-id", split="train")
```

This removes friction from the buyer's side: instead of downloading a file and manually loading
it, they get a familiar DataLoader-compatible object.

---

## 22. Appendix — Mathematical Foundations

### 22.1 Cosine Similarity

For two vectors u, v ∈ ℝ^d:
```
cos(u, v) = (u · v) / (||u||₂ · ||v||₂)
```
Used in: embedding similarity search, similar datasets, content-based recommendations.

### 22.2 BM25 Score

For query Q = {q₁, ..., qₙ} and document D:
```
BM25(Q, D) = Σᵢ IDF(qᵢ) · (f(qᵢ,D) · (k₁+1)) / (f(qᵢ,D) + k₁·(1-b+b·|D|/avgdl))
```
Where: f(qᵢ,D) = term frequency, IDF = inverse document frequency, k₁=1.2, b=0.75.
Used in: hybrid search lexical component.

### 22.3 Shannon Entropy

For a discrete distribution P over alphabet X:
```
H(P) = -Σ_{x ∈ X} P(x) · log₂(P(x))
```
Used in: dataset coverage score (entropy of categorical column distributions).

### 22.4 Jaccard Similarity

For two sets A, B:
```
J(A, B) = |A ∩ B| / |A ∪ B|
```
Used in: MinHash LSH duplicate detection (estimated by MinHash).

### 22.5 Bayesian Personalized Ranking Loss

For user u, positive item i, negative item j:
```
L_BPR = -Σ_{(u,i,j)} log σ(x̂_ui - x̂_uj) + λ||Θ||²
```
Used in: collaborative filtering recommender training.

### 22.6 Elastic Weight Consolidation

```
L_EWC(θ) = L_B(θ) + Σᵢ (λ/2) · F_i · (θᵢ - θ*ᵢ)²
```
Where F_i is the diagonal of the Fisher information matrix.
Used in: continual learning — preventing catastrophic forgetting.

### 22.7 Differential Privacy Guarantee

A randomized mechanism M satisfies (ε, δ)-differential privacy if for all adjacent datasets D,
D' and all output sets S:
```
Pr[M(D) ∈ S] ≤ e^ε · Pr[M(D') ∈ S] + δ
```
Used in: federated learning gradient perturbation.

### 22.8 Conservative Q-Learning Objective

```
L_CQL(Q) = α · (E_{s~D}[log Σ_a exp(Q(s,a))] - E_{(s,a)~D}[Q(s,a)])
           + (1/2) · E_{(s,a,r,s')~D}[(Q(s,a) - r - γ · max_{a'} Q(s',a'))²]
```
Used in: offline RL for pricing optimizer.

### 22.9 NDCG@K

```
DCG@K  = Σᵢ₌₁ᴷ (2^relᵢ - 1) / log₂(i+1)
NDCG@K = DCG@K / IDCG@K
```
Where relᵢ is the relevance of the i-th result and IDCG is the ideal DCG.
Used in: evaluation metric for semantic search quality.

### 22.10 Mean Reciprocal Rank

```
MRR = (1/|Q|) · Σ_{q ∈ Q} 1/rank_q
```
Where rank_q is the position of the first relevant result for query q.
Used in: evaluation metric for semantic search.

---

## Document Metadata

```
Document:     AI_Integration.md
Version:      1.0.0
Project:      Verida AI — Decentralized Dataset Marketplace
Author:       Principal AI Scientist & Chief AI Architect (AI-generated specification)
Stack:        React 19 + Vite | Express 5 + BullMQ | PostgreSQL + pgvector | Shelby Protocol | Aptos
AI Framework: Anthropic Claude (prototype) → self-hosted (production)
Last Updated: 2025
Total Modules: 11 (A through K)
Intelligence Levels Addressed: 0 → 6
Estimated Implementation Time: 24 weeks (solo developer) / 12 weeks (team of 3)
Lines of Specification: 2100+
```

---

*"Every recommendation in this document should move the platform closer to an intelligent
decentralized AI ecosystem where datasets understand themselves, models understand datasets,
buyers discover data semantically, and the entire ecosystem improves through continual learning."*
