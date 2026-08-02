import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

export const MARKETPLACE_CONTRACT_ADDRESS = process.env.MARKETPLACE_CONTRACT_ADDRESS ?? '';
export const PLATFORM_TREASURY_ADDRESS = process.env.PLATFORM_TREASURY_ADDRESS ?? '';

export const MARKETPLACE_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace`;
export const PLATFORM_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::platform`;
export const OWNERSHIP_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::ownership`;
export const ACCESS_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::access`;
export const ESCROW_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::escrow`;
export const SUBSCRIPTIONS_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::subscriptions`;
export const PROVENANCE_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::provenance`;
export const REVENUE_MODULE = `${MARKETPLACE_CONTRACT_ADDRESS}::revenue`;

let aptosClientCache: Aptos | null = null;

export function getMarketplaceAptosClient(): Aptos {
  if (aptosClientCache) return aptosClientCache;

  const network = (process.env.APTOS_NETWORK ?? 'testnet') as Network;
  const nodeUrl = process.env.APTOS_NODE_URL;

  const config = new AptosConfig({
    network,
    ...(nodeUrl ? { fullnode: nodeUrl } : {}),
  });

  aptosClientCache = new Aptos(config);
  return aptosClientCache;
}

export async function verifyTransactionSuccess(txHash: string): Promise<{
  success: boolean;
  sender: string;
  payloadFunction: string;
  payloadArguments: unknown[];
}> {
  const aptos = getMarketplaceAptosClient();
  const txn = await aptos.getTransactionByHash({ transactionHash: txHash });

  if (txn.type !== 'user_transaction') {
    return { success: false, sender: '', payloadFunction: '', payloadArguments: [] };
  }

  const userTxn = txn as {
    type: 'user_transaction';
    sender: string;
    payload: { function: string; arguments: unknown[] };
    success: boolean;
  };

  return {
    success: userTxn.success,
    sender: userTxn.sender,
    payloadFunction: userTxn.payload.function,
    payloadArguments: userTxn.payload.arguments,
  };
}

export async function buildMoveTransaction(params: {
  function: string;
  functionArguments: (string | number | boolean)[];
  sender: string;
}) {
  const aptos = getMarketplaceAptosClient();
  return aptos.transaction.build.simple({
    data: {
      function: params.function as `${string}::${string}::${string}`,
      functionArguments: params.functionArguments,
    },
    sender: params.sender,
  });
}

export function buildPaymentPayload(publisherAddress: string, totalOctas: number, datasetId: number) {
  return {
    function: `${PLATFORM_MODULE}::pay_with_fee`,
    functionArguments: [publisherAddress, totalOctas, datasetId],
  };
}

export function buildEscrowDepositPayload(publisherAddress: string, datasetId: number, amountOctas: number) {
  return {
    function: `${ESCROW_MODULE}::deposit`,
    functionArguments: [publisherAddress, datasetId, amountOctas],
  };
}

export function buildEscrowConfirmPayload(escrowId: number) {
  return {
    function: `${ESCROW_MODULE}::confirm_release`,
    functionArguments: [escrowId],
  };
}

export function buildEscrowDisputePayload(escrowId: number) {
  return {
    function: `${ESCROW_MODULE}::open_dispute`,
    functionArguments: [escrowId],
  };
}

export function buildGrantAccessPayload(accessorAddress: string, datasetId: number, durationSeconds: number) {
  return {
    function: `${ACCESS_MODULE}::grant_access`,
    functionArguments: [accessorAddress, datasetId, durationSeconds],
  };
}

export function buildRegisterDatasetPayload(datasetId: number) {
  return {
    function: `${OWNERSHIP_MODULE}::register_dataset`,
    functionArguments: [datasetId],
  };
}

export function buildTransferOwnershipPayload(datasetId: number, newOwnerAddress: string) {
  return {
    function: `${OWNERSHIP_MODULE}::transfer_ownership`,
    functionArguments: [datasetId, newOwnerAddress],
  };
}
