// IMPLEMENTER NOTE: Shared DB sync for escrow resolution. Used by both the
// buyer-facing POST /escrow/:id/status route (manual confirm/dispute) and the
// escrow auto-release keeper (expired dispute window). The on-chain tx is the
// source of truth; this mirrors the outcome into escrow_entries and records
// the fee-split payment into the on_chain_payments revenue ledger on release.
// DB TABLES: escrow_entries, on_chain_payments

import { and, eq } from 'drizzle-orm';

import { db, escrowEntries, onChainPayments } from '../db/index.js';

// Mirrors the marketplace contract fee split (verida_marketplace::platform).
const ESCROW_FEE_BASIS_POINTS = 500;
const FEE_DENOMINATOR = 10_000;

/**
 * Pure: splits a total escrow payout between the publisher (net of the
 * platform fee) and the fee, mirroring the contract's integer math
 * (floor(amount * bps / 10000)).
 */
export function computeFeeSplit(
  amountOctas: number,
  feeBasisPoints: number = ESCROW_FEE_BASIS_POINTS,
): { feeOctas: number; publisherOctas: number } {
  const feeOctas = Math.floor((amountOctas * feeBasisPoints) / FEE_DENOMINATOR);
  return { feeOctas, publisherOctas: amountOctas - feeOctas };
}

export interface EscrowResolveParams {
  amountOctas: number;
  buyerAddress: string;
  datasetId: number | null;
  escrowId: number;
  paymentType: 'escrow_auto_release' | 'escrow_release';
  publisherAddress: string;
  status: 'disputed' | 'released';
  txHash?: string;
}

/**
 * Optimistically transitions a pending escrow to `released` or `disputed`.
 * Returns false when the row was already resolved (concurrent sync lost), in
 * which case nothing is written.
 */
export async function resolveEscrowEntry(params: EscrowResolveParams): Promise<boolean> {
  const resolvedAtIso = new Date().toISOString();
  let updated = false;

  await db.transaction(async (tx) => {
    const rows = await tx
      .update(escrowEntries)
      .set({
        resolvedAt: resolvedAtIso,
        status: params.status,
      })
      .where(and(eq(escrowEntries.id, params.escrowId), eq(escrowEntries.status, 'pending')))
      .returning({ id: escrowEntries.id });

    if (rows.length === 0) return;
    updated = true;

    // On release, record the fee-split payment into the revenue ledger.
    if (params.status === 'released') {
      const { feeOctas: feeAmount, publisherOctas: publisherAmount } = computeFeeSplit(params.amountOctas);

      await tx.insert(onChainPayments).values({
        amountOctas: publisherAmount,
        datasetId: params.datasetId,
        feeOctas: feeAmount,
        payeeAddress: params.publisherAddress,
        payerAddress: params.buyerAddress,
        paymentType: params.paymentType,
        timestamp: resolvedAtIso,
        txHash: params.txHash ?? `escrow-${params.escrowId}`,
      });
    }
  });

  return updated;
}
