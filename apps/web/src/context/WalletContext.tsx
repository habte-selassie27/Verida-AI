import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { AptosWalletAdapterProvider, useWallet } from '@aptos-labs/wallet-adapter-react';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-react';

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
  const { connect: adapterConnect, disconnect: adapterDisconnect, account, connected, wallets, signAndSubmitTransaction: adapterSignAndSubmit, signMessage: adapterSignMessage, signIn: adapterSignIn } = useWallet();
  const [networkName, setNetworkName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNetwork() {
      try {
        if (connected && wallets.length > 0) {
          const petra = wallets.find((w) => w.name.toLowerCase().includes('petra'));
          if (petra) setNetworkName(petra.name);
        }
      } catch { /* ignore */ }
    }
    if (connected) fetchNetwork();
  }, [connected, wallets]);

  const connect = useCallback(async () => {
    if (wallets.length === 0) throw new Error('No Aptos wallet detected. Please install Petra, Martian, or Pontem.');

    const preferred = ['Petra', 'Martian', 'Pontem'];
    const target = preferred.find((name) => wallets.some((w) => w.name === name))
      ?? wallets[0]?.name;

    if (!target) throw new Error('No wallet found');
    await adapterConnect(target);
  }, [wallets, adapterConnect]);

  const disconnect = useCallback(async () => {
    try { await adapterDisconnect(); } catch { /* ignore */ }
  }, [adapterDisconnect]);

  const signAndSubmitTransaction = useCallback(async (transaction: InputTransactionData) => {
    if (!adapterSignAndSubmit) throw new Error('Wallet does not support signing');
    const result = await adapterSignAndSubmit(transaction);
    return { hash: result.hash };
  }, [adapterSignAndSubmit]);

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

  const bytesToHex = useCallback((value: unknown): string | null => {
    if (value instanceof Uint8Array) {
      return Array.from(value).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    if (Array.isArray(value)) {
      return (value as number[])
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return normalizeHexString(value);
  }, [normalizeHexString]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
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
        // Use bytesToHex (not normalizeHexString) so wallets that return
        // { signature: Uint8Array } per AIP-62 are also handled.
        const sigHex = bytesToHex(candidate);

        if (!sigHex) {
          throw new Error('Wallet signMessage returned a non-hex signature payload.');
        }
        if (sigHex.length !== 128) {
          throw new Error(
            `Wallet signature length is ${sigHex.length} hex chars; expected 128 (Ed25519 signature).`,
          );
        }

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
  }, [adapterSignMessage, adapterSignIn, account, wallets, bytesToHex, normalizeHexString]);

  const address = account?.address ? String(account.address) : null;
  const walletNames = wallets.map((w) => w.name);

  return (
    <WalletContext.Provider value={{
      connected,
      address,
      networkName,
      connect,
      disconnect,
      signAndSubmitTransaction,
      signMessage,
      walletNames,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider autoConnect={false} optInWallets={['Petra']}>
      <WalletContextInner>
        {children}
      </WalletContextInner>
    </AptosWalletAdapterProvider>
  );
}

export function useWalletContext(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}
