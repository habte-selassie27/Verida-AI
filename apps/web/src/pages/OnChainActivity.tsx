import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowSquareOut, Clock, ArrowUpRight, ArrowDownRight, ShieldCheck, WarningCircle } from '@phosphor-icons/react';
import { useWalletContext } from '../context/WalletContext';
import {
  MARKETPLACE_CONTRACT_ADDRESS,
  SHELBYNET_RPC,
  SHELBYNET_EXPLORER,
  OCTAS_PER_APT,
  fetchResource,
  verida_marketplace,
  platform,
  ownership,
  access,
  escrow,
  subscriptions,
  provenance,
  revenue,
} from '../lib/contracts';
import './OnChainActivity.css';

const EXPLORER = SHELBYNET_EXPLORER;

interface ContractTx {
  version: string;
  hash: string;
  timestamp_us: string;
  sender: string;
  success: boolean;
  payload_function?: string;
}

interface ContractState {
  admin: string;
  treasury: string;
  feeBasisPoints: number;
  paused: boolean;
}

export default function OnChainActivity() {
  const { connected, address } = useWalletContext();
  const [txs, setTxs] = useState<ContractTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractState, setContractState] = useState<ContractState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);

  // Fetch contract state from on-chain resources
  useEffect(() => {
    const fetchState = async () => {
      setStateLoading(true);
      try {
        const resourceType = `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::MarketplaceConfig`;
        const config = await fetchResource<{
          admin: string;
          treasury: string;
          fee_basis_points: string;
          paused: boolean;
        }>(resourceType);

        setContractState({
          admin: config.admin,
          treasury: config.treasury,
          feeBasisPoints: Number(config.fee_basis_points),
          paused: config.paused,
        });
      } catch {
        // Failed to fetch contract state
      } finally {
        setStateLoading(false);
      }
    };


    fetchState();
  }, []);

  // Fetch recent transactions for the contract address
  useEffect(() => {
    const fetchTxs = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${SHELBYNET_RPC}/accounts/${MARKETPLACE_CONTRACT_ADDRESS}/transactions?limit=20`
        );
        if (res.ok) {
          const data = await res.json();
          setTxs(data.map((tx: Record<string, unknown>) => ({
            version: String(tx.version ?? ''),
            hash: String(tx.hash ?? ''),
            timestamp_us: String(tx.timestamp_us ?? ''),
            sender: String(tx.sender ?? ''),
            success: Boolean(tx.success),
            payload_function: (tx.payload as Record<string, unknown>)?.function as string | undefined,
          })));
        }
      } catch {
        // Failed to fetch transactions
      } finally {
        setLoading(false);
      }
    };

    fetchTxs();
    const interval = setInterval(fetchTxs, 30000);
    return () => clearInterval(interval);
  }, []);

  function formatTime(us: string): string {
    const ts = Number(us) / 1000;
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function timeAgo(us: string): string {
    if (!us || us === '0' || us === 'null') return 'unknown';
    const ts = Number(us) / 1000;
    if (isNaN(ts) || ts === 0) return 'unknown';
    const diff = Date.now() - ts;
    if (diff < 0) return 'just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function shortenAddr(addr: string): string {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function shortenHash(hash: string): string {
    if (!hash || hash.length < 16) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  }

  function fnLabel(fn?: string): string {
    if (!fn) return 'unknown';
    const parts = fn.split('::');
    return parts[parts.length - 1] ?? fn;
  }

  return (
    <div className="oca">
      <div className="oca-header">
        <div>
          <h1 className="oca-title">On-Chain Activity</h1>
          <p className="oca-subtitle">Live contract transactions and state on Aptos testnet</p>
        </div>
        <a
          href={`${EXPLORER}/account/${MARKETPLACE_CONTRACT_ADDRESS}?network=shelbynet`}
          target="_blank"
          rel="noopener noreferrer"
          className="oca-explorer-link"
        >
          View on Explorer <ArrowSquareOut size={14} />
        </a>
      </div>

      {/* Contract State */}
      <div className="oca-section">
        <h2 className="oca-section-title">Contract State</h2>
        {stateLoading ? (
          <div className="oca-state-grid">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="oca-state-card oca-state-skeleton" />
            ))}
          </div>
        ) : contractState ? (
          <div className="oca-state-grid">
            <div className="oca-state-card">
              <span className="oca-state-label">Status</span>
              <span className={`oca-state-value ${contractState.paused ? 'oca-state--paused' : 'oca-state--active'}`}>
                {contractState.paused ? 'Paused' : 'Active'}
              </span>
            </div>
            <div className="oca-state-card">
              <span className="oca-state-label">Platform Fee</span>
              <span className="oca-state-value">{(contractState.feeBasisPoints / 100).toFixed(1)}%</span>
            </div>
            <div className="oca-state-card">
              <span className="oca-state-label">Treasury</span>
              <span className="oca-state-value oca-state-addr" title={contractState.treasury}>
                {shortenAddr(contractState.treasury)}
              </span>
            </div>
            <div className="oca-state-card">
              <span className="oca-state-label">Admin</span>
              <span className="oca-state-value oca-state-addr" title={contractState.admin}>
                {shortenAddr(contractState.admin)}
              </span>
            </div>
          </div>
        ) : (
          <div className="oca-empty">Failed to load contract state</div>
        )}
      </div>

      {/* Modules */}
      <div className="oca-section">
        <h2 className="oca-section-title">Deployed Modules</h2>
        <div className="oca-modules-grid">
          {[
            { name: 'verida_marketplace', desc: 'Root config (admin, pause, treasury, fees)', module: verida_marketplace },
            { name: 'platform', desc: 'Payment processing & fee splits', module: platform },
            { name: 'ownership', desc: 'Dataset ownership registry', module: ownership },
            { name: 'access', desc: 'Access grants & revocation', module: access },
            { name: 'escrow', desc: 'Escrow vault & disputes', module: escrow },
            { name: 'subscriptions', desc: 'Recurring subscription plans', module: subscriptions },
            { name: 'provenance', desc: 'Provenance event chain', module: provenance },
            { name: 'revenue', desc: 'Payment event ledger', module: revenue },
          ].map(mod => (
            <a
              key={mod.name}
              href={`${EXPLORER}/account/${MARKETPLACE_CONTRACT_ADDRESS}/modules?network=shelbynet`}
              target="_blank"
              rel="noopener noreferrer"
              className="oca-module-card"
            >
              <div className="oca-module-name">{mod.name}</div>
              <div className="oca-module-desc">{mod.desc}</div>
              <div className="oca-module-addr">{shortenAddr(mod.module)}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="oca-section">
        <div className="oca-tx-header">
          <h2 className="oca-section-title">Recent Transactions</h2>
          <span className="oca-tx-count">{txs.length} transactions</span>
        </div>

        {loading && txs.length === 0 ? (
          <div className="oca-tx-list">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="oca-tx-row oca-tx-skeleton" />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="oca-empty">
            <Clock size={24} />
            <span>No transactions yet. Deploy and interact with the contract to see activity.</span>
          </div>
        ) : (
          <div className="oca-tx-list">
            {txs.map(tx => (
              <div key={tx.hash} className={`oca-tx-row ${tx.success ? 'oca-tx--success' : 'oca-tx--failed'}`}>
                <div className="oca-tx-status">
                  {tx.success ? (
                    <ShieldCheck size={16} className="oca-tx-icon--success" />
                  ) : (
                    <WarningCircle size={16} className="oca-tx-icon--failed" />
                  )}
                </div>
                <div className="oca-tx-info">
                  <div className="oca-tx-fn">{fnLabel(tx.payload_function)}</div>
                  <div className="oca-tx-meta">
                    <span className="oca-tx-hash" title={tx.hash}>
                      <a
                        href={`${EXPLORER}/txn/${tx.hash}?network=shelbynet`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {shortenHash(tx.hash)} <ArrowSquareOut size={10} />
                      </a>
                    </span>
                    <span className="oca-tx-sep">·</span>
                    <span className="oca-tx-sender" title={tx.sender}>
                      {shortenAddr(tx.sender)}
                    </span>
                  </div>
                </div>
                <div className="oca-tx-right">
                  <span className="oca-tx-time">{timeAgo(tx.timestamp_us)}</span>
                  <span className="oca-tx-status-text">{tx.success ? 'Success' : 'Failed'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="oca-section">
        <h2 className="oca-section-title">Quick Links</h2>
        <div className="oca-links-grid">
          <Link to="/dashboard" className="oca-link-card">
            <ArrowUpRight size={16} />
            <span>Publisher Dashboard</span>
          </Link>
          <Link to="/dashboard/revenue" className="oca-link-card">
            <ArrowUpRight size={16} />
            <span>Revenue Analytics</span>
          </Link>
          <a
            href={`${EXPLORER}/account/${MARKETPLACE_CONTRACT_ADDRESS}?network=shelbynet`}
            target="_blank"
            rel="noopener noreferrer"
            className="oca-link-card"
          >
            <ArrowSquareOut size={16} />
            <span>Contract on Explorer</span>
          </a>
        </div>
      </div>
    </div>
  );
}
