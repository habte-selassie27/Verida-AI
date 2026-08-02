import { calculateFeeBreakdown, octasToApt } from '../lib/contracts';
import './FeeBreakdown.css';

interface FeeBreakdownProps {
  priceOctas: number;
  compact?: boolean;
}

export function FeeBreakdown({ priceOctas, compact = false }: FeeBreakdownProps) {
  const breakdown = calculateFeeBreakdown(priceOctas);

  if (compact) {
    return (
      <div className="fee-breakdown fee-breakdown--compact">
        <div className="fee-row">
          <span className="fee-label">Publisher receives</span>
          <span className="fee-value fee-value--publisher">{breakdown.publisherApt} APT</span>
        </div>
        <div className="fee-row">
          <span className="fee-label">Platform fee (5%)</span>
          <span className="fee-value fee-value--fee">{breakdown.feeApt} APT</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fee-breakdown">
      <div className="fee-header">Payment Breakdown</div>
      <div className="fee-row fee-row--total">
        <span className="fee-label">Total</span>
        <span className="fee-value fee-value--total">{breakdown.totalApt} APT</span>
      </div>
      <div className="fee-divider" />
      <div className="fee-row">
        <span className="fee-label">Publisher (95%)</span>
        <span className="fee-value fee-value--publisher">{breakdown.publisherApt} APT</span>
      </div>
      <div className="fee-row">
        <span className="fee-label">Platform (5%)</span>
        <span className="fee-value fee-value--fee">{breakdown.feeApt} APT</span>
      </div>
      <div className="fee-note">
        Payment split enforced on-chain via smart contract
      </div>
    </div>
  );
}
