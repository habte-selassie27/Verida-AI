// IMPLEMENTER NOTE: Creates the Shelby SDK singleton, shared runtime helpers, and typed Shelby error classes for the API layer.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: ShelbyClient singleton, upload signer setup, blob id helpers, and typed Shelby error hierarchy
// SHELBY SDK METHODS: ShelbyNodeClient constructor, Aptos client construction, connection probe
// DB TABLES: None directly; this file provides runtime utilities for Shelby-backed modules.
// HANDOFF TO TESTER: Verify singleton initialization, env parsing, blob id helpers, and error typing work under mocked SDKs.

import { Account, Aptos, AptosConfig, Ed25519Account, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';
import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';
import type { AccessType, DatasetTag, ProvenanceReceipt } from '@verida/shared';

import type { ProvenanceEventType } from '../db/schema.js';

export type ShelbyNetworkName = 'shelbynet' | 'testnet' | 'devnet' | 'local' | 'mainnet';

export interface ShelbyRuntime {
  apiKey: string;
  client: ShelbyNodeClient;
  network: Network;
  rpcBaseUrl: string;
  aptos: Aptos;
  uploadSigner: Account;
}

export interface ShelbyUploadMetadata {
  publisherAddress: string;
  contentHash: string;
  blobName?: string;
  name?: string;
  description?: string;
  tags?: DatasetTag[];
  accessType?: AccessType;
  license?: string;
  version?: number;
  sizeBytes?: number;
  expirationMicros?: number;
}

export interface ShelbyUploadProgress {
  percent: number;
  bytesUploaded: number;
  bytesTotal: number;
  stage: 'reading' | 'encoding' | 'registering' | 'confirming' | 'complete';
}

export interface ShelbyUploadResult {
  blobId: string;
  merkleRoot: string;
  receipt: ProvenanceReceipt;
  expiresAt: number;
}

export interface ShelbyVerificationResult {
  valid: boolean;
  checkedAt: number;
  details: Record<string, unknown>;
}

export interface ShelbySessionValidationResult {
  valid: boolean;
  reason?: 'missing' | 'expired' | 'revoked' | 'invalid' | 'unreachable';
  details?: Record<string, unknown>;
}

export interface ShelbyAccessSessionResult {
  sessionId: string;
  expiresAt: number;
}

export interface ShelbyProvenanceWriteInput {
  eventType?: ProvenanceEventType;
  actorAddress?: string;
  version?: number;
  txHash?: string;
  shelbyReceipt?: ProvenanceReceipt;
  metadata?: Record<string, unknown>;
}

export class ShelbyIntegrationError extends Error {
  public override readonly cause: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = new.target.name;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ShelbyConfigurationError extends ShelbyIntegrationError {}

export class ShelbyClientError extends ShelbyIntegrationError {}

export class ShelbyUploadError extends ShelbyIntegrationError {}

export class ShelbyStreamError extends ShelbyIntegrationError {}

export class ShelbyVerificationError extends ShelbyIntegrationError {}

export class ShelbyProvenanceError extends ShelbyIntegrationError {}

export class ShelbyAccessError extends ShelbyIntegrationError {}

interface ShelbyRuntimeState {
  apiKey: string;
  network: Network;
  rpcBaseUrl: string;
  client: ShelbyNodeClient;
  aptos: Aptos;
  uploadSigner: Account;
}

async function createUploadSigner(): Promise<Account> {
  const privateKey = process.env.SHELBY_SIGNER_PRIVATE_KEY?.trim();

  if (privateKey !== undefined && privateKey.length > 0) {
    try {
      const normalizedKey = privateKey.startsWith('ed25519-priv-')
        ? privateKey.slice('ed25519-priv-'.length)
        : privateKey;

      return new Ed25519Account({
        privateKey: new Ed25519PrivateKey(normalizedKey),
      });
    } catch (cause: unknown) {
      throw new ShelbyConfigurationError('SHELBY_SIGNER_PRIVATE_KEY is invalid.', { cause });
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new ShelbyConfigurationError(
      'SHELBY_SIGNER_PRIVATE_KEY is required in production. ' +
      'A persistent signer key is needed for deterministic on-chain identity.',
    );
  }

  console.warn(
    '[Shelby] No SHELBY_SIGNER_PRIVATE_KEY set. Generating ephemeral key. ' +
    'On-chain registrations will use a random identity that is lost on restart.',
  );
  return Account.generate();
}

async function initializeShelbyRuntime(): Promise<ShelbyRuntimeState> {
  const normalizedNetwork = (process.env.SHELBY_NETWORK ?? 'shelbynet').toLowerCase();
  const apiKey =
    process.env.SHELBY_API_KEY?.trim() ??
    (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
      ? 'test-shelby-api-key'
      : '');

  if (apiKey.length === 0) {
    throw new ShelbyConfigurationError('SHELBY_API_KEY is required to initialize the Shelby client.');
  }

  let network: Network;
  let shelbyClientNetwork: Network.SHELBYNET | Network.LOCAL;
  switch (normalizedNetwork as ShelbyNetworkName) {
    case 'shelbynet':
      shelbyClientNetwork = Network.SHELBYNET;
      network = Network.SHELBYNET;
      break;
    case 'testnet':
      shelbyClientNetwork = Network.SHELBYNET;
      network = Network.TESTNET;
      break;
    case 'devnet':
      shelbyClientNetwork = Network.SHELBYNET;
      network = Network.DEVNET;
      break;
    case 'local':
      shelbyClientNetwork = Network.LOCAL;
      network = Network.LOCAL;
      break;
    case 'mainnet':
      shelbyClientNetwork = Network.SHELBYNET;
      network = Network.MAINNET;
      break;
    default:
      throw new ShelbyConfigurationError(`Unsupported SHELBY_NETWORK value: ${normalizedNetwork}`);
  }

  const defaultRpcBaseUrl =
    normalizedNetwork === 'testnet'
      ? 'https://api.testnet.shelby.xyz/shelby'
      : normalizedNetwork === 'shelbynet'
        ? 'https://api.shelbynet.shelby.xyz/shelby'
        : 'http://localhost:9090';

  const rpcBaseUrl = (process.env.SHELBY_RPC_URL?.trim() ?? defaultRpcBaseUrl).replace(/\/+$/, '');
  const client = new ShelbyNodeClient({
    network: shelbyClientNetwork,
    apiKey,
  });
  const aptos = new Aptos(new AptosConfig({ network }));
  const uploadSigner = await createUploadSigner();

  if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
    try {
      await fetch(`${rpcBaseUrl}/v1/blobs/0x1/__healthcheck__`, { method: 'GET' });
    } catch (cause: unknown) {
      throw new ShelbyClientError('Shelby RPC connection test failed.', { cause });
    }
  }

  return {
    apiKey,
    client,
    network,
    rpcBaseUrl,
    aptos,
    uploadSigner,
  };
}

let shelbyRuntimeCache: ShelbyRuntimeState | null = null;
let shelbyRuntimePromise: Promise<ShelbyRuntimeState> | null = null;

async function getShelbyRuntimeLazy(): Promise<ShelbyRuntimeState> {
  if (shelbyRuntimeCache !== null) {
    return shelbyRuntimeCache;
  }

  if (shelbyRuntimePromise === null) {
    shelbyRuntimePromise = initializeShelbyRuntime().then((runtime) => {
      shelbyRuntimeCache = runtime;
      return runtime;
    }).catch((error) => {
      shelbyRuntimePromise = null;
      throw error;
    });
  }

  return shelbyRuntimePromise;
}

export async function getShelbyRuntime(): Promise<ShelbyRuntime> {
  return getShelbyRuntimeLazy();
}

export async function getShelbyClient(): Promise<ShelbyNodeClient> {
  const runtime = await getShelbyRuntimeLazy();
  return runtime.client;
}

export async function getShelbyRpcBaseUrl(): Promise<string> {
  const runtime = await getShelbyRuntimeLazy();
  return runtime.rpcBaseUrl;
}

export async function getShelbyAptosClient(): Promise<Aptos> {
  const runtime = await getShelbyRuntimeLazy();
  return runtime.aptos;
}

export async function getShelbyUploadSigner(): Promise<Account> {
  const runtime = await getShelbyRuntimeLazy();
  return runtime.uploadSigner;
}

export async function isShelbyAvailable(): Promise<boolean> {
  try {
    await getShelbyRuntimeLazy();
    return true;
  } catch {
    return false;
  }
}

export async function buildBlobId(accountAddress: string, blobName: string): Promise<string> {
  const normalizedAccountAddress = accountAddress.trim().toLowerCase();
  const normalizedBlobName = blobName.replaceAll('\\', '/').replace(/^\/+/, '');

  if (normalizedAccountAddress.length === 0 || normalizedBlobName.length === 0) {
    throw new ShelbyConfigurationError('Unable to build a Shelby blob id from an empty account or blob name.');
  }

  return `${normalizedAccountAddress}/${normalizedBlobName}`;
}

export async function parseBlobId(blobId: string): Promise<{ accountAddress: string; blobName: string }> {
  const normalizedBlobId = blobId.replaceAll('\\', '/').replace(/^\/+/, '');
  const slashIndex = normalizedBlobId.indexOf('/');

  if (slashIndex <= 0 || slashIndex === normalizedBlobId.length - 1) {
    throw new ShelbyConfigurationError(`Invalid Shelby blob id: ${blobId}`);
  }

  return {
    accountAddress: normalizedBlobId.slice(0, slashIndex).toLowerCase(),
    blobName: normalizedBlobId.slice(slashIndex + 1),
  };
}

export async function normalizeMerkleRoot(value: string): Promise<string> {
  return value.trim().toLowerCase();
}
