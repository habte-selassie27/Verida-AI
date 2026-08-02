import { useState, useEffect } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { MARKETPLACE_CONTRACT_ADDRESS, SHELBYNET_EXPLORER, fetchResource } from '../lib/contracts';
import './ContractStatePanel.css';

const EXPLORER = SHELBYNET_EXPLORER;

interface ContractState {
  admin: string;
  treasury: string;
  feeBasisPoints: number;
  paused: boolean;
}

function shortenAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ContractStatePanel() {
  const [state, setState] = useState<ContractState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      setLoading(true);
      try {
        const resourceType = `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::MarketplaceConfig`;
        const config = await fetchResource<{
          admin: string;
          treasury: string;
          fee_basis_points: string;
          paused: boolean;
        }>(resourceType);

        setState({
          admin: config.admin,
          treasury: config.treasury,
          feeBasisPoints: Number(config.fee_basis_points),
          paused: config.paused,
        });
      } catch {
        // Failed to fetch
      } finally {
        setLoading(false);
      }
    };

    fetchState();
  }, []);

  if (loading) {
    return (
      <div className="csp">
        <div className="csp-title">Contract State</div>
        <div className="csp-loading">Loading...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="csp">
        <div className="csp-title">Contract State</div>
        <div className="csp-error">Failed to load</div>
      </div>
    );
  }

  return (
    <div className="csp">
      <div className="csp-header">
        <div className="csp-title">Contract State</div>
        <a
          href={`${EXPLORER}/account/${MARKETPLACE_CONTRACT_ADDRESS}?network=shelbynet`}
          target="_blank"
          rel="noopener noreferrer"
          className="csp-link"
        >
          Explorer <ArrowSquareOut size={10} />
        </a>
      </div>

      <div className="csp-grid">
        <div className="csp-item">
          <span className="csp-label">Status</span>
          <span className={`csp-value ${state.paused ? 'csp--paused' : 'csp--active'}`}>
            {state.paused ? 'Paused' : 'Active'}
          </span>
        </div>
        <div className="csp-item">
          <span className="csp-label">Fee</span>
          <span className="csp-value">{(state.feeBasisPoints / 100).toFixed(1)}%</span>
        </div>
        <div className="csp-item">
          <span className="csp-label">Treasury</span>
          <span className="csp-value csp-addr" title={state.treasury}>
            {shortenAddr(state.treasury)}
          </span>
        </div>
        <div className="csp-item">
          <span className="csp-label">Admin</span>
          <span className="csp-value csp-addr" title={state.admin}>
            {shortenAddr(state.admin)}
          </span>
        </div>
      </div>
    </div>
  );
}
