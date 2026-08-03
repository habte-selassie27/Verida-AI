import { Router } from 'express';
import { db } from '../lib/db/index.js';
import { datasets, publishers } from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';
import type { AccessType, DatasetModality, DatasetTag, SchemaProfile } from '@verida/shared';

const router = Router();

const SEED_SECRET = process.env.SEED_SECRET ?? 'verida-seed-2025';

const DEMO_PUBLISHERS = [
  { address: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12', username: 'AI Research Lab', bio: 'Leading AI research organization publishing high-quality training datasets.' },
  { address: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234', username: 'DataForge', bio: 'Curating and publishing verified datasets for machine learning.' },
  { address: '0x3c4d5e6f7890abcdef1234567890abcdef123456', username: 'OpenData Collective', bio: 'Open-source data initiatives for the AI community.' },
];

const DEMO_DATASETS = [
  {
    name: 'ImageNet-21K Subset',
    description: 'A curated subset of ImageNet-21K containing 14,197,122 images across 21,841 classes.',
    tags: ['cv', 'vision', 'image', 'classification'],
    size_bytes: 47_500_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 50_000_000,
    license: 'CC-BY-4.0',
    modality: 'image' as const,
    quality_score: 0.94,
    ai_description: 'Large-scale image classification benchmark with over 14 million images spanning 21,841 categories.',
    schema_profile: null,
    suggested_tags: ['computer-vision', 'image-classification', 'deep-learning', 'benchmark'],
    publisher_idx: 0,
  },
  {
    name: 'Common Crawl NLP Corpus',
    description: 'Filtered and deduplicated text corpus from Common Crawl. 2.1TB of high-quality web text.',
    tags: ['nlp', 'text', 'language', 'pretraining'],
    size_bytes: 2_100_000_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 80_000_000,
    license: 'CC-BY-4.0',
    modality: 'text' as const,
    quality_score: 0.88,
    ai_description: 'Filtered Common Crawl subset with 2.1TB of deduplicated, quality-scored web text.',
    schema_profile: { modality: 'text', format: 'text', columns: [{ name: 'text', inferredType: 'string', nullRate: 0, cardinality: 1000000, semanticCategory: 'text' }], estimatedRowCount: 500000000 } as SchemaProfile,
    suggested_tags: ['language-model', 'pretraining', 'web-text', 'corpus'],
    publisher_idx: 1,
  },
  {
    name: 'Medical X-Ray Dataset',
    description: '56,000 chest X-ray images with diagnostic labels from 14 disease categories.',
    tags: ['medical', 'imaging', 'healthcare', 'radiology'],
    size_bytes: 12_800_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 150_000_000,
    license: 'CC-BY-NC-4.0',
    modality: 'image' as const,
    quality_score: 0.91,
    ai_description: 'Comprehensive chest X-ray dataset with 56,000 radiologist-annotated images across 14 diagnostic categories.',
    schema_profile: null,
    suggested_tags: ['medical-imaging', 'radiology', 'diagnosis', 'healthcare-ai'],
    publisher_idx: 0,
  },
  {
    name: 'Financial Time Series',
    description: '10 years of OHLCV data for 5,000+ stocks, ETFs, and commodities with technical indicators.',
    tags: ['financial', 'time-series', 'stocks', 'trading'],
    size_bytes: 890_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 30_000_000,
    license: 'Proprietary',
    modality: 'tabular' as const,
    quality_score: 0.87,
    ai_description: 'Comprehensive financial market dataset covering 5,000+ instruments with 10 years of daily OHLCV data.',
    schema_profile: { modality: 'tabular', format: 'csv', columns: [
      { name: 'timestamp', inferredType: 'datetime', nullRate: 0, cardinality: 2500, semanticCategory: 'datetime' },
      { name: 'symbol', inferredType: 'string', nullRate: 0, cardinality: 5000, semanticCategory: 'identifier' },
      { name: 'close', inferredType: 'float', nullRate: 0, cardinality: 50000, semanticCategory: 'numeric' },
    ], estimatedRowCount: 12500000 } as SchemaProfile,
    suggested_tags: ['quantitative-finance', 'time-series', 'market-analysis', 'trading'],
    publisher_idx: 1,
  },
  {
    name: 'Speech Commands v3',
    description: '305,000 audio clips of 35 common speech commands from 2,000+ speakers.',
    tags: ['audio', 'speech', 'recognition', 'commands'],
    size_bytes: 4_200_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'CC-BY-4.0',
    modality: 'audio' as const,
    quality_score: 0.85,
    ai_description: 'Large-scale speech command dataset with 305,000 one-second audio clips covering 35 common commands.',
    schema_profile: null,
    suggested_tags: ['speech-recognition', 'keyword-spotting', 'voice-assistant', 'audio-classification'],
    publisher_idx: 2,
  },
  {
    name: 'CodeContests+ Training Data',
    description: '150,000 competitive programming problems with solutions in Python, C++, and Java.',
    tags: ['code', 'programming', 'algorithms', 'competitive'],
    size_bytes: 2_800_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 20_000_000,
    license: 'MIT',
    modality: 'text' as const,
    quality_score: 0.92,
    ai_description: 'Curated dataset of 150,000 competitive programming problems with verified multi-language solutions.',
    schema_profile: null,
    suggested_tags: ['code-generation', 'algorithmic-reasoning', 'programming', 'software-engineering'],
    publisher_idx: 2,
  },
  {
    name: 'Satellite Urban Segmentation',
    description: '100,000 satellite images with pixel-level semantic segmentation labels for urban scenes.',
    tags: ['cv', 'geospatial', 'segmentation', 'remote-sensing'],
    size_bytes: 67_000_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 120_000_000,
    license: 'CC-BY-4.0',
    modality: 'image' as const,
    quality_score: 0.89,
    ai_description: 'High-resolution satellite imagery with pixel-level annotations for urban scene segmentation across 50 cities.',
    schema_profile: null,
    suggested_tags: ['remote-sensing', 'semantic-segmentation', 'urban-planning', 'geospatial-ai'],
    publisher_idx: 0,
  },
  {
    name: 'Multimodal Reasoning Benchmark',
    description: '50,000 problems requiring reasoning across text, images, and tables.',
    tags: ['multimodal', 'reasoning', 'benchmark', 'evaluation'],
    size_bytes: 8_500_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'CC-BY-4.0',
    modality: 'multimodal' as const,
    quality_score: 0.93,
    ai_description: 'Comprehensive multimodal benchmark with 50,000 problems requiring joint reasoning over text, images, and tables.',
    schema_profile: null,
    suggested_tags: ['multimodal-ai', 'reasoning', 'benchmark', 'evaluation'],
    publisher_idx: 1,
  },
  {
    name: 'Synthetic Patient Data',
    description: '1M rows of synthetic patient data with realistic distributions using differential privacy.',
    tags: ['tabular', 'synthetic', 'healthcare', 'privacy'],
    size_bytes: 125_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'CC0-1.0',
    modality: 'tabular' as const,
    quality_score: 0.82,
    ai_description: 'Synthetically generated patient dataset with 1 million records using differential privacy guarantees.',
    schema_profile: { modality: 'tabular', format: 'csv', columns: [
      { name: 'patient_id', inferredType: 'string', nullRate: 0, cardinality: 1000000, semanticCategory: 'identifier' },
      { name: 'age', inferredType: 'integer', nullRate: 0.02, cardinality: 100, semanticCategory: 'numeric' },
      { name: 'diagnosis_code', inferredType: 'string', nullRate: 0.05, cardinality: 500, semanticCategory: 'category' },
    ], estimatedRowCount: 1000000 } as SchemaProfile,
    suggested_tags: ['synthetic-data', 'differential-privacy', 'healthcare', 'data-augmentation'],
    publisher_idx: 2,
  },
  {
    name: 'YouTube-8M Lite',
    description: '3.2 million video labels from 4,800 classes with pre-computed features.',
    tags: ['video', 'cv', 'classification', 'multimodal'],
    size_bytes: 240_000_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 200_000_000,
    license: 'CC-BY-4.0',
    modality: 'video' as const,
    quality_score: 0.86,
    ai_description: 'Large-scale video dataset with 3.2 million labels spanning 4,800 action classes.',
    schema_profile: null,
    suggested_tags: ['video-classification', 'action-recognition', 'multimodal', 'large-scale'],
    publisher_idx: 0,
  },
  {
    name: 'Legal Contract NER Corpus',
    description: '25,000 annotated legal contracts with NER labels for 18 entity types.',
    tags: ['nlp', 'legal', 'ner', 'document'],
    size_bytes: 450_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 40_000_000,
    license: 'CC-BY-NC-4.0',
    modality: 'text' as const,
    quality_score: 0.90,
    ai_description: 'Specialized NER dataset for legal document processing with 25,000 annotated contracts.',
    schema_profile: null,
    suggested_tags: ['legal-ai', 'named-entity-recognition', 'contract-analysis', 'nlp'],
    publisher_idx: 1,
  },
  {
    name: 'Climate Sensor Network',
    description: '5 years of hourly climate readings from 2,000 weather stations worldwide.',
    tags: ['climate', 'time-series', 'environmental', 'sensor'],
    size_bytes: 340_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'CC0-1.0',
    modality: 'tabular' as const,
    quality_score: 0.84,
    ai_description: 'Global climate dataset with 5 years of hourly readings from 2,000 weather stations.',
    schema_profile: { modality: 'tabular', format: 'csv', columns: [
      { name: 'timestamp', inferredType: 'datetime', nullRate: 0, cardinality: 43800, semanticCategory: 'datetime' },
      { name: 'station_id', inferredType: 'string', nullRate: 0, cardinality: 2000, semanticCategory: 'identifier' },
      { name: 'temperature_c', inferredType: 'float', nullRate: 0.02, cardinality: 500, semanticCategory: 'numeric' },
    ], estimatedRowCount: 87600000 } as SchemaProfile,
    suggested_tags: ['climate-modeling', 'weather-forecasting', 'environmental-ai', 'time-series'],
    publisher_idx: 2,
  },
];

router.post('/admin/seed', async (req, res) => {
  try {
    const { secret } = req.body as { secret?: string };
    if (secret !== SEED_SECRET) {
      res.status(403).json({ error: 'Invalid seed secret.', success: false });
      return;
    }

    const [existingCount] = await db.select({ count: sql<number>`count(*)` }).from(datasets);
    if (Number(existingCount?.count ?? 0) > 0) {
      res.json({ message: `Database already has ${existingCount?.count} datasets. Skipping.`, success: true });
      return;
    }

    for (const pub of DEMO_PUBLISHERS) {
      await db.insert(publishers).values({
        address: pub.address,
        username: pub.username,
        bio: pub.bio,
        totalDatasets: 0,
        totalEarnings: 0,
      }).onConflictDoNothing();
    }

    for (let i = 0; i < DEMO_DATASETS.length; i++) {
      const ds = DEMO_DATASETS[i]!;
      const publisher = DEMO_PUBLISHERS[ds.publisher_idx]!;
      const { createHash } = await import('node:crypto');
      const merkleRoot = createHash('sha256').update(ds.name + i).digest('hex');
      const shelbyBlobId = `${publisher.address}/${ds.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`;

      await db.insert(datasets).values({
        shelbyBlobId,
        name: ds.name,
        description: ds.description,
        tags: ds.tags as DatasetTag[],
        sizeBytes: ds.size_bytes,
        version: 1,
        publisherAddress: publisher.address,
        accessType: ds.access_type as AccessType,
        pricePerAccess: ds.price_per_access,
        license: ds.license,
        provenanceReceipt: {
          blobId: shelbyBlobId,
          merkleRoot,
          size: ds.size_bytes,
          chunkCount: 1,
          uploaderAddress: publisher.address,
          txHash: merkleRoot,
          uploadedAt: Date.now(),
        },
        merkleRoot,
        verified: true,
        tampered: false,
        modality: ds.modality as DatasetModality,
        qualityScore: ds.quality_score,
        qualityBreakdown: {
          completeness: Math.min(1, ds.quality_score + 0.05),
          consistency: Math.min(1, ds.quality_score + 0.02),
          uniqueness: Math.min(1, ds.quality_score + 0.03),
          validity: Math.min(1, ds.quality_score + 0.01),
          timeliness: Math.min(1, ds.quality_score - 0.02),
          coverage: Math.min(1, ds.quality_score - 0.04),
        },
        qualityScoredAt: new Date().toISOString(),
        aiDescription: ds.ai_description,
        suggestedTags: ds.suggested_tags,
        schemaProfile: ds.schema_profile as SchemaProfile | null,
        describeStatus: 'completed',
        describedAt: new Date().toISOString(),
        embeddedAt: new Date().toISOString(),
      });
    }

    for (const pub of DEMO_PUBLISHERS) {
      const count = DEMO_DATASETS.filter(d => d.publisher_idx === DEMO_PUBLISHERS.indexOf(pub)).length;
      await db.update(publishers).set({ totalDatasets: count }).where(sql`${publishers.address} = ${pub.address}`);
    }

    res.json({
      message: `Seeded ${DEMO_DATASETS.length} datasets across ${DEMO_PUBLISHERS.length} publishers.`,
      success: true,
    });
  } catch (err: unknown) {
    console.error('[Seed] Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    const cause = err && typeof err === 'object' && 'cause' in err ? String((err as { cause: unknown }).cause) : '';
    res.status(500).json({ error: message, cause, success: false });
  }
});

export { router as adminRouter };
