import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useWalletContext } from './WalletContext';

interface AuthState {
  address: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  login: () => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthState>({
  address: null,
  isAuthenticated: false,
  isAuthenticating: false,
  login: async () => {},
  logout: () => {},
  token: null,
});

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'verida_auth_token';
const TOKEN_EXPIRY_KEY = 'verida_auth_expiry';

function getStoredToken(): { token: string; expiry: number } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return null;
    if (Date.now() >= Number(expiry)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      return null;
    }
    return { token, expiry: Number(expiry) };
  } catch {
    return null;
  }
}

function storeToken(token: string, expiresIn: string): void {
  const durationMs = parseExpiry(expiresIn);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + durationMs));
}

function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhs])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const [, amount, unit] = match;
  const n = Number(amount);
  switch (unit) {
    case 'd': return n * 24 * 60 * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 's': return n * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Deep-introspect a value for safe logging.
 *
 * CRITICAL: only describes the SHAPE of the value. Never logs the actual bytes
 * of a wallet signature — those are sensitive. Returns a JSON-serializable
 * record that can be passed straight to `console.error` and inspected without
 * clicking through `[Object]` placeholders.
 */
type SignatureShape =
  | { kind: 'string'; length: number; hexLength: number; startsWithZeroX: boolean; firstChars: string }
  | { kind: 'Uint8Array'; length: number; hexPreview: string; stack: string }
  | { kind: 'object'; ctor: string | null; keys: readonly string[]; jsonSnippet: string; stack: string }
  | { kind: 'undefined' | 'number' | 'boolean' | 'bigint' | 'symbol' | 'function' };

function inspectSignature(sig: unknown): SignatureShape {
  // Capture the stack ONCE up front so non-string branches can include it
  // without each allocating their own Error.
  const stack = new Error('[inspectSignature] capture point').stack ?? '<stack unavailable>';
  if (typeof sig === 'string') {
    const stripped = sig.replace(/^0x/, '');
    return {
      kind: 'string',
      length: sig.length,
      hexLength: stripped.length,
      startsWithZeroX: sig.startsWith('0x'),
      firstChars: sig.length > 12 ? `${sig.slice(0, 12)}…` : sig,
    };
  }
  if (sig instanceof Uint8Array) {
    const sampleBytes = Array.from(sig).slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('');
    const overallHexLen = sig.length * 2;
    return {
      kind: 'Uint8Array',
      length: sig.length,
      hexPreview: sig.length > 6
        ? `0x${sampleBytes} (${overallHexLen}-hex total)`
        : `0x${sampleBytes}`,
      stack,
    };
  }
  if (sig !== null && typeof sig === 'object') {
    const obj = sig as Record<string, unknown>;
    // Preserve natural enumeration order — useful for triangulating which
    // wallet adapter branch produced the object.
    const keys = Object.keys(obj).slice(0, 8);
    let jsonSnippet = '<unserializable>';
    try {
      const serialized = JSON.stringify(obj);
      jsonSnippet = serialized.length > 80 ? `${serialized.slice(0, 80)}…` : serialized;
    } catch {
      /* fall through, keep <unserializable> */
    }
    return {
      kind: 'object',
      ctor: obj.constructor?.name ?? null,
      keys,
      jsonSnippet,
      stack,
    };
  }
  // Captures undefined / number / boolean / bigint / symbol / function.
  // After the preceding string and object narrowing, `typeof sig` can only be
  // one of these primitive kinds.
  const primitiveKind = typeof sig as
    | 'undefined' | 'number' | 'boolean' | 'bigint' | 'symbol' | 'function';
  return { kind: primitiveKind };
}

/**
 * Coerce a wallet signature to a non-empty hex string at the network boundary.
 *
 * Defense in depth: if the WalletContext normalizer misses a case, this is the
 * last stop before JSON.stringify. JSON.stringify of a Uint8Array produces
 * `{"0":1,"1":2,…}` — which is exactly what was being sent when the user
 * reported `signature (Expected string, received object)`.
 */
function coerceSignature(sig: unknown): string {
  if (typeof sig === 'string') {
    if (sig.length === 0) {
      throw new Error('Wallet returned an empty signature string. Refresh and retry.');
    }
    return sig;
  }
  if (sig instanceof Uint8Array) {
    // A 64-byte Uint8Array is exactly one Ed25519 signature. We deliberately
    // do NOT accept length 32 (which is the shape of an Ed25519 public key) —
    // if the wallet hands us the pubkey instead of the signature, that's a
    // real bug that should fail loudly rather than be papered over.
    if (sig.length === 64) {
      const hex = Array.from(sig).map((b) => b.toString(16).padStart(2, '0')).join('');
      console.warn(
        '[Auth] Coerced a 64-byte Uint8Array signature to hex at the network boundary.',
        inspectSignature(sig),
      );
      return `0x${hex}`;
    }
  }
  const shape = inspectSignature(sig);
  console.error(
    `[Auth] Refusing to send signature of kind=${shape.kind}; expected string.`,
    shape,
  );
  let detail = `kind=${shape.kind}`;
  if (shape.kind === 'object') detail += `, ctor=${shape.ctor ?? 'n/a'}`;
  throw new Error(
    `Wallet returned signature in an unexpected shape (${detail}). Please refresh and retry.`,
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, connected, signMessage } = useWalletContext();
  const [token, setToken] = useState<string | null>(() => getStoredToken()?.token ?? null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const isAuthenticated = token !== null && connected && address !== null;

  const login = useCallback(async () => {
    if (!connected || !address || isAuthenticating) return;

    // Check for existing valid token
    const stored = getStoredToken();
    if (stored) {
      setToken(stored.token);
      return;
    }

    setIsAuthenticating(true);
    try {
      if (!address) {
        throw new Error('No wallet address available — connect your wallet first.');
      }

      // Step 1: Get nonce
      const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const nonceBody = (await nonceRes.json()) as {
        data: { message: string; nonce: string; expiresAt: number };
        success: boolean;
      };
      if (!nonceBody.success) throw new Error('Failed to get auth nonce');

      // Step 2: Sign message with wallet
      const { message } = nonceBody.data;

      // Sign via wallet adapter
      const signature = await signMessage(message);

      // Diagnostics — log a safe preview of what we are about to send.
      // We never log full signatures; only type, char length, and hex-character prefix.
      const sigLooksHex = typeof signature === 'string'
        && /^[0-9a-f]+$/i.test(signature.replace(/^0x/, ''));
      console.debug('[Auth] Obtained wallet signature', {
        signatureType: typeof signature,
        signatureLength: typeof signature === 'string' ? signature.length : -1,
        signatureStrippedLength: typeof signature === 'string'
          ? signature.replace(/^0x/, '').length
          : -1,
        signaturePrefixSafe: typeof signature === 'string'
          ? `${signature.slice(0, 12)}…`
          : '<n/a>',
        signatureLooksHex: sigLooksHex,
      });

      // Step 3: Verify signature and get JWT
      // Defense in depth: ensure signature is a canonical hex string at the
      // network boundary. If WalletContext leaks a Uint8Array or object, this
      // is the last line of defense BEFORE JSON.stringify — which would
      // serialize a Uint8Array as `{"0":1,"1":2,…}` and cause the server to
      // reject it as "Expected string, received object".
      const safeSignature = coerceSignature(signature);
      const signatureShape = inspectSignature(safeSignature);

      const verifyBody_payload = {
        address,
        message,
        signature: safeSignature,
      };

      // Dump a callstack at the boundary so future failures show EXACTLY which
      // signer branch produced the value (primary vs. SIWA fallback).
      const captureStack = new Error('[Auth] pre-/verify send').stack ?? '<stack unavailable>';
      console.debug('[Auth] Sending /api/auth/verify', {
        address,
        messageLength: message.length,
        signatureShape,
        sendStack: captureStack.split('\n').slice(0, 5).join('\n'),
      });

      const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyBody_payload),
      });
      const verifyBody = (await verifyRes.json()) as {
        data?: { address: string; expiresIn: string; token: string };
        error?: { code: string; error: string; details?: { issues?: unknown[]; missingFields?: string[]; summary?: string } };
        success: boolean;
      };
      if (!verifyBody.success) {
        const errorCode = verifyBody.error?.code ?? 'UNKNOWN';
        const errorMsg = verifyBody.error?.error ?? 'Unknown error';
        const failureStack = new Error('[Auth] /verify returned success=false').stack
          ?? '<stack unavailable>';
        // Expand the `Array(N)` placeholders so Zod issues are visible from a
        // single glance in the console. Also capture the SHAPE of what we sent
        // (never the raw bytes) and a callstack at the failure point.
        console.error(`[Auth] Verify failed: ${errorCode} - ${errorMsg}`, {
          serverError: verifyBody.error,
          sent: {
            address,
            messageLength: message.length,
            messagePreview: `${message.slice(0, 80)}${message.length > 80 ? '…' : ''}`,
            signatureShape: inspectSignature(safeSignature),
          },
          serverErrorIssues:
            verifyBody.error?.details?.issues
              ?.map((i: unknown) => JSON.stringify(i))
              .join('\n  ') ?? null,
          serverErrorMissingFields: verifyBody.error?.details?.missingFields ?? null,
          failureStack: failureStack.split('\n').slice(0, 6).join('\n'),
        });
        throw new Error(errorMsg);
      }

      if (!verifyBody.data) {
        throw new Error('Auth verify succeeded but no token payload was returned.');
      }

      storeToken(verifyBody.data.token, verifyBody.data.expiresIn);
      setToken(verifyBody.data.token);
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      clearToken();
      setToken(null);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, connected, isAuthenticating, signMessage]);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!connected) {
      clearToken();
      setToken(null);
    }
  }, [connected]);

  return (
    <AuthContext.Provider value={{ address, isAuthenticated, isAuthenticating, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
