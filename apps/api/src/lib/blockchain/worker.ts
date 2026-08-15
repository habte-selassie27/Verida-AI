// Blockchain outbox worker: processes durable blockchain_outbox jobs by
// submitting provenance events to Aptos (server-signed), saving the REAL
// transaction hash, and updating the provenance event's blockchain status.
//
// Concurrency: jobs are claimed with SELECT ... FOR UPDATE SKIP LOCKED, so
// multiple worker instances can never submit the same event twice.
// Idempotency: a job with an existing aptos_tx_hash is reconciled against the
// chain (never blindly resubmitted); CONFIRMED jobs are skipped entirely.
// Retries: transient failures back off exponentially (5s → 30s → 2m → 10m →
// 30m); permanent failures and exhausted retries mark the job FAILED but the
// provenance event stays in Postgres.
//
// Local/demo mode: when blockchain submission is not required (APTOS_NETWORK
// unset or local), no jobs exist — the outbox only receives rows when
// submission is enabled, so the worker is a no-op.

import { and, eq, lt, or, sql } from 'drizzle-orm';

import { db, blockchainOutbox, provenanceChain } from '../db/index.js';
import { isBlockchainSubmissionRequired, BLOCKCHAIN_ENV } from '../contracts/blockchainEnv.js';
import { getMarketplaceAptosClient } from '../contracts/client.js';
import { getServerSigner } from '../contracts/signer.js';
import { buildEmitEventArguments } from '../provenance/record.js';

const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MS = 10 * 60 * 1000;

// Attempt 1 → 5s, 2 → 30s, 3 → 2m, 4 → 10m, 5 → 30m (attempt index 0-based).
const RETRY_BACKOFF_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000];

interface OutboxJobRow {
  id: number;
  provenanceEventId: number;
  datasetId: number;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  attemptCount: number;
  aptosTxHash: string | null;
}

function isTransientFailure(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false;
  const message = cause.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('fetch failed') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('eai_again') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('429') ||
    message.includes('stale') ||
    message.includes('insufficient gas') ||
    message.includes('transaction already in mempool')
  );
}

export function retryDelayForAttempt(attemptsMade: number): number {
  return RETRY_BACKOFF_MS[Math.min(attemptsMade, RETRY_BACKOFF_MS.length - 1)] ?? RETRY_BACKOFF_MS.at(-1)!;
}

/** Claims one PENDING (or stale PROCESSING) outbox job, or null if none. */
async function claimNextJob(): Promise<OutboxJobRow | null> {
  const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: blockchainOutbox.id,
        provenanceEventId: blockchainOutbox.provenanceEventId,
        datasetId: blockchainOutbox.datasetId,
        eventType: blockchainOutbox.eventType,
        payload: blockchainOutbox.payload,
        status: blockchainOutbox.status,
        attemptCount: blockchainOutbox.attemptCount,
        aptosTxHash: blockchainOutbox.aptosTxHash,
      })
      .from(blockchainOutbox)
      .where(
        or(
          and(
            eq(blockchainOutbox.status, 'PENDING'),
            or(
              sql`${blockchainOutbox.nextRetryAt} IS NULL`,
              lt(blockchainOutbox.nextRetryAt, staleCutoff),
            ),
          ),
          and(
            eq(blockchainOutbox.status, 'PROCESSING'),
            lt(blockchainOutbox.updatedAt, staleCutoff),
          ),
        ),
      )
      .orderBy(blockchainOutbox.createdAt)
      .limit(1)
      .for('update', { skipLocked: true });

    const job = rows.at(0);
    if (job === undefined) return null;

    await tx
      .update(blockchainOutbox)
      .set({ status: 'PROCESSING', updatedAt: new Date().toISOString() })
      .where(eq(blockchainOutbox.id, job.id));

    return job;
  });

  return claimed;
}

/**
 * Reconciles a job that already has a submitted tx hash: if the tx is
 * confirmed on-chain we finalize; if it failed on-chain we record the failure.
 * Never blindly submits a second transaction for the same event.
 */
async function reconcileSubmittedTx(
  job: OutboxJobRow,
  txHash: string,
): Promise<'confirmed' | 'failed' | 'pending'> {
  try {
    const aptos = getMarketplaceAptosClient();
    const txn = await aptos.getTransactionByHash({ transactionHash: txHash });

    if (txn.type === 'pending_transaction') {
      return 'pending';
    }

    if (txn.type === 'user_transaction' && 'success' in txn && txn.success) {
      await finalizeJob(job.id, job.provenanceEventId, job.eventType, txHash);
      return 'confirmed';
    }

    await markJobFailed(job.id, job.provenanceEventId, 'On-chain transaction failed.');
    return 'failed';
  } catch (cause: unknown) {
    // Chain unreachable — leave the job as-is; it will be retried.
    console.warn(
      `[BlockchainWorker] Could not reconcile tx ${txHash} for outbox job ${job.id}:`,
      cause instanceof Error ? cause.message : cause,
    );
    return 'pending';
  }
}

async function submitEmitTransaction(
  job: OutboxJobRow,
): Promise<{ txHash: string }> {
  const aptos = getMarketplaceAptosClient();
  const signer = getServerSigner();
  const { function: fn, functionArguments } = buildEmitEventArguments(job.payload, signer.accountAddress.toString());

  const transaction = await aptos.transaction.build.simple({
    data: {
      function: fn as `${string}::${string}::${string}`,
      functionArguments,
    },
    sender: signer.accountAddress,
  });

  const submitted = await aptos.signAndSubmitTransaction({ signer, transaction });
  await aptos.waitForTransaction({ transactionHash: submitted.hash });
  return { txHash: submitted.hash };
}

async function finalizeJob(
  outboxId: number,
  provenanceEventId: number,
  eventType: string,
  txHash: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(blockchainOutbox)
      .set({
        aptosTxHash: txHash,
        confirmedAt: nowIso,
        status: 'CONFIRMED',
        updatedAt: nowIso,
      })
      .where(eq(blockchainOutbox.id, outboxId));

    await tx
      .update(provenanceChain)
      .set({
        blockchainConfirmedAt: nowIso,
        blockchainStatus: 'CONFIRMED',
        blockchainError: null,
        txHash,
      })
      .where(eq(provenanceChain.id, provenanceEventId));
  });

  console.log(
    `[BlockchainWorker] Provenance confirmed on-chain event=${eventType} outbox=${outboxId} tx=${txHash} network=${BLOCKCHAIN_ENV}`,
  );
}

async function markJobFailed(
  outboxId: number,
  provenanceEventId: number,
  error: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(blockchainOutbox)
      .set({
        lastError: error,
        status: 'FAILED',
        updatedAt: nowIso,
      })
      .where(eq(blockchainOutbox.id, outboxId));

    await tx
      .update(provenanceChain)
      .set({
        blockchainError: error,
        blockchainStatus: 'FAILED',
      })
      .where(eq(provenanceChain.id, provenanceEventId));
  });
}

async function processJob(job: OutboxJobRow): Promise<void> {
  // Idempotency: never resubmit an event that already has a tx hash.
  if (job.aptosTxHash !== null && job.aptosTxHash.length > 0) {
    await reconcileSubmittedTx(job, job.aptosTxHash);
    return;
  }

  const attemptsMade = job.attemptCount;
  const isLastAttempt = attemptsMade + 1 >= MAX_ATTEMPTS;
  const nowIso = new Date().toISOString();

  try {
    console.log(
      `[BlockchainWorker] Submitting provenance event event=${job.eventType} dataset=${job.datasetId} outbox=${job.id} attempt=${attemptsMade + 1} network=${BLOCKCHAIN_ENV}`,
    );

    const { txHash } = await submitEmitTransaction(job);

    // Mark SUBMITTED with the real hash, then reconcile (the tx may already be
    // confirmed after waitForTransaction).
    await db
      .update(blockchainOutbox)
      .set({
        aptosTxHash: txHash,
        status: 'SUBMITTED',
        submittedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(blockchainOutbox.id, job.id));

    await db
      .update(provenanceChain)
      .set({
        blockchainStatus: 'SUBMITTED',
        blockchainSubmittedAt: nowIso,
        txHash,
      })
      .where(eq(provenanceChain.id, job.provenanceEventId));

    const reconciled = await reconcileSubmittedTx({ ...job, aptosTxHash: txHash }, txHash);
    if (reconciled === 'pending') {
      // waitForTransaction returned but the ledger still shows pending —
      // leave it SUBMITTED; a later poll reconciles it.
      console.log(
        `[BlockchainWorker] Provenance submitted event=${job.eventType} dataset=${job.datasetId} tx=${txHash} awaiting confirmation`,
      );
    }
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);

    if (isTransientFailure(cause) && !isLastAttempt) {
      const delayMs = retryDelayForAttempt(attemptsMade);
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
      const nextAttempt = attemptsMade + 1;

      await db
        .update(blockchainOutbox)
        .set({
          attemptCount: nextAttempt,
          lastError: message,
          nextRetryAt: nextRetryAt,
          status: 'PENDING',
          updatedAt: nowIso,
        })
        .where(eq(blockchainOutbox.id, job.id));

      await db
        .update(provenanceChain)
        .set({
          blockchainError: message,
        })
        .where(eq(provenanceChain.id, job.provenanceEventId));

      console.warn(
        `[BlockchainWorker] Submission failed (transient), retrying event=${job.eventType} dataset=${job.datasetId} attempt=${nextAttempt} error="${message}"`,
      );
      return;
    }

    await markJobFailed(job.id, job.provenanceEventId, message);
    console.error(
      `[BlockchainWorker] Submission failed (permanent) event=${job.eventType} dataset=${job.datasetId} attempt=${attemptsMade + 1} error="${message}"`,
    );
  }
}

async function processBatch(): Promise<number> {
  const job = await claimNextJob();
  if (job === null) return 0;
  await processJob(job);
  return 1;
}

// ── Observability ────────────────────────────────────────────────────────────
export interface BlockchainWorkerStats {
  enabled: boolean;
  intervalMs: number | null;
  startedAt: string | null;
  lastPollAt: string | null;
  lastPollProcessed: number;
  lastPollDurationMs: number | null;
  totalProcessed: number;
  totalConfirmed: number;
  totalFailed: number;
  lastError: string | null;
}

const createEmptyStats = (): BlockchainWorkerStats => ({
  enabled: false,
  intervalMs: null,
  startedAt: null,
  lastPollAt: null,
  lastPollProcessed: 0,
  lastPollDurationMs: null,
  totalProcessed: 0,
  totalConfirmed: 0,
  totalFailed: 0,
  lastError: null,
});

let workerStats: BlockchainWorkerStats = createEmptyStats();

export function getBlockchainWorkerStats(): BlockchainWorkerStats {
  return { ...workerStats };
}

export interface BlockchainWorkerHandle {
  stop: () => Promise<void>;
  /** Runs one poll cycle now (used by tests and on-demand sweeps). */
  pollOnce: () => Promise<number>;
}

export function startBlockchainWorker(intervalMs: number = 30_000): BlockchainWorkerHandle {
  if (!isBlockchainSubmissionRequired()) {
    console.log(
      `[BlockchainWorker] Disabled (APTOS_NETWORK=${BLOCKCHAIN_ENV}, blockchain submission not required).`,
    );
    return {
      stop: async () => undefined,
      pollOnce: async () => 0,
    };
  }

  workerStats = {
    ...createEmptyStats(),
    enabled: true,
    intervalMs,
    startedAt: new Date().toISOString(),
  };

  let running = false;
  let stopped = false;

  const poll = async (): Promise<void> => {
    if (running || stopped) return;
    running = true;
    try {
      const startedAt = Date.now();
      let processed = 0;
      // Drain up to 5 jobs per cycle so a burst doesn't starve the loop.
      for (let i = 0; i < 5; i += 1) {
        const count = await processBatch();
        if (count === 0) break;
        processed += count;
      }
      workerStats.lastPollAt = new Date().toISOString();
      workerStats.lastPollProcessed = processed;
      workerStats.totalProcessed += processed;
      workerStats.lastPollDurationMs = Date.now() - startedAt;
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : String(cause);
      workerStats.lastError = message;
      console.error('[BlockchainWorker] Poll cycle failed:', cause);
    } finally {
      running = false;
    }
  };

  const firstRun = setTimeout(() => {
    void poll();
  }, 15_000);
  const timer = setInterval(() => {
    void poll();
  }, intervalMs);
  timer.unref?.();

  console.log(`[BlockchainWorker] Started (interval ${intervalMs}ms, network ${BLOCKCHAIN_ENV}).`);

  return {
    stop: async () => {
      stopped = true;
      clearTimeout(firstRun);
      clearInterval(timer);
      // Wait for an in-flight poll to finish so the DB can close safely.
      while (running) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    },
    pollOnce: async () => {
      const count = await processBatch();
      workerStats.totalProcessed += count;
      return count;
    },
  };
}

// Best-effort query used only for observability of the backlog.
export async function getOutboxBacklogCount(): Promise<number> {
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(blockchainOutbox)
      .where(eq(blockchainOutbox.status, 'PENDING'));
    return Number(rows.at(0)?.count ?? 0);
  } catch {
    return 0;
  }
}
