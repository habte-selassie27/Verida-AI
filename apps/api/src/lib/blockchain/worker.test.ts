import { describe, expect, it } from 'vitest';
import { retryDelayForAttempt } from './worker.js';
import { buildExplorerTxUrl, isBlockchainSubmissionRequired, BLOCKCHAIN_ENV } from '../contracts/blockchainEnv.js';

describe('retryDelayForAttempt', () => {
  it('follows the exponential backoff schedule 5s → 30s → 2m → 10m → 30m', () => {
    expect(retryDelayForAttempt(0)).toBe(5_000);
    expect(retryDelayForAttempt(1)).toBe(30_000);
    expect(retryDelayForAttempt(2)).toBe(120_000);
    expect(retryDelayForAttempt(3)).toBe(600_000);
    expect(retryDelayForAttempt(4)).toBe(1_800_000);
  });

  it('caps at the longest delay for attempts beyond the schedule', () => {
    expect(retryDelayForAttempt(10)).toBe(1_800_000);
  });
});

describe('blockchainEnv', () => {
  it('builds explorer URLs from the environment network + real tx hash', () => {
    const url = buildExplorerTxUrl('0xabc123');
    const network = BLOCKCHAIN_ENV === 'MAINNET' ? 'mainnet' : 'testnet';
    expect(url).toBe(`https://explorer.aptoslabs.com/txn/0xabc123?network=${network}`);
  });

  it('exposes a stable submission-required flag', () => {
    // The flag itself depends on APTOS_NETWORK, but it must always be a boolean.
    expect(typeof isBlockchainSubmissionRequired()).toBe('boolean');
  });
});
