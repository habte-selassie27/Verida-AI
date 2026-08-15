import { Router } from 'express';
import { db } from '../lib/db/index.js';
import { datasets, publishers } from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';
import type { AccessType, DatasetModality, DatasetTag, SchemaProfile } from '@verida/shared';
import { seedCommunityPosts } from '../lib/community/seed.js';

const router = Router();

const SEED_SECRET = process.env.SEED_SECRET ?? 'verida-seed-2025';
const ADMIN_WALLET = process.env.VITE_MARKETPLACE_CONTRACT_ADDRESS ?? '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd';

const DEMO_PUBLISHERS = [
  { address: ADMIN_WALLET, username: 'Verida Admin', bio: 'Platform administrator and primary dataset publisher.' },
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
    publisher_idx: 0,
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
    publisher_idx: 0,
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
    publisher_idx: 0,
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
    publisher_idx: 0,
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
    publisher_idx: 0,
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
    publisher_idx: 0,
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
    publisher_idx: 0,
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
    publisher_idx: 0,
  },
  {
    name: 'Arc Bootcamp Certification',
    description: 'Certification dataset for the Arc blockchain bootcamp program with verified completion records.',
    tags: ['other', 'certification'],
    size_bytes: 2_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 50_000_000,
    license: 'Proprietary',
    modality: 'tabular' as const,
    quality_score: 0.69,
    ai_description: 'Certification records for the Arc blockchain bootcamp program with verified completion data.',
    schema_profile: null,
    suggested_tags: ['certification', 'blockchain', 'education'],
    publisher_idx: 0,
  },
  {
    name: 'Henok CV',
    description: 'Computer vision dataset for facial recognition and personal identification research.',
    tags: ['cv', 'vision', 'facial-recognition'],
    size_bytes: 57_400,
    access_type: 'pay_per_access' as const,
    price_per_access: 50_000_000,
    license: 'CC-BY-4.0',
    modality: 'image' as const,
    quality_score: 0.69,
    ai_description: 'CV dataset focused on facial recognition and personal identification with curated image samples.',
    schema_profile: null,
    suggested_tags: ['facial-recognition', 'computer-vision', 'biometrics'],
    publisher_idx: 0,
  },
  {
    name: 'Pengu White Card',
    description: 'White card dataset for the Pengu NFT project with metadata and trait definitions.',
    tags: ['other', 'nft', 'digital-art'],
    size_bytes: 8_500_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 50_000_000,
    license: 'Proprietary',
    modality: 'image' as const,
    quality_score: 0.69,
    ai_description: 'White card dataset for the Pengu NFT collection with metadata, traits, and digital art references.',
    schema_profile: null,
    suggested_tags: ['nft', 'digital-art', 'metadata'],
    publisher_idx: 0,
  },
  {
    name: 'Software Engineering Guide',
    description: 'Comprehensive guide dataset for software engineering best practices and coding standards.',
    tags: ['legal', 'software', 'documentation'],
    size_bytes: 2_700_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 50_000_000,
    license: 'MIT',
    modality: 'text' as const,
    quality_score: 0.69,
    ai_description: 'Comprehensive software engineering guide with best practices, coding standards, and architectural patterns.',
    schema_profile: null,
    suggested_tags: ['software-engineering', 'coding-standards', 'best-practices'],
    publisher_idx: 0,
  },
  {
    name: 'Kast Logo',
    description: 'Brand logo assets for the Kast project with vector and raster formats.',
    tags: ['legal', 'brand', 'design'],
    size_bytes: 3_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 70_000_000,
    license: 'Proprietary',
    modality: 'image' as const,
    quality_score: 0.69,
    ai_description: 'Brand logo assets for the Kast project including vector SVG and high-resolution raster formats.',
    schema_profile: null,
    suggested_tags: ['branding', 'logo', 'design-assets'],
    publisher_idx: 0,
  },
  {
    name: 'Fluton Brandkit',
    description: 'Complete brand kit for Fluton including logos, color palettes, and typography guidelines.',
    tags: ['legal', 'brand', 'design'],
    size_bytes: 2_600_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 50_000_000,
    license: 'Proprietary',
    modality: 'document' as const,
    quality_score: 0.884,
    ai_description: 'Complete Fluton brand kit with logos, color palettes, typography, and usage guidelines.',
    schema_profile: null,
    suggested_tags: ['branding', 'brand-kit', 'design-system'],
    publisher_idx: 0,
  },
  {
    name: 'Fluton Brand Design Kit',
    description: 'Extended brand design kit for Fluton with medical and healthcare design assets.',
    tags: ['legal', 'medical', 'brand'],
    size_bytes: 2_600_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 50_000_000,
    license: 'Proprietary',
    modality: 'document' as const,
    quality_score: 0.884,
    ai_description: 'Extended Fluton brand design kit with healthcare-specific assets, medical icons, and compliance templates.',
    schema_profile: null,
    suggested_tags: ['healthcare-branding', 'medical-design', 'compliance'],
    publisher_idx: 0,
  },
  {
    name: 'Fluton Brand Design Kit 1',
    description: 'Premium brand design kit for Fluton with extended medical and legal templates.',
    tags: ['legal', 'medical', 'brand'],
    size_bytes: 2_600_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 70_000_000,
    license: 'Proprietary',
    modality: 'document' as const,
    quality_score: 0.884,
    ai_description: 'Premium Fluton brand design kit with extended medical templates, legal document styles, and compliance assets.',
    schema_profile: null,
    suggested_tags: ['premium-brand', 'medical-templates', 'legal-templates'],
    publisher_idx: 0,
  },
  {
    name: 'OpenStreetMap Building Footprints',
    description: 'Building footprint polygons from OpenStreetMap covering 50 major cities worldwide.',
    tags: ['geospatial', 'cv', 'urban', 'mapping'],
    size_bytes: 18_000_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'ODbL-1.0',
    modality: 'tabular' as const,
    quality_score: 0.86,
    ai_description: 'Building footprint polygon data from OpenStreetMap covering 50 major cities with area and height attributes.',
    schema_profile: null,
    suggested_tags: ['geospatial', 'urban-mapping', 'building-detection', 'osm'],
    publisher_idx: 1,
  },
  {
    name: 'PubMed Biomedical Abstracts',
    description: '10 million biomedical abstracts from PubMed with MeSH terms and citation networks.',
    tags: ['nlp', 'medical', 'text', 'biomedical'],
    size_bytes: 12_000_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 60_000_000,
    license: 'CC-BY-4.0',
    modality: 'text' as const,
    quality_score: 0.91,
    ai_description: 'PubMed biomedical abstracts with MeSH headings, citation links, and structured metadata for NLP research.',
    schema_profile: null,
    suggested_tags: ['biomedical-nlp', 'medical-text', 'literature-mining', 'pubmed'],
    publisher_idx: 1,
  },
  {
    name: 'COCO 2017 Keypoints',
    description: '200,000 images with human pose keypoints for action recognition and pose estimation.',
    tags: ['cv', 'pose', 'human', 'detection'],
    size_bytes: 5_200_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 40_000_000,
    license: 'CC-BY-4.0',
    modality: 'image' as const,
    quality_score: 0.90,
    ai_description: 'COCO keypoints dataset with 200K images annotated with 17 human pose keypoints for action recognition.',
    schema_profile: null,
    suggested_tags: ['pose-estimation', 'action-recognition', 'human-pose', 'coco'],
    publisher_idx: 1,
  },
  {
    name: 'Stack Overflow Developer Survey',
    description: 'Annual developer survey data from 90,000+ developers covering tools, languages, and salary data.',
    tags: ['tabular', 'survey', 'developer', 'salary'],
    size_bytes: 45_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'ODbL-1.0',
    modality: 'tabular' as const,
    quality_score: 0.83,
    ai_description: 'Stack Overflow annual developer survey with 90K+ responses covering programming languages, frameworks, tools, and compensation.',
    schema_profile: { modality: 'tabular', format: 'csv', columns: [
      { name: 'respondent_id', inferredType: 'string', nullRate: 0, cardinality: 90000, semanticCategory: 'identifier' },
      { name: 'language', inferredType: 'string', nullRate: 0.05, cardinality: 50, semanticCategory: 'category' },
      { name: 'salary_usd', inferredType: 'float', nullRate: 0.15, cardinality: 5000, semanticCategory: 'numeric' },
    ], estimatedRowCount: 90000 } as SchemaProfile,
    suggested_tags: ['developer-survey', 'salary-data', 'programming-trends', 'survey'],
    publisher_idx: 2,
  },
  {
    name: 'GSM8K Math Word Problems',
    description: '8,500 grade-school math word problems with step-by-step solutions.',
    tags: ['nlp', 'math', 'reasoning', 'education'],
    size_bytes: 12_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'MIT',
    modality: 'text' as const,
    quality_score: 0.95,
    ai_description: 'GSM8K benchmark with 8,500 linguistically diverse grade-school math problems and chain-of-thought solutions.',
    schema_profile: null,
    suggested_tags: ['math-reasoning', 'chain-of-thought', 'benchmark', 'education'],
    publisher_idx: 2,
  },
  {
    name: 'UrbanSound8K Audio',
    description: '8,732 urban sound annotations across 10 classes (sirens, jackhammers, dog barks, etc).',
    tags: ['audio', 'urban', 'classification', 'environmental'],
    size_bytes: 3_100_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 25_000_000,
    license: 'CC-BY-4.0',
    modality: 'audio' as const,
    quality_score: 0.81,
    ai_description: 'UrbanSound8K dataset with 8,732 annotated urban audio clips across 10 environmental sound classes.',
    schema_profile: null,
    suggested_tags: ['urban-sounds', 'audio-classification', 'environmental-sound', 'acoustics'],
    publisher_idx: 2,
  },
  {
    name: 'IMDB Movie Reviews Sentiment',
    description: '50,000 movie reviews labeled for sentiment analysis with balanced positive/negative classes.',
    tags: ['nlp', 'sentiment', 'text', 'movie'],
    size_bytes: 84_000_000,
    access_type: 'free' as const,
    price_per_access: null,
    license: 'Apache-2.0',
    modality: 'text' as const,
    quality_score: 0.85,
    ai_description: 'IMDB movie review corpus with 50K labeled reviews for binary sentiment classification, balanced across classes.',
    schema_profile: null,
    suggested_tags: ['sentiment-analysis', 'movie-reviews', 'text-classification', 'nlp-benchmark'],
    publisher_idx: 0,
  },
  {
    name: 'Waymo Open Motion Dataset',
    description: '1 million traffic scenes with LiDAR, camera, and map data for autonomous driving research.',
    tags: ['cv', 'autonomous', 'lidar', 'driving'],
    size_bytes: 180_000_000_000,
    access_type: 'pay_per_access' as const,
    price_per_access: 250_000_000,
    license: 'Waymo Open Dataset License',
    modality: 'multimodal' as const,
    quality_score: 0.96,
    ai_description: 'Waymo Open Motion Dataset with 1M driving scenes including LiDAR point clouds, camera images, and HD maps.',
    schema_profile: null,
    suggested_tags: ['autonomous-driving', 'lidar', 'motion-prediction', 'waymo'],
    publisher_idx: 1,
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
      // Clear existing data and re-seed with correct publisher
      await db.execute(sql`DELETE FROM datasets`);
      await db.execute(sql`DELETE FROM publishers`);
    }

    // Fix schema mismatches on older Render databases
    await db.execute(sql`ALTER TABLE datasets ALTER COLUMN size_bytes TYPE bigint`);
    await db.execute(sql`ALTER TABLE datasets ALTER COLUMN price_per_access TYPE bigint`);
    await db.execute(sql`ALTER TABLE publishers ALTER COLUMN total_earnings TYPE bigint`);

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
      // Demo publishers 1 & 2 use placeholder addresses (e.g. 0x2b3c... /
      // 0x3c4d..., 42 chars) that are NOT valid Aptos accounts. Passing one to
      // platform::pay_with_fee makes Petra fail simulation with "Hex string is
      // too short" and blocks marketplace payments, so every seeded dataset is
      // published under the admin wallet instead.
      const publisher = { ...DEMO_PUBLISHERS[ds.publisher_idx]!, address: ADMIN_WALLET };
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
          // No real on-chain transaction exists for seeded demo datasets.
          txHash: null,
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

    // All datasets are published under the admin wallet; the decorative demo
    // profiles (DataForge, OpenData Collective) keep a 0 dataset count.
    await db
      .update(publishers)
      .set({ totalDatasets: DEMO_DATASETS.length })
      .where(sql`${publishers.address} = ${ADMIN_WALLET}`);
    await db
      .update(publishers)
      .set({ totalDatasets: 0 })
      .where(sql`${publishers.address} <> ${ADMIN_WALLET}`);

    // Seed the community blog posts (idempotent by slug) so the Community
    // page shows real data the admin can edit/delete from the UI.
    const seededPosts = await seedCommunityPosts(db, ADMIN_WALLET);

    res.json({
      message: `Seeded ${DEMO_DATASETS.length} datasets across ${DEMO_PUBLISHERS.length} publishers and ${seededPosts} community posts.`,
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
