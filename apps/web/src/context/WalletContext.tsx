import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { AptosWalletAdapterProvider, useWallet } from '@aptos-labs/wallet-adapter-react';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import { AnySignature, Deserializer } from '@aptos-labs/ts-sdk';

interface DirectAptosWallet {
  connect: () => Promise<{ address: string }>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (tx: {
    type: string;
    function: string;
    arguments: unknown[];
    type_arguments: string[];
  }) => Promise<{ hash: string }>;
  signMessage: (input: { message: string; nonce: string }) => Promise<{ signature: string }>;
  account?: { address: string; publicKey?: string };
  network?: () => Promise<string>;
}

declare global {
  interface Window {
    aptos?: DirectAptosWallet;
  }
}

interface WalletState {
  connected: boolean;
  address: string | null;
  networkName: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<{ hash: string }>;
  signMessage: (message: string) => Promise<string>;
  walletNames: string[];
}

const WalletContext = createContext<WalletState | null>(null);

function WalletContextInner({ children }: { children: ReactNode }) {
  const {
    connect: adapterConnect,
    disconnect: adapterDisconnect,
    account,
    connected: adapterConnected,
    wallets,
    signAndSubmitTransaction: adapterSignAndSubmit,
    signMessage: adapterSignMessage,
    signIn: adapterSignIn,
  } = useWallet();
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [directWallet, setDirectWallet] = useState<{
    address: string;
    name: string;
  } | null>(null);

  const connected = adapterConnected || directWallet !== null;

  useEffect(() => {
    async function fetchNetwork() {
      try {
        if (adapterConnected && wallets.length > 0) {
          const connectedWallet = wallets.find((w) => w.name);
          if (connectedWallet) setNetworkName(connectedWallet.name);
        }
      } catch {
        /* ignore */
      }
    }
    if (adapterConnected) fetchNetwork();
  }, [adapterConnected, wallets]);

  const detectDirectWalletName = useCallback((): string => {
    const win = window as unknown as Record<string, unknown>;
    if (win.martian) return 'Martian';
    if (win.petra) return 'Petra';
    if (typeof window.aptos !== 'undefined') return 'Aptos Wallet';
    return 'Aptos Wallet';
  }, []);

  const connect = useCallback(async () => {
    if (wallets.length > 0) {
      const preferred = ['martian', 'petra', 'pontem'];
      const target =
        preferred.find((name) =>
          wallets.some((w) => w.name.toLowerCase().includes(name)),
        ) ?? wallets[0]?.name;

      const matchedWallet = target
        ? wallets.find(
            (w) =>
              w.name.toLowerCase().includes(target) ||
              w.name === target,
          )
        : null;

      if (!matchedWallet) throw new Error('No wallet found');
      await adapterConnect(matchedWallet.name);
      return;
    }

    // Fallback: connect via window.aptos (handles Martian, etc.)
    if (typeof window !== 'undefined' && window.aptos) {
      try {
        const result = await window.aptos.connect();
        const name = detectDirectWalletName();
        setDirectWallet({ address: result.address, name });
        return;
      } catch (e) {
        throw new Error(
          `Failed to connect via window.aptos: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    throw new Error('No Aptos wallet detected. Please install Petra, Martian, or Pontem.');
  }, [wallets, adapterConnect, detectDirectWalletName]);

  const disconnect = useCallback(async () => {
    if (directWallet) {
      try {
        await window.aptos?.disconnect();
      } catch { /* ignore */ }
      setDirectWallet(null);
      return;
    }
    try {
      await adapterDisconnect();
    } catch {
      /* ignore */
    }
  }, [adapterDisconnect, directWallet]);

  const signAndSubmitTransaction = useCallback(
    async (transaction: InputTransactionData) => {
      if (directWallet) {
        if (!window.aptos) throw new Error('Wallet not available');
        const payload = transaction.data as unknown as {
          function: string;
          functionArguments: unknown[];
          typeArguments: string[];
        };
        const result = await window.aptos.signAndSubmitTransaction({
          type: 'entry_function_payload',
          function: payload.function,
          arguments: payload.functionArguments,
          type_arguments: payload.typeArguments ?? [],
        });
        return { hash: result.hash };
      }
      if (!adapterSignAndSubmit) throw new Error('Wallet does not support signing');
      const result = await adapterSignAndSubmit(transaction);
      return { hash: result.hash };
    },
    [adapterSignAndSubmit, directWallet],
  );

  // ----- Signature normalizers ---------------------------------------------
  // Petra's adapter returns signature data in several shapes across versions:
  //   - adapterSignMessage(...) can return a hex string OR { signature: hex }
  //   - adapterSignIn (SIWA) returns { ..., signature: { publicKey, signature } }
  //     where values may be hex strings OR Uint8Array.
  // The backend (/api/auth/verify) expects a single canonical form:
  //   '0x' + 64-char Ed25519 publicKeyHex + 64-char Ed25519 signatureHex
  // These helpers coerce any of those variants into clean lowercase hex.

  const normalizeHexString = useCallback((value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    let hex = value.toLowerCase();
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length === 0 || !/^[0-9a-f]*$/.test(hex)) return null;
    return hex;
  }, []);

  const bytesToHex = useCallback(
    (value: unknown): string | null => {
      if (value instanceof Uint8Array) {
        return Array.from(value)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      if (Array.isArray(value)) {
        return (value as number[]).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      return normalizeHexString(value);
    },
    [normalizeHexString],
  );

  /**
   * Extract a raw 128-hex-char Ed25519 signature from a wallet response.
   *
   * Handles three shapes returned by the Aptos wallet adapter:
   *   1. Already a 128-char hex string → return as-is.
   *   2. A BCS-serialized AccountSignature / AnySignature (393 bytes = 786 hex
   *      chars) → deserialize with the Aptos SDK and extract the inner
   *      Ed25519 signature bytes.
   *   3. A Uint8Array of exactly 64 bytes → convert to hex.
   *
   * Returns lowercase hex (no 0x prefix) or throws.
   */
  const extractEd25519Signature = useCallback(
    (sig: unknown): string => {
      // ── Path 1: already a raw 128-char hex string ─────────────────────
      const hexStr = bytesToHex(sig);
      if (hexStr && hexStr.length === 128) return hexStr;

      // ── Path 2: BCS-serialized signature (Uint8Array or long hex) ─────
      let bcsBytes: Uint8Array | null = null;

      if (sig instanceof Uint8Array && sig.length > 64) {
        bcsBytes = sig;
      } else if (typeof sig === 'string' && hexStr && hexStr.length > 128) {
        // Convert the long hex string back to bytes for BCS deserialization
        try {
          bcsBytes = new Uint8Array(hexStr.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
        } catch {
          bcsBytes = null;
        }
      }

      if (bcsBytes) {
        try {
          const deserializer = new Deserializer(bcsBytes);
          const anySig = AnySignature.deserialize(deserializer);
          const rawSig = anySig.toUint8Array();
          // After the SDK version transition, toUint8Array() should return raw
          // bytes (64 for Ed25519). But if it still returns BCS bytes, the
          // length will be >64 and we fall through to the error below.
          if (rawSig.length === 64) {
            return Array.from(rawSig)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          }
        } catch (e) {
          console.warn('[WalletContext] BCS AnySignature deserialization failed:', e);
        }
      }

      // ── Path 3: plain Uint8Array that is exactly 64 bytes (raw Ed25519) ──
      if (sig instanceof Uint8Array && sig.length === 64) {
        return Array.from(sig)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }

      throw new Error(
        `Wallet signature length is ${hexStr?.length ?? 'unknown'} hex chars; ` +
          `expected 128 (Ed25519 signature).`,
      );
    },
    [bytesToHex],
  );

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      // Direct wallet path
      if (directWallet) {
        if (!window.aptos) throw new Error('Wallet not available');
        const response = await window.aptos.signMessage({
          message,
          nonce: Date.now().toString(),
        });
        const sigHex = typeof response.signature === 'string'
          ? response.signature
          : bytesToHex(response.signature);
        if (!sigHex || sigHex.length !== 128) {
          throw new Error(`Direct wallet signature length is ${sigHex?.length ?? 'unknown'} hex chars; expected 128.`);
        }
        const pubKeyHex = bytesToHex(window.aptos.account?.publicKey);
        if (!pubKeyHex || pubKeyHex.length !== 64) {
          throw new Error('Direct wallet signMessage: cannot read publicKey.');
        }
        return `0x${pubKeyHex}${sigHex}`;
      }

      // Primary path: AIP-61 adapter signMessage
      if (adapterSignMessage) {
        try {
          const response = await adapterSignMessage({
            message,
            nonce: Date.now().toString(),
          });

          const candidate =
            typeof response === 'string'
              ? response
              : (response as { signature?: unknown })?.signature;
          // Use extractEd25519Signature which handles BCS-serialized
          // AccountSignature (786 hex chars), raw hex strings (128 chars),
          // and Uint8Array values.
          const sigHex = extractEd25519Signature(candidate);

          // Backend contract: '0x' + 64-char pubKeyHex + 64-char sigHex = 130 chars total.
          const accountObj = account as { publicKey?: string | Uint8Array | null } | null;
          const pubKeyHex = bytesToHex(accountObj?.publicKey);

          if (pubKeyHex && pubKeyHex.length === 64) {
            return `0x${pubKeyHex}${sigHex}`;
          }
          // If `account.publicKey` is not exposed by the wallet, we cannot satisfy
          // the backend's pubKey+sig concatenation contract — bail loudly rather
          // than send a half-formed payload.
          throw new Error(
            'Wallet signMessage: cannot read account.publicKey to compose SIWA-style payload.',
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Only fall back to signIn on Petra deprecation errors
          if (!msg.includes('DeprecatedApiError') && !msg.includes('window.petra')) {
            throw e;
          }
        }
      }

      // Fallback: SIWA signIn
      if (!adapterSignIn) throw new Error('Wallet does not support message signing');

      const walletName = wallets.find((w) => w.name.toLowerCase().includes('petra'))?.name;

      const result = await adapterSignIn({
        walletName: walletName ?? 'Petra',
        input: {
          domain: window.location.host,
          nonce: Date.now().toString(),
          // exactOptionalPropertyTypes requires the field to be omitted (not
          // undefined) when no wallet address is available.
          ...(address !== null ? { address } : {}),
          statement: message,
          version: '1',
        },
      });

      if (!result?.signature) throw new Error('No signature returned from wallet');

      const sigObj =
        typeof result.signature === 'string'
          ? { signature: result.signature }
          : (result.signature as { publicKey?: unknown; signature?: unknown });

      const pubKeyHex = bytesToHex(sigObj.publicKey);
      const sigHex = bytesToHex(sigObj.signature);

      if (!pubKeyHex || !sigHex) {
        throw new Error('SIWA response missing or non-hex publicKey/signature.');
      }
      if (pubKeyHex.length !== 64 || sigHex.length !== 64) {
        throw new Error(
          `Unexpected SIWA signature length: pubKey=${pubKeyHex.length} hex, sig=${sigHex.length} hex (both should be 64).`,
        );
      }

      return `0x${pubKeyHex}${sigHex}`;
    },
    [adapterSignMessage, adapterSignIn, account, wallets, bytesToHex, extractEd25519Signature, directWallet],
  );

  const address = directWallet?.address ?? (account?.address ? String(account.address) : null);
  const walletNames = directWallet ? [directWallet.name] : wallets.map((w) => w.name);

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        networkName,
        connect,
        disconnect,
        signAndSubmitTransaction,
        signMessage,
        walletNames,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider autoConnect={false}>
      <WalletContextInner>{children}</WalletContextInner>
    </AptosWalletAdapterProvider>
  );
}

export function useWalletContext(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}
