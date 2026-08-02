import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { MARKETPLACE_CONTRACT_ADDRESS } from '../lib/contracts';
import { useWalletContext } from '../context/WalletContext';
import './EscrowStatus.css';

interface EscrowStatusProps {
  // The on-chain escrow id (used for the confirm_release / open_dispute txs).
  // Null when the chain could not be queried at purchase time.
  escrowId: number | null;
  dbEscrowId: number | null;
  deadline: number;
  status: 'pending' | 'released' | 'disputed' | 'refunded';
  onConfirm: (txHash: string) => void;
  onDispute: (txHash: string) => void;
}

export function EscrowStatus({ escrowId, dbEscrowId, deadline, status, onConfirm, onDispute }: EscrowStatusProps) {
  const { connected, signAndSubmitTransaction } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!escrowId || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::escrow::confirm_release`,
          functionArguments: [escrowId],
        },
      });
      onConfirm(result.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Escrow confirm failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!escrowId || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::escrow::open_dispute`,
          functionArguments: [escrowId],
        },
      });
      onDispute(result.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Escrow dispute failed');
    } finally {
      setLoading(false);
    }
  };
  const [remaining, setRemaining] = useState(Math.max(0, deadline - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, deadline - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const isExpired = remaining === 0;
  const urgency = days < 1 ? 'urgent' : days < 3 ? 'warning' : 'normal';

  return (
    <div className={`escrow-status escrow-status--${status}`}>
      <div className="escrow-header">
        <span className="escrow-icon">🔒</span>
        <span className="escrow-title">Payment Secured in Escrow</span>
      </div>

      <div className="escrow-countdown">
        <div className={`escrow-timer escrow-timer--${urgency}`}>
          {isExpired ? (
            <span className="escrow-expired-label">Auto-release triggered</span>
          ) : (
            <span className="escrow-time">
              {days > 0 && <>{days}d </>}
              {pad(hrs)}:{pad(mins)}:{pad(secs)}
            </span>
          )}
        </div>
        <span className="escrow-countdown-label">
          {isExpired ? 'Funds releasing to publisher' : 'until auto-release'}
        </span>
      </div>

      {status === 'pending' && !isExpired && (
        <>
          <div className="escrow-actions">
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleConfirm}
              disabled={!escrowId}
            >
              Confirm & Release
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={loading}
              onClick={handleDispute}
              disabled={!escrowId}
            >
              Open Dispute
            </Button>
          </div>
          {!escrowId && dbEscrowId !== null && (
            <p className="escrow-note">
              On-chain escrow id unavailable, so this session can&apos;t confirm release from the
              browser. Your funds are safely held on-chain; the publisher can trigger{' '}
              <code>auto_release</code> after the dispute window expires, or an admin can refund
              you.
            </p>
          )}
          {error && <p className="escrow-note escrow-note--error">{error}</p>}
        </>
      )}

      {status === 'released' && (
        <div className="escrow-status-badge escrow-status-badge--released">
          Funds released to publisher
        </div>
      )}

      {status === 'disputed' && (
        <div className="escrow-status-badge escrow-status-badge--disputed">
          Dispute opened — under review
        </div>
      )}

      {status === 'refunded' && (
        <div className="escrow-status-badge escrow-status-badge--refunded">
          Refunded to buyer
        </div>
      )}

      {isExpired && status === 'pending' && (
        <div className="escrow-status-badge escrow-status-badge--released">
          Dispute window expired — funds auto-released
        </div>
      )}
    </div>
  );
}
