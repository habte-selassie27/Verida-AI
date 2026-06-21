// IMPLEMENTER NOTE: Implements dataset access session creation and session validation endpoints.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: /api/datasets/:id/access and /api/sessions/:sessionId contracts for Shelby micropayment sessions
// SHELBY SDK METHODS: createAccessSession, validateSession
// DB TABLES: datasets, access_sessions
// HANDOFF TO TESTER: Verify 404 behavior for missing datasets, session creation payloads, and validation response accuracy.

import { eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';

import { datasets, db } from '../lib/db/index.js';
import { createAccessSession, ShelbyAccessError, validateSession } from '../lib/shelby/index.js';
import { ApiRouteError } from './datasets.js';

const accessRouter = Router();

const datasetIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const accessRequestBodySchema = z.object({
  payerAddress: z.string().trim().min(1),
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
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const datasetId = parseDatasetId(request);
    const body = parseAccessBody(request);
    const datasetRows = await db
      .select({
        id: datasets.id,
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

    try {
      const session = await createAccessSession(dataset.shelbyBlobId, body.payerAddress);

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
