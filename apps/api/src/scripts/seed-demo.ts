import { db } from '../lib/db/index.js';
import { datasets, publishers } from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';
import type { AccessType, DatasetModality, SchemaProfile } from '@verida/shared';
import { seedCommunityPosts } from '../lib/community/seed.js';

const ADMIN_WALLET = process.env.VITE_MARKETPLACE_CONTRACT_ADDRESS ?? '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd';

// NOTE: only the admin wallet is a real Aptos account. The other demo
// profiles are decorative; their placeholder addresses (42 chars) are not
// valid accounts and would make Petra fail simulation on payment, so the
// seed loop below always publishes under ADMIN_WALLET.
const DEMO_PUBLISHERS = [
  { address: ADMIN_WALLET, username: 'AI Research Lab', bio: 'Leading AI research organization publishing high-quality training datasets.' },
  { address: ADMIN_WALLET, username: 'DataForge', bio: 'Curating and publishing verified datasets for machine learning.' },
  { address: ADMIN_WALLET, username: 'OpenData Collective', bio: 'Open-source data initiatives for the AI community.' },
];

const DEMO_DATASETS = [
  {
    name: 'ImageNet-21K Subset',
    description: 'A curated subset of ImageNet-21K containing 14,197,122 images across 21,841 classes. Optimized for training vision-language models with balanced class distribution.',
    tags: ['cv', 'vision', 'image', 'classification'],
    size_bytes: 47_500_000_000,
    access_type: 'pay_per_access',
    price_per_access: 50_000_000,
    license: 'CC-BY-4.0',
    modality: 'image',
    quality_score: 0.94,
    ai_description: 'This dataset contains a large-scale image classification benchmark with over 14 million images spanning 21,841 categories. The data is well-curated with balanced class distribution, making it suitable for training deep vision models. Images are high-resolution with diverse lighting conditions and backgrounds.',
    schema_profile: null,
    suggested_tags: ['computer-vision', 'image-classification', 'deep-learning', 'benchmark'],
    publisher_idx: 0,
  },
  {
    name: 'Common Crawl filtered NLP corpus',
    description: 'Filtered and deduplicated text corpus from Common Crawl. 2.1TB of high-quality web text suitable for pre-training large language models.',
    tags: ['nlp', 'text', 'language', 'pretraining'],
    size_bytes: 2_100_000_000_000,
    access_type: 'pay_per_access',
    price_per_access: 80_000_000,
    license: 'CC-BY-4.0',
    modality: 'text',
    quality_score: 0.88,
    ai_description: 'A filtered subset of the Common Crawl corpus containing 2.1TB of web text. The data has been deduplicated, language-filtered, and quality-scored using perplexity filtering. Suitable for pre-training language models with strong performance on downstream tasks.',
    schema_profile: { modality: 'text', format: 'text', columns: [{ name: 'text', inferredType: 'string', nullRate: 0, cardinality: 1000000, semanticCategory: 'text' }], estimatedRowCount: 500000000 },
    suggested_tags: ['language-model', 'pretraining', 'web-text', 'corpus'],
    publisher_idx: 1,
  },
  {
    name: 'Medical Imaging X-Ray Dataset',
    description: '56,000 chest X-ray images with diagnostic labels from 14 disease categories. Includes metadata for patient demographics and imaging parameters.',
    tags: ['medical', 'imaging', 'healthcare', 'radiology'],
    size_bytes: 12_800_000_000,
    access_type: 'pay_per_access',
    price_per_access: 150_000_000,
    license: 'CC-BY-NC-4.0',
    modality: 'image',
    quality_score: 0.91,
    ai_description: 'A comprehensive chest X-ray dataset with 56,000 images labeled across 14 diagnostic categories. Each image includes detailed annotations from board-certified radiologists. The dataset is suitable for training automated diagnostic systems and medical imaging research.',
    schema_profile: null,
    suggested_tags: ['medical-imaging', 'radiology', 'diagnosis', 'healthcare-ai'],
    publisher_idx: 0,
  },
  {
    name: 'Financial Time Series - Market Data',
    description: 'Real-time and historical market data for 5,000+ stocks, ETFs, and commodities. 10 years of OHLCV data with technical indicators.',
    tags: ['financial', 'time-series', 'stocks', 'trading'],
    size_bytes: 890_000_000,
    access_type: 'pay_per_access',
    price_per_access: 30_000_000,
    license: 'Proprietary',
    modality: 'tabular',
    quality_score: 0.87,
    ai_description: 'Comprehensive financial market dataset covering 5,000+ instruments with 10 years of daily OHLCV data. Includes computed technical indicators (RSI, MACD, Bollinger Bands) and fundamental data. Suitable for quantitative trading strategy development and financial modeling.',
    schema_profile: { modality: 'tabular', format: 'csv', columns: [
      { name: 'timestamp', inferredType: 'datetime', nullRate: 0, cardinality: 2500, semanticCategory: 'datetime' },
      { name: 'symbol', inferredType: 'string', nullRate: 0, cardinality: 5000, semanticCategory: 'identifier' },
      { name: 'open', inferredType: 'float', nullRate: 0, cardinality: 50000, semanticCategory: 'numeric' },
      { name: 'high', inferredType: 'float', nullRate: 0, cardinality: 50000, semanticCategory: 'numeric' },
      { name: 'low', inferredType: 'float', nullRate: 0, cardinality: 50000, semanticCategory: 'numeric' },
      { name: 'close', inferredType: 'float', nullRate: 0, cardinality: 50000, semanticCategory: 'numeric' },
      { name: 'volume', inferredType: 'integer', nullRate: 0, cardinality: 100000, semanticCategory: 'numeric' },
    ], estimatedRowCount: 12500000 },
    suggested_tags: ['quantitative-finance', 'time-series', 'market-analysis', 'trading'],
    publisher_idx: 1,
  },
  {
    name: 'Speech Commands v3',
    description: '305,000 audio clips of 35 common speech commands. Recorded by 2,000+ speakers across diverse accents and environments.',
    tags: ['audio', 'speech', 'recognition', 'commands'],
    size_bytes: 4_200_000_000,
    access_type: 'free',
    price_per_access: null,
    license: 'CC-BY-4.0',
    modality: 'audio',
    quality_score: 0.85,
    ai_description: 'A large-scale speech command dataset with 305,000 one-second audio clips covering 35 common commands. The data is collected from diverse speakers with varying accents, recording environments, and audio quality. Suitable for training keyword spotting and voice assistant systems.',
    schema_profile: null,
    suggested_tags: ['speech-recognition', 'keyword-spotting', 'voice-assistant', 'audio-classification'],
    publisher_idx: 2,
  },
  {
    name: 'CodeContests+ Training Data',
    description: '150,000 competitive programming problems with solutions in Python, C++, and Java. Includes difficulty ratings, test cases, and editorial explanations.',
    tags: ['code', 'programming', 'algorithms', 'competitive'],
    size_bytes: 2_800_000_000,
    access_type: 'pay_per_access',
    price_per_access: 20_000_000,
    license: 'MIT',
    modality: 'text',
    quality_score: 0.92,
    ai_description: 'A curated dataset of 150,000 competitive programming problems with verified solutions in multiple languages. Each problem includes test cases, difficulty ratings, and editorial explanations. Ideal for training code generation models and algorithmic reasoning systems.',
    schema_profile: { modality: 'text', format: 'json', columns: [
      { name: 'problem_id', inferredType: 'string', nullRate: 0, cardinality: 150000, semanticCategory: 'identifier' },
      { name: 'title', inferredType: 'string', nullRate: 0, cardinality: 150000, semanticCategory: 'text' },
      { name: 'description', inferredType: 'string', nullRate: 0, cardinality: 150000, semanticCategory: 'text' },
      { name: 'difficulty', inferredType: 'string', nullRate: 0, cardinality: 5, semanticCategory: 'category' },
      { name: 'solution_python', inferredType: 'string', nullRate: 0.1, cardinality: 150000, semanticCategory: 'code' },
    ], estimatedRowCount: 150000 },
    suggested_tags: ['code-generation', 'algorithmic-reasoning', 'programming', 'software-engineering'],
    publisher_idx: 2,
  },
  {
    name: 'Satellite Imagery - Urban Segmentation',
    description: '100,000 satellite images with pixel-level semantic segmentation labels for urban scene understanding. 17 object categories.',
    tags: ['cv', 'geospatial', 'segmentation', 'remote-sensing'],
    size_bytes: 67_000_000_000,
    access_type: 'pay_per_access',
    price_per_access: 120_000_000,
    license: 'CC-BY-4.0',
    modality: 'image',
    quality_score: 0.89,
    ai_description: 'High-resolution satellite imagery dataset with pixel-level annotations for urban scene segmentation. Contains 100,000 images covering diverse urban environments across 50 cities worldwide. Labels include 17 categories: roads, buildings, vegetation, water, etc.',
    schema_profile: null,
    suggested_tags: ['remote-sensing', 'semantic-segmentation', 'urban-planning', 'geospatial-ai'],
    publisher_idx: 0,
  },
  {
    name: 'Multimodal Reasoning Benchmark',
    description: '50,000 problems requiring reasoning across text, images, and tables. Designed to evaluate and train multimodal AI systems.',
    tags: ['multimodal', 'reasoning', 'benchmark', 'evaluation'],
    size_bytes: 8_500_000_000,
    access_type: 'free',
    price_per_access: null,
    license: 'CC-BY-4.0',
    modality: 'multimodal',
    quality_score: 0.93,
    ai_description: 'A comprehensive multimodal benchmark with 50,000 problems that require joint reasoning over text, images, and structured tables. Each problem includes detailed explanations and step-by-step solutions. Designed to evaluate the reasoning capabilities of multimodal AI systems.',
    schema_profile: null,
    suggested_tags: ['multimodal-ai', 'reasoning', 'benchmark', 'evaluation'],
    publisher_idx: 1,
  },
  {
    name: 'Synthetic Tabular Data Generator',
    description: '1M rows of synthetic patient data with realistic distributions. Generated using differential privacy for safe sharing.',
    tags: ['tabular', 'synthetic', 'healthcare', 'privacy'],
    size_bytes: 125_000_000,
    access_type: 'free',
    price_per_access: null,
    license: 'CC0-1.0',
    modality: 'tabular',
    quality_score: 0.82,
    ai_description: 'Synthetically generated patient dataset with 1 million records following realistic statistical distributions. Generated using differential privacy guarantees to ensure individual patient privacy. Suitable for developing and testing healthcare analytics without real patient data concerns.',
    schema_profile: { modality: 'tabular', format: 'csv', columns: [
      { name: 'patient_id', inferredType: 'string', nullRate: 0, cardinality: 1000000, semanticCategory: 'identifier' },
      { name: 'age', inferredType: 'integer', nullRate: 0.02, cardinality: 100, semanticCategory: 'numeric' },
      { name: 'gender', inferredType: 'string', nullRate: 0.01, cardinality: 3, semanticCategory: 'category' },
      { name: 'diagnosis_code', inferredType: 'string', nullRate: 0.05, cardinality: 500, semanticCategory: 'category' },
      { name: 'bp_systolic', inferredType: 'float', nullRate: 0.1, cardinality: 200, semanticCategory: 'numeric' },
    ], estimatedRowCount: 1000000 },
    suggested_tags: ['synthetic-data', 'differential-privacy', 'healthcare', 'data-augmentation'],
    publisher_idx: 2,
  },
  {
    name: 'YouTube-8M Lite',
    description: '3.2 million video labels from 4800 classes. Pre-computed visual and audio features for efficient training.',
    tags: ['video', 'cv', 'classification', 'multimodal'],
    size_bytes: 240_000_000_000,
    access_type: 'pay_per_access',
    price_per_access: 200_000_000,
    license: 'CC-BY-4.0',
    modality: 'video',
    quality_score: 0.86,
    ai_description: 'A large-scale video dataset with 3.2 million labels spanning 4,800 action classes. Includes pre-computed visual and audio features for efficient model training. Videos are sourced from YouTube with diverse content types and qualities.',
    schema_profile: null,
    suggested_tags: ['video-classification', 'action-recognition', 'multimodal', 'large-scale'],
    publisher_idx: 0,
  },
  {
    name: 'Legal Contract NER Corpus',
    description: '25,000 annotated legal contracts with named entity recognition labels for 18 entity types including parties, dates, and monetary values.',
    tags: ['nlp', 'legal', 'ner', 'document'],
    size_bytes: 450_000_000,
    access_type: 'pay_per_access',
    price_per_access: 40_000_000,
    license: 'CC-BY-NC-4.0',
    modality: 'text',
    quality_score: 0.90,
    ai_description: 'A specialized NER dataset for legal document processing with 25,000 annotated contracts. Annotations cover 18 entity types critical for contract analysis: parties, dates, monetary values, obligations, clauses, etc. Suitable for training legal AI systems.',
    schema_profile: { modality: 'text', format: 'json', columns: [
      { name: 'contract_id', inferredType: 'string', nullRate: 0, cardinality: 25000, semanticCategory: 'identifier' },
      { name: 'text', inferredType: 'string', nullRate: 0, cardinality: 25000, semanticCategory: 'text' },
      { name: 'entities', inferredType: 'json', nullRate: 0, cardinality: 25000, semanticCategory: 'annotation' },
    ], estimatedRowCount: 25000 },
    suggested_tags: ['legal-ai', 'named-entity-recognition', 'contract-analysis', 'nlp'],
    publisher_idx: 1,
  },
  {
    name: 'Climate Sensor Network Data',
    description: '5 years of hourly climate readings from 2,000 weather stations worldwide. Temperature, humidity, pressure, wind speed, and precipitation.',
    tags: ['climate', 'time-series', 'environmental', 'sensor'],
    size_bytes: 340_000_000,
    access_type: 'free',
    price_per_access: null,
    license: 'CC0-1.0',
    modality: 'tabular',
    quality_score: 0.84,
    ai_description: 'Global climate dataset with 5 years of hourly readings from 2,000 weather stations. Includes temperature, humidity, atmospheric pressure, wind speed, and precipitation measurements. Suitable for climate modeling, weather forecasting, and environmental research.',
    schema_profile: { modality: 'tabular', format: 'csv', columns: [
      { name: 'timestamp', inferredType: 'datetime', nullRate: 0, cardinality: 43800, semanticCategory: 'datetime' },
      { name: 'station_id', inferredType: 'string', nullRate: 0, cardinality: 2000, semanticCategory: 'identifier' },
      { name: 'temperature_c', inferredType: 'float', nullRate: 0.02, cardinality: 500, semanticCategory: 'numeric' },
      { name: 'humidity_pct', inferredType: 'float', nullRate: 0.03, cardinality: 100, semanticCategory: 'numeric' },
      { name: 'pressure_hpa', inferredType: 'float', nullRate: 0.01, cardinality: 200, semanticCategory: 'numeric' },
    ], estimatedRowCount: 87600000 },
    suggested_tags: ['climate-modeling', 'weather-forecasting', 'environmental-ai', 'time-series'],
    publisher_idx: 2,
  },
];

async function seed() {
  console.log('Seeding demo publishers...');
  
  for (const pub of DEMO_PUBLISHERS) {
    await db.insert(publishers).values({
      address: pub.address,
      username: pub.username,
      bio: pub.bio,
      totalDatasets: 0,
      totalEarnings: 0,
    }).onConflictDoNothing();
  }

  console.log('Seeding demo datasets...');
  
  for (let i = 0; i < DEMO_DATASETS.length; i++) {
    const ds = DEMO_DATASETS[i]!;
    const publisher = DEMO_PUBLISHERS[ds.publisher_idx]!;
    
    // Create a deterministic merkle root from the dataset name
    const { createHash } = await import('node:crypto');
    const merkleRoot = createHash('sha256').update(ds.name + i).digest('hex');
    
    // Create a fake Shelby blob ID
    const shelbyBlobId = `${publisher.address}/${ds.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${Date.now()}-${i}`;

    await db.insert(datasets).values({
      shelbyBlobId,
      name: ds.name,
      description: ds.description,
      tags: ds.tags as string[],
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

    console.log(`  ✓ ${ds.name} (${ds.modality}, quality: ${ds.quality_score})`);
  }

  // Update publisher dataset counts
  for (const pub of DEMO_PUBLISHERS) {
    const count = DEMO_DATASETS.filter(d => d.publisher_idx === DEMO_PUBLISHERS.indexOf(pub)).length;
    await db.update(publishers).set({ totalDatasets: count }).where(sql`${publishers.address} = ${pub.address}`);
  }

  // Seed the community blog posts (idempotent by slug).
  const seededPosts = await seedCommunityPosts(db, ADMIN_WALLET);
  if (seededPosts > 0) {
    console.log(`  ✓ ${seededPosts} community posts`);
  }

  console.log(`\nSeeded ${DEMO_DATASETS.length} datasets across ${DEMO_PUBLISHERS.length} publishers.`);
}

seed().catch(console.error);
