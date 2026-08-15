import { useState } from 'react';
import { transferDatasetOwnership } from '../api/client';
import { useWalletContext } from '../context/WalletContext';
import './OwnershipBadge.css';

interface OwnershipBadgeProps {
  isOnChain: boolean;
  isOwner: boolean;
  ownerAddress?: string;
  compact?: boolean;
}

export function OwnershipBadge({ isOnChain, isOwner, ownerAddress, compact = false }: OwnershipBadgeProps) {
  if (!isOnChain && !isOwner) return null;

  return (
    <div className={`ownership-badge ${compact ? 'ownership-badge--compact' : ''} ${isOnChain ? 'ownership-badge--verified' : ''}`}>
      <span className="ownership-badge-icon">
        {isOnChain ? '⛓️' : '📋'}
      </span>
      <span className="ownership-badge-text">
        {isOnChain ? 'On-chain verified' : 'DB only'}
      </span>
      {isOwner && (
        <span className="ownership-badge-owner">Owner</span>
      )}
    </div>
  );
}

interface TransferOwnershipProps {
  datasetId: number;
  isOwner: boolean;
}

export function TransferOwnershipButton({ datasetId, isOwner }: TransferOwnershipProps) {
  const { connected, address } = useWalletContext();
  const [loading, setLoading] = useState(false);

  if (!isOwner || !connected) return null;

  const handleClick = async () => {
    const newOwner = prompt('Enter the new owner wallet address:');
    if (!newOwner || !newOwner.startsWith('0x')) return;
    if (!address) return;
    const paddedAddress = '0x' + newOwner.slice(2).toLowerCase().padStart(64, '0');

    setLoading(true);
    try {
      // Transfer is signed server-side with the platform account — the
      // recorded on-chain owner — so it lands on the configured Aptos network
      // and passes the contract's owner check (browser-wallet submission fails
      // with ENOT_OWNER because the wallet is not the registered owner).
      const result = await transferDatasetOwnership(datasetId, paddedAddress, address);
      alert(`✓ Ownership transferred on-chain\nNew owner: ${paddedAddress}\nTx: ${result.txHash.slice(0, 18)}…`);
      window.location.reload();
    } catch (err) {
      console.error('Transfer ownership failed:', err);
      alert(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="ownership-transfer-btn" onClick={handleClick} disabled={loading}>
      {loading ? 'Transferring...' : 'Transfer Ownership'}
    </button>
  );
}
