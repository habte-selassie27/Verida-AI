import type {
  APIResponse,
  AccessSession,
  Dataset,
  DatasetTag,
  DatasetVersion,
  Publisher,
} from '@verida/shared';

export type { Dataset } from '@verida/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'verida_auth_token';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

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
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
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

export interface SimilarDataset {
  id: number;
  name: string;
  ai_description: string | null;
  modality: string | null;
  price_per_access: number | null;
  quality_score: number | null;
  size_bytes: number;
  suggested_tags: string[];
  tags: string[];
  similarity?: number;
}

export async function getSimilarDatasets(id: number, limit = 6): Promise<SimilarDataset[]> {
  const res = await request<{
    data: { results: SimilarDataset[]; sourceDatasetId: number; sourceModality: string | null };
  }>(`/api/datasets/${id}/similar?limit=${limit}`);
  return res.data.results;
}

export async function createAccessSession(
  datasetId: number,
  payerAddress: string,
  txHash?: string,
): Promise<AccessSessionResponse> {
  return request<AccessSessionResponse>(`/api/datasets/${datasetId}/access`, {
    method: 'POST',
    body: JSON.stringify({ payerAddress, txHash }),
  });
}

export interface DatasetAccessStatus {
  hasAccess: boolean;
  session: { sessionId: string; expiresAt: number } | null;
}

export interface DatasetPreview {
  previewable: boolean;
  format: string | null;
  columns: string[];
  rows: (string | null)[][];
}

export async function getDatasetPreview(id: number): Promise<DatasetPreview> {
  // No auth needed — the preview is a tiny sample (first 5 rows) of the blob,
  // shown publicly like any marketplace. Non-tabular datasets return
  // previewable:false and the UI hides the table.
  return request<DatasetPreview>(`/api/datasets/${id}/preview`);
}

export async function checkDatasetAccess(datasetId: number, wallet?: string): Promise<DatasetAccessStatus> {
  // With a wallet address the check works WITHOUT a login (identity is the
  // public wallet address). Without it, the JWT is used and the active session
  // id is included when one exists.
  const qs = wallet ? `?wallet=${encodeURIComponent(wallet)}` : '';
  return request<DatasetAccessStatus>(`/api/datasets/${datasetId}/access${qs}`);
}

export async function checkDatasetAccessBatch(
  datasetIds: number[],
  wallet?: string,
): Promise<Record<number, { active: boolean; hasAccess: boolean }>> {
  const data = await request<{ access: Record<number, { active: boolean; hasAccess: boolean }> }>(
    '/api/access/check',
    {
      method: 'POST',
      body: JSON.stringify({
        datasetIds,
        ...(wallet ? { walletAddress: wallet } : {}),
      }),
    },
  );
  return data.access;
}

export async function verifyDataset(id: number): Promise<{ jobId: string }> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/datasets/${id}/verify`, {
    method: 'POST',
    headers,
  });

  const body = (await res.json()) as APIResponse<{ jobId: string }>;

  if (!body.success) {
    throw new ApiError(body.error.code, body.error.error, body.error.details);
  }

  return body.data;
}

export async function getPublisher(
  address: string,
): Promise<PublisherResponse> {
  return request<PublisherResponse>(`/api/publishers/${address}`);
}

export async function uploadDataset(formData: FormData, jobId?: string): Promise<UploadResponse> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = jobId
    ? `${API_BASE}/api/datasets/upload?jobId=${encodeURIComponent(jobId)}`
    : `${API_BASE}/api/datasets/upload`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const body = (await res.json()) as APIResponse<UploadResponse>;

  if (!body.success) {
    throw new ApiError(body.error.code, body.error.error, body.error.details);
  }

  return body.data;
}

export async function addDatasetVersion(
  datasetId: number,
  formData: FormData,
  jobId?: string,
): Promise<UploadResponse> {
  // The upload endpoint treats parentDatasetId as a signal to attach the blob
  // to an existing dataset as its next version instead of creating a new one.
  formData.append('parentDatasetId', String(datasetId));
  return uploadDataset(formData, jobId);
}

export function getStreamUrl(datasetId: number, sessionId: string): string {
  return `${API_BASE}/api/datasets/${datasetId}/stream?sessionId=${encodeURIComponent(sessionId)}`;
}

export interface EscrowEntry {
  id: number;
  onChainEscrowId: number | null;
  buyerAddress: string;
  publisherAddress: string;
  datasetId: number | null;
  amountOctas: number;
  status: 'pending' | 'released' | 'disputed' | 'refunded';
  createdAt: string;
  resolvedAt: string | null;
  disputeReason: string | null;
}

export async function createEscrowEntry(
  datasetId: number,
  amountOctas: number,
  onChainEscrowId?: number,
): Promise<EscrowEntry> {
  return request<EscrowEntry>('/api/escrow/create', {
    method: 'POST',
    body: JSON.stringify({
      amountOctas,
      datasetId,
      ...(onChainEscrowId !== undefined ? { onChainEscrowId } : {}),
    }),
  });
}

export async function updateEscrowStatus(
  escrowId: number,
  status: 'released' | 'disputed',
  txHash?: string,
): Promise<{ escrowId: number; onChainEscrowId: number | null; status: string; resolvedAt: string }> {
  return request(`/api/escrow/${escrowId}/status`, {
    method: 'POST',
    body: JSON.stringify({
      status,
      ...(txHash ? { txHash } : {}),
    }),
  });
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

export async function updatePublisherProfile(data: {
  bio?: string | null;
  username?: string | null;
}): Promise<Publisher> {
  return request<Publisher>('/api/publishers/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getAptPrice(): Promise<number> {
  const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
  const res = await fetch(`${BASE}/api/price/apt`);
  const json = await res.json() as { data?: { price?: number }; success?: boolean };
  if (!res.ok || !json.success || typeof json.data?.price !== 'number') {
    throw new Error(json.success === false ? 'Price API unavailable' : 'Failed to fetch APT price');
  }
  return json.data.price;
}
