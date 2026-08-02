import { useState } from 'react';
import { MARKETPLACE_CONTRACT_ADDRESS } from '../lib/contracts';
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
  const { connected, signAndSubmitTransaction } = useWalletContext();
  const [loading, setLoading] = useState(false);

  if (!isOwner || !connected) return null;

  const handleClick = async () => {
    const newOwner = prompt('Enter the new owner wallet address:');
    if (!newOwner || !newOwner.startsWith('0x')) return;
    const paddedAddress = '0x' + newOwner.slice(2).padStart(64, '0');

    setLoading(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::ownership::transfer_ownership`,
          functionArguments: [datasetId, paddedAddress],
        },
      });
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
