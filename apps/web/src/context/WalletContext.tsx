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

  const signMessage = useCallback(async (message: string): Promise<string> => {
    // Try signMessage first (Petra v2.4.8 may throw deprecation error)
    if (adapterSignMessage) {
      try {
        const response = await adapterSignMessage({
          message,
          nonce: Date.now().toString(),
        });
        const r = response as { signature: string };
        return r.signature;
      } catch (e) {
        // Only fallback signIn on Petra deprecation errors
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('DeprecatedApiError') && !msg.includes('window.petra')) {
          throw e;
        }
      }
    }

    // Fallback: use signIn (SIWA) — different wallet standard feature
    if (!adapterSignIn) throw new Error('Wallet does not support message signing');

    const walletName = account?.address ? wallets.find((w) =>
      w.name.toLowerCase().includes('petra'),
    )?.name : undefined;

    const result = await adapterSignIn({
      walletName: walletName ?? 'Petra',
      input: {
        domain: window.location.host,
        nonce: Date.now().toString(),
        address: account?.address,
        statement: message,
        version: '1',
      },
    });

    if (!result?.signature) throw new Error('No signature returned from wallet');

    // SIWA signature is { publicKey, signature, type } — concatenate pubkey+sig as hex
    const sig = result.signature as { publicKey: string | Uint8Array; signature: string | Uint8Array };
    const pubKeyHex = typeof sig.publicKey === 'string' ? sig.publicKey.replace('0x', '') : Array.from(new Uint8Array(sig.publicKey)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const sigHex = typeof sig.signature === 'string' ? sig.signature.replace('0x', '') : Array.from(new Uint8Array(sig.signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
    // Backend expects: pubKeyHex(64) + sigHex(64) = 128 hex chars
    return `0x${pubKeyHex}${sigHex}`;
  }, [adapterSignMessage, adapterSignIn, account, wallets]);

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
