// IMPLEMENTER NOTE: Defines the shared Verida AI domain types used by the web and API packages.
// BUILD.md TASK: STEP 1 — Shared Types Package
// ARCHITECT CONTRACT: Dataset, DatasetVersion, ProvenanceReceipt, AccessSession, Publisher, DatasetTag, AccessType, UploadStatus, APIResponse<T>
// SHELBY SDK METHODS: None directly; this file models Shelby receipt and session payloads.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify snake_case DB-shaped fields, enum values, and receipt shape stay stable for later API and UI integration.

export enum DatasetTag {
  AUDIO = 'audio',
  CLIMATE = 'climate',
  EDUCATION = 'education',
  ENERGY = 'energy',
  FINANCE = 'finance',
  GAMING = 'gaming',
  GEOSPATIAL = 'geospatial',
  GOVERNMENT = 'government',
  LEGAL = 'legal',
  MEDICAL = 'medical',
  NLP = 'nlp',
  OTHER = 'other',
  ROBOTICS = 'robotics',
  SCIENCE = 'science',
  SYNTHETIC = 'synthetic',
  TABULAR = 'tabular',
  TIME_SERIES = 'time_series',
  VISION = 'vision',
  WEB = 'web',
}

export enum AccessType {
  FREE = 'free',
  PAY_PER_ACCESS = 'pay_per_access',
  SUBSCRIPTION = 'subscription',
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

export type AccessSessionStatus = 'active' | 'expired' | 'revoked' | 'completed';

export interface ProvenanceReceipt {
  blobId: string;
  merkleRoot: string;
  uploadedAt: number;
  uploaderAddress: string;
  txHash: string;
  size: number;
  chunkCount: number;
}

export type DescribeStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type DatasetModality =
  | 'tabular'
  | 'hierarchical'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'archive'
  | 'other';

export enum DatasetType {
  TABULAR = 'tabular',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  PDF = 'pdf',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  TEXT = 'text',
  UNKNOWN = 'unknown',
}

export interface DatasetProfile {
  title: string;
  description: string;
  modality: DatasetModality;
  datasetType: DatasetType;
  tags: string[];
  metadata: Record<string, unknown>;
  schema?: SchemaProfile;
}

export interface DistributionStats {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  [key: string]: number | undefined;
}

export interface ColumnProfile {
  name: string;
  inferredType: string;
  nullRate: number;
  cardinality: number;
  sampleValues: string[];
  semanticCategory?: string;
  distributionStats?: DistributionStats;
}

export interface SchemaProfile {
  modality: DatasetModality;
  format?: string;
  estimatedRowCount?: number;
  estimatedTokenCount?: number;
  columns?: ColumnProfile[];
  qualitySignals?: Record<string, unknown>;
  sampledRows?: number;
  language?: string;
  topNgrams?: string[];
  avgSentenceLength?: number;
  lexicalDiversity?: number;
  [key: string]: unknown;
}

export interface QualityBreakdown {
  completeness: number;
  consistency: number;
  uniqueness: number;
  validity: number;
  timeliness: number;
  coverage: number;
}

export interface Dataset {
  id: number;
  shelby_blob_id: string;
  name: string;
  description: string;
  tags: DatasetTag[];
  size_bytes: number;
  version: number;
  publisher_address: string;
  created_at: string;
  access_type: AccessType;
  price_per_access: number | null;
  license: string;
  provenance_receipt: ProvenanceReceipt;
  merkle_root: string;
  verified: boolean | null;
  tampered: boolean;
  access_count: number;
  download_count: number;
  unique_accessors: number;
  schema_profile: SchemaProfile | null;
  ai_description: string | null;
  suggested_tags: string[] | null;
  describe_status: DescribeStatus | null;
  described_at: string | null;
  modality: DatasetModality | null;
  estimated_row_count: number | null;
  quality_score: number | null;
  quality_breakdown: QualityBreakdown | null;
  quality_scored_at: string | null;
  embedded_at: string | null;
  on_chain_dataset_id: number | null;
  on_chain_owner_verified: boolean | null;
}

export interface DatasetVersion {
  id: number;
  dataset_id: number;
  version: number;
  shelby_blob_id: string;
  changelog: string | null;
  created_at: string;
  merkle_root: string;
  size_bytes: number;
}

export interface AccessSession {
  id: number;
  dataset_id: number;
  accessor_address: string;
  session_id: string;
  created_at: string;
  expires_at: string;
  bytes_consumed: number;
  status: AccessSessionStatus;
}

export interface Publisher {
  address: string;
  username: string | null;
  bio: string | null;
  total_datasets: number;
  total_earnings: number;
  verified: boolean;
  created_at: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export type APIResponse<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: ApiError;
    };
