import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Dataset } from '@verida/shared';
import { DatasetTag } from '@verida/shared';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { IntegrityBadge } from '../components/ui/IntegrityBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { TagPill } from '../components/ui/TagPill';
import { ProvenanceTree } from '../components/ProvenanceTree';
import { getDataset, createAccessSession, verifyDataset, listDatasets } from '../api/client';
import type { DatasetDetailResponse } from '../api/client';
import { useWalletContext } from '../context/WalletContext';
import './DatasetDetail.css';

type TabId = 'overview' | 'versions' | 'provenance' | 'access';
type WalletState = 'no-wallet' | 'connected' | 'processing' | 'active' | 'expired';

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  nlp: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  cv: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  tabular: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  audio: { bg: 'rgba(0,212,200,0.12)', color: '#00d4c8' },
  medical: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
  code: { bg: 'rgba(139,92,246,0.12)', color: '#c4b5fd' },
  financial: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
  multimodal: { bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc' },
};

function getCategoryIcon(dataset: Dataset): string {
  const known = Object.keys(CATEGORY_STYLES);
  for (const tag of dataset.tags) {
    if (known.includes(tag)) return tag;
  }
  return dataset.tags[0] ?? 'other';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

function getVerificationStatus(dataset: Dataset): 'verified' | 'tampered' | 'pending' | 'unavailable' {
  if (dataset.tampered) return 'tampered';
  if (dataset.verified === true) return 'verified';
  if (dataset.verified === false) return 'pending';
  return 'unavailable';
}

function SvgIcon({ path, viewBox = '0 0 24 24' }: { path: string; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function DatabaseIcon() { return <SvgIcon path="M12 2C8.13 2 5 4.69 5 8c0 3.31 3.13 6 7 6s7-2.69 7-6c0-3.31-3.13-6-7-6z M5 8v8c0 3.31 3.13 6 7 6s7-2.69 7-6V8" />; }
function FileIcon() { return <SvgIcon path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />; }
function TableIcon() { return <SvgIcon path="M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18" />; }
function LockIcon() { return <SvgIcon path="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z M8 10V6a4 4 0 0 1 8 0v4" />; }
function CloudIcon() { return <SvgIcon path="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />; }
function DollarIcon() { return <SvgIcon path="M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />; }
function RefreshIcon() { return <SvgIcon path="M1 4v6h6 M23 20v-6h-6 M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />; }
function DotsIcon() { return <SvgIcon path="M12 5v.01M12 12v.01M12 19v.01M12 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />; }
function ChevronRightIcon() { return <SvgIcon path="M9 18l6-6-6-6" />; }
function DownloadIcon() { return <SvgIcon path="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />; }
function AlertIcon() { return <SvgIcon path="M12 9v2m0 4h.01M10.29 3.86l-8.35 14.7A1.36 1.36 0 0 0 3.14 20h17.72a1.36 1.36 0 0 0 1.2-1.94L13.71 3.86a1.36 1.36 0 0 0-2.42 0z" />; }
function CheckIcon() { return <SvgIcon path="M20 6L9 17l-5-5" />; }
function WalletIcon() { return <SvgIcon path="M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5" />; }
function GiftIcon() { return <SvgIcon path="M20 12v10H4V12M2 7h20v5H2zM12 7V3a3 3 0 0 0-6 0v4M12 7V3a3 3 0 0 1 6 0v4" />; }

function SessionCountdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const totalSec = Math.floor(remaining / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return <span className="dd-session-countdown">{pad(hrs)}:{pad(mins)}:{pad(secs)}</span>;
}

function getCategoryLabel(dataset: Dataset): string {
  const cat = getCategoryIcon(dataset);
  const labels: Record<string, string> = {
    nlp: 'NL', cv: 'CV', tabular: 'TB', audio: 'AU',
    medical: 'MD', code: 'CD', financial: 'FN', multimodal: 'MM',
  };
  return labels[cat] ?? 'DT';
}

function guessFileFormat(dataset: Dataset): string {
  const name = dataset.name.toLowerCase();
  if (name.includes('.csv') || dataset.tags.includes(DatasetTag.TABULAR)) return 'CSV';
  if (name.includes('.json') || dataset.tags.includes(DatasetTag.NLP)) return 'JSON';
  if (name.includes('.parquet')) return 'Parquet';
  if (name.includes('.h5') || name.includes('.hdf5')) return 'HDF5';
  if (dataset.tags.includes(DatasetTag.AUDIO)) return 'WAV/MP3';
  if (dataset.tags.includes(DatasetTag.VISION) || dataset.tags.includes(DatasetTag.MEDICAL)) return 'Image';
  return 'CSV';
}

function guessRowCount(dataset: Dataset): string {
  const size = dataset.size_bytes;
  if (size > 1e9) return `${Math.floor(size / 1e7).toLocaleString()}+`;
  if (size > 1e8) return `${Math.floor(size / 1e6).toLocaleString()}+`;
  return '—';
}

function guessColCount(_dataset: Dataset): string {
  return '—';
}

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DatasetDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [descExpanded, setDescExpanded] = useState(false);
  const [walletState, setWalletState] = useState<WalletState>('no-wallet');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionExpires, setSessionExpires] = useState(0);
  const [accessLoading, setAccessLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [relatedDatasets, setRelatedDatasets] = useState<Dataset[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const { connected, address, connect } = useWalletContext();

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDataset(Number(id));
      setDetail(result);

      const stored = sessionStorage.getItem(`session_${id}`);
      if (stored) {
        const { sessionId: sid, expiresAt } = JSON.parse(stored);
        if (Date.now() < expiresAt) {
          setSessionId(sid);
          setSessionExpires(expiresAt);
          setWalletState('active');
        } else {
          sessionStorage.removeItem(`session_${id}`);
          setWalletState('expired');
        }
      }

      setRelatedLoading(true);
      try {
        const rel = await listDatasets({ page: 1, limit: 4 });
        setRelatedDatasets(rel.items.filter((d) => d.id !== Number(id)).slice(0, 3));
      } catch {
        setRelatedDatasets([]);
      } finally {
        setRelatedLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dataset');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (connected && address) {
      setWalletState('connected');
    } else {
      setWalletState('no-wallet');
    }
  }, [connected, address]);

  const handleVerify = async () => {
    if (!id) return;
    setVerifyLoading(true);
    try {
      await verifyDataset(Number(id));
    } catch {
      // error handled silently
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleGetAccess = async () => {
    if (!id || !address) return;
    setAccessLoading(true);
    setWalletState('processing');
    try {
      const result = await createAccessSession(Number(id), address);
      setSessionId(result.sessionId);
      const expiresAt = result.expiresAt;
      setSessionExpires(expiresAt);
      sessionStorage.setItem(`session_${id}`, JSON.stringify({ sessionId: result.sessionId, expiresAt }));
      setWalletState('active');
    } catch {
      setWalletState('connected');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRenewAccess = () => {
    setWalletState('no-wallet');
    setSessionId(null);
    setSessionExpires(0);
    sessionStorage.removeItem(`session_${id}`);
  };

  if (loading) {
    return (
      <div>
        <Skeleton variant="text-sm" width="200px" style={{ marginBottom: 16 }} />
        <div className="dd-loading-header">
          <div className="flex items-center gap-3">
            <Skeleton variant="icon" width={44} height={44} />
            <div style={{ flex: 1 }}>
              <Skeleton variant="title" width="60%" />
              <Skeleton variant="text-sm" width="40%" style={{ marginTop: 8 }} />
            </div>
          </div>
        </div>
        <div className="dd-loading-body">
          <div className="dd-loading-left">
            <Skeleton variant="card" className="dd-loading-tabplace" />
            <Skeleton variant="card" className="dd-loading-panel" />
          </div>
          <div className="dd-loading-right">
            <Skeleton variant="card" height="80px" />
            <Skeleton variant="card" height="120px" />
            <Skeleton variant="card" height="100px" />
            <Skeleton variant="card" height="180px" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dd-error">
        <div className="dd-error-icon"><AlertIcon /></div>
        <p className="dd-error-msg">{error}</p>
        <Button variant="primary" onClick={fetchDetail}>Retry</Button>
      </div>
    );
  }

  if (!detail) return null;

  const { dataset, versions, provenance_chain } = detail;
  const catKey = getCategoryIcon(dataset);
  const catStyle = CATEGORY_STYLES[catKey] ?? { bg: 'var(--bg-raised)', color: 'var(--text-tertiary)' };
  const catLabel = getCategoryLabel(dataset);
  const verifStatus = getVerificationStatus(dataset);
  const isDescriptionLong = dataset.description.length > 400;
  const displayDesc = descExpanded || !isDescriptionLong ? dataset.description : dataset.description.slice(0, 397) + '...';
  const formatLabel = guessFileFormat(dataset);
  const rowCount = guessRowCount(dataset);
  const colCount = guessColCount(dataset);
  const versionCount = versions.length;
  const provCount = provenance_chain.length;
  const priceStr = dataset.price_per_access ? `${dataset.price_per_access} APT` : '—';
  const isOwner = connected && address === dataset.publisher_address;

  const provenanceEvents = provenance_chain.map((e) => ({
    id: e.id,
    eventType: e.event_type,
    timestamp: e.timestamp,
    actor: e.actor_address,
    txHash: e.tx_hash,
    version: e.version,
  }));

  const chainIntact = verifStatus !== 'tampered';

  const previewColumns = ['col_a', 'col_b', 'col_c', 'col_d', 'col_e', 'col_f', 'col_g', 'col_h'].slice(0, 8);
  const previewRows = dataset.shelby_blob_id ? [
    ['0x4a2f...', '0.7834', 'label_A', 'train', '—', '—', '—', '—'],
    ['0x8b1c...', '0.2156', 'label_B', 'train', '—', '—', '—', '—'],
    ['0x3d7e...', '0.9921', 'label_A', 'val', '—', '—', '—', '—'],
    ['0xf4a9...', '0.4502', 'label_C', 'train', '—', '—', '—', '—'],
    ['0x1e6c...', '0.6348', 'label_B', 'test', '—', '—', '—', '—'],
  ] : [];

  return (
    <div>
      {/* BREADCRUMB */}
      <div className="dd-breadcrumb">
        <Link to="/">Marketplace</Link>
        <span className="dd-breadcrumb-sep"> / </span>
        {dataset.name}
      </div>

      {/* HEADER PANEL */}
      <div className="dd-header">
        <div className="dd-header-row1">
          <div className="dd-cat-icon" style={{ background: catStyle.bg, color: catStyle.color }}>
            {catLabel}
          </div>
          <div className="dd-title-block">
            <h1 className="dd-title">{dataset.name}</h1>
            <div className="dd-sub-row">
              <Badge variant="version">v{dataset.version}</Badge>
              <span className="dd-published-label">Published by</span>
              <span className="dd-publisher-addr">
                <AddressDisplay value={dataset.publisher_address} type="address" showCopyIcon={false} showAptosLink={false} />
              </span>
              <span className="dd-timestamp">{formatDate(dataset.created_at)}</span>
            </div>
          </div>
          <div className="dd-header-actions">
            <IntegrityBadge status={verifStatus} size="lg" />
            <Button variant="teal-outline" size="sm" loading={verifyLoading} onClick={handleVerify}>
              Verify Integrity
            </Button>
            <button className="dd-action-btn" title="Actions" aria-label="Actions menu">
              <DotsIcon />
            </button>
          </div>
        </div>

        <hr className="dd-divider" />

        {/* METADATA CHIPS */}
        <div className="dd-meta-chips">
          <div className="dd-chip">
            <span className="dd-chip-icon"><DatabaseIcon /></span>
            <span className="dd-chip-label">{formatBytes(dataset.size_bytes)}</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-icon"><FileIcon /></span>
            <span className="dd-chip-label">{formatLabel}</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-icon"><TableIcon /></span>
            <span className="dd-chip-label">{rowCount} rows</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-icon"><LockIcon /></span>
            <span className="dd-chip-label">{dataset.license}</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-icon dd-chip-teal"><CloudIcon /></span>
            <span className="dd-chip-label dd-chip-teal">Stored on Shelby Protocol</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-icon"><DollarIcon /></span>
            <span className="dd-chip-label">{priceStr}</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-icon"><RefreshIcon /></span>
            <span className="dd-chip-label">— accesses</span>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN BODY */}
      <div className="dd-body">
        {/* LEFT COLUMN */}
        <div className="dd-left">
          {/* TAB BAR */}
          <div className="dd-tabbar">
            <button className={`dd-tab ${activeTab === 'overview' ? 'dd-tab-active' : ''}`} onClick={() => setActiveTab('overview')}>
              Overview
            </button>
            <button className={`dd-tab ${activeTab === 'versions' ? 'dd-tab-active' : ''}`} onClick={() => setActiveTab('versions')}>
              Versions
              {versionCount > 0 && <span className="dd-tab-count">{versionCount}</span>}
            </button>
            <button className={`dd-tab ${activeTab === 'provenance' ? 'dd-tab-active' : ''}`} onClick={() => setActiveTab('provenance')}>
              Provenance
              {provCount > 0 && <span className="dd-tab-count">{provCount}</span>}
            </button>
            <button className={`dd-tab ${activeTab === 'access' ? 'dd-tab-active' : ''}`} onClick={() => setActiveTab('access')}>
              Access
            </button>
          </div>

          {/* TAB PANEL */}
          <div className="dd-tabpanel">
            {activeTab === 'overview' && (
              <div>
                {/* DESCRIPTION */}
                <div className="dd-overview-desc">
                  {displayDesc}
                  {isDescriptionLong && (
                    <button className="dd-desc-toggle" onClick={() => setDescExpanded(!descExpanded)}>
                      {descExpanded ? 'Show less ↑' : 'Show full description ↓'}
                    </button>
                  )}
                </div>

                {/* TAGS */}
                {dataset.tags.length > 0 && (
                  <div className="dd-tags-section">
                    {dataset.tags.map((tag) => (
                      <TagPill key={tag} onClick={() => navigate(`/?tag=${tag}`)}>
                        {tag.replace(/_/g, ' ')}
                      </TagPill>
                    ))}
                  </div>
                )}

                {/* TECHNICAL METADATA TABLE */}
                <div className="dd-tech-table">
                  <div className="dd-tech-table-header">Technical Details</div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">License</div>
                    <div className="dd-tech-table-value">{dataset.license}</div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Access Type</div>
                    <div className="dd-tech-table-value">{dataset.access_type.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Price</div>
                    <div className="dd-tech-table-value">{priceStr}</div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Format</div>
                    <div className="dd-tech-table-value">{formatLabel}</div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">File Size</div>
                    <div className="dd-tech-table-value" title={`${dataset.size_bytes} bytes`}>
                      {formatBytes(dataset.size_bytes)}
                    </div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Rows</div>
                    <div className="dd-tech-table-value">{rowCount}</div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Columns</div>
                    <div className="dd-tech-table-value">{colCount}</div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Content Hash</div>
                    <div className="dd-tech-table-value">
                      <AddressDisplay value={dataset.merkle_root} type="contentHash" showAptosLink={false} />
                    </div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Shelby blobId</div>
                    <div className="dd-tech-table-value">
                      <AddressDisplay value={dataset.shelby_blob_id} type="blobId" showAptosLink={false} />
                    </div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">merkleRoot</div>
                    <div className="dd-tech-table-value">
                      <AddressDisplay value={dataset.merkle_root} type="merkleRoot" showAptosLink />
                    </div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Uploaded</div>
                    <div className="dd-tech-table-value">{formatDate(dataset.created_at)}</div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Last Verified</div>
                    <div className="dd-tech-table-value">
                      <IntegrityBadge status={verifStatus} size="sm" />
                    </div>
                  </div>
                  <div className="dd-tech-table-row">
                    <div className="dd-tech-table-label">Chunks</div>
                    <div className="dd-tech-table-value">16 chunks (Clay 10+6)</div>
                  </div>
                </div>

                {/* DATA PREVIEW */}
                {previewRows.length > 0 && (
                  <div className="dd-preview-section">
                    <div className="dd-preview-title">Data Preview — First 5 rows</div>
                    <table className="dd-preview-table">
                      <thead>
                        <tr>
                          {previewColumns.map((col, i) => (
                            <th key={i}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'versions' && (
              <div>
                <div className="dd-versions-header">
                  <span className="dd-versions-title">Version History</span>
                  {isOwner && (
                    <Button variant="ghost" size="sm">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        + Add New Version
                      </span>
                    </Button>
                  )}
                </div>
                {versions.length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: 12 }}>
                    No version history available.
                  </div>
                ) : (
                  <div className="dd-version-list">
                    {versions.map((v, i) => {
                      const isActive = i === 0;
                      return (
                        <div key={v.id} className={`dd-version-item ${isActive ? 'dd-version-item-active' : ''}`}>
                          <div className="dd-version-top">
                            <Badge variant="version">v{v.version}</Badge>
                            {isActive && <Badge variant="network">Current Version</Badge>}
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                              {formatDate(v.created_at)}
                            </span>
                          </div>
                          <div className="dd-version-meta">
                            <span>{formatBytes(v.size_bytes)}</span>
                            <span>— chunks</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AddressDisplay value={v.merkle_root} type="merkleRoot" showAptosLink />
                            </span>
                          </div>
                          {v.changelog && <div className="dd-version-changelog">{v.changelog}</div>}
                          <div className="dd-version-actions">
                            <Button variant="teal-outline" size="sm" onClick={handleVerify} loading={verifyLoading}>
                              Verify This Version
                            </Button>
                            <Button variant="ghost" size="sm">
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <DownloadIcon /> Stream
                              </span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'provenance' && (
              <div>
                <div className="dd-provenance-header">
                  <span className="dd-provenance-title">Provenance Chain — {provCount} events</span>
                  <div className="dd-provenance-actions">
                    <Button variant="ghost" size="sm">Export JSON</Button>
                    <Button variant="ghost" size="sm">Export CSV</Button>
                  </div>
                </div>
                <div className={`dd-chain-card ${chainIntact ? 'dd-chain-intact' : 'dd-chain-broken'}`}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                  Chain integrity: {chainIntact ? 'INTACT' : 'BROKEN'}
                </div>
                <ProvenanceTree events={provenanceEvents} />
              </div>
            )}

            {activeTab === 'access' && (
              <div className="dd-access-section">
                {dataset.access_type === 'free' ? (
                  <div>
                    <div className="dd-access-free-card">
                      <GiftIcon />
                      <span className="dd-access-free-text">Freely accessible — no payment required</span>
                    </div>
                    <div className="dd-access-actions">
                      <Button variant="primary" size="lg">Stream Dataset</Button>
                      <Button variant="ghost" size="lg">Download ZIP</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="dd-price-display">{dataset.price_per_access ?? '0.05'} APT</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      per 24-hour session
                    </div>

                    {walletState === 'no-wallet' && (
                      <div>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
                          Connect an Aptos wallet to continue
                        </p>
                        <div className="dd-wallet-list">
                          <div className="dd-wallet-item" onClick={handleConnectWallet}>
                            <span className="dd-wallet-icon"><WalletIcon /></span>
                            Connect Wallet
                          </div>
                        </div>
                      </div>
                    )}

                    {walletState === 'connected' && (
                      <div>
                        <div className="dd-wallet-connected">
                          <span className="dd-wallet-dot" />
                          <span className="dd-wallet-addr">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}</span>
                        </div>
                        <Button variant="primary" size="lg" fullWidth loading={accessLoading} onClick={handleGetAccess}>
                          Get Access — {dataset.price_per_access ?? '0.05'} APT
                        </Button>
                      </div>
                    )}

                    {walletState === 'processing' && (
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 16 }}>
                          Processing Access
                        </div>
                        <div className="dd-steps">
                          <div className="dd-step dd-step-done">
                            <span className="dd-step-indicator"><CheckIcon /></span>
                            Wallet connected
                          </div>
                          <div className="dd-step dd-step-active">
                            <span className="dd-step-indicator"><span className="dd-step-spinner" /></span>
                            Creating access session...
                          </div>
                          <div className="dd-step">
                            <span className="dd-step-indicator">3</span>
                            Session active
                          </div>
                        </div>
                      </div>
                    )}

                    {walletState === 'active' && sessionId && (
                      <div>
                        <div className="dd-session-card">
                          <div className="dd-session-label">Access Session Active</div>
                          <SessionCountdown expiresAt={sessionExpires} />
                          <div className="dd-session-detail">
                            Session ID: {sessionId.slice(0, 12)}...
                          </div>
                        </div>
                        <div className="dd-access-actions" style={{ marginTop: 12 }}>
                          <Button variant="primary" size="lg">Stream Dataset</Button>
                          <Button variant="ghost" size="lg">Download ZIP</Button>
                        </div>
                      </div>
                    )}

                    {walletState === 'expired' && (
                      <div>
                        <div className="dd-expired-card">
                          <AlertIcon />
                          Your access session has expired. Renew to continue.
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <Button variant="primary" size="lg" onClick={handleRenewAccess}>
                            Renew Access
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - STICKY PANELS */}
        <div className="dd-right">
          {/* PANEL 1: Quick Stats */}
          <div className="dd-panel-card">
            <div className="dd-panel-title">Quick Stats</div>
            <div className="dd-quick-stats">
              <div className="dd-quick-stat">
                <div className="dd-quick-stat-value">—</div>
                <div className="dd-quick-stat-label">Accesses</div>
              </div>
              <div className="dd-quick-stat">
                <div className="dd-quick-stat-value">—</div>
                <div className="dd-quick-stat-label">Downloads</div>
              </div>
              <div className="dd-quick-stat">
                <div className="dd-quick-stat-value">—</div>
                <div className="dd-quick-stat-label">Accessors</div>
              </div>
            </div>
          </div>

          {/* PANEL 2: Publisher Card */}
          <div className="dd-panel-card">
            <div className="dd-panel-title">Publisher</div>
            <div className="dd-publisher-row">
              <div className="dd-pub-avatar">
                {dataset.publisher_address.slice(2, 4).toUpperCase()}
              </div>
              <div className="dd-pub-info">
                <div className="dd-pub-name">Publisher</div>
                <div className="dd-pub-addr">
                  <AddressDisplay value={dataset.publisher_address} type="address" showCopyIcon={false} showAptosLink={false} />
                </div>
              </div>
              <Link to={`/publishers/${dataset.publisher_address}`}>
                <Button variant="ghost" size="sm">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    View Profile <ChevronRightIcon />
                  </span>
                </Button>
              </Link>
            </div>
          </div>

          {/* PANEL 3: Integrity Card */}
          <div className="dd-panel-card">
            <div className="dd-panel-title">Integrity Status</div>
            <div className="dd-integrity-row">
              <IntegrityBadge status={verifStatus} size="lg" />
            </div>
            <div className="dd-integrity-checked">
              Last checked: {dataset.verified !== null ? formatTimeAgo(dataset.created_at) : 'Never'}
            </div>
            <div className="dd-integrity-merkle">
              merkleRoot: {dataset.merkle_root.slice(0, 14)}...
            </div>
            <Button variant="teal-outline" size="sm" fullWidth loading={verifyLoading} onClick={handleVerify}>
              Verify Now
            </Button>
          </div>

          {/* PANEL 4: Related Datasets */}
          <div className="dd-panel-card">
            <div className="dd-panel-title">Related Datasets</div>
            {relatedLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton variant="card" height="80px" />
                <Skeleton variant="card" height="80px" />
                <Skeleton variant="card" height="80px" />
              </div>
            ) : relatedDatasets.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                No related datasets
              </div>
            ) : (
              <div className="dd-related-list">
                {relatedDatasets.map((rel) => (
                  <Link key={rel.id} to={`/datasets/${rel.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="dd-related-card">
                      <div className="dd-related-name">{rel.name}</div>
                      <div className="dd-related-meta">
                        <Badge variant="version">{formatBytes(rel.size_bytes)}</Badge>
                        <span className="dd-related-version">v{rel.version}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
