import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface WalletState {
  connected: boolean;
  address: string | null;
  networkName: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: {
    data?: {
      function: string;
      typeArguments: string[];
      functionArguments: unknown[];
    };
    payload?: {
      type: string;
      function: string;
      typeArguments: string[];
      arguments: unknown[];
    };
  }) => Promise<{ hash: string }>;
  signMessage: (message: string) => Promise<string>;
  walletNames: string[];
}

const WalletContext = createContext<WalletState | null>(null);

function getAptos() {
  const anyWindow = window as unknown as {
    aptos?: {
      connect?: () => Promise<{ address: string }>;
      disconnect?: () => Promise<void>;
      account?: () => Promise<{ address: string }>;
      network?: () => Promise<{ name: string }>;
      signAndSubmitTransaction?: (tx: unknown) => Promise<{ hash: string }>;
      signMessage?: (input: { message: string; nonce?: string }) => Promise<{ signature: string | { publicKey: string; signature: string } }>;
      onEvent?: (event: string, cb: (...args: unknown[]) => void) => void;
      isConnected?: () => Promise<{ connected: boolean }>;
    };
  };
  return anyWindow.aptos;
}

function WalletContextInner({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [walletNames, setWalletNames] = useState<string[]>(() => {
    const aptos = getAptos();
    return aptos ? ['Petra (Wallet Standard)'] : [];
  });

  const updateNetwork = useCallback(async () => {
    try {
      const aptos = getAptos();
      if (aptos?.network) {
        const net = await aptos.network();
        if (net?.name) setNetworkName(net.name);
      }
    } catch { /* ignore */ }
  }, []);

  const connect = useCallback(async () => {
    const aptos = getAptos();
    if (!aptos?.connect) throw new Error('No Aptos wallet detected. Please install Petra, Martian, or Pontem.');

    try {
      await aptos.connect();
      const acct = await aptos.account();
      if (acct?.address) {
        setAddress(acct.address);
        setConnected(true);
        await updateNetwork();
      } else {
        throw new Error('No address returned from wallet');
      }
    } catch (cause: unknown) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      if (msg.includes('already connected') || msg.includes('already authorized')) {
        const acct = await aptos.account();
        if (acct?.address) {
          setAddress(acct.address);
          setConnected(true);
          await updateNetwork();
          return;
        }
      }
      throw cause;
    }
  }, [updateNetwork]);

  const disconnect = useCallback(async () => {
    try {
      const aptos = getAptos();
      await aptos?.disconnect();
    } catch { /* ignore */ }
    setAddress(null);
    setConnected(false);
    setNetworkName(null);
  }, []);

  const signAndSubmitTransaction = useCallback(async (transaction: {
    data?: {
      function: string;
      typeArguments: string[];
      functionArguments: unknown[];
    };
    payload?: {
      type: string;
      function: string;
      typeArguments: string[];
      arguments: unknown[];
    };
  }): Promise<{ hash: string }> => {
    const aptos = getAptos();
    if (!aptos?.signAndSubmitTransaction) throw new Error('Wallet does not support transaction signing');

    // Convert from adapter format to wallet standard format
    const payload = transaction.payload ?? {
      type: 'entry_function_payload',
      function: transaction.data!.function,
      typeArguments: transaction.data!.typeArguments,
      arguments: transaction.data!.functionArguments,
    };

    const result = await aptos.signAndSubmitTransaction({ payload });
    return { hash: result.hash };
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    const aptos = getAptos();
    if (!aptos?.signMessage) throw new Error('Wallet does not support message signing');
    const result = await aptos.signMessage({ message, nonce: 'verida-ai-auth' });
    const sig = result.signature;
    return typeof sig === 'string' ? sig : sig.signature;
  }, []);

  // Check initial connection state
  useEffect(() => {
    const check = async () => {
      try {
        const aptos = getAptos();
        if (!aptos) return;

        const isConnected = await aptos.isConnected?.();
        if (isConnected?.connected) {
          const acct = await aptos.account();
          if (acct?.address) {
            setAddress(acct.address);
            setConnected(true);
            await updateNetwork();
          }
        }
      } catch { /* ignore */ }
    };
    check();
  }, [updateNetwork]);

  // Listen for account/network changes
  useEffect(() => {
    const aptos = getAptos();
    if (!aptos?.onEvent) return;

    const handleEvent = () => {
      // Re-check state on any event
      if (aptos.account) {
        aptos.account().then((acct) => {
          if (acct?.address) {
            setAddress(acct.address);
            setConnected(true);
            updateNetwork();
          } else {
            setAddress(null);
            setConnected(false);
          }
        }).catch(() => {
          setAddress(null);
          setConnected(false);
        });
      }
    };

    // Standard event names for Aptos Wallet Standard
    aptos.onEvent('connect', handleEvent);
    aptos.onEvent('disconnect', () => {
      setAddress(null);
      setConnected(false);
      setNetworkName(null);
    });

    return () => {
      // Cleanup - most wallets don't support removeListener
    };
  }, [updateNetwork]);

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
  return <WalletContextInner>{children}</WalletContextInner>;
}

export function useWalletContext(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}
