// Centralizes Aptos network environment detection. Explicit configuration via
// APTOS_NETWORK=local|testnet|mainnet (defaults to testnet, matching the
// pre-existing client behavior). No hardcoded network selection in app logic.
export type BlockchainEnvironment = 'LOCAL' | 'TESTNET' | 'MAINNET';

function normalizeNetwork(raw: string | undefined): BlockchainEnvironment {
  const value = raw?.trim().toLowerCase();

  if (value === 'mainnet') return 'MAINNET';
  if (value === 'local' || value === 'dev' || value === 'development') return 'LOCAL';
  if (value === 'testnet') return 'TESTNET';

  // Unset / unrecognized: default to testnet (the historical default).
  return 'TESTNET';
}

export const BLOCKCHAIN_ENV: BlockchainEnvironment = normalizeNetwork(process.env.APTOS_NETWORK);

/** True when provenance events should be queued for on-chain submission. */
export function isBlockchainSubmissionRequired(): boolean {
  return BLOCKCHAIN_ENV === 'TESTNET' || BLOCKCHAIN_ENV === 'MAINNET';
}

export function getExplorerBaseUrl(): string {
  return BLOCKCHAIN_ENV === 'MAINNET' ? 'https://explorer.aptoslabs.com' : 'https://explorer.aptoslabs.com';
}

export function buildExplorerTxUrl(txHash: string): string {
  const network = BLOCKCHAIN_ENV === 'MAINNET' ? 'mainnet' : 'testnet';
  return `${getExplorerBaseUrl()}/txn/${txHash}?network=${network}`;
}
