import { MARKETPLACE_CONTRACT_ADDRESS, getMarketplaceAptosClient } from './client.js';
import { eq, sql } from 'drizzle-orm';
import { db, datasets, accessSessions } from '../db/index.js';

const ACCESS_DURATION_SECONDS = 24 * 60 * 60;

export async function verifyPayWithFeeTransaction(
  txHash: string,
  payerAddress: string,
  publisherAddress: string,
  expectedAmount: number,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const aptos = getMarketplaceAptosClient();
    const txn = await aptos.getTransactionByHash({ transactionHash: txHash });

    if (txn.type !== 'user_transaction') {
      return { valid: false, error: 'Transaction is not a user transaction.' };
    }

    const userTxn = txn as {
      type: 'user_transaction';
      sender: string;
      payload: { function: string; arguments: unknown[] };
      success: boolean;
    };

    const expectedFunction = `${MARKETPLACE_CONTRACT_ADDRESS}::platform::pay_with_fee`;

    if (userTxn.payload.function !== expectedFunction) {
      return { valid: false, error: `Unexpected function call: ${userTxn.payload.function}` };
    }

    if (userTxn.sender.toLowerCase() !== payerAddress.toLowerCase()) {
      return { valid: false, error: 'Transaction sender does not match payer.' };
    }

    if (!userTxn.success) {
      return { valid: false, error: 'Transaction failed on-chain.' };
    }

    const args = userTxn.payload.arguments;
    if (args[0] !== publisherAddress || args[1] !== expectedAmount) {
      return { valid: false, error: 'Transaction arguments do not match expected payment.' };
    }

    return { valid: true };
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { valid: false, error: `Verification failed: ${message}` };
  }
}

export async function createPaymentSession(
  datasetId: number,
  payerAddress: string,
  txHash?: string,
): Promise<{ sessionId: string; expiresAt: number }> {
  const datasetRows = await db
    .select({
      accessType: datasets.accessType,
      pricePerAccess: datasets.pricePerAccess,
      shelbyBlobId: datasets.shelbyBlobId,
      publisherAddress: datasets.publisherAddress,
    })
    .from(datasets)
    .where(eq(datasets.id, datasetId))
    .limit(1);

  const dataset = datasetRows.at(0);
  if (!dataset) {
    throw new Error(`Dataset ${datasetId} not found`);
  }

  if (dataset.accessType === 'pay_per_access' && dataset.pricePerAccess !== null) {
    if (!txHash) {
      throw new Error('Transaction hash required for paid dataset');
    }

    const verification = await verifyPayWithFeeTransaction(
      txHash,
      payerAddress,
      dataset.publisherAddress,
      dataset.pricePerAccess,
    );

    if (!verification.valid) {
      throw new Error(verification.error ?? 'Payment verification failed');
    }
  }

  const sessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const expiresAt = Date.now() + ACCESS_DURATION_SECONDS * 1000;

  await db.insert(accessSessions).values({
    datasetId,
    sessionId,
    accessorAddress: payerAddress,
    expiresAt: new Date(expiresAt).toISOString(),
    status: 'active',
  });

  return { sessionId, expiresAt };
}

export async function calculateFee(totalOctas: number): Promise<{ publisherAmount: number; feeAmount: number }> {
  const feeBps = 500;
  const fee = Math.floor((totalOctas * feeBps) / 10_000);
  return {
    publisherAmount: totalOctas - fee,
    feeAmount: fee,
  };
}
