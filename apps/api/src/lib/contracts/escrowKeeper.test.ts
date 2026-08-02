import { describe, it, expect } from 'vitest';
import { ESCROW_MODULE } from './client.js';
import { extractEscrowState, findExpiredEscrows, type EscrowVaultEntry } from './escrowKeeper.js';

// Realistic on-chain shapes: REST API serializes u64 fields as strings.
const vaultType = `${ESCROW_MODULE}::EscrowVault`;
const configType = `${ESCROW_MODULE}::EscrowConfig`;

function entry(partial: Partial<EscrowVaultEntry>): EscrowVaultEntry {
  return {
    id: '1',
    buyer: '0xbuyer',
    publisher: '0xpub',
    dataset_id: '42',
    amount_octas: '100000000',
    created_at: '1700000000',
    status: '0',
    ...partial,
  };
}

describe('extractEscrowState', () => {
  it('parses EscrowVault entries and the configured dispute window', () => {
    const state = extractEscrowState([
      { type: vaultType, data: { entries: [entry({ id: '7' }), entry({ id: '8', status: '1' })] } },
      { type: configType, data: { next_id: '9', dispute_window: '120' } },
    ]);

    expect(state.entries.map((e) => e.id)).toEqual(['7', '8']);
    expect(state.disputeWindowSeconds).toBe(120);
  });

  it('returns empty entries when EscrowVault is absent', () => {
    const state = extractEscrowState([{ type: configType, data: { next_id: '1', dispute_window: '604800' } }]);
    expect(state.entries).toEqual([]);
    expect(state.disputeWindowSeconds).toBe(604800);
  });

  it('falls back to the default 7-day window when EscrowConfig is absent', () => {
    const state = extractEscrowState([{ type: vaultType, data: { entries: [] } }]);
    expect(state.disputeWindowSeconds).toBe(7 * 24 * 60 * 60);
  });

  it('ignores a malformed dispute_window', () => {
    const state = extractEscrowState([
      { type: configType, data: { next_id: '1', dispute_window: 'not-a-number' } },
    ]);
    expect(state.disputeWindowSeconds).toBe(7 * 24 * 60 * 60);
  });

  it('ignores unrelated resource types', () => {
    const state = extractEscrowState([
      { type: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>', data: { coin: { value: '5' } } },
      { type: `${ESCROW_MODULE}::EscrowVault`, data: { entries: [] } },
    ]);
    expect(state.entries).toEqual([]);
  });

  it('tolerates a vault whose entries are not an array', () => {
    const state = extractEscrowState([{ type: vaultType, data: { entries: 'oops' } }]);
    expect(state.entries).toEqual([]);
  });
});

describe('findExpiredEscrows', () => {
  const window = 120;
  const grace = 60;

  it('selects pending escrows past created_at + window + grace', () => {
    const createdAt = 1700000000;
    const now = createdAt + window + grace + 1;
    const expired = findExpiredEscrows(
      [entry({ id: '1', created_at: String(createdAt) })],
      window,
      now,
      grace,
    );
    expect(expired).toEqual([1]);
  });

  it('includes an entry landing exactly on the deadline', () => {
    const createdAt = 1700000000;
    const now = createdAt + window + grace;
    const expired = findExpiredEscrows(
      [entry({ id: '1', created_at: String(createdAt) })],
      window,
      now,
      grace,
    );
    expect(expired).toEqual([1]);
  });

  it('excludes escrows still inside the dispute window', () => {
    const createdAt = 1700000000;
    const now = createdAt + window + grace - 1;
    const expired = findExpiredEscrows(
      [entry({ id: '1', created_at: String(createdAt) })],
      window,
      now,
      grace,
    );
    expect(expired).toEqual([]);
  });

  it('skips released, disputed, and refunded entries', () => {
    const createdAt = 1700000000;
    const now = createdAt + window + grace + 100;
    const expired = findExpiredEscrows(
      [
        entry({ id: '1', created_at: String(createdAt), status: '1' }),
        entry({ id: '2', created_at: String(createdAt), status: '2' }),
        entry({ id: '3', created_at: String(createdAt), status: '3' }),
        entry({ id: '4', created_at: String(createdAt), status: '0' }),
      ],
      window,
      now,
      grace,
    );
    expect(expired).toEqual([4]);
  });

  it('skips entries with unparseable ids or timestamps', () => {
    const createdAt = 1700000000;
    const now = createdAt + window + grace + 100;
    const expired = findExpiredEscrows(
      [
        entry({ id: 'nan', created_at: String(createdAt) }),
        entry({ id: '2', created_at: 'not-a-time' }),
        entry({ id: '3', created_at: String(createdAt) }),
      ],
      window,
      now,
      grace,
    );
    expect(expired).toEqual([3]);
  });

  it('returns an empty list for an empty vault', () => {
    expect(findExpiredEscrows([], window, 9999999999, grace)).toEqual([]);
  });
});
