// Defaulted in code (not just env) so on-chain payloads are always valid — an
// empty address would produce `::module::fn` function strings that every wallet
// rejects with "Hex string is too short".
export const MARKETPLACE_CONTRACT_ADDRESS =
  import.meta.env.VITE_MARKETPLACE_CONTRACT_ADDRESS?.trim() ||
  '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd';

export const SHELBYNET_RPC = 'https://api.shelbynet.shelby.xyz/v1';
export const SHELBYNET_EXPLORER = 'https://explorer.aptoslabs.com';

export const verida_marketplace = `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace`;
export const platform = `${MARKETPLACE_CONTRACT_ADDRESS}::platform`;
export const ownership = `${MARKETPLACE_CONTRACT_ADDRESS}::ownership`;
export const access = `${MARKETPLACE_CONTRACT_ADDRESS}::access`;
export const escrow = `${MARKETPLACE_CONTRACT_ADDRESS}::escrow`;
export const subscriptions = `${MARKETPLACE_CONTRACT_ADDRESS}::subscriptions`;
export const provenance = `${MARKETPLACE_CONTRACT_ADDRESS}::provenance`;
export const revenue = `${MARKETPLACE_CONTRACT_ADDRESS}::revenue`;

export const PLATFORM_MODULE = platform;
export const OWNERSHIP_MODULE = ownership;
export const ACCESS_MODULE = access;
export const ESCROW_MODULE = escrow;
export const SUBSCRIPTIONS_MODULE = subscriptions;
export const PROVENANCE_MODULE = provenance;
export const REVENUE_MODULE = revenue;

export const OCTAS_PER_APT = 100_000_000;

export function octasToApt(octas: number): string {
  return (octas / OCTAS_PER_APT).toFixed(2);
}

export function aptToOctas(apt: number): number {
  return Math.round(apt * OCTAS_PER_APT);
}

export const FEE_BASIS_POINTS = 500;
export const FEE_DENOMINATOR = 10_000;

export function calculateFeeBreakdown(totalOctas: number): {
  total: number;
  publisherAmount: number;
  feeAmount: number;
  publisherApt: string;
  feeApt: string;
  totalApt: string;
} {
  const feeAmount = Math.floor((totalOctas * FEE_BASIS_POINTS) / FEE_DENOMINATOR);
  const publisherAmount = totalOctas - feeAmount;

  return {
    total: totalOctas,
    publisherAmount,
    feeAmount,
    publisherApt: octasToApt(publisherAmount),
    feeApt: octasToApt(feeAmount),
    totalApt: octasToApt(totalOctas),
  };
}

export async function fetchAccountResources(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${SHELBYNET_RPC}/accounts/${MARKETPLACE_CONTRACT_ADDRESS}/resources`);
  if (!res.ok) throw new Error(`Failed to fetch account resources: ${res.status}`);
  return res.json();
}

export async function fetchResource<T>(resourceType: string): Promise<T> {
  const resources = await fetchAccountResources();
  const match = resources.find((r: Record<string, unknown>) => r.type === resourceType);
  if (!match) throw new Error(`Resource not found: ${resourceType}`);
  return (match as { data: T }).data;
}
