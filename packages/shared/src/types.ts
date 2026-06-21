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
