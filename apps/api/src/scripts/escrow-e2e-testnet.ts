// IMPLEMENTER NOTE: End-to-end test of the escrow lifecycle on a live network
// (Aptos testnet or shelbynet, as configured by APTOS_NODE_URL):
//
//   deposit → (shortened) dispute-window expiry → keeper auto_release →
//   verify on-chain status + DB/ledger sync.
//
// Prerequisites:
//   - The upgraded escrow module (vault-held coins + fee split +
//     set_dispute_window) is published at MARKETPLACE_CONTRACT_ADDRESS.
//   - SHELBY_SIGNER_PRIVATE_KEY is a funded account that OWNS the module (it
//     shortens the dispute window) and can pay gas for the test txs.
//   - DATABASE_URL is reachable (used to verify DB sync; falls back to
//     on-chain-only verification with a warning if it isn't).
//
// Run from apps/api:
//   npx tsx --env-file ../../.env src/scripts/escrow-e2e-testnet.ts
//
// Env:
//   ESCROW_E2E_WINDOW_SECONDS   dispute window to set for the test (default 120)
//   ESCROW_E2E_AMOUNT_OCTAS     escrow amount in octas (default 1_000_000 = 0.01 APT)
//   ESCROW_E2E_DATASET_ID       force a dataset id for the DB mirror (default: any dataset in DB, else null)

import { eq } from 'drizzle-orm';
import { Account, Ed25519Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

import { closeDb, db, datasets, escrowEntries, onChainPayments } from '../lib/db/index.js';
import {
  ESCROW_MODULE,
  MARKETPLACE_CONTRACT_ADDRESS,
  getMarketplaceAptosClient,
} from '../lib/contracts/client.js';
import {
  extractEscrowState,
  runEscrowAutoReleaseSweep,
  type EscrowVaultEntry,
} from '../lib/contracts/escrowKeeper.js';

const WINDOW_SECONDS = Number.parseInt(process.env.ESCROW_E2E_WINDOW_SECONDS ?? '120', 10);
const AMOUNT_OCTAS = Number.parseInt(process.env.ESCROW_E2E_AMOUNT_OCTAS ?? '1000000', 10);
const FORCED_DATASET_ID = process.env.ESCROW_E2E_DATASET_ID
  ? Number.parseInt(process.env.ESCROW_E2E_DATASET_ID, 10)
  : null;
// The keeper adds GRACE_SECONDS (60s) on top of the on-chain deadline, so we
// must wait past created_at + window + grace before it will release.
const KEEPER_GRACE_SECONDS = 60;
const POLL_INTERVAL_MS = 3_000;

type MoveResource = { type: string; data?: unknown };

function getSigner(): Account {
  const privateKey = process.env.SHELBY_SIGNER_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error('SHELBY_SIGNER_PRIVATE_KEY is required (must own the escrow module).');
  }
  const aip80Key = privateKey.startsWith('ed25519-priv-')
    ? privateKey
    : `ed25519-priv-${privateKey.replace(/^0x/i, '')}`;
  return new Ed25519Account({ privateKey: new Ed25519PrivateKey(aip80Key) });
}

async function submitEntry(
  aptos: ReturnType<typeof getMarketplaceAptosClient>,
  signer: Account,
  entryFunction: string,
  functionArguments: (number | string)[],
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    data: { function: entryFunction as `${string}::${string}::${string}`, functionArguments },
    sender: signer.accountAddress,
  });
  const submitted = await aptos.signAndSubmitTransaction({ signer, transaction });
  await aptos.waitForTransaction({ transactionHash: submitted.hash });
  return submitted.hash;
}

async function readVaultState(
  aptos: ReturnType<typeof getMarketplaceAptosClient>,
): Promise<{
  entries: EscrowVaultEntry[];
  disputeWindowSeconds: number;
  hasVaultCoins: boolean;
  vaultFound: boolean;
}> {
  const resources = (await aptos.getAccountResources({
    accountAddress: MARKETPLACE_CONTRACT_ADDRESS,
  })) as unknown as MoveResource[];
  const state = extractEscrowState(resources);

  const vaultResource = resources.find((r) => r.type === `${ESCROW_MODULE}::EscrowVault`);
  // The module-managed coin vault is a separate resource (EscrowVault's layout
  // is frozen for upgrade compatibility).
  const coinsResource = resources.find((r) => r.type === `${ESCROW_MODULE}::EscrowVaultCoins`);
  return {
    ...state,
    hasVaultCoins: coinsResource !== undefined,
    vaultFound: vaultResource !== undefined,
  };
}

async function moduleHasFunction(
  aptos: ReturnType<typeof getMarketplaceAptosClient>,
  functionName: string,
): Promise<boolean> {
  try {
    const module = await aptos.getAccountModule({
      accountAddress: MARKETPLACE_CONTRACT_ADDRESS,
      moduleName: 'escrow',
    });
    const abi = (module as { abi?: { exposed_functions?: Array<{ name: string }> } }).abi;
    return abi?.exposed_functions?.some((f) => f.name === functionName) ?? false;
  } catch {
    return false;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const aptos = getMarketplaceAptosClient();
  const signer = getSigner();
  const signerAddress = signer.accountAddress.toString();
  const checks: string[] = [];
  let failures = 0;
  let originalWindowSeconds: number | null = null;
  let windowChanged = false;

  // Restores the dispute window changed for the test so an interrupted run can
  // never leave the deployed contract with a short auto-release window.
  const restoreDisputeWindow = async (): Promise<void> => {
    if (!windowChanged || originalWindowSeconds === null) return;
    const current = await readVaultState(aptos).then((s) => s.disputeWindowSeconds).catch(() => null);
    if (current === originalWindowSeconds) return;
    try {
      const hash = await submitEntry(aptos, signer, `${ESCROW_MODULE}::set_dispute_window`, [
        originalWindowSeconds,
      ]);
      console.log(`✓ restored dispute window → ${originalWindowSeconds}s (tx ${hash})`);
    } catch (cause: unknown) {
      console.warn(
        '⚠ could not restore dispute window — restore manually:',
        cause instanceof Error ? cause.message : cause,
      );
    }
  };

  const check = (label: string, ok: boolean, detail: string): void => {
    checks.push(`${ok ? '✓' : '✗'} ${label} — ${detail}`);
    if (!ok) failures += 1;
  };

  console.log('── Escrow lifecycle E2E ─────────────────────────────');
  console.log(`network: ${process.env.APTOS_NODE_URL ?? '(default)'}`);
  console.log(`contract: ${MARKETPLACE_CONTRACT_ADDRESS}`);
  console.log(`signer: ${signerAddress}`);

  // 1. Pre-flight: deployed module must be the upgraded one. init_module does
  // NOT re-run on upgrades, so a missing EscrowVaultCoins resource is expected
  // after the first upgrade — initialize it (idempotent) before proceeding.
  let initial = await readVaultState(aptos);
  originalWindowSeconds = initial.disputeWindowSeconds;
  check(
    'escrow module deployed (EscrowVault present)',
    initial.vaultFound,
    initial.vaultFound ? 'vault found' : 'not found — publish the upgraded contract first',
  );
  if (!initial.hasVaultCoins) {
    console.log('EscrowVaultCoins missing (init_module skipped on upgrades) — calling initialize_vault…');
    try {
      const hash = await submitEntry(aptos, signer, `${ESCROW_MODULE}::initialize_vault`, []);
      console.log(`✓ initialize_vault (tx ${hash})`);
      initial = await readVaultState(aptos);
    } catch (cause: unknown) {
      console.error('initialize_vault reverted — is the signer the module owner?', cause instanceof Error ? cause.message : cause);
    }
  }
  check(
    'module-managed coin vault initialized',
    initial.hasVaultCoins,
    initial.hasVaultCoins ? 'EscrowVaultCoins present' : 'missing after initialize_vault',
  );
  if (!initial.hasVaultCoins) {
    failures += 1;
  }

  // 2. Shorten the dispute window so the test completes in minutes, not days.
  let windowSeconds = initial.disputeWindowSeconds;
  if (windowSeconds > WINDOW_SECONDS) {
    const hasSetter = await moduleHasFunction(aptos, 'set_dispute_window');
    if (!hasSetter) {
      console.error(
        '\n✗ Deployed escrow module has no set_dispute_window; cannot shorten the\n' +
          `  ${windowSeconds}s window for a fast test. Publish the upgraded contract first.`,
      );
      failures += 1;
    } else {
      try {
        const hash = await submitEntry(aptos, signer, `${ESCROW_MODULE}::set_dispute_window`, [
          WINDOW_SECONDS,
        ]);
        console.log(`✓ set_dispute_window → ${WINDOW_SECONDS}s (tx ${hash})`);
        windowChanged = true;
        windowSeconds = WINDOW_SECONDS;
      } catch (cause: unknown) {
        console.error(
          '\n✗ set_dispute_window reverted — is the signer the module owner?',
          cause instanceof Error ? cause.message : cause,
        );
        failures += 1;
      }
    }
  } else {
    console.log(`dispute window already ${windowSeconds}s — no change needed`);
  }

  // 3. Balance check.
  const balance = await aptos.getAccountAPTAmount({ accountAddress: signerAddress });
  if (balance < AMOUNT_OCTAS + 200_000) {
    console.error(
      `\n✗ Signer balance ${balance} octas is too low (need ${AMOUNT_OCTAS + 200_000}). Fund it first.`,
    );
    failures += 1;
  }

  if (failures > 0) {
    await restoreDisputeWindow();
    await closeDb();
    console.log('\nPre-flight failed. Nothing was deposited.');
    process.exit(1);
  }

  // 4. Pick a dataset to mirror (best-effort; on-chain does not validate it).
  let datasetId: number | null = FORCED_DATASET_ID;
  // NOTE: explicitly widened to `string` — signerAddress is typed `0x${string}`
  // by the SDK and would reject a plain string from the DB otherwise.
  let publisherAddress: string = signerAddress;
  let dbAvailable = true;
  try {
    const dsRows = await db
      .select({ id: datasets.id, publisherAddress: datasets.publisherAddress })
      .from(datasets)
      .limit(1);
    const ds = dsRows.at(0);
    if (FORCED_DATASET_ID === null && ds) {
      datasetId = ds.id;
      publisherAddress = ds.publisherAddress;
    }
  } catch (cause: unknown) {
    dbAvailable = false;
    console.warn('DB unreachable — verifying on-chain only.', cause instanceof Error ? cause.message : cause);
  }

  // 5. Deposit (buyer = signer). Escrow id is the pre-deposit next_id.
  // NOTE: getAccountResource resolves to the resource DATA itself (not a
  // `{ data }` wrapper) — the next_id is a top-level string field.
  const configRows = await aptos.getAccountResource({
    accountAddress: MARKETPLACE_CONTRACT_ADDRESS,
    resourceType: `${ESCROW_MODULE}::EscrowConfig` as `${string}::${string}::${string}`,
  });
  const nextId = Number((configRows as { next_id?: string })?.next_id ?? '0');
  const escrowId = nextId;

  const depositHash = await submitEntry(aptos, signer, `${ESCROW_MODULE}::deposit`, [
    publisherAddress,
    datasetId ?? 0,
    AMOUNT_OCTAS,
  ]);
  console.log(`✓ deposited ${AMOUNT_OCTAS} octas → escrow #${escrowId} (tx ${depositHash})`);

  // Find the on-chain created_at for this escrow.
  const afterDeposit = await readVaultState(aptos);
  const entry = afterDeposit.entries.find((e) => Number(e.id) === escrowId);
  if (!entry) {
    console.error(`\n✗ Escrow #${escrowId} not found on-chain after deposit.`);
    await restoreDisputeWindow();
    await closeDb();
    process.exit(1);
  }
  const createdAt = Number(entry.created_at);

  // 6. Mirror the escrow into the DB (only if the DB is reachable). A missing
  // table or unreachable DB degrades to on-chain-only verification.
  if (dbAvailable) {
    try {
      await db.insert(escrowEntries).values({
        amountOctas: AMOUNT_OCTAS,
        buyerAddress: signerAddress,
        datasetId,
        onChainEscrowId: escrowId,
        publisherAddress,
        status: 'pending',
      });
      console.log(`✓ mirrored escrow #${escrowId} into escrow_entries`);
    } catch (cause: unknown) {
      dbAvailable = false;
      console.warn(
        'Failed to mirror escrow into the DB — continuing on-chain only.',
        cause instanceof Error ? cause.message : cause,
      );
    }
  }

  // 7. Wait for the keeper's release threshold (window + keeper grace).
  const releaseAt = createdAt + windowSeconds + KEEPER_GRACE_SECONDS + 5;
  const nowSeconds = Math.floor(Date.now() / 1000);
  console.log(
    `waiting until on-chain ts ${releaseAt} (${Math.max(0, releaseAt - nowSeconds)}s) for auto-release threshold…`,
  );
  while (Math.floor(Date.now() / 1000) < releaseAt) {
    await sleep(POLL_INTERVAL_MS);
  }

  // 8. Run the keeper sweep.
  const { released, errors } = await runEscrowAutoReleaseSweep();
  check(
    `keeper auto-released escrow #${escrowId}`,
    released.includes(escrowId),
    released.includes(escrowId) ? `released: ${released.join(', ')}` : `errors: ${JSON.stringify(errors)}`,
  );

  // 9. On-chain verification.
  const finalState = await readVaultState(aptos);
  const finalEntry = finalState.entries.find((e) => Number(e.id) === escrowId);
  const onChainStatus = Number(finalEntry?.status);
  check('on-chain status = released', onChainStatus === 1, `status=${onChainStatus}`);

  // 10. DB + ledger verification (best-effort).
  if (dbAvailable && failures === 0) {
    try {
      const dbRows = await db
        .select()
        .from(escrowEntries)
        .where(eq(escrowEntries.onChainEscrowId, escrowId))
        .limit(1);
      const dbEntry = dbRows.at(0);
      check('DB escrow status = released', dbEntry?.status === 'released', dbEntry?.status ?? 'missing');

      // Find the auto_release tx hash from the signer's recent txs.
      const txs = await aptos.getAccountTransactions({
        accountAddress: signerAddress,
        options: { limit: 10 },
      });
      // NOTE: REST serializes entry-arg u64s as strings, so compare with String().
      const autoReleaseTx = txs.find(
        (tx) =>
          tx.type === 'user_transaction' &&
          (tx as { payload?: { function?: string; arguments?: unknown[] } }).payload?.function ===
            `${ESCROW_MODULE}::auto_release` &&
          String((tx as { payload?: { arguments?: unknown[] } }).payload?.arguments?.[0]) ===
            String(escrowId) &&
          (tx as { success?: boolean }).success === true,
      );
      const txHash = autoReleaseTx ? (autoReleaseTx as { hash: string }).hash : null;

      const feeOctas = Math.floor((AMOUNT_OCTAS * 500) / 10_000);
      const ledgerRows = txHash
        ? await db
            .select()
            .from(onChainPayments)
            .where(eq(onChainPayments.txHash, txHash))
            .limit(1)
        : [];
      const ledger = ledgerRows.at(0);
      check(
        'revenue ledger has fee-split payment',
        ledger !== undefined &&
          ledger.paymentType === 'escrow_auto_release' &&
          ledger.feeOctas === feeOctas &&
          ledger.amountOctas === AMOUNT_OCTAS - feeOctas,
        ledger ? `fee=${ledger.feeOctas} net=${ledger.amountOctas} (expected ${feeOctas}/${AMOUNT_OCTAS - feeOctas})` : 'no ledger row',
      );
    } catch (cause: unknown) {
      console.warn('DB verification failed:', cause instanceof Error ? cause.message : cause);
    }
  }

  // Summary.
  await restoreDisputeWindow();
  console.log('\n── Results ──────────────────────────────────────────');
  for (const line of checks) console.log(line);
  await closeDb();
  console.log(failures === 0 ? '\nPASS — escrow lifecycle verified end-to-end.' : `\nFAIL — ${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
