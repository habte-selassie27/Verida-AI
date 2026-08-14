// IMPLEMENTER NOTE: Periodic keeper that calls escrow::auto_release for pending
// escrows whose 7-day dispute window has expired, then mirrors the result into
// escrow_entries and the on_chain_payments revenue ledger.
// ARCHITECT CONTRACT: escrow::auto_release(escrow_id) — no caller auth, so any
// funded account can trigger it once timestamp::now_seconds() >= created_at + dispute_window.
// DB TABLES: escrow_entries, on_chain_payments

import { eq } from 'drizzle-orm';
import { Account } from '@aptos-labs/ts-sdk';

import { db, escrowEntries } from '../db/index.js';
import { MARKETPLACE_CONTRACT_ADDRESS, ESCROW_MODULE, getMarketplaceAptosClient } from './client.js';
import { resolveEscrowEntry } from './escrowSync.js';
import { getServerSigner } from './signer.js';

// Mirrors STATUS_PENDING in the escrow Move module.
const STATUS_PENDING = 0;
// Fallback used only if EscrowConfig can't be read (matches DISPUTE_WINDOW_SECONDS).
const DEFAULT_DISPUTE_WINDOW_SECONDS = 7 * 24 * 60 * 60;
// Grace buffer so clock skew between this server and the chain can't cause a
// premature call that reverts on the `now >= created_at + window` assert.
const GRACE_SECONDS = 60;

export interface EscrowVaultEntry {
  id: string;
  buyer: string;
  publisher: string;
  dataset_id: string;
  amount_octas: string;
  created_at: string;
  status: string;
}

interface EscrowVaultResource {
  entries: EscrowVaultEntry[];
  coins?: Record<string, unknown>;
}

interface EscrowConfigResource {
  next_id: string;
  dispute_window: string;
}

type MoveResource = { type: string; data?: unknown };

/**
 * Pure: scans an account's Move resources for the escrow module's EscrowVault
 * and EscrowConfig and normalizes them into keeper-friendly shape. Any missing
 * or malformed resource degrades to empty entries / the default window so a
 * not-yet-deployed contract reads as a no-op sweep rather than a crash.
 */
export function extractEscrowState(resources: ReadonlyArray<MoveResource>): {
  entries: EscrowVaultEntry[];
  disputeWindowSeconds: number;
} {
  let entries: EscrowVaultEntry[] = [];
  let disputeWindowSeconds = DEFAULT_DISPUTE_WINDOW_SECONDS;

  for (const resource of resources) {
    if (resource.type === `${ESCROW_MODULE}::EscrowVault`) {
      const vault = resource.data as EscrowVaultResource | undefined;
      entries = Array.isArray(vault?.entries) ? vault.entries : [];
    } else if (resource.type === `${ESCROW_MODULE}::EscrowConfig`) {
      const config = resource.data as EscrowConfigResource | undefined;
      const parsed = Number(config?.dispute_window);
      if (Number.isFinite(parsed) && parsed > 0) {
        disputeWindowSeconds = parsed;
      }
    }
  }

  return { entries, disputeWindowSeconds };
}

/**
 * Pure: selects the ids of pending escrows whose dispute window has fully
 * expired (created_at + window + grace), skipping released/disputed/refunded
 * entries and entries with unparseable ids or timestamps.
 */
export function findExpiredEscrows(
  entries: ReadonlyArray<EscrowVaultEntry>,
  disputeWindowSeconds: number,
  nowSeconds: number,
  graceSeconds: number = GRACE_SECONDS,
): number[] {
  const expired: number[] = [];

  for (const entry of entries) {
    const entryId = Number(entry.id);
    const createdSeconds = Number(entry.created_at);
    const status = Number(entry.status);

    if (status !== STATUS_PENDING) continue;
    if (!Number.isFinite(entryId) || !Number.isFinite(createdSeconds)) continue;

    const deadline = createdSeconds + disputeWindowSeconds + graceSeconds;
    if (nowSeconds >= deadline) {
      expired.push(entryId);
    }
  }

  return expired;
}

function getEscrowKeeperSigner(): Account {
  return getServerSigner();
}

async function fetchEscrowState(): Promise<{
  entries: EscrowVaultEntry[];
  disputeWindowSeconds: number;
}> {
  const aptos = getMarketplaceAptosClient();
  const resources = await aptos.getAccountResources({ accountAddress: MARKETPLACE_CONTRACT_ADDRESS });
  return extractEscrowState(resources as unknown as ReadonlyArray<MoveResource>);
}

async function autoReleaseEscrow(
  entryId: number,
  signer: Account,
): Promise<string> {
  const aptos = getMarketplaceAptosClient();
  const transaction = await aptos.transaction.build.simple({
    data: {
      function: `${ESCROW_MODULE}::auto_release` as `${string}::${string}::${string}`,
      functionArguments: [entryId],
    },
    sender: signer.accountAddress,
  });

  const submitted = await aptos.signAndSubmitTransaction({ signer, transaction });
  await aptos.waitForTransaction({ transactionHash: submitted.hash });
  return submitted.hash;
}

// Mirror a successful on-chain release into escrow_entries (pending → released)
// and record the fee-split payment into the revenue ledger — the same shape the
// buyer-facing POST /escrow/:id/status produces on manual confirmation.
async function markReleasedInDb(entryId: number, txHash: string): Promise<void> {
  const rows = await db
    .select({
      amountOctas: escrowEntries.amountOctas,
      buyerAddress: escrowEntries.buyerAddress,
      datasetId: escrowEntries.datasetId,
      id: escrowEntries.id,
      publisherAddress: escrowEntries.publisherAddress,
    })
    .from(escrowEntries)
    .where(eq(escrowEntries.onChainEscrowId, entryId))
    .limit(1);
  const entry = rows.at(0);
  if (!entry) return; // Not tracked in the DB — nothing to sync.

  await resolveEscrowEntry({
    amountOctas: entry.amountOctas,
    buyerAddress: entry.buyerAddress,
    datasetId: entry.datasetId,
    escrowId: entry.id,
    paymentType: 'escrow_auto_release',
    publisherAddress: entry.publisherAddress,
    status: 'released',
    txHash,
  });
}

export interface EscrowSweepResult {
  errors: Array<{ escrowId: number; error: string }>;
  released: number[];
}

// ── Observability ────────────────────────────────────────────────────────────
export interface EscrowKeeperStats {
  enabled: boolean;
  intervalMs: number | null;
  startedAt: string | null;
  lastSweepAt: string | null;
  lastSweepDurationMs: number | null;
  lastSweepReleased: number;
  lastSweepErrors: number;
  totalSweeps: number;
  totalReleased: number;
  totalErrors: number;
  lastError: string | null;
  lastErrorAt: string | null;
}

const createEmptyStats = (): EscrowKeeperStats => ({
  enabled: false,
  intervalMs: null,
  startedAt: null,
  lastSweepAt: null,
  lastSweepDurationMs: null,
  lastSweepReleased: 0,
  lastSweepErrors: 0,
  totalSweeps: 0,
  totalReleased: 0,
  totalErrors: 0,
  lastError: null,
  lastErrorAt: null,
});

let keeperStats: EscrowKeeperStats = createEmptyStats();

function recordSweep(released: number[], errors: EscrowSweepResult['errors']): void {
  keeperStats.lastSweepAt = new Date().toISOString();
  keeperStats.lastSweepReleased = released.length;
  keeperStats.lastSweepErrors = errors.length;
  keeperStats.totalSweeps += 1;
  keeperStats.totalReleased += released.length;
  keeperStats.totalErrors += errors.length;
  if (errors.length > 0) {
    keeperStats.lastError = errors[0]?.error ?? null;
    keeperStats.lastErrorAt = keeperStats.lastSweepAt;
  }
}

/** Returns a defensive copy of the keeper's live stats (safe to serialize). */
export function getEscrowKeeperStats(): EscrowKeeperStats {
  return { ...keeperStats };
}

export async function runEscrowAutoReleaseSweep(): Promise<EscrowSweepResult> {
  const released: number[] = [];
  const errors: Array<{ escrowId: number; error: string }> = [];

  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    console.warn('[EscrowKeeper] MARKETPLACE_CONTRACT_ADDRESS is not configured. Skipping sweep.');
    recordSweep(released, errors);
    return { errors, released };
  }

  let state: Awaited<ReturnType<typeof fetchEscrowState>>;
  try {
    state = await fetchEscrowState();
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error('[EscrowKeeper] Failed to read on-chain escrow state:', message);
    errors.push({ escrowId: 0, error: `fetch escrow state: ${message}` });
    recordSweep(released, errors);
    return { errors, released };
  }

  const signer = getEscrowKeeperSigner();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiredIds = findExpiredEscrows(
    state.entries,
    state.disputeWindowSeconds,
    nowSeconds,
  );

  for (const entryId of expiredIds) {
    try {
      const txHash = await autoReleaseEscrow(entryId, signer);
      released.push(entryId);
      console.log(`[EscrowKeeper] Auto-released escrow ${entryId} (tx ${txHash}).`);
      await markReleasedInDb(entryId, txHash);
    } catch (cause: unknown) {
      const message = cause instanceof Error ? cause.message : String(cause);
      errors.push({ escrowId: entryId, error: message });
      console.warn(`[EscrowKeeper] Auto-release failed for escrow ${entryId}:`, message);
    }
  }

  recordSweep(released, errors);
  return { errors, released };
}

export interface EscrowKeeperHandle {
  // Stops the scheduler and awaits any in-flight sweep so the DB can be
  // closed safely afterwards.
  stop: () => Promise<void>;
}

export function startEscrowKeeper(
  intervalMs: number = 60 * 60 * 1000,
): EscrowKeeperHandle {
  if (process.env.ESCROW_KEEPER_ENABLED === 'false') {
    console.log('[EscrowKeeper] Disabled via ESCROW_KEEPER_ENABLED=false.');
    return { stop: async () => undefined };
  }

  keeperStats = {
    ...createEmptyStats(),
    enabled: true,
    intervalMs,
    startedAt: new Date().toISOString(),
  };

  // NOTE: In horizontally scaled deployments only one instance should run the
  // keeper (set ESCROW_KEEPER_ENABLED=false on the others). Concurrent runners
  // are safe on-chain — the second auto_release reverts on the status assert —
  // but would log expected race errors and double-read the vault.
  let running = false;
  let stopped = false;
  let inflight: Promise<void> | null = null;

  const sweep = async (): Promise<void> => {
    if (running || stopped) return;
    running = true;
    inflight = (async () => {
      const startedMs = Date.now();
      try {
        await runEscrowAutoReleaseSweep();
      } catch (cause: unknown) {
        console.error('[EscrowKeeper] Sweep crashed:', cause);
        // Record crashed sweeps too, so observability reflects the failure.
        recordSweep([], [{
          escrowId: 0,
          error: cause instanceof Error ? cause.message : String(cause),
        }]);
      } finally {
        keeperStats.lastSweepDurationMs = Date.now() - startedMs;
        running = false;
      }
    })();
    await inflight;
    inflight = null;
  };

  // Run once shortly after boot, then on the interval.
  const firstRun = setTimeout(() => {
    void sweep();
  }, 30_000);
  const timer = setInterval(() => {
    void sweep();
  }, intervalMs);
  timer.unref?.();

  console.log(`[EscrowKeeper] Started (interval ${intervalMs}ms).`);
  return {
    stop: async () => {
      stopped = true;
      clearTimeout(firstRun);
      clearInterval(timer);
      if (inflight) {
        await inflight;
      }
    },
  };
}
