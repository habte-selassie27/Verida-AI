import './RevenueChart.css';

interface RevenueData {
  month: string;
  amount: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  totalOnChain: number;
  verified?: boolean;
}

const OCTAS = 100_000_000;

export function RevenueChart({ data, totalOnChain, verified = false }: RevenueChartProps) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="revenue-chart">
      <div className="revenue-chart-header">
        <div>
          <div className="revenue-chart-title">Revenue Overview</div>
          <div className="revenue-chart-subtitle">On-chain verified</div>
        </div>
        {verified && (
          <span className="revenue-verified-badge">⛓️ Verified</span>
        )}
      </div>

      <div className="revenue-total">
        <span className="revenue-total-value">{(totalOnChain / OCTAS).toFixed(2)} APT</span>
        <span className="revenue-total-label">Total Revenue (On-Chain)</span>
      </div>

      <div className="revenue-bars">
        {data.map((item, i) => {
          const height = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          return (
            <div key={i} className="revenue-bar-col">
              <div className="revenue-bar-value">
                {item.amount > 0 ? `${(item.amount / OCTAS).toFixed(1)}` : '—'}
              </div>
              <div className="revenue-bar-track">
                <div
                  className="revenue-bar-fill"
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
              </div>
              <div className="revenue-bar-label">{item.month}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
