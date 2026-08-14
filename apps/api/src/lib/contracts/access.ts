// On-chain state checks. The deployed marketplace modules declare NO #[view]
// functions, so `aptos.view()` calls are rejected by the fullnode ("function
// not marked as view function") and every fallback silently returned false.
// Instead we read the account's Move resources directly — the same pattern the
// escrow keeper uses — so grants/ownership/subscriptions resolve correctly.
import { MARKETPLACE_CONTRACT_ADDRESS, getMarketplaceAptosClient } from './client.js';

interface AccessRegistryResource {
  grants?: Array<{
    accessor: string;
    dataset_id: string;
    expires_at: string;
    revoked: boolean;
  }>;
}

interface OwnershipRegistryResource {
  records?: Array<{
    dataset_id: string;
    owner: string;
  }>;
}

interface SubscriptionRegistryResource {
  subscriptions?: Array<{
    subscriber: string;
    expires_at: string;
    active: boolean;
  }>;
}

async function readResource<T>(resourceType: string): Promise<T | null> {
  const aptos = getMarketplaceAptosClient();
  const resources = await aptos.getAccountResources({
    accountAddress: MARKETPLACE_CONTRACT_ADDRESS,
  });
  const match = resources.find((r) => r.type === resourceType);
  return (match?.data as T | undefined) ?? null;
}

export async function checkOnChainAccess(
  accessorAddress: string,
  datasetId: number,
): Promise<{ hasAccess: boolean; expiresAt?: number }> {
  try {
    const registry = await readResource<AccessRegistryResource>(
      `${MARKETPLACE_CONTRACT_ADDRESS}::access::AccessRegistry`,
    );
    if (!registry?.grants) return { hasAccess: false };

    const normalized = accessorAddress.toLowerCase();
    const nowSeconds = Math.floor(Date.now() / 1000);

    for (const grant of registry.grants) {
      if (
        grant.accessor.toLowerCase() === normalized &&
        Number(grant.dataset_id) === datasetId &&
        !grant.revoked &&
        Number(grant.expires_at) > nowSeconds
      ) {
        return { hasAccess: true, expiresAt: Number(grant.expires_at) * 1000 };
      }
    }

    return { hasAccess: false };
  } catch {
    return { hasAccess: false };
  }
}

export async function checkOnChainOwnership(
  datasetId: number,
): Promise<{ owner?: string; isOnChain: boolean }> {
  try {
    const registry = await readResource<OwnershipRegistryResource>(
      `${MARKETPLACE_CONTRACT_ADDRESS}::ownership::OwnershipRegistry`,
    );
    const record = registry?.records?.find((r) => Number(r.dataset_id) === datasetId);
    if (record) {
      return { owner: record.owner, isOnChain: true };
    }
    return { isOnChain: false };
  } catch {
    return { isOnChain: false };
  }
}

export async function checkOnChainSubscription(
  subscriberAddress: string,
): Promise<{ isSubscribed: boolean; expiresAt?: number }> {
  try {
    const registry = await readResource<SubscriptionRegistryResource>(
      `${MARKETPLACE_CONTRACT_ADDRESS}::subscriptions::SubscriptionRegistry`,
    );
    const normalized = subscriberAddress.toLowerCase();
    const nowSeconds = Math.floor(Date.now() / 1000);

    const sub = registry?.subscriptions?.find(
      (s) =>
        s.subscriber.toLowerCase() === normalized &&
        s.active &&
        Number(s.expires_at) > nowSeconds,
    );
    if (sub) {
      return { isSubscribed: true, expiresAt: Number(sub.expires_at) * 1000 };
    }
    return { isSubscribed: false };
  } catch {
    return { isSubscribed: false };
  }
}

export async function checkMarketplacePaused(): Promise<boolean> {
  try {
    const config = await readResource<{ paused?: boolean }>(
      `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::MarketplaceConfig`,
    );
    return config?.paused === true;
  } catch {
    return false;
  }
}
