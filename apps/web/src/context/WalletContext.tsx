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
  walletNames: string[];
}

const WalletContext = createContext<WalletState | null>(null);

function WalletContextInner({ children }: { children: ReactNode }) {
  const { connect: adapterConnect, disconnect: adapterDisconnect, account, connected, wallets, signAndSubmitTransaction: adapterSignAndSubmit } = useWallet();
  const [networkName, setNetworkName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNetwork() {
      try {
        const wallet = wallets.find((w) => w.name.toLowerCase().includes('petra'));
        if (wallet && 'network' in wallet) {
          const networkFunc = (wallet as { network?: () => Promise<{ name?: string }> }).network;
          if (networkFunc) {
            const net = await networkFunc();
            if (net?.name) setNetworkName(net.name);
          }
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
      walletNames,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider autoConnect={false}>
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
