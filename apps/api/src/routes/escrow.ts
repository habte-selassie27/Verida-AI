import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db, datasets, escrowEntries } from '../lib/db/index.js';
import { getAuthenticatedAddress, requireAuth } from '../middleware/auth.js';
import { resolveEscrowEntry } from '../lib/contracts/escrowSync.js';
import { ApiRouteError } from './datasets.js';

const escrowRouter = Router();

const createEscrowSchema = z.object({
  datasetId: z.coerce.number().int().positive(),
  amountOctas: z.coerce.number().int().positive(),
  onChainEscrowId: z.coerce.number().int().positive().optional(),
});

const escrowIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const escrowStatusSchema = z.object({
  status: z.enum(['released', 'disputed']),
  txHash: z.string().trim().min(1).optional(),
});

escrowRouter.post(
  '/escrow/create',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const authenticatedAddress = getAuthenticatedAddress(request);
    const parsed = createEscrowSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_ESCROW_REQUEST',
        details: { issues: parsed.error.issues },
        message: 'Invalid escrow creation request.',
        statusCode: 400,
      });
    }

    const { datasetId, amountOctas, onChainEscrowId } = parsed.data;

    const datasetRows = await db
      .select({
        id: datasets.id,
        publisherAddress: datasets.publisherAddress,
        pricePerAccess: datasets.pricePerAccess,
      })
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1);

    const dataset = datasetRows.at(0);
    if (!dataset) {
      throw new ApiRouteError({
        code: 'DATASET_NOT_FOUND',
        message: `Dataset ${datasetId} not found.`,
        statusCode: 404,
      });
    }

    const [inserted] = await db
      .insert(escrowEntries)
      .values({
        amountOctas,
        buyerAddress: authenticatedAddress,
        datasetId,
        onChainEscrowId: onChainEscrowId ?? null,
        publisherAddress: dataset.publisherAddress,
        status: 'pending',
      })
      .returning();

    if (!inserted) {
      throw new ApiRouteError({
        code: 'ESCROW_CREATE_FAILED',
        message: 'Failed to create escrow entry.',
        statusCode: 500,
      });
    }

    response.status(201).json({
      data: {
        datasetId,
        escrowId: inserted.id,
        onChainEscrowId: inserted.onChainEscrowId,
        publisherAddress: dataset.publisherAddress,
        status: 'pending',
      },
      success: true,
    });
  }),
);

escrowRouter.get(
  '/escrow/:id',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const parsed = escrowIdParamSchema.safeParse({ id: request.params.id });
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_ESCROW_ID',
        message: 'Invalid escrow id.',
        statusCode: 400,
      });
    }

    const rows = await db
      .select()
      .from(escrowEntries)
      .where(eq(escrowEntries.id, parsed.data.id))
      .limit(1);

    const entry = rows.at(0);
    if (!entry) {
      throw new ApiRouteError({
        code: 'ESCROW_NOT_FOUND',
        message: 'Escrow entry not found.',
        statusCode: 404,
      });
    }

    response.json({ data: entry, success: true });
  }),
);

escrowRouter.get(
  '/escrow/buyer/:address',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const address = String(request.params.address ?? '');
    const authenticatedAddress = getAuthenticatedAddress(request);

    if (!address || address.toLowerCase() !== authenticatedAddress) {
      throw new ApiRouteError({
        code: 'ADDRESS_MISMATCH',
        message: 'Can only view your own escrows.',
        statusCode: 403,
      });
    }

    const rows = await db
      .select()
      .from(escrowEntries)
      .where(eq(escrowEntries.buyerAddress, address));

    response.json({ data: rows, success: true });
  }),
);

// POST /escrow/:id/status — buyer-confirmed lifecycle sync. The on-chain tx is
// the source of truth (escrow::confirm_release / open_dispute); this endpoint
// mirrors the result into the DB and records the fee-split payment on release.
escrowRouter.post(
  '/escrow/:id/status',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const authenticatedAddress = getAuthenticatedAddress(request);

    const idParsed = escrowIdParamSchema.safeParse({ id: request.params.id });
    if (!idParsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_ESCROW_ID',
        message: 'Invalid escrow id.',
        statusCode: 400,
      });
    }

    const statusParsed = escrowStatusSchema.safeParse(request.body);
    if (!statusParsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_ESCROW_STATUS',
        details: { issues: statusParsed.error.issues },
        message: 'Escrow status must be "released" or "disputed".',
        statusCode: 400,
      });
    }

    const rows = await db
      .select()
      .from(escrowEntries)
      .where(eq(escrowEntries.id, idParsed.data.id))
      .limit(1);
    const entry = rows.at(0);

    if (!entry) {
      throw new ApiRouteError({
        code: 'ESCROW_NOT_FOUND',
        message: 'Escrow entry not found.',
        statusCode: 404,
      });
    }

    if (entry.buyerAddress.toLowerCase() !== authenticatedAddress) {
      throw new ApiRouteError({
        code: 'NOT_ESCROW_BUYER',
        message: 'Only the buyer can confirm or dispute this escrow.',
        statusCode: 403,
      });
    }

    const { status, txHash } = statusParsed.data;

    const updated = await resolveEscrowEntry({
      amountOctas: entry.amountOctas,
      buyerAddress: entry.buyerAddress,
      datasetId: entry.datasetId,
      escrowId: entry.id,
      paymentType: 'escrow_release',
      publisherAddress: entry.publisherAddress,
      status,
      txHash,
    });

    if (!updated) {
      throw new ApiRouteError({
        code: 'ESCROW_ALREADY_RESOLVED',
        message: 'Escrow is already resolved.',
        statusCode: 409,
      });
    }

    response.json({
      data: {
        escrowId: entry.id,
        onChainEscrowId: entry.onChainEscrowId,
        status,
        resolvedAt: new Date().toISOString(),
      },
      success: true,
    });
  }),
);

export { escrowRouter };
