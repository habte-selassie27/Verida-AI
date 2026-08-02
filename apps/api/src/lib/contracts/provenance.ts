import { MARKETPLACE_CONTRACT_ADDRESS, getMarketplaceAptosClient } from './client.js';

export interface OnChainProvenanceEvent {
  dataset_id: number;
  version: number;
  event_type: number;
  actor: string;
  timestamp: number;
  metadata: string;
}

export async function getOnChainProvenanceEvents(
  datasetId: number,
): Promise<OnChainProvenanceEvent[]> {
  try {
    const aptos = getMarketplaceAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::provenance::get_events` as `${string}::${string}::${string}`,
        functionArguments: [datasetId],
      },
    });

    const events = result[0] as OnChainProvenanceEvent[];
    return events ?? [];
  } catch {
    return [];
  }
}

export async function getOnChainProvenanceCount(datasetId: number): Promise<number> {
  try {
    const aptos = getMarketplaceAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${MARKETPLACE_CONTRACT_ADDRESS}::provenance::get_event_count` as `${string}::${string}::${string}`,
        functionArguments: [datasetId],
      },
    });
    return (result[0] as number) ?? 0;
  } catch {
    return 0;
  }
}
