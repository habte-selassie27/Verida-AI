// Server-signed publisher on-chain actions. The browser wallet submits these to
// whatever network the extension is configured for — which on shelbynet/testnet
// setups silently fails (module_not_found) when the wallet is on mainnet. These
// helpers sign with the platform account (SHELBY_SIGNER_PRIVATE_KEY) so the txs
// deterministically land on the configured Aptos network.
import { getMarketplaceAptosClient, ACCESS_MODULE, OWNERSHIP_MODULE } from './client.js';
import { getServerSigner } from './signer.js';

async function submitEntryFunction(
  functionName: string,
  functionArguments: (string | number)[],
): Promise<string> {
  const aptos = getMarketplaceAptosClient();
  const signer = getServerSigner();

  const transaction = await aptos.transaction.build.simple({
    data: {
      function: functionName as `${string}::${string}::${string}`,
      functionArguments,
    },
    sender: signer.accountAddress,
  });

  const submitted = await aptos.signAndSubmitTransaction({ signer, transaction });
  const result = await aptos.waitForTransaction({ transactionHash: submitted.hash });

  if (!result.success) {
    throw new Error(
      `On-chain transaction failed: ${(result as { vm_status?: string }).vm_status ?? 'unknown VM error'}`,
    );
  }

  return submitted.hash;
}

export async function submitGrantAccess(
  accessorAddress: string,
  datasetId: number,
  durationSeconds: number,
): Promise<string> {
  return submitEntryFunction(`${ACCESS_MODULE}::grant_access`, [
    accessorAddress,
    datasetId,
    durationSeconds,
  ]);
}

export async function submitRevokeAccess(
  accessorAddress: string,
  datasetId: number,
): Promise<string> {
  return submitEntryFunction(`${ACCESS_MODULE}::revoke_access`, [accessorAddress, datasetId]);
}

export async function submitRegisterDataset(datasetId: number): Promise<string> {
  return submitEntryFunction(`${OWNERSHIP_MODULE}::register_dataset`, [datasetId]);
}

export async function submitTransferOwnership(
  datasetId: number,
  newOwnerAddress: string,
): Promise<string> {
  return submitEntryFunction(`${OWNERSHIP_MODULE}::transfer_ownership`, [datasetId, newOwnerAddress]);
}
