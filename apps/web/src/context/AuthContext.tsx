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
      // Step 1: Get nonce
      const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const nonceBody = await nonceRes.json() as {
        data: { message: string; nonce: string; expiresAt: number };
        success: boolean;
      };
      if (!nonceBody.success) throw new Error('Failed to get auth nonce');

      // Step 2: Sign message with wallet
      const { message } = nonceBody.data;

      // Sign via wallet adapter
      const signature = await signMessage(message);

      // Step 3: Verify signature and get JWT
      const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature }),
      });
      const verifyBody = await verifyRes.json() as {
        data: { address: string; expiresIn: string; token: string };
        success: boolean;
      };
      if (!verifyBody.success) throw new Error('Signature verification failed');

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
