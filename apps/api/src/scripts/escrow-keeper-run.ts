// IMPLEMENTER NOTE: One-shot escrow auto-release sweep for external cron
// schedulers (Render cron job, GitHub Actions, etc.).
//
//   npx tsx src/scripts/escrow-keeper-run.ts
//
// Finds pending on-chain escrows past their 7-day dispute window, calls
// escrow::auto_release for each, and mirrors the releases into the DB.
// Exit code 0 = sweep ran (possibly with per-entry errors logged), 1 = fatal.

import { closeDb } from '../lib/db/index.js';
import { runEscrowAutoReleaseSweep } from '../lib/contracts/escrowKeeper.js';

async function main(): Promise<void> {
  const { errors, released } = await runEscrowAutoReleaseSweep();

  console.log(
    `[EscrowKeeper] Sweep complete. Released: ${released.length}, errors: ${errors.length}.`,
  );
  if (errors.length > 0) {
    console.error(JSON.stringify(errors, null, 2));
  }

  await closeDb();

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

await main();
