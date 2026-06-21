// IMPLEMENTER NOTE: Implements publisher profile read and authenticated profile update endpoints.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: /api/publishers/:address read and /api/publishers/me update contracts
// SHELBY SDK METHODS: None directly; this module handles metadata persistence and retrieval.
// DB TABLES: publishers, datasets
// HANDOFF TO TESTER: Verify address validation, auth-gated profile updates, and returned dataset lists per publisher.

import { desc, eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

import { db, datasets, publishers } from '../lib/db/index.js';
import { getAuthenticatedAddress, requireAuth } from '../middleware/auth.js';
import { ApiRouteError } from './datasets.js';

const publishersRouter = Router();

const publisherAddressParamSchema = z.object({
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{4,}$/, 'Publisher address must be a hex string prefixed with 0x.'),
});

const updatePublisherBodySchema = z.object({
  bio: z.string().trim().max(1000).nullable().optional(),
  username: z.string().trim().min(3).max(50).nullable().optional(),
});

function parsePublisherAddress(request: Request): string {
  const parsed = publisherAddressParamSchema.safeParse({
    address: request.params.address,
  });

  if (!parsed.success) {
    throw new ApiRouteError({
      code: 'INVALID_PUBLISHER_ADDRESS',
      details: {
        issues: parsed.error.issues,
      },
      message: 'Publisher address is invalid.',
      statusCode: 400,
    });
  }

  return parsed.data.address.toLowerCase();
}

function parsePublisherUpdateBody(request: Request): z.infer<typeof updatePublisherBodySchema> {
  const rawBody = request.body as Record<string, unknown>;
  const parsed = updatePublisherBodySchema.safeParse({
    bio: rawBody.bio ?? null,
    username: rawBody.username ?? null,
  });

  if (!parsed.success) {
    throw new ApiRouteError({
      code: 'INVALID_PUBLISHER_PROFILE',
      details: {
        issues: parsed.error.issues,
      },
      message: 'Publisher profile update payload is invalid.',
      statusCode: 400,
    });
  }

  return parsed.data;
}

publishersRouter.get(
  '/publishers/:address',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const address = parsePublisherAddress(request);
    const [publisherRows, datasetRows] = await Promise.all([
      db
        .select({
          address: publishers.address,
          bio: publishers.bio,
          created_at: publishers.createdAt,
          total_datasets: publishers.totalDatasets,
          total_earnings: publishers.totalEarnings,
          username: publishers.username,
          verified: publishers.verified,
        })
        .from(publishers)
        .where(eq(publishers.address, address))
        .limit(1),
      db
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
        .where(eq(datasets.publisherAddress, address))
        .orderBy(desc(datasets.createdAt)),
    ]);
    const publisherProfile = publisherRows.at(0);

    if (publisherProfile === undefined) {
      throw new ApiRouteError({
        code: 'PUBLISHER_NOT_FOUND',
        message: `Publisher ${address} was not found.`,
        statusCode: 404,
      });
    }

    response.json({
      data: {
        datasets: datasetRows,
        publisher: publisherProfile,
      },
      success: true,
    });
  }),
);

publishersRouter.put(
  '/publishers/me',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const address = getAuthenticatedAddress(request);
    const body = parsePublisherUpdateBody(request);

    await db
      .insert(publishers)
      .values({
        address,
        bio: body.bio ?? null,
        username: body.username ?? null,
      })
      .onConflictDoUpdate({
        set: {
          bio: body.bio ?? null,
          username: body.username ?? null,
        },
        target: publishers.address,
      });

    const profileRows = await db
      .select({
        address: publishers.address,
        bio: publishers.bio,
        created_at: publishers.createdAt,
        total_datasets: publishers.totalDatasets,
        total_earnings: publishers.totalEarnings,
        username: publishers.username,
        verified: publishers.verified,
      })
      .from(publishers)
      .where(eq(publishers.address, address))
      .limit(1);
    const profile = profileRows.at(0);

    if (profile === undefined) {
      throw new ApiRouteError({
        code: 'PUBLISHER_UPDATE_FAILED',
        message: 'Publisher profile update did not persist.',
        statusCode: 500,
      });
    }

    response.json({
      data: profile,
      success: true,
    });
  }),
);

export { publishersRouter };
