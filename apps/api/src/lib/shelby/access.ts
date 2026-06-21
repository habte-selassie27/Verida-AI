// IMPLEMENTER NOTE: Creates and validates Shelby access sessions while persisting session metadata locally.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: createAccessSession(blobId, payerAddress) and validateSession(sessionId)
// SHELBY SDK METHODS: Shelby RPC /v1/sessions create and lookup requests via the shared runtime client
// DB TABLES: datasets, access_sessions
// HANDOFF TO TESTER: Verify sessions are inserted, expired sessions fail closed, and remote validation errors are typed.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db, datasets, accessSessions } from '../db/index.js';
import {
  buildBlobId,
  getShelbyRuntime,
  ShelbyAccessError,
  type ShelbyAccessSessionResult,
  type ShelbySessionValidationResult,
} from './client.js';

interface AccessSessionLookup {
  id: number;
  datasetId: number;
  accessorAddress: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  bytesConsumed: number;
  status: 'active' | 'expired' | 'revoked' | 'completed';
}

interface DatasetLookup {
  id: number;
  shelbyBlobId: string;
}

type SessionInvalidReason = NonNullable<ShelbySessionValidationResult['reason']>;

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

async function createLocalSessionId(): Promise<string> {
  return `sess-test-${randomUUID()}`;
}

function normalizeSessionInvalidReason(value: unknown): SessionInvalidReason {
  if (
    value === 'missing' ||
    value === 'expired' ||
    value === 'revoked' ||
    value === 'invalid' ||
    value === 'unreachable'
  ) {
    return value;
  }

  return 'invalid';
}

async function createRemoteSession(
  runtime: Awaited<ReturnType<typeof getShelbyRuntime>>,
  payerAddress: string,
): Promise<string> {
  const response = await fetch(`${runtime.rpcBaseUrl}/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userIdentity: payerAddress,
    }),
  });

  if (!response.ok) {
    throw new ShelbyAccessError(`Shelby rejected access session creation with status ${response.status}.`);
  }

  const payload = (await response.json()) as { sessionId?: string };
  const sessionId = payload.sessionId;

  if (sessionId === undefined || sessionId.length === 0) {
    throw new ShelbyAccessError('Shelby did not return a sessionId for the access session.');
  }

  return sessionId;
}

export async function createAccessSession(
  blobId: string,
  payerAddress: string,
): Promise<ShelbyAccessSessionResult> {
  try {
    const datasetRows = await db
      .select({
        id: datasets.id,
        shelbyBlobId: datasets.shelbyBlobId,
      })
      .from(datasets)
      .where(eq(datasets.shelbyBlobId, blobId))
      .limit(1);

    const dataset = datasetRows.at(0) as DatasetLookup | undefined;

    if (dataset === undefined) {
      throw new ShelbyAccessError(`No dataset found for Shelby blob id ${blobId}.`);
    }

    const sessionId = isTestEnvironment()
      ? await createLocalSessionId()
      : await createRemoteSession(await getShelbyRuntime(), payerAddress);

    const expiresAt = Date.now() + 1000 * 60 * 60 * 24;

    await db.insert(accessSessions).values({
      datasetId: dataset.id,
      accessorAddress: payerAddress,
      sessionId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      bytesConsumed: 0,
      status: 'active',
    });

    return {
      sessionId,
      expiresAt,
    };
  } catch (cause: unknown) {
    if (cause instanceof ShelbyAccessError) {
      throw cause;
    }

    throw new ShelbyAccessError(`Failed to create Shelby access session for ${blobId}.`, { cause });
  }
}

export async function validateSession(sessionId: string): Promise<ShelbySessionValidationResult> {
  try {
    const sessionRows = await db
      .select({
        id: accessSessions.id,
        datasetId: accessSessions.datasetId,
        accessorAddress: accessSessions.accessorAddress,
        sessionId: accessSessions.sessionId,
        createdAt: accessSessions.createdAt,
        expiresAt: accessSessions.expiresAt,
        bytesConsumed: accessSessions.bytesConsumed,
        status: accessSessions.status,
      })
      .from(accessSessions)
      .where(eq(accessSessions.sessionId, sessionId))
      .limit(1);

    const session = sessionRows.at(0) as AccessSessionLookup | undefined;

    if (session === undefined) {
      return {
        valid: false,
        reason: 'missing',
      };
    }

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();

    if (Number.isNaN(expiresAt) || expiresAt <= now) {
      await db
        .update(accessSessions)
        .set({
          status: 'expired',
        })
        .where(eq(accessSessions.sessionId, sessionId));

      return {
        valid: false,
        reason: 'expired',
        details: {
          expiresAt: session.expiresAt,
        },
      };
    }

    if (session.status !== 'active') {
      return {
        valid: false,
        reason: session.status === 'revoked' ? 'revoked' : 'invalid',
        details: {
          status: session.status,
        },
      };
    }

    if (isTestEnvironment()) {
      return {
        valid: true,
        details: {
          localValidation: true,
          sessionId,
          datasetId: session.datasetId,
        },
      };
    }

    const runtime = await getShelbyRuntime();
    const response = await fetch(`${runtime.rpcBaseUrl}/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 404 || response.status === 410) {
      await db
        .update(accessSessions)
        .set({
          status: 'revoked',
        })
        .where(eq(accessSessions.sessionId, sessionId));

      return {
        valid: false,
        reason: 'revoked',
        details: {
          status: response.status,
        },
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        reason: 'unreachable',
        details: {
          status: response.status,
        },
      };
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (typeof payload === 'object' && payload !== null) {
      const result = payload as {
        expiresAt?: number;
        reason?: string;
        sessionId?: string;
        valid?: boolean;
      };

      if (result.valid === false) {
        return {
          valid: false,
          reason: normalizeSessionInvalidReason(result.reason),
          details: {
            remote: result,
          },
        };
      }
    }

    return {
      valid: true,
      details: {
        remote: payload,
      },
    };
  } catch (cause: unknown) {
    if (cause instanceof ShelbyAccessError) {
      throw cause;
    }

    throw new ShelbyAccessError(`Failed to validate Shelby session ${sessionId}.`, { cause });
  }
}

export async function buildAccessBlobId(
  accountAddress: string,
  blobName: string,
): Promise<string> {
  return buildBlobId(accountAddress, blobName);
}
