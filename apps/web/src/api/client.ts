import type {
  APIResponse,
  AccessSession,
  Dataset,
  DatasetTag,
  DatasetVersion,
  Publisher,
} from '@verida/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const body = (await res.json()) as APIResponse<T>;

  if (!body.success) {
    throw new ApiError(
      body.error.code,
      body.error.error,
      body.error.details,
    );
  }

  return body.data;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  totalItems: number;
  totalPages: number;
}

export interface DatasetDetailResponse {
  dataset: Dataset;
  versions: DatasetVersion[];
  provenance_chain: {
    id: number;
    dataset_id: number;
    event_type: string;
    actor_address: string;
    timestamp: string;
    tx_hash: string;
    version: number;
    shelby_receipt: unknown;
    metadata: unknown;
  }[];
}

export interface PublisherResponse {
  publisher: Publisher;
  datasets: Dataset[];
}

export interface UploadResponse {
  jobId: string;
  dataset?: {
    id: number;
    shelby_blob_id: string;
    name: string;
    description: string;
    tags: string[];
    size_bytes: number;
    version: number;
    publisher_address: string;
    created_at: string;
    access_type: string;
    price_per_access: number | null;
    license: string;
    provenance_receipt: { txHash?: string } | null;
    merkle_root: string;
    verified: boolean | null;
    tampered: boolean;
  };
}

export interface AccessSessionResponse {
  sessionId: string;
  expiresAt: number;
}

export async function listDatasets(params?: {
  page?: number;
  limit?: number;
  tag?: DatasetTag;
  tags?: string[];
  publisher?: string;
  license?: string;
  search?: string;
  accessType?: string;
  sort?: string;
}): Promise<PaginatedResponse<Dataset>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.tags?.length) qs.set('tags', params.tags.join(','));
  if (params?.publisher) qs.set('publisher', params.publisher);
  if (params?.license) qs.set('license', params.license);
  if (params?.search) qs.set('search', params.search);
  if (params?.accessType) qs.set('accessType', params.accessType);
  if (params?.sort) qs.set('sort', params.sort);
  return request<PaginatedResponse<Dataset>>(`/api/datasets?${qs}`);
}

export async function getDataset(id: number): Promise<DatasetDetailResponse> {
  return request<DatasetDetailResponse>(`/api/datasets/${id}`);
}

export async function createAccessSession(
  datasetId: number,
  payerAddress: string,
): Promise<AccessSessionResponse> {
  return request<AccessSessionResponse>(`/api/datasets/${datasetId}/access`, {
    method: 'POST',
    body: JSON.stringify({ payerAddress }),
  });
}

export async function verifyDataset(id: number): Promise<{ jobId: string }> {
  return request<{ jobId: string }>(`/api/datasets/${id}/verify`, {
    method: 'POST',
  });
}

export async function getPublisher(
  address: string,
): Promise<PublisherResponse> {
  return request<PublisherResponse>(`/api/publishers/${address}`);
}

export async function uploadDataset(formData: FormData): Promise<UploadResponse> {
  const res = await fetch(`${API_BASE}/api/datasets/upload`, {
    method: 'POST',
    body: formData,
  });

  const body = (await res.json()) as APIResponse<UploadResponse>;

  if (!body.success) {
    throw new ApiError(body.error.code, body.error.error, body.error.details);
  }

  return body.data;
}

export function getStreamUrl(datasetId: number, sessionId: string): string {
  return `${API_BASE}/api/datasets/${datasetId}/stream?sessionId=${encodeURIComponent(sessionId)}`;
}

export interface StatsResponse {
  totalDatasets: number;
  totalAccesses: number;
  verified: number;
  shelbySize: number;
  latency: number;
  uptime: number;
}

export async function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/api/stats/live');
}
