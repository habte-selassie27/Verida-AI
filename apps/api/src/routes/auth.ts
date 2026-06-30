// IMPLEMENTER NOTE: Implements SIWE (Sign-In with Aptos) authentication flow.
// BUILD.md TASK: P0 — SIWE Auth
// ARCHITECT CONTRACT: /api/auth/nonce generates challenge, /api/auth/verify validates signature and issues JWT
// SHELBY SDK METHODS: None directly; this module handles wallet-based authentication.
// DB TABLES: publishers (auto-created on first login)
// HANDOFF TO TESTER: Verify nonce generation, signature verification, JWT issuance, and replay protection.

import { randomUUID } from 'node:crypto';

import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import jsSha3 from 'js-sha3';
const { sha3_256 } = jsSha3;
import { z } from 'zod';

import { db, publishers } from '../lib/db/index.js';

const authRouter = Router();

interface NonceRecord {
  address: string;
  expiresAt: number;
  nonce: string;
  used: boolean;
}

const nonceStore = new Map<string, NonceRecord>();

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const JWT_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim() ?? '';
  if (secret.length === 0) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return secret;
}

// Periodic cleanup of expired nonces
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of nonceStore.entries()) {
    if (record.used || record.expiresAt <= now) {
      nonceStore.delete(key);
    }
  }
}, 60_000);

const nonceRequestSchema = z.object({
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{4,}$/, 'Invalid Aptos address format.'),
});

const verifyRequestSchema = z.object({
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{4,}$/, 'Invalid Aptos address format.'),
  message: z.string().trim().min(1, 'Message is required.'),
  signature: z.string().trim().min(1, 'Signature is required.'),
});

function generateNonce(): string {
  return `verida-ai-login-${randomUUID()}`;
}

function buildSignMessage(nonce: string, address: string): string {
  return [
    'Welcome to Verida AI!',
    '',
    `I want to sign in to Verida AI with my Aptos wallet.`,
    '',
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    '',
    'By signing this message, you prove you own this wallet.',
    'This costs no gas and has no on-chain effect.',
  ].join('\n');
}

function extractNonceFromMessage(message: string): string | null {
  const nonceLine = message.split('\n').find((line) => line.startsWith('Nonce: '));
  return nonceLine?.slice('Nonce: '.length)?.trim() ?? null;
}

async function verifyAptosSignature(
  address: string,
  message: string,
  signature: string,
): Promise<boolean> {
  try {
    // Aptos wallet signatures are hex-encoded Ed25519 signatures (128 hex chars = 64 bytes)
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;

    // Validate signature format: should be 64 bytes (128 hex chars)
    if (cleanSig.length !== 128 || !/^[0-9a-fA-F]+$/.test(cleanSig)) {
      console.error('[Auth] Invalid signature format');
      return false;
    }

    // Verify the account exists on-chain and the signature's public key matches
    const response = await fetch(
      `https://fullnode.testnet.aptoslabs.com/v1/accounts/${address}`,
    );
    if (!response.ok) {
      console.error('[Auth] Account not found on-chain');
      return false;
    }

    const account = await response.json() as { authentication_key: string };
    const expectedAuthKey = account.authentication_key.toLowerCase().replace('0x', '');

    // Extract the 32-byte Ed25519 public key from the first 32 bytes of the signature
    const pubKeyHex = cleanSig.slice(0, 64);
    if (!/^[0-9a-fA-F]{64}$/.test(pubKeyHex)) {
      console.error('[Auth] Invalid public key in signature');
      return false;
    }

    // Aptos derives the account address from SHA3-256(0x00 || public_key)
    // Compute the authentication key: SHA3-256(0x00 || pubkey_bytes)
    const pubKeyBytes = new Uint8Array(
      pubKeyHex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)),
    );
    const authKeyInput = new Uint8Array(33);
    authKeyInput[0] = 0x00; // Ed25519 scheme byte
    authKeyInput.set(pubKeyBytes, 1);

    const computedAuthKey = sha3_256(authKeyInput);

    if (computedAuthKey !== expectedAuthKey) {
      console.error('[Auth] Derived auth key does not match on-chain auth key');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Auth] Aptos signature verification failed:', error);
    return false;
  }
}

authRouter.post(
  '/nonce',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const parsed = nonceRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'INVALID_ADDRESS',
          details: { issues: parsed.error.issues },
          error: 'A valid Aptos address is required.',
        },
        success: false,
      });
      return;
    }

    const address = parsed.data.address.toLowerCase();
    const nonce = generateNonce();
    const expiresAt = Date.now() + NONCE_EXPIRY_MS;

    nonceStore.set(nonce, {
      address,
      expiresAt,
      nonce,
      used: false,
    });

    const message = buildSignMessage(nonce, address);

    response.json({
      data: {
        expiresAt,
        message,
        nonce,
      },
      success: true,
    });
  }),
);

function summarizeZodIssues(issues: z.ZodIssue[]): string {
  if (issues.length === 0) {
    return 'Address, message, and signature are required.';
  }
  const fields = new Set<string>();
  for (const issue of issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    fields.add(`${field} (${issue.message})`);
  }
  // Also log server-side so we have a permanent record outside the client
  console.warn('[Auth] /verify validation failed:', { issues });
  return `Invalid request: ${Array.from(fields).join('; ')}.`;
}

authRouter.post(
  '/verify',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const parsed = verifyRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      const summary = summarizeZodIssues(parsed.error.issues);
      response.status(400).json({
        error: {
          code: 'INVALID_VERIFY_REQUEST',
          details: {
            issues: parsed.error.issues,
            missingFields: parsed.error.issues
              .filter((i) => i.code === 'invalid_type')
              .map((i) => i.path.join('.') || '<root>'),
          },
          error: summary,
        },
        success: false,
      });
      return;
    }

    const { address, message, signature } = parsed.data;
    const normalizedAddress = address.toLowerCase();

    const nonce = extractNonceFromMessage(message);
    if (nonce === null) {
      response.status(400).json({
        error: {
          code: 'INVALID_MESSAGE',
          error: 'Message does not contain a valid nonce.',
        },
        success: false,
      });
      return;
    }

    const nonceRecord = nonceStore.get(nonce);
    if (nonceRecord === undefined) {
      response.status(400).json({
        error: {
          code: 'NONCE_NOT_FOUND',
          error: 'Nonce has expired or was not generated. Please request a new one.',
        },
        success: false,
      });
      return;
    }

    if (nonceRecord.used) {
      nonceStore.delete(nonce);
      response.status(400).json({
        error: {
          code: 'NONCE_REUSED',
          error: 'Nonce has already been used. Please request a new one.',
        },
        success: false,
      });
      return;
    }

    if (nonceRecord.expiresAt <= Date.now()) {
      nonceStore.delete(nonce);
      response.status(400).json({
        error: {
          code: 'NONCE_EXPIRED',
          error: 'Nonce has expired. Please request a new one.',
        },
        success: false,
      });
      return;
    }

    if (nonceRecord.address !== normalizedAddress) {
      response.status(400).json({
        error: {
          code: 'ADDRESS_MISMATCH',
          error: 'The address in the nonce request does not match the verification request.',
        },
        success: false,
      });
      return;
    }

    // Mark nonce as used before verification to prevent replay
    nonceRecord.used = true;
    nonceStore.delete(nonce);

    const signatureValid = await verifyAptosSignature(normalizedAddress, message, signature);
    if (!signatureValid) {
      response.status(401).json({
        error: {
          code: 'INVALID_SIGNATURE',
          error: 'The provided signature is not valid for this address and message.',
        },
        success: false,
      });
      return;
    }

    // Auto-create publisher record on first login
    await db
      .insert(publishers)
      .values({ address: normalizedAddress })
      .onConflictDoNothing();

    const token = jwt.sign(
      { address: normalizedAddress, sub: normalizedAddress },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRY },
    );

    response.json({
      data: {
        address: normalizedAddress,
        expiresIn: JWT_EXPIRY,
        token,
      },
      success: true,
    });
  }),
);

export { authRouter };
