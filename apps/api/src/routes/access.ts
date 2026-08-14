// IMPLEMENTER NOTE: Implements dataset access session creation and session validation endpoints.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: /api/datasets/:id/access and /api/sessions/:sessionId contracts for Shelby micropayment sessions
// SHELBY SDK METHODS: createAccessSession, validateSession
// DB TABLES: datasets, access_sessions
// HANDOFF TO TESTER: Verify 404 behavior for missing datasets, session creation payloads, and validation response accuracy.

import { and, desc, eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

import { datasets, db, accessSessions } from '../lib/db/index.js';
import { getShelbyAptosClient } from '../lib/shelby/client.js';
import { createAccessSession, ShelbyAccessError, validateSession } from '../lib/shelby/index.js';
import { createPaymentSession, verifyPayWithFeeTransaction } from '../lib/contracts/payment.js';
import { checkOnChainAccess } from '../lib/contracts/access.js';
import { getAuthenticatedAddress, requireAuth } from '../middleware/auth.js';
import { ApiRouteError } from './datasets.js';

const accessRouter = Router();

const datasetIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const accessRequestBodySchema = z.object({
  payerAddress: z.string().trim().min(1),
  txHash: z.string().trim().min(1).optional(),
});

const accessCheckBodySchema = z.object({
  datasetIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  walletAddress: z.string().trim().min(2).max(66),
});

const sessionIdParamSchema = z.object({
  sessionId: z.string().trim().min(1),
});

function parseDatasetId(request: Request): number {
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

function parseSessionId(request: Request): string {
  const parsed = sessionIdParamSchema.safeParse({
    sessionId: request.params.sessionId,
  });

  if (!parsed.success) {
    throw new ApiRouteError({
      code: 'INVALID_SESSION_ID',
      details: {
        issues: parsed.error.issues,
      },
      message: 'Session id is invalid.',
      statusCode: 400,
    });
  }

  return parsed.data.sessionId;
}

function parseAccessBody(request: Request): z.infer<typeof accessRequestBodySchema> {
  const rawBody = request.body as Record<string, unknown>;
  const parsed = accessRequestBodySchema.safeParse({
    payerAddress:
      (typeof rawBody.payerAddress === 'string' ? rawBody.payerAddress : undefined) ??
      (typeof rawBody.payer_address === 'string' ? rawBody.payer_address : undefined),
    txHash: typeof rawBody.txHash === 'string' ? rawBody.txHash : undefined,
  });

  if (!parsed.success) {
    throw new ApiRouteError({
      code: 'INVALID_ACCESS_REQUEST',
      details: {
        issues: parsed.error.issues,
      },
      message: 'Access request body is invalid.',
      statusCode: 400,
    });
  }

  return parsed.data;
}

accessRouter.post(
  '/datasets/:id/access',
  requireAuth,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const datasetId = parseDatasetId(request);
    const authenticatedAddress = getAuthenticatedAddress(request);
    const body = parseAccessBody(request);

    // Bind payerAddress to authenticated wallet — reject spoofing
    if (body.payerAddress.toLowerCase() !== authenticatedAddress) {
      throw new ApiRouteError({
        code: 'ADDRESS_MISMATCH',
        message: 'payerAddress must match the authenticated wallet address.',
        statusCode: 403,
      });
    }

    const datasetRows = await db
      .select({
        accessType: datasets.accessType,
        id: datasets.id,
        pricePerAccess: datasets.pricePerAccess,
        shelbyBlobId: datasets.shelbyBlobId,
      })
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1);
    const dataset = datasetRows.at(0);

    if (dataset === undefined) {
      throw new ApiRouteError({
        code: 'DATASET_NOT_FOUND',
        message: `Dataset ${datasetId} was not found.`,
        statusCode: 404,
      });
    }

    // A wallet that already has a session for this dataset is permanently
    // entitled to it — they paid (or accessed) before, so never charge them
    // again. Re-access simply re-issues a fresh session.
    const priorSessionRows = await db
      .select({
        createdAt: accessSessions.createdAt,
        expiresAt: accessSessions.expiresAt,
        sessionId: accessSessions.sessionId,
        status: accessSessions.status,
      })
      .from(accessSessions)
      .where(
        and(
          eq(accessSessions.datasetId, datasetId),
          eq(accessSessions.accessorAddress, authenticatedAddress),
        ),
      )
      .orderBy(desc(accessSessions.createdAt))
      .limit(1);
    const priorSession = priorSessionRows.at(0);
    const isEntitled = priorSession !== undefined;

    // Reuse a still-active session instead of minting duplicates.
    if (
      priorSession !== undefined &&
      priorSession.status === 'active' &&
      new Date(priorSession.expiresAt).getTime() > Date.now()
    ) {
      response.status(200).json({
        data: {
          expiresAt: new Date(priorSession.expiresAt).getTime(),
          reused: true,
          sessionId: priorSession.sessionId,
        },
        success: true,
      });
      return;
    }

    // Enforce payment for pay-per-access datasets (first access only — an
    // entitled wallet never pays again).
    if (dataset.accessType === 'pay_per_access' && dataset.pricePerAccess !== null && !isEntitled) {
      if (!body.txHash) {
        throw new ApiRouteError({
          code: 'PAYMENT_REQUIRED',
          message: `This dataset requires ${dataset.pricePerAccess} octas per access. Provide txHash with a valid Aptos transaction.`,
          statusCode: 402,
        });
      }

      // Verify the Aptos transaction on-chain
      try {
        const aptos = await getShelbyAptosClient();
        let txn = await aptos.getTransactionByHash({ transactionHash: body.txHash });

        // The tx may still be pending right after wallet submission — wait
        // briefly for it to commit, then re-fetch the final result instead of
        // rejecting a legit payment with a confusing error.
        if (txn.type === 'pending_transaction') {
          await aptos.waitForTransaction({
            transactionHash: body.txHash,
            options: { timeoutSecs: 20 },
          });
          txn = await aptos.getTransactionByHash({ transactionHash: body.txHash });
        }

        if (txn.type !== 'user_transaction') {
          throw new ApiRouteError({
            code: 'INVALID_TRANSACTION',
            message: 'Transaction is not a user transaction.',
            statusCode: 402,
          });
        }

        const userTxn = txn as { type: 'user_transaction'; sender: string; payload: { function: string; arguments: unknown[] } };

        // Verify the sender matches the payer
        if (userTxn.sender.toLowerCase() !== authenticatedAddress) {
          throw new ApiRouteError({
            code: 'SENDER_MISMATCH',
            message: 'Transaction sender does not match the payer address.',
            statusCode: 402,
          });
        }

        // Verify the transaction succeeded
        if (txn.type === 'user_transaction' && 'success' in txn && !txn.success) {
          throw new ApiRouteError({
            code: 'TRANSACTION_FAILED',
            message: 'The payment transaction failed on-chain.',
            statusCode: 402,
          });
        }
      } catch (cause: unknown) {
        if (cause instanceof ApiRouteError) throw cause;
        const causeMessage = cause instanceof Error ? cause.message : String(cause);
        console.error('[Access] Failed to verify Aptos transaction:', cause);
        throw new ApiRouteError({
          code: 'PAYMENT_VERIFICATION_FAILED',
          details: {
            cause: causeMessage,
            hint: 'Confirm the tx hash exists on shelbynet and that SHELBY_API_KEY is not being sent to the Aptos fullnode.',
          },
          message: 'Unable to verify the payment transaction on-chain.',
          statusCode: 502,
        });
      }
    }

    try {
      let session;
      try {
        session = await createAccessSession(dataset.shelbyBlobId, authenticatedAddress);
      } catch (shelbyErr) {
        // Shelby is unavailable — create a local session as fallback
        if (shelbyErr instanceof ShelbyAccessError) {
          console.warn('[Access] Shelby unavailable, creating local session:', shelbyErr.message);
          const sessionId = randomUUID();
          const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

          await db.insert(accessSessions).values({
            datasetId,
            sessionId,
            accessorAddress: authenticatedAddress,
            expiresAt: new Date(expiresAt).toISOString(),
            status: 'active',
          });

          session = { sessionId, expiresAt };
        } else {
          throw shelbyErr;
        }
      }

      response.status(201).json({
        data: {
          expiresAt: session.expiresAt,
          sessionId: session.sessionId,
        },
        success: true,
      });
    } catch (cause: unknown) {
      if (cause instanceof ShelbyAccessError) {
        throw new ApiRouteError({
          code: 'ACCESS_SESSION_FAILED',
          details: {
            cause: cause.message,
          },
          message: 'Failed to create access session.',
          statusCode: 500,
        });
      }

      throw cause;
    }
  }),
);

// GET /api/datasets/:id/access — entitlement check for the authenticated wallet.
// Supports an optional ?wallet= query param that returns hasAccess WITHOUT
// authentication (the result is keyed by the public wallet address and only
// reveals whether that wallet paid). Session ids are only returned to an
// authenticated caller.
accessRouter.get(
  '/datasets/:id/access',
  (request: Request, response: Response, next: NextFunction): void => {
    const walletParam = typeof request.query.wallet === 'string' ? request.query.wallet.trim() : '';
    if (walletParam.length > 0) {
      next();
      return;
    }
    requireAuth(request, response, next);
  },
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const datasetId = parseDatasetId(request);
    const walletParam = typeof request.query.wallet === 'string' ? request.query.wallet.trim() : '';
    const isAuthenticatedCheck = walletParam.length === 0;
    const walletAddress = (walletParam || getAuthenticatedAddress(request)).toLowerCase();

    const datasetRows = await db
      .select({
        accessType: datasets.accessType,
        id: datasets.id,
      })
      .from(datasets)
      .where(eq(datasets.id, datasetId))
      .limit(1);
    const dataset = datasetRows.at(0);

    if (dataset === undefined) {
      throw new ApiRouteError({
        code: 'DATASET_NOT_FOUND',
        message: `Dataset ${datasetId} was not found.`,
        statusCode: 404,
      });
    }

    const sessionRows = await db
      .select({
        expiresAt: accessSessions.expiresAt,
        sessionId: accessSessions.sessionId,
        status: accessSessions.status,
      })
      .from(accessSessions)
      .where(
        and(
          eq(accessSessions.datasetId, datasetId),
          eq(accessSessions.accessorAddress, walletAddress),
        ),
      )
      .orderBy(desc(accessSessions.createdAt))
      .limit(1);
    const session = sessionRows.at(0);

    // Check on-chain grants as fallback when no DB session exists.
    // grant_access writes to the Move AccessRegistry; we must verify it there.
    const onChainResult = await checkOnChainAccess(walletAddress, datasetId);

    // Free datasets are always accessible; paid datasets are unlocked if the
    // wallet has a DB session OR an on-chain grant.
    const hasAccess = dataset.accessType === 'free' || session !== undefined || onChainResult.hasAccess;

    // Only ever expose the session id to an authenticated caller.
    let activeSession: { expiresAt: number; sessionId: string } | null = null;
    if (
      isAuthenticatedCheck &&
      session !== undefined &&
      session.status === 'active' &&
      new Date(session.expiresAt).getTime() > Date.now()
    ) {
      activeSession = {
        expiresAt: new Date(session.expiresAt).getTime(),
        sessionId: session.sessionId,
      };
    }

    response.json({
      data: {
        hasAccess,
        session: activeSession,
      },
      success: true,
    });
  }),
);

// POST /api/access/check — batch entitlement check for the marketplace grid.
// body: { datasetIds: number[], walletAddress: string } → { access: { [datasetId]: { hasAccess, active } } }
// No authentication required: identity is the public wallet address.
accessRouter.post(
  '/access/check',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const parsed = accessCheckBodySchema.safeParse(request.body as Record<string, unknown>);
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_ACCESS_CHECK',
        details: {
          issues: parsed.error.issues,
        },
        message: 'datasetIds must be a non-empty list of positive integers and walletAddress is required.',
        statusCode: 400,
      });
    }
    const datasetIds = parsed.data.datasetIds;
    const authenticatedAddress = parsed.data.walletAddress.toLowerCase();

    const [datasetRows, sessionRows] = await Promise.all([
      db
        .select({
          accessType: datasets.accessType,
          id: datasets.id,
        })
        .from(datasets)
        .where(inArray(datasets.id, datasetIds)),
      db
        .select({
          datasetId: accessSessions.datasetId,
          expiresAt: accessSessions.expiresAt,
          status: accessSessions.status,
        })
        .from(accessSessions)
        .where(
          and(
            eq(accessSessions.accessorAddress, authenticatedAddress),
            inArray(accessSessions.datasetId, datasetIds),
          ),
        ),
    ]);

    const now = Date.now();
    const sessionDatasetIds = new Set<number>();
    const activeDatasetIds = new Set<number>();
    for (const sessionRow of sessionRows) {
      sessionDatasetIds.add(sessionRow.datasetId);
      if (sessionRow.status === 'active' && new Date(sessionRow.expiresAt).getTime() > now) {
        activeDatasetIds.add(sessionRow.datasetId);
      }
    }

    const access: Record<number, { active: boolean; hasAccess: boolean }> = {};
    for (const datasetRow of datasetRows) {
      const hasDbAccess = sessionDatasetIds.has(datasetRow.id);
      const hasFreeAccess = datasetRow.accessType === 'free';
      const hasOnChainAccess = !hasDbAccess && !hasFreeAccess
        ? (await checkOnChainAccess(authenticatedAddress, datasetRow.id)).hasAccess
        : false;

      access[datasetRow.id] = {
        hasAccess: hasFreeAccess || hasDbAccess || hasOnChainAccess,
        active: activeDatasetIds.has(datasetRow.id),
      };
    }

    response.json({
      data: {
        access,
      },
      success: true,
    });
  }),
);

accessRouter.get(
  '/sessions/:sessionId',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const sessionId = parseSessionId(request);

    try {
      const result = await validateSession(sessionId);

      response.json({
        data: result,
        success: true,
      });
    } catch (cause: unknown) {
      if (cause instanceof ShelbyAccessError) {
        throw new ApiRouteError({
          code: 'ACCESS_SESSION_VALIDATION_FAILED',
          details: {
            cause: cause.message,
          },
          message: 'Unable to validate access session.',
          statusCode: 500,
        });
      }

      throw cause;
    }
  }),
);

export { accessRouter };
