// IMPLEMENTER NOTE: Implements dataset upload, listing, detail, integrity verification, and streaming endpoints.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: /api/datasets upload/list/detail/verify/stream contracts with BullMQ and Shelby integration
// SHELBY SDK METHODS: validateSession, streamDataset
// DB TABLES: datasets, dataset_versions, provenance_chain, access_sessions
// HANDOFF TO TESTER: Validate POST/GET route schemas, queue job payloads, stream session enforcement order, and bytes_consumed updates.

import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import { AccessType, DatasetTag } from '@verida/shared';
import { z } from 'zod';

import { db, accessSessions, datasets, datasetVersions, provenanceChain, publishers } from '../lib/db/index.js';
import {
  UploadJobTypes,
  UploadDatasetQueue,
  VerifyIntegrityQueue,
  type UploadDatasetJobData,
  type UploadDatasetMetadata,
  type VerifyIntegrityJobData,
} from '../lib/queue/queue.js';
import { ShelbyAccessError, streamDataset, validateSession } from '../lib/shelby/index.js';
import { getAuthenticatedAddress, requireAuth } from '../middleware/auth.js';
import { streamRateLimit, uploadRateLimit } from '../middleware/rateLimit.js';

function escapeLikeWildcards(input: string): string {
  return input.replace(/[%_]/g, (char) => `\\${char}`);
}

type QueryValue = string | string[] | undefined;

interface ApiRouteErrorShape {
  code: string;
  details?: Record<string, unknown>;
  message: string;
  statusCode: number;
}

class ApiRouteError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;
  public readonly statusCode: number;

  constructor(input: ApiRouteErrorShape) {
    super(input.message);
    this.name = 'ApiRouteError';
    this.statusCode = input.statusCode;
    this.code = input.code;
    this.details = input.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface UploadBodyInput {
  accessType: AccessType;
  blobName: string | undefined;
  description: string;
  expirationMicros: number | undefined;
  license: string;
  name: string;
  pricePerAccess: number | null | undefined;
  publisherAddress: string;
  tags: DatasetTag[];
  version: number | undefined;
}

const SESSION_HEADER_NAME = 'x-session-id';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const datasetIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  accessType: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  license: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  publisher: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.string().trim().min(1).optional(),
  tag: z.nativeEnum(DatasetTag).optional(),
  tags: z.string().trim().optional(),
});

const uploadBodySchema = z
  .object({
    accessType: z.nativeEnum(AccessType),
    blobName: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1),
    expirationMicros: z.coerce.number().int().positive().optional(),
    license: z.string().trim().min(1),
    name: z.string().trim().min(3),
    pricePerAccess: z.coerce.number().int().nonnegative().nullable().optional(),
    publisherAddress: z.string().trim().min(1),
    tags: z.array(z.nativeEnum(DatasetTag)).min(1),
    version: z.coerce.number().int().positive().optional(),
  })
  .superRefine((value, context) => {
    if (value.accessType === AccessType.PAY_PER_ACCESS && value.pricePerAccess === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pricePerAccess is required when accessType is pay_per_access.',
        path: ['pricePerAccess'],
      });
    }
  });

function getSingleValue(raw: QueryValue): string | undefined {
  if (Array.isArray(raw)) {
    return raw.at(0);
  }

  return raw;
}

function parseRouteDatasetId(request: Request): number {
  const parsed = datasetIdParamSchema.safeParse({
    id: request.params.id,
  });

  if (!parsed.success) {
    throw new ApiRouteError({
      code: 'INVALID_DATASET_ID',
      details: {
        issues: parsed.error.issues,
      },
      message: 'Dataset id must be a positive integer.',
      statusCode: 400,
    });
  }

  return parsed.data.id;
}

function parseListQuery(request: Request): z.infer<typeof listQuerySchema> {
  const parsed = listQuerySchema.safeParse({
    limit: getSingleValue(request.query.limit as QueryValue),
    license: getSingleValue(request.query.license as QueryValue),
    page: getSingleValue(request.query.page as QueryValue),
    publisher: getSingleValue(request.query.publisher as QueryValue),
    tag: getSingleValue(request.query.tag as QueryValue),
  });

  if (!parsed.success) {
    throw new ApiRouteError({
      code: 'INVALID_QUERY',
      details: {
        issues: parsed.error.issues,
      },
      message: 'Dataset list query parameters are invalid.',
      statusCode: 400,
    });
  }

  return parsed.data;
}

function normalizeStringField(input: unknown): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }

  const normalized = input.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseTagsInput(input: unknown): DatasetTag[] {
  const allowedTags = new Set<string>(Object.values(DatasetTag));

  if (Array.isArray(input)) {
    const tags = input
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);

    const invalidTag = tags.find((tag) => !allowedTags.has(tag));
    if (invalidTag !== undefined) {
      throw new ApiRouteError({
        code: 'INVALID_TAG',
        details: {
          tag: invalidTag,
        },
        message: `Unsupported dataset tag: ${invalidTag}.`,
        statusCode: 400,
      });
    }

    return tags as DatasetTag[];
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return [];
    }

    const parsedJson = (() => {
      if (!(trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return null;
      }

      try {
        return JSON.parse(trimmed) as unknown;
      } catch {
        return null;
      }
    })();

    if (Array.isArray(parsedJson)) {
      return parseTagsInput(parsedJson);
    }

    return parseTagsInput(trimmed.split(','));
  }

  return [];
}

function parseOptionalInteger(input: unknown): number | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }

  if (typeof input === 'number' && Number.isInteger(input)) {
    return input;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    const value = Number.parseInt(trimmed, 10);
    return Number.isFinite(value) ? value : undefined;
  }

  return undefined;
}

function parseUploadBody(request: Request): UploadBodyInput {
  const rawBody = request.body as Record<string, unknown>;
  const normalizedInput = {
    accessType:
      normalizeStringField(rawBody.accessType) ??
      normalizeStringField(rawBody.access_type) ??
      '',
    blobName: normalizeStringField(rawBody.blobName) ?? normalizeStringField(rawBody.blob_name),
    description: normalizeStringField(rawBody.description) ?? '',
    expirationMicros: parseOptionalInteger(rawBody.expirationMicros ?? rawBody.expiration_micros),
    license: normalizeStringField(rawBody.license) ?? '',
    name: normalizeStringField(rawBody.name) ?? '',
    pricePerAccess: parseOptionalInteger(rawBody.pricePerAccess ?? rawBody.price_per_access),
    publisherAddress:
      normalizeStringField(rawBody.publisherAddress) ??
      normalizeStringField(rawBody.publisher_address) ??
      '',
    tags: parseTagsInput(rawBody.tags),
    version: parseOptionalInteger(rawBody.version),
  };
  const parsed = uploadBodySchema.safeParse(normalizedInput);

  if (!parsed.success) {
    throw new ApiRouteError({
      code: 'INVALID_UPLOAD_METADATA',
      details: {
        issues: parsed.error.issues,
      },
      message: 'Upload metadata is invalid.',
      statusCode: 400,
    });
  }

  return {
    accessType: parsed.data.accessType,
    blobName: parsed.data.blobName,
    description: parsed.data.description,
    expirationMicros: parsed.data.expirationMicros,
    license: parsed.data.license,
    name: parsed.data.name,
    pricePerAccess: parsed.data.pricePerAccess,
    publisherAddress: parsed.data.publisherAddress,
    tags: parsed.data.tags,
    version: parsed.data.version,
  };
}

async function computeFileContentHash(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const fileStream = createReadStream(filePath);

  for await (const chunk of fileStream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

function createUploadMetadataFromBody(input: UploadBodyInput): UploadDatasetMetadata {
  const metadata: UploadDatasetMetadata = {
    accessType: input.accessType,
    description: input.description,
    license: input.license,
    name: input.name,
    tags: input.tags,
  };

  if (input.blobName !== undefined) {
    metadata.blobName = input.blobName;
  }

  if (input.expirationMicros !== undefined) {
    metadata.expirationMicros = input.expirationMicros;
  }

  if (input.version !== undefined) {
    metadata.version = input.version;
  }

  if (input.accessType === AccessType.PAY_PER_ACCESS) {
    metadata.pricePerAccess = input.pricePerAccess ?? null;
  }

  return metadata;
}

async function ensureDatasetExists(datasetId: number): Promise<void> {
  const rows = await db
    .select({
      id: datasets.id,
    })
    .from(datasets)
    .where(eq(datasets.id, datasetId))
    .limit(1);

  if (rows.at(0) === undefined) {
    throw new ApiRouteError({
      code: 'DATASET_NOT_FOUND',
      message: `Dataset ${datasetId} was not found.`,
      statusCode: 404,
    });
  }
}

async function loadDatasetForStream(datasetId: number): Promise<{
  id: number;
  name: string;
  shelbyBlobId: string;
}> {
  const rows = await db
    .select({
      id: datasets.id,
      name: datasets.name,
      shelbyBlobId: datasets.shelbyBlobId,
    })
    .from(datasets)
    .where(eq(datasets.id, datasetId))
    .limit(1);

  const datasetRow = rows.at(0);

  if (datasetRow === undefined) {
    throw new ApiRouteError({
      code: 'DATASET_NOT_FOUND',
      message: `Dataset ${datasetId} was not found.`,
      statusCode: 404,
    });
  }

  return datasetRow;
}

function parseSessionIdFromHeaders(request: Request): string {
  const sessionId = request.header(SESSION_HEADER_NAME)?.trim() ?? '';

  if (sessionId.length === 0) {
    throw new ApiRouteError({
      code: 'SESSION_REQUIRED',
      message: `Missing required ${SESSION_HEADER_NAME} header.`,
      statusCode: 403,
    });
  }

  return sessionId;
}

async function validateSessionInDatabase(datasetId: number, sessionId: string): Promise<void> {
  const rows = await db
    .select({
      datasetId: accessSessions.datasetId,
      expiresAt: accessSessions.expiresAt,
      id: accessSessions.id,
      sessionId: accessSessions.sessionId,
      status: accessSessions.status,
    })
    .from(accessSessions)
    .where(and(eq(accessSessions.datasetId, datasetId), eq(accessSessions.sessionId, sessionId)))
    .limit(1);

  const sessionRow = rows.at(0);

  if (sessionRow === undefined) {
    throw new ApiRouteError({
      code: 'SESSION_INVALID',
      message: 'Access session is missing or does not belong to this dataset.',
      statusCode: 403,
    });
  }

  if (sessionRow.status !== 'active') {
    throw new ApiRouteError({
      code: 'SESSION_INVALID',
      details: {
        status: sessionRow.status,
      },
      message: 'Access session is not active.',
      statusCode: 403,
    });
  }

  const expiresAtMillis = new Date(sessionRow.expiresAt).getTime();
  if (Number.isNaN(expiresAtMillis) || expiresAtMillis <= Date.now()) {
    await db
      .update(accessSessions)
      .set({
        status: 'expired',
      })
      .where(eq(accessSessions.id, sessionRow.id));

    throw new ApiRouteError({
      code: 'SESSION_EXPIRED',
      details: {
        expiresAt: sessionRow.expiresAt,
      },
      message: 'Access session has expired.',
      statusCode: 403,
    });
  }
}

async function validateSessionWithShelby(sessionId: string): Promise<void> {
  try {
    const validation = await validateSession(sessionId);

    if (!validation.valid) {
      throw new ApiRouteError({
        code: 'SESSION_INVALID',
        details: {
          reason: validation.reason,
        },
        message: 'Access session failed Shelby validation.',
        statusCode: 403,
      });
    }
  } catch (cause: unknown) {
    if (cause instanceof ApiRouteError) {
      throw cause;
    }

    if (cause instanceof ShelbyAccessError) {
      throw new ApiRouteError({
        code: 'SESSION_VALIDATION_FAILED',
        details: {
          cause: cause.message,
        },
        message: 'Unable to validate access session with Shelby.',
        statusCode: 500,
      });
    }

    throw cause;
  }
}

function formatAttachmentFilename(datasetName: string): string {
  const sanitized = datasetName
    .replace(/[^a-z0-9_.-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return sanitized.length > 0 ? sanitized : 'dataset';
}

function ensureUploadTempDirectoryExists(directory: string): void {
  if (fs.existsSync(directory)) {
    return;
  }

  fs.mkdirSync(directory, {
    recursive: true,
  });
}

function getUploadTempDirectory(): string {
  const configuredDirectory = process.env.UPLOAD_TEMP_DIR?.trim();
  const defaultDirectory = path.resolve('/tmp/verida-ai-uploads');
  const uploadTempDirectory = configuredDirectory && configuredDirectory.length > 0
    ? path.resolve(configuredDirectory)
    : defaultDirectory;

  ensureUploadTempDirectoryExists(uploadTempDirectory);
  return uploadTempDirectory;
}

const uploadStorage = multer.diskStorage({
  destination: (_request, _file, callback): void => {
    callback(null, getUploadTempDirectory());
  },
  filename: (_request, file, callback): void => {
    const extension = path.extname(file.originalname);
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const uploadMiddleware = multer({
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
  storage: uploadStorage,
}).single('file');

async function runUploadMiddleware(request: Request, response: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    uploadMiddleware(request, response, (error: unknown) => {
      if (error === undefined) {
        resolve();
        return;
      }

      reject(error);
    });
  });
}

function getMulterErrorCode(cause: unknown): string | undefined {
  if (!(cause instanceof Error)) {
    return undefined;
  }

  if (!('code' in cause)) {
    return undefined;
  }

  const code = (cause as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

const datasetsRouter = Router();

datasetsRouter.post(
  '/upload',
  requireAuth,
  uploadRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    try {
      await runUploadMiddleware(request, response);
    } catch (cause: unknown) {
      const multerCode = getMulterErrorCode(cause);

      if (multerCode === 'LIMIT_FILE_SIZE') {
        throw new ApiRouteError({
          code: 'FILE_TOO_LARGE',
          message: 'Uploaded file exceeds the 10GB limit.',
          statusCode: 413,
        });
      }

      if (multerCode !== undefined) {
        throw new ApiRouteError({
          code: 'UPLOAD_REJECTED',
          details: {
            multerCode,
          },
          message: 'Upload request could not be processed.',
          statusCode: 400,
        });
      }

      throw cause;
    }

    const file = request.file;

    if (file === undefined) {
      throw new ApiRouteError({
        code: 'FILE_REQUIRED',
        message: 'A dataset file must be attached as multipart field "file".',
        statusCode: 400,
      });
    }

    const uploadBody = parseUploadBody(request);
    const authenticatedAddress = getAuthenticatedAddress(request);

    // Bind publisherAddress to the authenticated wallet — reject spoofing
    if (uploadBody.publisherAddress.toLowerCase() !== authenticatedAddress) {
      // Clean up temp file on auth failure
      try { await fs.promises.unlink(file.path); } catch { /* ignore */ }
      throw new ApiRouteError({
        code: 'ADDRESS_MISMATCH',
        message: 'publisherAddress must match the authenticated wallet address.',
        statusCode: 403,
      });
    }

    const contentHash = await computeFileContentHash(file.path);
    const metadata: UploadDatasetMetadata = createUploadMetadataFromBody(uploadBody);
    metadata.sizeBytes = file.size;

    const jobData: UploadDatasetJobData = {
      contentHash,
      filePath: file.path,
      metadata,
      publisherAddress: authenticatedAddress,
    };

    const job = await UploadDatasetQueue.add(UploadJobTypes.UPLOAD_DATASET, jobData, {
      attempts: 3,
      backoff: { delay: 5000, type: 'exponential' },
      removeOnComplete: { age: 86400, count: 100 },
      removeOnFail: { age: 604800 },
    });

    response.status(202).json({
      data: {
        jobId: String(job.id),
        status: 'queued',
      },
      success: true,
    });
  }),
);

datasetsRouter.get(
  '/',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const query = parseListQuery(request);
    const offset = (query.page - 1) * query.limit;
    const filters: SQL<unknown>[] = [];

    if (query.publisher !== undefined) {
      filters.push(eq(datasets.publisherAddress, query.publisher));
    }

    if (query.license !== undefined) {
      filters.push(eq(datasets.license, query.license));
    }

    if (query.tag !== undefined) {
      filters.push(sql`${datasets.tags} @> ARRAY[${query.tag}]::text[]`);
    }

    if (query.tags !== undefined) {
      const tagList = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        filters.push(sql`${datasets.tags} @> ARRAY[${sql.join(tagList, sql`, `)}]::text[]`);
      }
    }

    if (query.search !== undefined) {
      const escapedSearch = escapeLikeWildcards(query.search);
      filters.push(
        sql`(${datasets.name} ILIKE ${'%' + escapedSearch + '%'} OR ${datasets.description} ILIKE ${'%' + escapedSearch + '%'})`,
      );
    }

    if (query.accessType !== undefined && query.accessType !== 'all') {
      filters.push(sql`${datasets.accessType} = ${query.accessType}`);
    }

    if (query.sort === 'verified_only') {
      filters.push(eq(datasets.verified, true));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    let orderByClause;
    let needsAccessCountJoin = false;
    const accessCountSubquery = db
      .select({
        datasetId: accessSessions.datasetId,
        accessCount: count(accessSessions.id).as('access_count'),
      })
      .from(accessSessions)
      .groupBy(accessSessions.datasetId)
      .as('access_counts');

    if (query.sort === 'largest') {
      orderByClause = desc(datasets.sizeBytes);
    } else if (query.sort === 'most_accessed') {
      needsAccessCountJoin = true;
      orderByClause = desc(sql`COALESCE(${accessCountSubquery.accessCount}, 0)`);
    } else {
      orderByClause = desc(datasets.createdAt);
    }

    let selectQuery = db
      .select({
        access_count: sql<string>`COALESCE(${accessCountSubquery.accessCount}, 0)`,
        access_type: datasets.accessType,
        created_at: datasets.createdAt,
        description: datasets.description,
        id: datasets.id,
        license: datasets.license,
        merkle_root: datasets.merkleRoot,
        name: datasets.name,
        price_per_access: datasets.pricePerAccess,
        provenance_receipt: datasets.provenanceReceipt,
        publisher_address: datasets.publisherAddress,
        shelby_blob_id: datasets.shelbyBlobId,
        size_bytes: datasets.sizeBytes,
        tags: datasets.tags,
        tampered: datasets.tampered,
        verified: datasets.verified,
        version: datasets.version,
      })
      .from(datasets)
      .leftJoin(accessCountSubquery, eq(datasets.id, accessCountSubquery.datasetId))
      .orderBy(orderByClause)
      .limit(query.limit)
      .offset(offset);
    const countQuery = db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(datasets);

    const datasetRows = whereClause === undefined
      ? await selectQuery
      : await selectQuery.where(whereClause);
    const countRows = whereClause === undefined
      ? await countQuery
      : await countQuery.where(whereClause);
    const totalItems = Number(countRows.at(0)?.count ?? 0);

    response.json({
      data: {
        items: datasetRows,
        page: query.page,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.limit)),
      },
      success: true,
    });
  }),
);

datasetsRouter.get(
  '/:id',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const datasetId = parseRouteDatasetId(request);
    const datasetRows = await db
      .select({
        access_type: datasets.accessType,
        created_at: datasets.createdAt,
        description: datasets.description,
        id: datasets.id,
        license: datasets.license,
        merkle_root: datasets.merkleRoot,
        name: datasets.name,
        price_per_access: datasets.pricePerAccess,
        provenance_receipt: datasets.provenanceReceipt,
        publisher_address: datasets.publisherAddress,
        shelby_blob_id: datasets.shelbyBlobId,
        size_bytes: datasets.sizeBytes,
        tags: datasets.tags,
        tampered: datasets.tampered,
        verified: datasets.verified,
        version: datasets.version,
      })
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1);
    const datasetRecord = datasetRows.at(0);

    if (datasetRecord === undefined) {
      throw new ApiRouteError({
        code: 'DATASET_NOT_FOUND',
        message: `Dataset ${datasetId} was not found.`,
        statusCode: 404,
      });
    }

    const [versionRows, provenanceRows] = await Promise.all([
      db
        .select({
          changelog: datasetVersions.changelog,
          created_at: datasetVersions.createdAt,
          dataset_id: datasetVersions.datasetId,
          id: datasetVersions.id,
          merkle_root: datasetVersions.merkleRoot,
          shelby_blob_id: datasetVersions.shelbyBlobId,
          size_bytes: datasetVersions.sizeBytes,
          version: datasetVersions.version,
        })
        .from(datasetVersions)
        .where(eq(datasetVersions.datasetId, datasetId))
        .orderBy(desc(datasetVersions.version)),
      db
        .select({
          actor_address: provenanceChain.actorAddress,
          dataset_id: provenanceChain.datasetId,
          event_type: provenanceChain.eventType,
          id: provenanceChain.id,
          metadata: provenanceChain.metadata,
          shelby_receipt: provenanceChain.shelbyReceipt,
          timestamp: provenanceChain.timestamp,
          tx_hash: provenanceChain.txHash,
          version: provenanceChain.version,
        })
        .from(provenanceChain)
        .where(eq(provenanceChain.datasetId, datasetId))
        .orderBy(asc(provenanceChain.timestamp)),
    ]);

    response.json({
      data: {
        dataset: datasetRecord,
        provenance_chain: provenanceRows,
        versions: versionRows,
      },
      success: true,
    });
  }),
);

datasetsRouter.post(
  '/:id/verify',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const datasetId = parseRouteDatasetId(request);
    await ensureDatasetExists(datasetId);

    const jobData: VerifyIntegrityJobData = {
      datasetId,
    };
    const job = await VerifyIntegrityQueue.add('VERIFY_INTEGRITY', jobData);

    response.status(202).json({
      data: {
        jobId: String(job.id),
      },
      success: true,
    });
  }),
);

datasetsRouter.get(
  '/:id/stream',
  streamRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const datasetId = parseRouteDatasetId(request);
    const dataset = await loadDatasetForStream(datasetId);

    // Security-critical order:
    // 1. Parse session id from headers.
    const sessionId = parseSessionIdFromHeaders(request);
    // 2. Validate session in access_sessions table.
    await validateSessionInDatabase(dataset.id, sessionId);
    // 3. Validate session through Shelby SDK-backed session checker.
    await validateSessionWithShelby(sessionId);
    // 4. Open Shelby stream only after both checks pass.
    const shelbyReadable = await streamDataset(dataset.shelbyBlobId, sessionId);

    // 5 + 6. Set response metadata before streaming.
    response.setHeader('Content-Type', 'application/octet-stream');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${formatAttachmentFilename(dataset.name)}"`,
    );

    let streamedBytes = 0;
    shelbyReadable.on('data', (chunk: unknown): void => {
      if (Buffer.isBuffer(chunk)) {
        streamedBytes += chunk.byteLength;
        return;
      }

      if (typeof chunk === 'string') {
        streamedBytes += Buffer.byteLength(chunk);
      }
    });

    try {
      // 7. Stream to the client using pipeline for backpressure-safe transfer.
      await pipeline(shelbyReadable, response);
    } catch (cause: unknown) {
      if (!response.headersSent) {
        throw new ApiRouteError({
          code: 'STREAM_FAILED',
          details: {
            cause: cause instanceof Error ? cause.message : 'unknown',
          },
          message: 'Dataset stream failed.',
          statusCode: 500,
        });
      }

      response.destroy(cause instanceof Error ? cause : undefined);
      return;
    }

    if (streamedBytes > 0) {
      await db
        .update(accessSessions)
        .set({
          bytesConsumed: sql`${accessSessions.bytesConsumed} + ${streamedBytes}`,
        })
        .where(eq(accessSessions.sessionId, sessionId));
    }
  }),
);

export { ApiRouteError, datasetsRouter };
