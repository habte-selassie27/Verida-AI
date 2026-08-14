// Shared server-side Aptos signer. The platform signs on-chain admin actions
// (escrow auto-release, publisher grant/revoke) with SHELBY_SIGNER_PRIVATE_KEY —
// the same account that owns the marketplace contract — so they land on the
// configured Aptos network deterministically, independent of any browser wallet.
import { Account, Ed25519Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

export function getServerSigner(): Account {
  const privateKey = process.env.SHELBY_SIGNER_PRIVATE_KEY?.trim();

  if (privateKey !== undefined && privateKey.length > 0) {
    // Pass the key in AIP-80 compliant form (ed25519-priv-0x…), same as the
    // Shelby upload signer, so server-signed txs share the configured identity.
    const aip80Key = privateKey.startsWith('ed25519-priv-')
      ? privateKey
      : `ed25519-priv-${privateKey.replace(/^0x/i, '')}`;
    return new Ed25519Account({ privateKey: new Ed25519PrivateKey(aip80Key) });
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[ServerSigner] SHELBY_SIGNER_PRIVATE_KEY is not set. Server-signed transactions ' +
      'will use an ephemeral, likely unfunded account and will fail for gas.',
    );
  }
  return Account.generate();
}
