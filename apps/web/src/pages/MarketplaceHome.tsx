import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Lock, Star, ArrowRight, X } from '@phosphor-icons/react';
import { listDatasets, getStats, createAccessSession, checkDatasetAccessBatch } from '../api/client';
import { useWalletContext } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_CONTRACT_ADDRESS, calculateFeeBreakdown } from '../lib/contracts';
import { FeeBreakdown } from '../components/FeeBreakdown';
import type { Dataset } from '@verida/shared';
import { AccessType, DatasetTag } from '@verida/shared';
import type { StatsResponse } from '../api/client';
import './MarketplaceHome.css';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function qualityColor(score: number | null) {
  if (score === null) return 'var(--text-tertiary)';
  if (score >= 80) return 'var(--green)';
  if (score >= 60) return '#fbbf24';
  return '#f87171';
}

function formatApt(octas: number | null) {
  if (!octas) return '0';
  return (octas / 100_000_000).toFixed(1);
}

const CATEGORIES = [
  { tag: 'nlp', label: 'NLP', color: '#60a5fa' },
  { tag: 'cv', label: 'Vision', color: '#fbbf24' },
  { tag: 'tabular', label: 'Tabular', color: '#4ade80' },
  { tag: 'audio', label: 'Audio', color: '#ff007f' },
  { tag: 'medical', label: 'Medical', color: '#f87171' },
  { tag: 'code', label: 'Code', color: '#8B5CF6' },
  { tag: 'financial', label: 'Finance', color: '#fbbf24' },
  { tag: 'multimodal', label: 'Multimodal', color: '#00E5FF' },
];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function AccessBadge({ accessType, pricePerAccess, unlocked }: {
  accessType: AccessType;
  pricePerAccess: number | null;
  unlocked?: boolean;
}) {
  if (accessType === AccessType.FREE) {
    return <span className="mkt-access-badge mkt-access--free">FREE</span>;
  }
  // Already paid for / unlocked by this wallet — show that instead of a
  // payment prompt so users are never confused into paying twice.
  if (unlocked) {
    return <span className="mkt-access-badge mkt-access--unlocked">UNLOCKED</span>;
  }
  return (
    <span className="mkt-access-badge mkt-access--paid">
      <Lock size={10} />
      PAY PER ACCESS
    </span>
  );
}

export default function Marketplace() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [accessFilter, setAccessFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [payModal, setPayModal] = useState<Dataset | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  // Datasets this wallet has already paid for / unlocked (persistent entitlement
  // — a paid wallet must never be shown the paywall again).
  const [entitledIds, setEntitledIds] = useState<Set<number>>(new Set());
  const { connected, address, connect, signAndSubmitTransaction } = useWalletContext();
  const { isAuthenticated, login: authLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dsResult, statsResult] = await Promise.all([
          listDatasets({ page: 1, limit: 100 }),
          getStats().catch(() => null),
        ]);
        setDatasets(dsResult.items);
        setStats(statsResult);
      } catch {
        setDatasets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Once the wallet is connected + authenticated, check which paid datasets it
  // has already unlocked so we never show a paywall for something it owns.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!connected || !address || !isAuthenticated) return;
      const paidIds = datasets
        .filter(d => d.access_type === AccessType.PAY_PER_ACCESS)
        .map(d => d.id);
      if (paidIds.length === 0) return;
      try {
        const access = await checkDatasetAccessBatch(paidIds);
        if (cancelled) return;
        setEntitledIds(new Set(
          Object.entries(access)
            .filter(([, v]) => v.hasAccess)
            .map(([id]) => Number(id)),
        ));
      } catch {
        // Not authenticated / network error — fall back to the paywall
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [connected, address, isAuthenticated, datasets]);

  const verifiedCount = stats?.verified ?? datasets.filter(d => d.verified === true).length;
  const scoredDatasets = datasets.filter(d => d.quality_score !== null && d.quality_score > 0);
  const avgQuality = scoredDatasets.length
    ? Math.round(scoredDatasets.reduce((sum, d) => sum + d.quality_score!, 0) / scoredDatasets.length * 100)
    : null;

  const filtered = datasets.filter(ds => {
    if (search && !ds.name.toLowerCase().includes(search.toLowerCase()) && !(ds.ai_description ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTag && !(ds.tags ?? []).includes(activeTag as DatasetTag)) return false;
    if (accessFilter === 'free' && ds.access_type !== AccessType.FREE) return false;
    if (accessFilter === 'paid' && ds.access_type !== AccessType.PAY_PER_ACCESS) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'quality') return (b.quality_score ?? 0) - (a.quality_score ?? 0);
    if (sortBy === 'accesses') return (b.access_count ?? 0) - (a.access_count ?? 0);
    if (sortBy === 'size') return b.size_bytes - a.size_bytes;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handlePay = useCallback(async (ds: Dataset) => {
    // Already unlocked for this wallet — never re-charge. (Guards the race
    // where the entitlement check hasn't finished when the modal opens.)
    if (entitledIds.has(ds.id) || purchasedIds.has(ds.id)) {
      setPayModal(null);
      navigate(`/datasets/${ds.id}`);
      return;
    }
    if (!connected || !address) {
      try { await connect(); } catch { return; }
    }
    setPaying(true);
    setPayError(null);
    try {
      // Step 1: Authenticate first (needs wallet for message signing)
      if (!isAuthenticated) {
        await authLogin();
      }

      // Step 2: Sign payment via smart contract (fee split enforced on-chain)
      const priceOctas = ds.price_per_access ?? 0;
      const publisherAddress = ds.publisher_address;
      const result = await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::platform::pay_with_fee`,
          functionArguments: [publisherAddress, priceOctas, ds.id],
        },
      });

      // Step 3: Create access session
      const sessionResult = await createAccessSession(ds.id, address!, result.hash);
      sessionStorage.setItem(`session_${ds.id}`, JSON.stringify({
        sessionId: sessionResult.sessionId,
        expiresAt: sessionResult.expiresAt,
      }));
      setPurchasedIds(prev => new Set(prev).add(ds.id));
      setPayModal(null);
      navigate(`/datasets/${ds.id}`);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }, [connected, address, connect, isAuthenticated, authLogin, signAndSubmitTransaction, navigate, entitledIds, purchasedIds]);

  const handleCardClick = (ds: Dataset, e: React.MouseEvent) => {
    if (
      ds.access_type === AccessType.PAY_PER_ACCESS &&
      !purchasedIds.has(ds.id) &&
      !entitledIds.has(ds.id)
    ) {
      e.preventDefault();
      setPayModal(ds);
    }
  };

  return (
    <div className="marketplace">
      {/* ─── Hero + Stats ──────────────────────────────────────────── */}
      <section className="mkt-hero">
        <div className="container">
          <div className="mkt-hero-top">
            <div className="mkt-hero-left">
              <h1 className="mkt-hero-title">Marketplace</h1>
              <p className="mkt-hero-sub">
                Explore verified AI datasets with immutable provenance on Shelby Protocol
              </p>
            </div>
            <div className="mkt-hero-stats">
              <div className="mkt-stat">
                <span className="mkt-stat-value">{loading ? '—' : datasets.length}</span>
                <span className="mkt-stat-label">DATASETS</span>
              </div>
              <div className="mkt-stat">
                <span className="mkt-stat-value">16</span>
                <span className="mkt-stat-label">SP NODES</span>
              </div>
              <div className="mkt-stat">
                <span className="mkt-stat-value">Shelbynet</span>
                <span className="mkt-stat-label">NETWORK</span>
              </div>
            </div>
          </div>

          {/* ─── Metrics Row ─────────────────────────────────────── */}
          <div className="mkt-metrics-row">
            <div className="mkt-metric-card">
              <span className="mkt-metric-label">Total Datasets</span>
              <span className="mkt-metric-value">{loading ? '...' : datasets.length}</span>
            </div>
            <div className="mkt-metric-card">
              <span className="mkt-metric-label">Verified</span>
              <span className="mkt-metric-value mkt-metric--green">{loading ? '...' : verifiedCount}</span>
            </div>
            <div className="mkt-metric-card">
              <span className="mkt-metric-label">Avg Quality</span>
              <span className="mkt-metric-value" style={{ color: qualityColor(avgQuality) }}>
                {loading ? '...' : avgQuality !== null ? `${avgQuality}%` : '—'}
              </span>
              {!loading && <span className="mkt-metric-sub">{avgQuality !== null ? 'Excellent' : 'No scored datasets'}</span>}
            </div>
            <div className="mkt-metric-card">
              <span className="mkt-metric-label">Total Accesses</span>
              <span className="mkt-metric-value">{stats?.totalAccesses ?? '—'}</span>
            </div>
          </div>

          {/* ─── Search Bar ──────────────────────────────────────── */}
          <div className="mkt-search-bar">
            <MagnifyingGlass size={18} className="mkt-search-icon" />
            <input
              type="text"
              placeholder="Search datasets..."
              className="mkt-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="mkt-search-tags">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.tag}
                  className={`mkt-filter-pill ${activeTag === cat.tag ? 'mkt-filter-pill--active' : ''}`}
                  style={{ '--pill-color': cat.color } as React.CSSProperties}
                  onClick={() => setActiveTag(activeTag === cat.tag ? null : cat.tag)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="mkt-search-selects">
              <select className="mkt-filter-select" value={accessFilter} onChange={e => setAccessFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="free">Free</option>
                <option value="paid">Pay Per Access</option>
              </select>
              <select className="mkt-filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="latest">Latest</option>
                <option value="quality">Quality</option>
                <option value="accesses">Most Accessed</option>
                <option value="size">Largest</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dataset Grid ──────────────────────────────────────────── */}
      <section className="mkt-section">
        <div className="container">
          <div className="mkt-section-header">
            <div>
              <div className="section-label">Browse</div>
              <h2 className="mkt-section-title">
                {loading ? 'Loading...' : `${sorted.length} dataset${sorted.length !== 1 ? 's' : ''}`}
              </h2>
            </div>
            <Link to="/upload" className="btn btn-primary btn-sm">+ Upload New</Link>
          </div>

          {loading ? (
            <div className="mkt-loading">Loading datasets...</div>
          ) : sorted.length === 0 ? (
            <div className="mkt-empty">No datasets match your filters.</div>
          ) : (
            <div className="mkt-dataset-grid">
              {sorted.map(ds => {
                const isLocked = ds.access_type === AccessType.PAY_PER_ACCESS && !purchasedIds.has(ds.id) && !entitledIds.has(ds.id);
                return (
                  <Link
                    key={ds.id}
                    to={`/datasets/${ds.id}`}
                    className={`mkt-dataset-card ${isLocked ? 'mkt-dataset-card--locked' : ''}`}
                    onClick={(e) => handleCardClick(ds, e)}
                  >
                    {isLocked && <div className="mkt-card-lock-overlay"><Lock size={24} /></div>}

                    <div className="mkt-dataset-top">
                      <div className="mkt-dataset-avatar" style={{ background: ds.verified ? 'rgba(0,245,212,.12)' : 'rgba(139,92,246,.12)' }}>
                        {initials(ds.name)}
                      </div>
                      <AccessBadge
                        accessType={ds.access_type}
                        pricePerAccess={ds.price_per_access}
                        unlocked={purchasedIds.has(ds.id) || entitledIds.has(ds.id)}
                      />
                    </div>

                    <h3 className="mkt-dataset-name">{ds.name}</h3>

                    <div className="mkt-dataset-meta">
                      <span>{formatBytes(ds.size_bytes)}</span>
                      <span>·</span>
                      <span>{ds.access_count ?? 0} accesses</span>
                    </div>

                    <div className="mkt-dataset-tags">
                      {(ds.tags ?? []).slice(0, 2).map(t => (
                        <span key={t} className="mkt-tag mkt-tag--sm">{t}</span>
                      ))}
                    </div>

                    <div className="mkt-dataset-bottom">
                      {ds.access_type === AccessType.FREE ? (
                        <span className="mkt-dataset-cta mkt-cta--free">View Dataset <ArrowRight size={12} /></span>
                      ) : (
                        <span className="mkt-dataset-cta mkt-cta--locked">
                          {purchasedIds.has(ds.id) || entitledIds.has(ds.id) ? 'View Dataset' : `Unlock for ${formatApt(ds.price_per_access)} APT`}
                        </span>
                      )}
                      <span className="mkt-dataset-quality" style={{ color: qualityColor(ds.quality_score) }}>
                        {ds.quality_score !== null ? ds.quality_score : '—'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── Payment Modal ─────────────────────────────────────────── */}
      {payModal && (
        <div className="mkt-pay-overlay" onClick={() => setPayModal(null)}>
          <div className="mkt-pay-modal" onClick={e => e.stopPropagation()}>
            <button className="mkt-pay-close" onClick={() => setPayModal(null)}><X size={18} /></button>

            <div className="mkt-pay-header">
              <div className="mkt-pay-lock"><Lock size={20} /></div>
              <h3 className="mkt-pay-title">{payModal.name}</h3>
            </div>

            <div className="mkt-pay-price-box">
              <span className="mkt-pay-price-label">Price</span>
              <span className="mkt-pay-price-value">{formatApt(payModal.price_per_access)} APT</span>
            </div>

            <FeeBreakdown priceOctas={payModal.price_per_access ?? 0} />

            <ul className="mkt-pay-features">
              <li>Permanent access to dataset</li>
              <li>Download files</li>
              <li>API access</li>
              <li>Version updates</li>
            </ul>

            {payError && <div className="mkt-pay-error">{payError}</div>}

            <button
              className="mkt-pay-btn"
              onClick={() => handlePay(payModal)}
              disabled={paying}
            >
              {paying ? 'Processing...' : `Pay ${formatApt(payModal.price_per_access)} APT & Unlock`}
            </button>

            <p className="mkt-pay-note">Payment is processed on Aptos testnet. You need testnet APT.</p>
          </div>
        </div>
      )}
    </div>
  );
}
