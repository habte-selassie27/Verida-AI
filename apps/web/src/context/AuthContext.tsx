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
      // Strip undefined values explicitly so JSON.stringify cannot drop a
      // required field silently. The server-side Zod schema treats missing
      // fields as invalid.
      const verifyBody_payload = {
        address,
        message,
        signature: signature ?? '',
      };
      console.debug('[Auth] Sending /api/auth/verify', {
        address,
        messageLength: message.length,
        signatureType: typeof signature,
        signatureLength: typeof signature === 'string' ? signature.length : -1,
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
        // Log the full server response so the missing field is visible without
        // having to expand `Array(N)` placeholders in DevTools.
        console.error(`[Auth] Verify failed: ${errorCode} - ${errorMsg}`, {
          serverError: verifyBody.error,
          sent: {
            address,
            signatureLength: typeof signature === 'string' ? signature.length : -1,
            signatureType: typeof signature,
          },
        });
        if (errorCode === 'INVALID_VERIFY_REQUEST' && verifyBody.error?.details?.missingFields?.length) {
          console.error(
            '[Auth] Server says these fields were missing/invalid:',
            verifyBody.error.details.missingFields,
          );
        }
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
