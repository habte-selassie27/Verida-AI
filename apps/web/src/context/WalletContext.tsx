import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { AptosWalletAdapterProvider, useWallet } from '@aptos-labs/wallet-adapter-react';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import {
  AccountAuthenticator,
  Deserializer,
  deserializeSignature,
} from '@aptos-labs/ts-sdk';

interface SignMessageResult {
  token: string;
  fullMessage: string;
}

interface WalletState {
  connected: boolean;
  address: string | null;
  networkName: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<{ hash: string }>;
  signMessage: (message: string) => Promise<SignMessageResult>;
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

  const connected = adapterConnected;
  const address = account?.address ? String(account.address) : null;

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

  const connect = useCallback(async () => {
    // Poll for wallets up to 2s — wallet extensions inject asynchronously
    // and may not be available at the moment the user clicks "Connect".
    let availableWallets = wallets;
    if (availableWallets.length === 0) {
      for (let i = 0; i < 20; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (wallets.length > 0) {
          availableWallets = wallets;
          break;
        }
      }
    }
    if (availableWallets.length === 0) {
      throw new Error(
        'No Aptos wallet detected. Please install Petra, Martian, or Pontem and reload the page.',
      );
    }

    const preferred = ['petra', 'martian', 'pontem'];
    const target =
      preferred.find((name) => availableWallets.some((w) => w.name.toLowerCase().includes(name))) ??
      availableWallets[0]?.name;

    const matchedWallet = target
      ? wallets.find((w) => w.name.toLowerCase().includes(target) || w.name === target)
      : null;

    if (!matchedWallet) throw new Error('No wallet found');
    await adapterConnect(matchedWallet.name);
  }, [wallets, adapterConnect]);

  const disconnect = useCallback(async () => {
    try {
      await adapterDisconnect();
    } catch {
      /* ignore */
    }
  }, [adapterDisconnect]);

  const signAndSubmitTransaction = useCallback(
    async (transaction: InputTransactionData) => {
      if (!adapterSignAndSubmit) throw new Error('Wallet does not support signing');
      const result = await adapterSignAndSubmit(transaction);
      return { hash: result.hash };
    },
    [adapterSignAndSubmit],
  );

  // ----- Signature normalizers ---------------------------------------------
  // Petra's adapter returns signature data in several shapes across versions.
  // The backend expects: '0x' + 64-char Ed25519 publicKeyHex + 128-char Ed25519 signatureHex.
  //
  // CRITICAL: The wallet adapter and the web app may use different copies of
  // @aptos-labs/ts-sdk, so `instanceof` checks fail across packages. We use
  // duck typing exclusively (checking for `.toUint8Array`, `.publicKey`,
  // `.signature` properties) to traverse the object graph.

  const normalizeHexString = useCallback((value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    let hex = value.toLowerCase();
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length === 0 || !/^[0-9a-f]*$/.test(hex)) return null;
    return hex;
  }, []);

  const toHex = (bytes: Uint8Array): string =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  /** Call `.toUint8Array()` on any object that has it, cross-package safe. */
  const tryToUint8 = (v: unknown): Uint8Array | null => {
    if (!v || typeof v !== 'object') return null;
    const fn = (v as Record<string, unknown>).toUint8Array as unknown;
    if (typeof fn !== 'function') return null;
    const result = fn.call(v);
    return result instanceof Uint8Array ? result : null;
  };

  /**
   * Get the raw N-byte payload from an object graph:
   *   1. Try `.toUint8Array()` directly.
   *   2. If result is longer than N, take the trailing N bytes (handles
   *      BCS-envelope types like AnySignature / AnyPublicKey).
   *   3. If object has a `.publicKey` / `.signature` child, recurse into it.
   *   4. If object is a Uint8Array, use directly.
   *
   * Returns null when undetermined.
   */
  const grabNbytes = useCallback(
    (value: unknown, n: 32 | 64): Uint8Array | null => {
      // Raw byte array
      if (value instanceof Uint8Array) {
        if (value.length === n) return value;
        if (value.length > n) return value.slice(value.length - n);
        return null;
      }
      if (Array.isArray(value) && value.every((b) => typeof b === 'number')) {
        if (value.length === n) return new Uint8Array(value as number[]);
        if (value.length > n) return new Uint8Array((value as number[]).slice(value.length - n));
        return null;
      }

      if (!value || typeof value !== 'object') {
        // Hex string
        const maybeHex = normalizeHexString(value);
        if (maybeHex) {
          if (maybeHex.length === n * 2) {
            const bytes = new Uint8Array(maybeHex.length / 2);
            for (let i = 0; i < maybeHex.length; i += 2) {
              bytes[i / 2] = Number.parseInt(maybeHex.slice(i, i + 2), 16);
            }
            return bytes;
          }
          // AnyPublicKey is serialized as scheme(1) + key(32) = 66 hex chars.
          // Take the TRAILING n*2 hex chars so we drop the leading scheme byte.
          if (maybeHex.length > n * 2 && maybeHex.length % 2 === 0) {
            const trimmed = maybeHex.slice(maybeHex.length - n * 2);
            const bytes = new Uint8Array(n);
            for (let i = 0; i < trimmed.length; i += 2) {
              bytes[i / 2] = Number.parseInt(trimmed.slice(i, i + 2), 16);
            }
            return bytes;
          }
        }
        return null;
      }

      const obj = value as Record<string, unknown>;

      // Traverse into child properties FIRST — wrapper types (AnyPublicKey,
      // AnySignature) hold the raw key/sig in .publicKey / .signature.
      // Only fall through to toUint8Array for leaf types (Ed25519PublicKey,
      // Ed25519Signature) where it returns exactly N raw bytes.
      if (obj.publicKey) return grabNbytes(obj.publicKey, n);
      if (obj.public_key) return grabNbytes(obj.public_key, n);
      if (n === 64 && obj.signature) return grabNbytes(obj.signature, 64);
      for (const key of ['bcs', 'bytes', 'data'] as const) {
        const val = obj[key];
        if (val instanceof Uint8Array) return grabNbytes(val, n);
      }
      if (typeof obj.hex === 'string') return grabNbytes(obj.hex, n);
      if (obj.hex instanceof Uint8Array) return grabNbytes(obj.hex, n);

      // toUint8Array LAST — leaf types (Ed25519PublicKey / Ed25519Signature)
      // return exactly N raw bytes. Envelope BCS bytes MUST have been
      // handled by the child traversal above, so if toUint8 returns > N
      // the payload is a BCS wrapper with an unrecognised child field,
      // and we take trailing N bytes as a last resort.
      const uint8 = tryToUint8(value);
      if (uint8) {
        if (uint8.length === n) return uint8;
        if (uint8.length > n) return uint8.slice(uint8.length - n);
      }

      return null;
    },
    [normalizeHexString],
  );

  const extractEd25519PublicKey = useCallback(
    (value: unknown): string | null => {
      const bytes = grabNbytes(value, 32);
      return bytes ? toHex(bytes) : null;
    },
    [],
  );

  const extractEd25519Signature = useCallback(
    (value: unknown): string | null => {
      // First try as generic 64-byte extraction
      const bytes = grabNbytes(value, 64);
      if (bytes) return toHex(bytes);

      // Fallback: try to BCS-deserialize longer byte arrays (AccountAuthenticator)
      if (value instanceof Uint8Array && value.length > 64) {
        try {
          const aa = AccountAuthenticator.deserialize(new Deserializer(value)) as unknown as
            { signature: { signature?: unknown; toUint8Array?: () => Uint8Array } };
          if (aa.signature) return extractEd25519Signature(aa.signature);
        } catch { /* not an AccountAuthenticator */ }
        try {
          const parsed = deserializeSignature(value);
          const bytes2 = grabNbytes(parsed, 64);
          if (bytes2) return toHex(bytes2);
        } catch { /* continue */ }
      }

      // Long hex string → convert to bytes
      const hex = normalizeHexString(value);
      if (hex && hex.length > 128) {
        const buf = new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => Number.parseInt(b, 16)));
        return extractEd25519Signature(buf);
      }

      return null;
    },
    [normalizeHexString],
  );

  /**
   * Produce the '0x' + 64-char pubKey + 128-char sig string the backend's
   * /api/auth/verify endpoint expects.
   *
   * Strategy: try `adapterSignMessage` first (AIP-61). Many newer Petra
   * versions return either:
   *   - The signature bytes (hex string or Uint8Array) directly, OR
   *   - An `AccountAuthenticator` instance with `.public_key` and
   *     `.signature`, OR
   *   - An object like `{ signature: hexOrBytes, publicKey: hexOrBytes }`.
   * We try to recover the Ed25519 public key from each of those, then fall
   * back to `adapterSignIn` (SIWA) which always returns a structural
   * AccountAuthenticator-shaped response.
   */
  const signMessage = useCallback(
    async (message: string): Promise<SignMessageResult> => {
      /**
       * Try every reasonable pairing of (sigField, pubKeyField) and
       * return a fully-populated `{ pubKeyHex, sigHex }` when both
       * canonical 64-char pubkey + 128-char sig can be recovered.
       *
       * `pubKeyField === null` means "fall back to account.publicKey".
       */
      const tryAssemblePayload = (
        sigField: unknown,
        pubKeyField: unknown | null,
      ): { pubKeyHex: string; sigHex: string } | null => {
        const effectivePubKey =
          pubKeyField === null
            ? (account as { publicKey?: unknown } | null)?.publicKey
            : pubKeyField;
        const pubKeyHex = extractEd25519PublicKey(effectivePubKey);
        const sigHex = extractEd25519Signature(sigField);
        if (pubKeyHex && pubKeyHex.length === 64 && sigHex && sigHex.length === 128) {
          return { pubKeyHex, sigHex };
        }
        return null;
      };

      // ─── Primary path: AIP-62 adapterSignMessage ──────────────────────
      if (adapterSignMessage) {
        try {
          const walletNonce = Date.now().toString();
          const response = await adapterSignMessage({
            message,
            nonce: walletNonce,
          });

          // AIP-62: response.fullMessage is what was actually signed
          // (format: "APTOS\n\nmessage: {message}\nnonce: {nonce}")
          // CRITICAL: If fullMessage is missing, we must reconstruct it using
          // the same nonce we sent to the wallet, NOT fall back to the raw
          // message — Petra signs the AIP-62 wrapped message, not the raw prompt.
          let signedMessage = (response as { fullMessage?: string })?.fullMessage;
          if (!signedMessage) {
            // Reconstruct AIP-62 format as a fallback
            signedMessage = `APTOS\n\nmessage: ${message}\nnonce: ${walletNonce}`;
            console.warn(
              '[WalletContext] wallet adapter did not return fullMessage; reconstructed AIP-62 message.',
              { reconstructedLength: signedMessage.length },
            );
          }

          const candidate =
            typeof response === 'string'
              ? response
              : (response as { signature?: unknown })?.signature;
          // Use extractEd25519Signature which handles BCS-serialized
          // AccountSignature (786 hex chars), raw hex strings (128 chars),
          // and Uint8Array values.
          const responseObj =
            response && typeof response === 'object'
              ? (response as {
                  publicKey?: unknown;
                  public_key?: unknown;
                  accountPublicKey?: unknown;
                })
              : null;
          const sigHex = extractEd25519Signature(candidate);

          // Backend contract: '0x' + 64-char pubKeyHex + 128-char sigHex = 194 chars total.
          //
          // Primary source: the AccountAuthenticator in `candidate` (if it is
          // one) carries BOTH the public key AND the signature.  Petra's
          // adapterSignMessage returns the BCS AccountAuthenticator as the
          // signature hex, so we deserialise it here to get the public key
          // as well.
          const candidateForAuth =
            candidate instanceof Uint8Array
              ? candidate
              : typeof candidate === 'string'
                ? (() => {
                    const h = normalizeHexString(candidate);
                    if (h && h.length > 128) {
                      try {
                        return new Uint8Array(h.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
                      } catch { /* ignore */ }
                    }
                    return null;
                  })()
                : null;
          const authPubKey =
            candidateForAuth !== null
              ? (() => {
                  try {
                    const aa = AccountAuthenticator.deserialize(
                      new Deserializer(candidateForAuth),
                    ) as unknown as { public_key?: { publicKey?: { toUint8Array?: () => Uint8Array } } };
                    return extractEd25519PublicKey(aa.public_key);
                  } catch { return null; }
                })()
              : null;

      const accountObj = account as { publicKey?: unknown } | null;
      const pkViaAccount = accountObj?.publicKey;
      const pkViaAccountHex = extractEd25519PublicKey(pkViaAccount);

      const pubKeyHex =
        // AUTHORITATIVE: the connected account's public key is definitionally
        // correct for this address. Prefer it over anything parsed out of the
        // signature blob — Petra's signMessage returns a RAW 64-byte signature
        // (not an AccountAuthenticator), so deserializing it yields garbage.
        pkViaAccountHex ??
        extractEd25519PublicKey(responseObj?.publicKey) ??
        extractEd25519PublicKey(responseObj?.public_key) ??
        extractEd25519PublicKey(responseObj?.accountPublicKey) ??
        authPubKey;

      // ── Diagnostic: log the raw response and extracted keys ────────────
      const hexify = (v: unknown): string => {
        if (v == null) return String(v);
        if (typeof v === 'string') return `str(${v.length}):${v.slice(0, 70)}`;
        if (v instanceof Uint8Array) return `u8(${v.length}):${Array.from(v.slice(0, 40)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
        if (typeof v === 'object') {
          const keys = Object.keys(v as object);
          const toU8 = (v as { toUint8Array?: () => Uint8Array }).toUint8Array;
          let inner = '';
          if (typeof toU8 === 'function') {
            try { inner = hexify(toU8.call(v)); } catch { inner = 'toU8-threw'; }
          }
          return `obj{${keys.join(',')}}${inner ? ` toU8=${inner}` : ''}`;
        }
        return String(v);
      };
      console.log('[WalletContext] PUBKEY-DEBUG',
        JSON.stringify({
          responseKeys: response && typeof response === 'object' ? Object.keys(response) : 'N/A',
          fullMessage60: signedMessage?.slice(0, 60),
          sigHexLen: sigHex?.length ?? null,
          authPubKey: authPubKey ?? null,
          pkViaAccountHex: pkViaAccountHex ?? null,
          finalPubKeyHex: pubKeyHex ?? null,
          account_publicKey_shape: hexify(pkViaAccount),
          response_publicKey_shape: hexify(responseObj?.publicKey),
          response_public_key_shape: hexify(responseObj?.public_key),
          address,
        }, null, 2),
      );

      if (pubKeyHex && pubKeyHex.length === 64 && sigHex && sigHex.length === 128) {
        return { token: `0x${pubKeyHex}${sigHex}`, fullMessage: signedMessage };
      }

        const dumpShape = (obj: unknown, label: string) => {
          const t = typeof obj;
          // eslint-disable-next-line no-eq-null
          if (obj === null || t !== 'object') { console.warn(`[${label}] type=${t}`); return; }
          const keys = Object.keys(obj as object);
          const entries = keys.map(k => {
            const v = (obj as Record<string, unknown>)[k] as unknown;
            const vt = v === null ? 'null' : typeof v;
            const ulen = v instanceof Uint8Array ? `(${v.length}b)` : '';
            return `${k}:${vt}${ulen}`;
          });
          console.warn(`[${label}] keys=${keys.length} ${entries.join(', ')} toUint8Fn=${typeof (obj as Record<string, unknown>).toUint8Array}`);
        };
        dumpShape(response, 'response');
        dumpShape(candidate, 'candidate');
      dumpShape(account, 'account');
      dumpShape(pkViaAccount, 'account.publicKey');
      console.warn('[WalletContext] pubKey chain:', {
        authPubKey: authPubKey?.slice(0, 10),
        respPubKey: extractEd25519PublicKey(responseObj?.publicKey)?.slice(0, 10),
        respPub_key: extractEd25519PublicKey(responseObj?.public_key)?.slice(0, 10),
        respAcctPk: extractEd25519PublicKey(responseObj?.accountPublicKey)?.slice(0, 10),
        accountPk: pkViaAccountHex?.slice(0, 10),
        sigHexLen: sigHex?.length,
      });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // Only fall back to signIn on Petra deprecation errors
          if (
            !msg.includes('DeprecatedApiError') &&
            !msg.includes('window.petra') &&
            !msg.includes('cannot read account.publicKey')
          ) {
            throw e;
          }
        }
      }

      // Fallback: SIWA signIn
      if (!adapterSignIn) throw new Error('Wallet does not support message signing');

      const walletName = wallets.find((w) => w.name.toLowerCase().includes('petra'))?.name;
      const siwaNonce = Date.now().toString();
      const siwaDomain = window.location.host;

      const result = await adapterSignIn({
        walletName: walletName ?? 'Petra',
        input: {
          domain: siwaDomain,
          nonce: siwaNonce,
          // exactOptionalPropertyTypes requires the field to be omitted (not
          // undefined) when no wallet address is available.
          ...(address !== null ? { address } : {}),
          statement: message,
          version: '1',
        },
      });

      if (!result?.signature) throw new Error('No signature returned from wallet');

      // CRITICAL: The SIWA signIn method signs a DIFFERENT message format than
      // the raw prompt. We must reconstruct the SIWA message so the backend
      // verifies against the same bytes the wallet signed.
      const siwaFullMessage = (result as { fullMessage?: string })?.fullMessage
        ?? [
          `${siwaDomain} wants you to sign in with your Aptos account:`,
          address ?? '',
          '',
          `Nonce: ${siwaNonce}`,
          '',
          message,
          '',
          'Version: 1',
        ].join('\n');

      const sigObj =
        typeof result.signature === 'string'
          ? { signature: result.signature }
          : (result.signature as { publicKey?: unknown; signature?: unknown });

      // If the signature is a hex string longer than 128 chars, it's an
      // AccountAuthenticator envelope — extract the public key from it too.
      const authPubKey =
        typeof result.signature === 'string'
          ? (() => {
              const h = normalizeHexString(result.signature);
              if (h && h.length > 128) {
                try {
                  const bytes = new Uint8Array(h.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
                  const aa = AccountAuthenticator.deserialize(new Deserializer(bytes)) as
                    unknown as { public_key?: { publicKey?: { toUint8Array?: () => Uint8Array } } };
                  return extractEd25519PublicKey(aa.public_key);
                } catch { return null; }
              }
              return null;
            })()
          : null;

      const fallbackPubKey = (result as { publicKey?: unknown; public_key?: unknown; accountPublicKey?: unknown; account?: { publicKey?: unknown } });
      const pubKeyHex =
        authPubKey ??
        extractEd25519PublicKey(sigObj.publicKey) ??
        extractEd25519PublicKey(fallbackPubKey?.publicKey) ??
        extractEd25519PublicKey(fallbackPubKey?.public_key) ??
        extractEd25519PublicKey(fallbackPubKey?.accountPublicKey) ??
        extractEd25519PublicKey(fallbackPubKey?.account?.publicKey) ??
        extractEd25519PublicKey((account as { publicKey?: unknown } | null)?.publicKey);
      const sigHex = sigObj.signature ? extractEd25519Signature(sigObj.signature) : null;

      if (!pubKeyHex || !sigHex) {
        const dumpShape = (obj: unknown, label: string) => {
          const t = typeof obj;
          // eslint-disable-next-line no-eq-null
          if (obj === null || t !== 'object') { console.warn(`[${label}] type=${t}`); return; }
          const keys = Object.keys(obj as object);
          const entries = keys.map(k => {
            const v = (obj as Record<string, unknown>)[k] as unknown;
            const vt = v === null ? 'null' : typeof v;
            const ulen = v instanceof Uint8Array ? `(${v.length}b)` : '';
            return `${k}:${vt}${ulen}`;
          });
          console.warn(`[${label}] keys=${keys.length} ${entries.join(', ')} toUint8Fn=${typeof (obj as Record<string, unknown>).toUint8Array}`);
        };
        dumpShape(result, 'siwa_result');
        dumpShape(result.signature, 'siwa_result.signature');
        if (typeof result.signature !== 'string') dumpShape(sigObj, 'siwa_sigObj');
        throw new Error(
          `SIWA response missing or non-hex publicKey/signature (pubKeyHex=${typeof pubKeyHex}, sigHex=${typeof sigHex}).`,
        );
      }
      if (pubKeyHex.length !== 64 || sigHex.length !== 128) {
        throw new Error(
          `Unexpected SIWA signature length: pubKey=${pubKeyHex.length} hex, sig=${sigHex.length} hex (expected 64 and 128).`,
        );
      }

      return { token: `0x${pubKeyHex}${sigHex}`, fullMessage: siwaFullMessage };
    },
    [
      adapterSignMessage,
      adapterSignIn,
      account,
      address,
      wallets,
      normalizeHexString,
      extractEd25519Signature,
      extractEd25519PublicKey,
    ],
  );

  const walletNames = wallets.map((w) => w.name);

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
