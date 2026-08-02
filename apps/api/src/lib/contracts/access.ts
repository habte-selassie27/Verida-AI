import { MARKETPLACE_CONTRACT_ADDRESS, getMarketplaceAptosClient } from './client.js';

export async function checkOnChainAccess(
  accessorAddress: string,
  datasetId: number,
): Promise<{ hasAccess: boolean; expiresAt?: number }> {
  try {
    const aptos = getMarketplaceAptosClient();
    const viewPayload = {
      function: `${MARKETPLACE_CONTRACT_ADDRESS}::access::has_access` as `${string}::${string}::${string}`,
      functionArguments: [accessorAddress, datasetId],
    };

    const result = await aptos.view({ payload: viewPayload });
    const hasAccess = result[0] as boolean;

    if (hasAccess) {
      const expiryResult = await aptos.view({
        payload: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::access::get_access_expiry` as `${string}::${string}::${string}`,
          functionArguments: [accessorAddress, datasetId],
        },
      });
      const expiresAt = expiryResult[0] as number;
      return { hasAccess: true, expiresAt: expiresAt * 1000 };
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
    const aptos = getMarketplaceAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::ownership::get_owner` as `${string}::${string}::${string}`,
        functionArguments: [datasetId],
      },
    });

    const optionValue = result[0] as { vec?: string[] } | null;
    if (optionValue?.vec && optionValue.vec.length > 0) {
      return { owner: optionValue.vec[0], isOnChain: true };
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
    const aptos = getMarketplaceAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::subscriptions::is_subscribed` as `${string}::${string}::${string}`,
        functionArguments: [subscriberAddress],
      },
    });

    const isSubscribed = result[0] as boolean;

    if (isSubscribed) {
      const expiryResult = await aptos.view({
        payload: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::subscriptions::get_subscription_expiry` as `${string}::${string}::${string}`,
              functionArguments: [subscriberAddress],
            },
          });
          const expiresAt = expiryResult[0] as number;
          return { isSubscribed: true, expiresAt: expiresAt * 1000 };
        }

        return { isSubscribed: false };
      } catch {
        return { isSubscribed: false };
      }
}

export async function checkMarketplacePaused(): Promise<boolean> {
  try {
    const aptos = getMarketplaceAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::is_paused` as `${string}::${string}::${string}`,
        functionArguments: [],
      },
    });
    return result[0] as boolean;
  } catch {
    return false;
  }
}
