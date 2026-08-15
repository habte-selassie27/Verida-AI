// Central provenance event recorder. Every provenance event that must be
// recorded on-chain is created ATOMICALLY with its blockchain_outbox job in a
// single transaction — the outbox can never be missing for an event that
// exists, and the event can never be created without its durable job.
//
// Events are queued for Aptos only when the environment has blockchain
// submission enabled (testnet/mainnet). In local/demo mode events carry
// blockchain_status = NOT_REQUIRED and NO outbox job and NO fabricated tx
// hash — aptos_tx_hash stays NULL until a real transaction exists.

import {
  blockchainOutbox,
  provenanceChain,
  type BlockchainStatus,
  type ProvenanceEventType,
} from '../db/schema.js';
import { isBlockchainSubmissionRequired } from '../contracts/blockchainEnv.js';
import { PROVENANCE_MODULE } from '../contracts/client.js';
import type { ProvenanceReceipt } from '@verida/shared';

// The drizzle transaction handle passed into `db.transaction(cb)`. Passing it
// in keeps provenance + outbox creation atomic with the caller's own writes.
// Typed loosely because the schema object is `as const` (readonly), which is
// structurally incompatible with drizzle's mutable transaction schema type —
// the actual tx objects passed by callers are the real, correctly-typed ones.
type InsertableTx = {
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: (cols: unknown) => Promise<unknown[]>;
    };
  };
};

function asTx(tx: unknown): InsertableTx {
  return tx as InsertableTx;
}

// Mirrors the Move module's u8 event codes (verida_marketplace::provenance).
export const PROVENANCE_EVENT_CODES: Record<ProvenanceEventType, number> = {
  UPLOAD: 0,
  VERSION_ADDED: 1,
  VERIFIED: 2,
  TAMPER_DETECTED: 3,
  ACCESSED: 4,
  OWNERSHIP_TRANSFERRED: 5,
};

export interface RecordProvenanceEventInput {
  datasetId: number;
  version: number;
  eventType: ProvenanceEventType;
  actorAddress: string;
  timestamp?: string;
  shelbyReceipt?: ProvenanceReceipt | null;
  /** A real Aptos tx hash if one exists for this event; otherwise omit. */
  txHash?: string | null;
  metadata?: Record<string, unknown>;
  /** Merkle root of the dataset at the time of the event (for on-chain payload). */
  merkleRoot?: string;
  blobId?: string;
}

export interface RecordedProvenanceEvent {
  id: number;
  datasetId: number;
  blockchainStatus: BlockchainStatus;
  txHash: string | null;
  outboxId: number | null;
}

/**
 * Inserts a provenance event and (when blockchain submission is required) its
 * outbox job inside the given transaction. Pass the drizzle `tx` handle from an
 * existing transaction to keep the caller's atomicity guarantees.
 */
export async function recordProvenanceEvent(
  tx: unknown,
  input: RecordProvenanceEventInput,
): Promise<RecordedProvenanceEvent> {
  const queuedForBlockchain = isBlockchainSubmissionRequired();

  const txHandle = asTx(tx);

  const inserted = (await txHandle
    .insert(provenanceChain)
    .values({
      actorAddress: input.actorAddress,
      datasetId: input.datasetId,
      eventType: input.eventType,
      metadata: input.metadata ?? {},
      shelbyReceipt: input.shelbyReceipt ?? ({} as ProvenanceReceipt),
      timestamp: input.timestamp ?? new Date().toISOString(),
      txHash: input.txHash ?? null,
      version: input.version,
      blockchainStatus: queuedForBlockchain ? 'PENDING' : 'NOT_REQUIRED',
    })
    .returning({
      id: provenanceChain.id,
    })) as Array<{ id: number }>;

  const event = inserted.at(0);
  if (event === undefined) {
    throw new Error('Provenance event insert did not return a row.');
  }

  let outboxId: number | null = null;
  if (queuedForBlockchain) {
    const payload = buildOutboxPayload(input);
    const outboxRows = (await txHandle
      .insert(blockchainOutbox)
      .values({
        datasetId: input.datasetId,
        eventType: input.eventType,
        payload,
        provenanceEventId: event.id,
        status: 'PENDING',
        attemptCount: 0,
      })
      .returning({ id: blockchainOutbox.id })) as Array<{ id: number }>;
    outboxId = outboxRows.at(0)?.id ?? null;
  }

  return {
    id: event.id,
    datasetId: input.datasetId,
    blockchainStatus: queuedForBlockchain ? 'PENDING' : 'NOT_REQUIRED',
    txHash: input.txHash ?? null,
    outboxId,
  };
}

/** Builds the on-chain metadata payload: identifiers + hashes only. */
function buildOutboxPayload(input: RecordProvenanceEventInput): Record<string, unknown> {
  return {
    eventType: input.eventType,
    eventCode: PROVENANCE_EVENT_CODES[input.eventType],
    datasetId: input.datasetId,
    version: input.version,
    blobId: input.blobId ?? (input.shelbyReceipt?.blobId ?? null),
    merkleRoot: input.merkleRoot ?? (input.shelbyReceipt?.merkleRoot ?? null),
    actor: input.actorAddress,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Returns the Move entry function + arguments for emitting a provenance event
 * on-chain. `emitter` is the server signer — the browser never writes
 * authoritative provenance events.
 */
export function buildEmitEventArguments(
  payload: Record<string, unknown>,
  emitterAddress: string,
): { function: string; functionArguments: (string | number)[] } {
  const datasetId = Number(payload.datasetId);
  const version = Number(payload.version);
  const eventCode = Number(payload.eventCode ?? 0);
  const metadataJson = JSON.stringify({
    blobId: payload.blobId ?? null,
    merkleRoot: payload.merkleRoot ?? null,
    actor: payload.actor ?? null,
    eventType: payload.eventType ?? null,
  });

  return {
    function: `${PROVENANCE_MODULE}::emit_event`,
    functionArguments: [datasetId, version, eventCode, metadataJson],
  };
}
