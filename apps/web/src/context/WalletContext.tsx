import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { AptosWalletAdapterProvider, useWallet } from '@aptos-labs/wallet-adapter-react';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-react';
import {
  AccountAuthenticator,
  AnySignature,
  Deserializer,
  Ed25519PublicKey,
  Ed25519Signature,
  deserializeSignature,
  type Signature,
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
  // Petra's adapter returns signature data in several shapes across versions:
  //   - adapterSignMessage(...) can return a hex string OR { signature: hex }
  //   - adapterSignIn (SIWA) returns { ..., signature: { publicKey, signature } }
  //     where values may be hex strings OR Uint8Array.
  // The backend (/api/auth/verify) expects a single canonical form:
  //   '0x' + 64-char Ed25519 publicKeyHex + 128-char Ed25519 signatureHex
  // These helpers coerce any of those variants into clean lowercase hex.

  const normalizeHexString = useCallback((value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    let hex = value.toLowerCase();
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length === 0 || !/^[0-9a-f]*$/.test(hex)) return null;
    return hex;
  }, []);

  /**
   * Convert any of the wallet response shapes into lowercase hex (no 0x).
   *
   * Deliberately avoids `obj.toUint8Array()` because that method is
   * deprecated in @aptos-labs/ts-sdk 5.x — Aptos SDK now wants callers to
   * use `obj.bcsToBytes()` for BCS-envelope objects. We only touch
   * `.toUint8Array()` on the still-current `Ed25519Signature` /
   * `Ed25519PublicKey` types whose bytes ARE the signature/pubkey, never on
   * `AccountAuthenticator` / `AnySignature` (which are envelopes).
   */
  const bytesToHex = useCallback(
    (value: unknown): string | null => {
      // Direct Uint8Array → hex.
      if (value instanceof Uint8Array) {
        return Array.from(value)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      // Plain arrays of bytes (defensive — e.g. JSON-serialized payloads
      // arrive as `{ 0: 1, 1: 2 }` or `[{ }]`).
      if (Array.isArray(value) && value.every((b) => typeof b === 'number')) {
        return (value as number[]).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
      // Object wrappers that expose the payload via a Uint8Array field
      // (`bcs`, `bytes`, `data`, `hex`) — used by newer Aptos SDK envelopes
      // without touching the deprecated `.toUint8Array()`.
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.bcs instanceof Uint8Array) return bytesToHex(obj.bcs);
        if (obj.bytes instanceof Uint8Array) return bytesToHex(obj.bytes);
        if (obj.data instanceof Uint8Array) return bytesToHex(obj.data);
        if (typeof obj.hex === 'string') return normalizeHexString(obj.hex);
        if (obj.hex instanceof Uint8Array) return bytesToHex(obj.hex);
      }
      return normalizeHexString(value);
    },
    [normalizeHexString],
  );

  // Shared helpers used by both extractEd25519PublicKey and
  // extractEd25519Signature.
  const toHex = (bytes: Uint8Array): string =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  const duckToUint8 = (v: unknown): Uint8Array | null => {
    const fn = (v as Record<string, unknown> | null)?.toUint8Array;
    if (typeof fn !== 'function') return null;
    const result = fn.call(v);
    return result instanceof Uint8Array ? result : null;
  };

  /**
   * Pull out a 32-byte Ed25519 public key (64 hex chars) from any wallet
   * payload shape. Returns `null` when undetermined.
   */
  const extractEd25519PublicKey = useCallback(
    (value: unknown): string | null => {
      // Fast path: direct 32-byte Uint8Array
      if (value instanceof Uint8Array && value.length === 32) return toHex(value);
      if (
        Array.isArray(value) &&
        value.length === 32 &&
        value.every((b) => typeof b === 'number')
      ) {
        return toHex(new Uint8Array(value as number[]));
      }

      if (value && typeof value === 'object') {
        if (value instanceof Ed25519PublicKey) return toHex(value.toUint8Array());
        const obj = value as Record<string, unknown>;
        // Check structured fields BEFORE duck-type toUint8Array — BCS
        // envelopes (AnyPublicKey) have a .publicKey child that holds the
        // raw key, whereas duckToUint8 on the envelope returns BCS-wrapped
        // bytes that include the type tag.
        if (obj.publicKey) return extractEd25519PublicKey(obj.publicKey);
        if (obj.public_key) return extractEd25519PublicKey(obj.public_key);
        if (obj.bcs instanceof Uint8Array) return extractEd25519PublicKey(obj.bcs);
        if (obj.bytes instanceof Uint8Array) return extractEd25519PublicKey(obj.bytes);
        if (obj.data instanceof Uint8Array) return extractEd25519PublicKey(obj.data);
        if (typeof obj.hex === 'string') {
          const h = bytesToHex(obj.hex);
          if (h && h.length === 64) return h;
        }
        if (obj.hex instanceof Uint8Array) return extractEd25519PublicKey(obj.hex);
      // Duck-type toUint8Array last — only safe for leaf types
      // (Ed25519PublicKey) where toUint8Array returns exactly 32 raw bytes.
      const duck = duckToUint8(value);
      if (duck && duck.length === 32) return toHex(duck);
      console.warn('[extractPubKey] failed on:', {
        ctor: (value as object).constructor?.name,
        keys: Object.keys(value as object).slice(0, 8),
        duckLen: duck?.length,
        hasPublicKey: 'publicKey' in (value as object),
        hasPublic_key: 'public_key' in (value as object),
        hasBcs: 'bcs' in (value as object),
        hasBytes: 'bytes' in (value as object),
        hasData: 'data' in (value as object),
        hasHex: 'hex' in (value as object),
      });
      }

      return bytesToHex(value);
    },
    [bytesToHex],
  );

  /**
   * Pull a 64-byte Ed25519 signature (128 hex chars) out of any wallet
   * payload shape. Returns `null` when undetermined.
   *
   * Order of preference (no deprecated API calls):
   *   1. Raw 64-byte Uint8Array → hex.
   *   2. Aptos SDK Ed25519Signature → `.toUint8Array()` (still supported
   *      for the leaf type).
   *   3. BCS envelope (Uint8Array > 64 bytes) → try
   *      `deserializeSignature`, then `AnySignature.deserialize`, then take
   *      `AnySignature.signature` and stringify.
   *   4. 128-char hex string → as-is.
   *   5. Last resort: trailing 64 bytes of an unknown envelope.
   */
  const extractEd25519Signature = useCallback(
    (value: unknown): string | null => {
      const fromSignature = (s: Signature): string | null => {
        // Duck-type first — handles cross-package instanceof mismatch.
        const duck = duckToUint8(s);
        if (duck && duck.length === 64) return toHex(duck);
        // instanceof fallback for when the same SDK copy is used.
        if (s instanceof Ed25519Signature) return toHex(s.toUint8Array());
        if (s instanceof AnySignature) {
          const inner = s.signature;
          if (inner instanceof Ed25519Signature) return toHex(inner.toUint8Array());
          return fromSignature(inner);
        }
        // Duck-type AnySignature via .signature traversal.
        const sObj = s as unknown as Record<string, unknown>;
        if (sObj.signature) return fromSignature(sObj.signature as Signature);
        return null;
      };

      // (1) raw Uint8Array
      if (value instanceof Uint8Array) {
        if (value.length === 64) return toHex(value);
        if (value.length === 65) {
          // Some wallets prepend a 0x00 scheme byte before the 64-byte sig
          return toHex(value.slice(1));
        }
        if (value.length > 64) {
          // (3a) AccountAuthenticator envelope — Petra adapterSignMessage
          // may return a BCS AccountAuthenticator, from which we need the
          // inner 64-byte Ed25519 signature.
          try {
            const auth = AccountAuthenticator.deserialize(new Deserializer(value)) as unknown as
              { signature: AnySignature };
            const out = fromSignature(auth.signature);
            if (out) return out;
          } catch {
            /* fall through */
          }
          try {
            const parsed = deserializeSignature(value);
            const out = fromSignature(parsed);
            if (out) return out;
          } catch {
            /* fall through */
          }
          try {
            const any = AnySignature.deserialize(new Deserializer(value));
            const out = fromSignature(any);
            if (out) return out;
          } catch {
            /* fall through — not an AnySignature, try trailing bytes */
          }
          // (5) trailing 64 bytes fallback.
          if (value.length >= 64) return toHex(value.slice(value.length - 64));
        }
      }

      // (2) long hex string → convert to bytes and retry deserializers.
      const hex = bytesToHex(value);
      if (typeof value === 'string' && hex && hex.length > 128) {
        const bytes = new Uint8Array(
          hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
        );
        return extractEd25519Signature(bytes);
      }

      // (3) leaf typed signature
      if (value instanceof Ed25519Signature) return toHex(value.toUint8Array());
      if (value instanceof AnySignature) return fromSignature(value);

      // (3b) generic object with signature / bcs / bytes / hex / toUint8Array
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        // Check .signature FIRST — AnySignature.toUint8Array() returns BCS
        // bytes (not the 64-byte signature) in the current SDK, so we
        // must traverse into the inner Ed25519Signature directly.
        if (obj.signature) return extractEd25519Signature(obj.signature);
        if (obj.bcs instanceof Uint8Array) return extractEd25519Signature(obj.bcs);
        if (obj.bytes instanceof Uint8Array) return extractEd25519Signature(obj.bytes);
        if (typeof obj.hex === 'string') {
          const h = bytesToHex(obj.hex);
          if (h && h.length === 128) return h;
        }
        if (obj.hex instanceof Uint8Array) return extractEd25519Signature(obj.hex);
        // Duck-type toUint8Array LAST — only for leaf types (Ed25519Signature)
        // where toUint8Array returns raw bytes, not BCS.
        const duck = duckToUint8(value);
        if (duck && duck.length === 64) return toHex(duck);
        if (duck && duck.length > 64) return extractEd25519Signature(duck);
      }

      // (4) exact 128-char hex string
      if (hex && hex.length === 128) return hex;

      // (5) brute-force toUint8Array fallback on any remaining object
      if (value && typeof value === 'object') {
        const duck = duckToUint8(value);
        if (duck && duck.length === 64) return toHex(duck);
        console.warn('[extractSig] failed on:', {
          ctor: (value as object).constructor?.name,
          keys: Object.keys(value as object).slice(0, 5),
          duckLen: duck?.length,
        });
      }

      return null;
    },
    [bytesToHex],
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
          const response = await adapterSignMessage({
            message,
            nonce: Date.now().toString(),
          });

          // AIP-62: response.fullMessage is what was actually signed
          // (format: "APTOS\n\nmessage: {message}\nnonce: {nonce}")
          const signedMessage =
            (response as { fullMessage?: string })?.fullMessage ?? message;

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
                    const h = bytesToHex(candidate);
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
        authPubKey ??
        extractEd25519PublicKey(responseObj?.publicKey) ??
        extractEd25519PublicKey(responseObj?.public_key) ??
        extractEd25519PublicKey(responseObj?.accountPublicKey) ??
        pkViaAccountHex;

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

      // If the signature is a hex string longer than 128 chars, it's an
      // AccountAuthenticator envelope — extract the public key from it too.
      const authPubKey =
        typeof result.signature === 'string'
          ? (() => {
              const h = bytesToHex(result.signature);
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

      return { token: `0x${pubKeyHex}${sigHex}`, fullMessage: message };
    },
    [
      adapterSignMessage,
      adapterSignIn,
      account,
      address,
      wallets,
      bytesToHex,
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
