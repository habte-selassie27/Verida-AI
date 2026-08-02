import { useState } from 'react';
import { Button } from '../components/ui/Button';
import './SubscriptionTier.css';

interface SubscriptionTierProps {
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  onSelect: (tier: 'monthly' | 'quarterly' | 'annual') => void;
  loading?: boolean;
}

const TIERS = [
  { key: 'monthly' as const, label: 'Monthly', duration: '30 days', savings: null },
  { key: 'quarterly' as const, label: 'Quarterly', duration: '90 days', savings: 10 },
  { key: 'annual' as const, label: 'Annual', duration: '365 days', savings: 20 },
];

export function SubscriptionTier({ monthlyPrice, quarterlyPrice, annualPrice, onSelect, loading }: SubscriptionTierProps) {
  const [selected, setSelected] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const prices = {
    monthly: monthlyPrice,
    quarterly: quarterlyPrice,
    annual: annualPrice,
  };

  const OCTAS = 100_000_000;
  const formatPrice = (octas: number) => (octas / OCTAS).toFixed(2);

  return (
    <div className="sub-tier">
      <div className="sub-tier-header">Subscription Plans</div>
      <div className="sub-tier-grid">
        {TIERS.map(tier => (
          <button
            key={tier.key}
            className={`sub-tier-card ${selected === tier.key ? 'sub-tier-card--selected' : ''}`}
            onClick={() => setSelected(tier.key)}
          >
            {tier.savings && (
              <span className="sub-tier-savings">Save {tier.savings}%</span>
            )}
            <span className="sub-tier-label">{tier.label}</span>
            <span className="sub-tier-duration">{tier.duration}</span>
            <span className="sub-tier-price">{formatPrice(prices[tier.key])} APT</span>
            <span className="sub-tier-per-month">
              {formatPrice(prices[tier.key] / (tier.key === 'monthly' ? 1 : tier.key === 'quarterly' ? 3 : 12))} APT/mo
            </span>
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading ?? false}
        onClick={() => onSelect(selected)}
      >
        Subscribe — {formatPrice(prices[selected])} APT/{TIERS.find(t => t.key === selected)?.duration}
      </Button>
    </div>
  );
}
