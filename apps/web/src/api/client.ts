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
  const attempt = (): Promise<Response> => fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  let res: Response;
  try {
    res = await attempt();
  } catch (networkError) {
    // Transient network failures (Render free-tier cold start after idle,
    // DNS blips, deploy restarts) surface as TypeError / ERR_NAME_NOT_RESOLVED.
    // Retry once after a short pause before surfacing "Failed to fetch".
    await new Promise((resolve) => setTimeout(resolve, 2500));
    res = await attempt();
  }

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
    // Nullable: only ever a REAL Aptos tx hash; null means no on-chain tx.
    tx_hash: string | null;
    version: number;
    shelby_receipt: unknown;
    metadata: unknown;
    blockchain_status: string | null;
    blockchain_error: string | null;
    blockchain_submitted_at: string | null;
    blockchain_confirmed_at: string | null;
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

export interface OnChainActionResult {
  datasetId: number;
  txHash: string;
  accessor?: string;
}

// Publisher on-chain actions are signed SERVER-SIDE with the platform account
// (SHELBY_SIGNER_PRIVATE_KEY), so they land on the configured Aptos network
// even when the browser wallet is on a different network.
export async function grantDatasetAccess(
  datasetId: number,
  accessor: string,
  durationSeconds: number,
  callerAddress: string,
): Promise<OnChainActionResult> {
  return request<OnChainActionResult>(`/api/datasets/${datasetId}/grant-access`, {
    method: 'POST',
    body: JSON.stringify({ accessor, callerAddress, durationSeconds }),
  });
}

export async function revokeDatasetAccess(
  datasetId: number,
  accessor: string,
  callerAddress: string,
): Promise<OnChainActionResult> {
  return request<OnChainActionResult>(`/api/datasets/${datasetId}/revoke-access`, {
    method: 'POST',
    body: JSON.stringify({ accessor, callerAddress }),
  });
}

export async function registerDatasetOwnership(
  datasetId: number,
  callerAddress: string,
): Promise<OnChainActionResult> {
  return request<OnChainActionResult>(`/api/datasets/${datasetId}/register-ownership`, {
    method: 'POST',
    body: JSON.stringify({ callerAddress }),
  });
}

export async function transferDatasetOwnership(
  datasetId: number,
  newOwner: string,
  callerAddress: string,
): Promise<OnChainActionResult> {
  return request<OnChainActionResult>(`/api/datasets/${datasetId}/transfer-ownership`, {
    method: 'POST',
    body: JSON.stringify({ newOwner, callerAddress }),
  });
}

// ─── Community (blog) ────────────────────────────────────────────────────────

export interface CommunityPost {
  author_address: string;
  author_username: string | null;
  category: string;
  comment_count: number;
  content?: string;
  created_at: string;
  excerpt: string | null;
  featured: boolean;
  id: number;
  like_count: number;
  published_at: string | null;
  slug: string;
  title: string;
  updated_at?: string;
}

export interface CommunityComment {
  author_address: string | null;
  content: string;
  created_at: string;
  display_name: string | null;
  id: number;
  post_id: number;
}

export interface CommunityPostDetail {
  comments: CommunityComment[];
  liked_by_viewer: boolean;
  post: CommunityPost;
}

export interface CommunityPostPayload {
  category: string;
  content: string;
  excerpt?: string | null;
  featured?: boolean;
  slug?: string;
  title: string;
}

// The API can return rows in either snake_case (GET projections) or camelCase
// (Drizzle .returning() on writes). Normalize both to the typed shape so the
// UI never crashes on undefined fields.
function normalizeCommunityPost(raw: Record<string, unknown>): CommunityPost {
  const post: CommunityPost = {
    author_address: String(raw.author_address ?? raw.authorAddress ?? ''),
    author_username: raw.author_username != null ? String(raw.author_username) : null,
    category: String(raw.category ?? ''),
    comment_count: Number(raw.comment_count ?? raw.commentCount ?? 0),
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    excerpt: raw.excerpt != null ? String(raw.excerpt) : null,
    featured: Boolean(raw.featured),
    id: Number(raw.id),
    like_count: Number(raw.like_count ?? raw.likeCount ?? 0),
    published_at: raw.published_at != null
      ? String(raw.published_at)
      : raw.publishedAt != null
        ? String(raw.publishedAt)
        : null,
    slug: String(raw.slug ?? ''),
    title: String(raw.title ?? ''),
  };
  if (raw.content != null) {
    post.content = String(raw.content);
  }
  if (raw.updated_at != null) {
    post.updated_at = String(raw.updated_at);
  } else if (raw.updatedAt != null) {
    post.updated_at = String(raw.updatedAt);
  }
  return post;
}

function normalizeCommunityComment(raw: Record<string, unknown>): CommunityComment {
  return {
    author_address: raw.author_address != null
      ? String(raw.author_address)
      : raw.authorAddress != null
        ? String(raw.authorAddress)
        : null,
    content: String(raw.content ?? ''),
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    display_name: raw.display_name != null
      ? String(raw.display_name)
      : raw.displayName != null
        ? String(raw.displayName)
        : null,
    id: Number(raw.id),
    post_id: Number(raw.post_id ?? raw.postId),
  };
}

export async function getCommunityPosts(
  category?: string,
): Promise<{ items: CommunityPost[]; totalItems: number }> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const data = await request<{ items: Record<string, unknown>[]; totalItems: number }>(`/api/community/posts${query}`);
  return { items: data.items.map(normalizeCommunityPost), totalItems: data.totalItems };
}

export async function getCommunityPost(
  slug: string,
  viewer?: string | null,
): Promise<CommunityPostDetail> {
  const query = viewer ? `?viewer=${encodeURIComponent(viewer)}` : '';
  const data = await request<{
    comments: Record<string, unknown>[];
    liked_by_viewer: boolean;
    post: Record<string, unknown>;
  }>(`/api/community/posts/${encodeURIComponent(slug)}${query}`);
  return {
    comments: data.comments.map(normalizeCommunityComment),
    liked_by_viewer: Boolean(data.liked_by_viewer),
    post: normalizeCommunityPost(data.post),
  };
}

export async function createCommunityPost(
  payload: CommunityPostPayload,
): Promise<{ post: CommunityPost }> {
  const data = await request<{ post: Record<string, unknown> }>('/api/community/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { post: normalizeCommunityPost(data.post) };
}

export async function updateCommunityPost(
  slug: string,
  payload: Partial<CommunityPostPayload>,
): Promise<{ post: CommunityPost }> {
  const data = await request<{ post: Record<string, unknown> }>(`/api/community/posts/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return { post: normalizeCommunityPost(data.post) };
}

export async function deleteCommunityPost(slug: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/community/posts/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
}

export async function addCommunityComment(
  postId: number,
  content: string,
  displayName?: string | null,
  address?: string | null,
): Promise<{ comment: CommunityComment }> {
  const body: Record<string, unknown> = { content };
  if (displayName !== undefined && displayName !== null && displayName.trim().length > 0) {
    body.displayName = displayName.trim();
  }
  if (address !== undefined && address !== null && address.trim().length > 0) {
    body.address = address.trim();
  }
  const data = await request<{ comment: Record<string, unknown> }>(`/api/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { comment: normalizeCommunityComment(data.comment) };
}

export async function deleteCommunityComment(commentId: number): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/community/comments/${commentId}`, {
    method: 'DELETE',
  });
}

export async function toggleCommunityLike(
  postId: number,
  likerId: string,
  address?: string | null,
): Promise<{ liked: boolean; likeCount: number }> {
  const body: Record<string, unknown> = { likerId };
  if (address !== undefined && address !== null && address.trim().length > 0) {
    body.address = address.trim();
  }
  return request<{ liked: boolean; likeCount: number }>(`/api/community/posts/${postId}/like`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
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
