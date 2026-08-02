// IMPLEMENTER NOTE: Implements publisher profile read and authenticated profile update endpoints.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: /api/publishers/:address read and /api/publishers/me update contracts
// SHELBY SDK METHODS: None directly; this module handles metadata persistence and retrieval.
// DB TABLES: publishers, datasets
// HANDOFF TO TESTER: Verify address validation, auth-gated profile updates, and returned dataset lists per publisher.

import { desc, eq, sql, and, gte } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

import { db, datasets, publishers, accessSessions } from '../lib/db/index.js';
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

publishersRouter.get(
  '/publishers/:address/revenue',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const address = getAuthenticatedAddress(request);

    // Get all datasets by this publisher
    const publisherDatasets = await db
      .select({ id: datasets.id, name: datasets.name, price_per_access: datasets.pricePerAccess })
      .from(datasets)
      .where(eq(datasets.publisherAddress, address));

    if (publisherDatasets.length === 0) {
      response.json({
        data: {
          totalRevenue: 0,
          thisMonthRevenue: 0,
          totalDownloads: 0,
          monthlyRevenue: [],
          recentTransactions: [],
        },
        success: true,
      });
      return;
    }

    const datasetIds = publisherDatasets.map((d) => d.id);
    const datasetMap = new Map(publisherDatasets.map((d) => [d.id, d]));

    // Get access sessions for publisher's datasets
    const sessions = await db
      .select({
        id: accessSessions.id,
        dataset_id: accessSessions.datasetId,
        accessor_address: accessSessions.accessorAddress,
        created_at: accessSessions.createdAt,
        bytes_consumed: accessSessions.bytesConsumed,
        status: accessSessions.status,
      })
      .from(accessSessions)
      .where(sql`${accessSessions.datasetId} IN ${datasetIds}`)
      .orderBy(desc(accessSessions.createdAt));

    // Calculate total revenue
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const session of sessions) {
      const ds = datasetMap.get(session.dataset_id);
      if (ds?.price_per_access) {
        totalRevenue += ds.price_per_access / 100_000_000; // Convert octas to APT
        if (new Date(session.created_at) >= thisMonthStart) {
          thisMonthRevenue += ds.price_per_access / 100_000_000;
        }
      }
    }

    // Calculate monthly revenue (last 6 months)
    const monthlyRevenue: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = monthDate.toLocaleString('en-US', { month: 'short' });
      
      let monthTotal = 0;
      for (const session of sessions) {
        const sessionDate = new Date(session.created_at);
        if (sessionDate >= monthDate && sessionDate <= monthEnd) {
          const ds = datasetMap.get(session.dataset_id);
          if (ds?.price_per_access) {
            monthTotal += ds.price_per_access / 100_000_000;
          }
        }
      }
      monthlyRevenue.push({ month: monthLabel, amount: Math.round(monthTotal * 10) / 10 });
    }

    // Get recent transactions
    const recentTransactions = sessions.slice(0, 10).map((session) => {
      const ds = datasetMap.get(session.dataset_id);
      return {
        dataset: ds?.name ?? 'Unknown',
        buyer: `${session.accessor_address.slice(0, 6)}...${session.accessor_address.slice(-4)}`,
        amount: ds?.price_per_access ? `${(ds.price_per_access / 100_000_000).toFixed(1)} APT` : 'Free',
        time: formatTimeAgo(session.created_at),
      };
    });

    response.json({
      data: {
        totalRevenue: Math.round(totalRevenue * 10) / 10,
        thisMonthRevenue: Math.round(thisMonthRevenue * 10) / 10,
        totalDownloads: sessions.length,
        monthlyRevenue,
        recentTransactions,
      },
      success: true,
    });
  }),
);

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export { publishersRouter };
