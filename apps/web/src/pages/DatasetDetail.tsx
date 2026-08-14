import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Dataset } from '@verida/shared';
import { DatasetTag, DatasetModality } from '@verida/shared';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { IntegrityBadge } from '../components/ui/IntegrityBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { TagPill } from '../components/ui/TagPill';
import { ProvenanceTree } from '../components/ProvenanceTree';
import { getDataset, createAccessSession, verifyDataset, getSimilarDatasets, getStreamUrl, addDatasetVersion, createEscrowEntry, updateEscrowStatus, checkDatasetAccess } from '../api/client';
import type { DatasetDetailResponse, SimilarDataset } from '../api/client';
import { useWalletContext } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_CONTRACT_ADDRESS, OCTAS_PER_APT, calculateFeeBreakdown, fetchResource, SHELBYNET_EXPLORER } from '../lib/contracts';
import { FeeBreakdown } from '../components/FeeBreakdown';
import { OwnershipBadge, TransferOwnershipButton } from '../components/OwnershipBadge';
import { EscrowStatus } from '../components/EscrowStatus';
import { SubscriptionTier } from '../components/SubscriptionTier';
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

const VERSION_STAGE_LABELS = [
  'Reading & encoding',
  'Anchoring to Aptos',
  'Uploading to Shelby',
  'Confirming',
  'Complete',
];

// WebSocket progress lives on the API server, not the Vite dev server.
// Derive the WS origin from VITE_API_URL (e.g. http://localhost:4000 -> ws://localhost:4000).
function getWsBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
  try {
    const url = new URL(apiUrl);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}`;
  } catch {
    return `ws://${window.location.host}`;
  }
}
const WS_BASE = getWsBase();

const ESCROW_CONFIG_RESOURCE = `${MARKETPLACE_CONTRACT_ADDRESS}::escrow::EscrowConfig`;
// Matches DISPUTE_WINDOW_SECONDS (604800) in the escrow Move module.
const ESCROW_DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeFilename(name: string): string {
  const sanitized = name
    .replace(/[^a-z0-9_.-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return sanitized.length > 0 ? sanitized : 'dataset';
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
  const modality = dataset.schema_profile?.modality ?? dataset.modality;
  if (modality === 'tabular') return 'CSV';
  if (modality === 'text') return 'Text';
  if (modality === 'image') return 'Image';
  if (modality === 'audio') return 'Audio';
  if (modality === 'video') return 'Video';
  if (modality === 'document') return 'Document';
  const name = dataset.name.toLowerCase();
  if (name.includes('.csv') || dataset.tags.includes(DatasetTag.TABULAR)) return 'CSV';
  if (name.includes('.json') || dataset.tags.includes(DatasetTag.NLP)) return 'JSON';
  if (name.includes('.parquet')) return 'Parquet';
  if (name.includes('.h5') || name.includes('.hdf5')) return 'HDF5';
  if (dataset.tags.includes(DatasetTag.AUDIO)) return 'WAV/MP3';
  if (dataset.tags.includes(DatasetTag.VISION) || dataset.tags.includes(DatasetTag.MEDICAL)) return 'Image';
  return 'Unknown';
}

function guessRowCount(dataset: Dataset): string {
  const fromSchema = dataset.schema_profile?.estimatedRowCount;
  if (fromSchema != null) return Number(fromSchema).toLocaleString();
  const fromDb = dataset.estimated_row_count;
  if (fromDb != null) return Number(fromDb).toLocaleString();
  const size = dataset.size_bytes;
  if (size > 1e9) return `${Math.floor(size / 1e7).toLocaleString()}+`;
  if (size > 1e8) return `${Math.floor(size / 1e6).toLocaleString()}+`;
  return '—';
}

function guessColCount(dataset: Dataset): string {
  const cols = dataset.schema_profile?.columns;
  if (Array.isArray(cols) && cols.length > 0) return String(cols.length);
  return '—';
}

const QUALITY_DIMENSIONS: { key: keyof import('@verida/shared').QualityBreakdown; label: string }[] = [
  { key: 'completeness', label: 'Completeness' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'uniqueness', label: 'Uniqueness' },
  { key: 'validity', label: 'Validity' },
  { key: 'coverage', label: 'Coverage' },
  { key: 'timeliness', label: 'Timeliness' },
];

function qualityColor(score: number): string {
  if (score >= 0.8) return '#4ade80';
  if (score >= 0.6) return '#fbbf24';
  return '#f87171';
}

const MODALITY_LABELS: Record<string, string> = {
  tabular: 'Tabular',
  text: 'Text',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  code: 'Code',
  multimodal: 'Multimodal',
  other: 'Other',
};

const MODALITY_ICONS: Record<string, string> = {
  tabular: '📊',
  text: '📝',
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  code: '💻',
  multimodal: '🔀',
  other: '📦',
};

function getModalityLabel(modality: string | null): string {
  if (!modality) return 'Unknown';
  return MODALITY_LABELS[modality] ?? modality;
}

function getContentTypeLabel(schemaProfile: unknown): string | null {
  const sp = schemaProfile as { format?: string; columns?: { name: string }[] } | null;
  if (!sp) return null;
  if (sp.format) return sp.format.toUpperCase();
  if (sp.columns && sp.columns.length > 0) return 'Structured Data';
  return null;
}

function getSemanticCategories(schemaProfile: unknown): string[] {
  const sp = schemaProfile as { columns?: { semanticCategory?: string }[] } | null;
  if (!sp?.columns) return [];
  const cats = new Set<string>();
  for (const col of sp.columns) {
    if (col.semanticCategory) cats.add(col.semanticCategory);
  }
  return [...cats].slice(0, 8);
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
  // Permanent entitlement — once this wallet has paid for the dataset it is
  // never charged again, even after a session expires.
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [relatedDatasets, setRelatedDatasets] = useState<SimilarDataset[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(true);
  const [escrowId, setEscrowId] = useState<number | null>(null);
  const [escrowOnChainId, setEscrowOnChainId] = useState<number | null>(null);
  const [escrowDeadline, setEscrowDeadline] = useState(0);
  const [escrowStatus, setEscrowStatus] = useState<'pending' | 'released' | 'disputed' | 'refunded'>('pending');
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [onChainRegistered, setOnChainRegistered] = useState<boolean | null>(null);
  const [versionUploading, setVersionUploading] = useState(false);
  const [versionUploadPercent, setVersionUploadPercent] = useState(0);
  const [versionUploadStage, setVersionUploadStage] = useState(0);
  const versionInputRef = useRef<HTMLInputElement>(null);
  const versionWsRef = useRef<WebSocket | null>(null);
  const { connected, address, connect, signAndSubmitTransaction } = useWalletContext();
  const { isAuthenticated, login: authLogin } = useAuth();

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDataset(Number(id));
      setDetail(result);

      // On-chain ownership check requires per-dataset view call which is unavailable.
      // Default to false; ownership badge will show "DB only" until re-registered on-chain.
      setOnChainRegistered(false);

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
        const rel = await getSimilarDatasets(Number(id), 4);
        setRelatedDatasets(rel.filter((d) => d.id !== Number(id)).slice(0, 3));
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

  // Close any in-flight version-upload progress socket on unmount.
  useEffect(() => {
    return () => {
      versionWsRef.current?.close();
    };
  }, []);

  // Close the ⋮ actions menu on outside click / Escape.
  useEffect(() => {
    if (!actionMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [actionMenuOpen]);

  useEffect(() => {
    // Don't overwrite 'active' or 'processing' states — those mean a valid session exists
    setWalletState(prev => {
      if (prev === 'active' || prev === 'processing') return prev;
      if (connected && address) return 'connected';
      return 'no-wallet';
    });
  }, [connected, address]);

  // Check whether this wallet has already paid for / unlocked the dataset, and
  // restore a still-active session so they never face the paywall again.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id || !connected || !address || !isAuthenticated) return;
      try {
        const status = await checkDatasetAccess(Number(id));
        if (cancelled) return;
        setHasPaidAccess(status.hasAccess);
        if (status.session) {
          setSessionId(status.session.sessionId);
          setSessionExpires(status.session.expiresAt);
          setWalletState('active');
          sessionStorage.setItem(`session_${id}`, JSON.stringify({
            sessionId: status.session.sessionId,
            expiresAt: status.session.expiresAt,
          }));
        }
      } catch {
        // Not authenticated / network error — leave state as-is
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [id, connected, address, isAuthenticated]);

  const handleVerify = async () => {
    if (!id) return;
    if (!connected || !address) {
      alert('Please connect your wallet first.');
      return;
    }
    setVerifyLoading(true);
    try {
      if (!isAuthenticated) {
        await authLogin();
      }
      await verifyDataset(Number(id));

      // Verification runs as an async BullMQ job. Poll the dataset until the
      // status settles (verified=true or tampered=true), then refresh the view.
      const datasetId = Number(id);
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const refreshed = await getDataset(datasetId);
        const d = refreshed.dataset;
        if (d.verified === true || d.tampered === true) {
          setDetail(refreshed);
          break;
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Verification failed');
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
    if (!id || !address || !detail) return;
    // If we already have a valid session, just activate it — don't charge again
    if (sessionId && walletState === 'active') {
      setWalletState('active');
      return;
    }
    setAccessLoading(true);
    setWalletState('processing');
    try {
      let txHash: string | undefined;
      let depositEscrowId: number | null = null;

      // For pay-per-access datasets, deposit the payment into the on-chain
      // escrow vault — but only on the FIRST purchase. A wallet that already
      // paid is entitled and is granted a fresh session free of charge.
      if (
        detail.dataset.access_type === 'pay_per_access' &&
        detail.dataset.price_per_access &&
        !hasPaidAccess
      ) {
        const priceOctas = detail.dataset.price_per_access;
        const publisherAddress = detail.dataset.publisher_address;

        // Read EscrowConfig.next_id BEFORE depositing — that is the id the
        // deposit will create. Best-effort: if the chain can't be read we
        // still deposit and track the escrow in the DB without on-chain ids.
        try {
          const config = await fetchResource<{ next_id: string }>(ESCROW_CONFIG_RESOURCE);
          depositEscrowId = Number(config.next_id);
        } catch {
          depositEscrowId = null;
        }

        const depositResult = await signAndSubmitTransaction({
          data: {
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::escrow::deposit`,
            functionArguments: [publisherAddress, Number(id), priceOctas],
          },
        });
        txHash = depositResult.hash;
      }

      const sessionResult = await createAccessSession(Number(id), address, hasPaidAccess ? undefined : txHash);
      setSessionId(sessionResult.sessionId);
      const expiresAt = sessionResult.expiresAt;
      setSessionExpires(expiresAt);
      sessionStorage.setItem(`session_${id}`, JSON.stringify({ sessionId: sessionResult.sessionId, expiresAt }));

      // Persist a real escrow record for pay-per-access purchases
      if (detail.dataset.access_type === 'pay_per_access' && txHash) {
        try {
          const entry = await createEscrowEntry(
            Number(id),
            detail.dataset.price_per_access ?? 0,
            depositEscrowId ?? undefined,
          );
          setEscrowId(entry.id);
          setEscrowOnChainId(entry.onChainEscrowId);
          setEscrowDeadline(Date.now() + ESCROW_DISPUTE_WINDOW_MS);
          setEscrowStatus('pending');
        } catch (err) {
          console.error('Failed to create escrow record:', err);
        }
      }

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

  const handleRenewSubscription = async (tier: 'monthly' | 'quarterly' | 'annual') => {
    if (!connected || !address || !detail) return;
    setAccessLoading(true);
    setWalletState('processing');
    try {
      const tierEnum = tier === 'monthly' ? 0 : tier === 'quarterly' ? 1 : 2;
      const tierPrice = tier === 'monthly'
        ? detail.dataset.price_per_access ?? 0
        : tier === 'quarterly'
          ? Math.round((detail.dataset.price_per_access ?? 0) * 2.7)
          : Math.round((detail.dataset.price_per_access ?? 0) * 10);

      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::subscriptions::renew`,
          functionArguments: [address, tierEnum],
        },
      });

      // Record renewal payment on-chain
      const feeBreakdown = calculateFeeBreakdown(tierPrice);
      try {
        await signAndSubmitTransaction({
          data: {
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::revenue::record_payment`,
            functionArguments: [address, detail.dataset.publisher_address, tierPrice, feeBreakdown.feeAmount, Number(id), 1],
          },
        });
      } catch {
        // Revenue recording is best-effort
      }

      const sessionResult = await createAccessSession(Number(id), address);
      setSessionId(sessionResult.sessionId);
      setSessionExpires(sessionResult.expiresAt);
      sessionStorage.setItem(`session_${id}`, JSON.stringify({ sessionId: sessionResult.sessionId, expiresAt: sessionResult.expiresAt }));
      setWalletState('active');
    } catch {
      setWalletState('connected');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleRegisterOnChain = async () => {
    if (!id || !connected) return;
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::ownership::register_dataset`,
          functionArguments: [Number(id)],
        },
      });
      fetchDetail();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('EDATASET_ALREADY_REGISTERED') || msg.includes('already_exists')) {
        alert('This dataset is already registered on-chain.');
        fetchDetail();
      } else {
        alert(msg || 'Registration failed');
      }
    }
  };

  const handleEmitProvenance = async (eventType: number, metadata: string) => {
    if (!id || !connected) return;
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::provenance::emit_event`,
          functionArguments: [Number(id), dataset.version, eventType, metadata],
        },
      });
      fetchDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to emit event');
    }
  };

  const handleGrantAccess = async () => {
    if (!id || !connected) return;
    const accessor = prompt('Enter the wallet address to grant access to:');
    if (!accessor || !accessor.startsWith('0x')) return;
    const durationStr = prompt('Access duration in seconds (e.g. 86400 for 1 day):', '604800');
    if (!durationStr) return;
    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration <= 0) return;

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::access::grant_access`,
          functionArguments: [accessor, Number(id), duration],
        },
      });
      alert('Access granted on-chain');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to grant access');
    }
  };

  const handleRevokeAccess = async () => {
    if (!id || !connected) return;
    const accessor = prompt('Enter the wallet address to revoke access from:');
    if (!accessor || !accessor.startsWith('0x')) return;

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::access::revoke_access`,
          functionArguments: [accessor, Number(id)],
        },
      });
      alert('Access revoked on-chain');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke access');
    }
  };

  const handleStream = () => {
    if (!id || !sessionId) return;
    const url = getStreamUrl(Number(id), sessionId);
    window.open(url, '_blank');
  };

  const handleDownload = () => {
    if (!id || !sessionId) return;
    const url = getStreamUrl(Number(id), sessionId);
    const a = document.createElement('a');
    a.href = url;
    a.download = dataset?.name ?? 'dataset';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportJson = () => {
    if (!detail) return;
    downloadTextFile(
      `${safeFilename(detail.dataset.name)}-detail.json`,
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          dataset: detail.dataset,
          provenance_chain: detail.provenance_chain,
          versions: detail.versions,
        },
        null,
        2,
      ),
      'application/json',
    );
  };

  const handleExportCsv = () => {
    if (!detail) return;
    const header = ['id', 'dataset_id', 'version', 'event_type', 'timestamp', 'actor_address', 'tx_hash'];
    const rows = detail.provenance_chain.map((e) => [
      e.id,
      e.dataset_id,
      e.version,
      e.event_type,
      e.timestamp,
      e.actor_address,
      e.tx_hash,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    downloadTextFile(`${safeFilename(detail.dataset.name)}-provenance.csv`, csv, 'text/csv;charset=utf-8');
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedAction(label);
      window.setTimeout(() => setCopiedAction(null), 1600);
    } catch {
      alert('Clipboard unavailable — copy the value manually.');
    }
    setActionMenuOpen(false);
  };

  const handleAddVersionClick = () => {
    if (!connected || !address) {
      alert('Please connect your wallet first.');
      return;
    }
    versionInputRef.current?.click();
  };

  const handleVersionFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !detail || !address) return;

    const changelog = (window.prompt('Describe this version change (optional):', '') ?? '').slice(0, 2000);

    // Re-authenticate fresh before uploading, mirroring the Upload page flow.
    try {
      if (!isAuthenticated) {
        await authLogin();
      }
    } catch {
      alert('Please sign the authentication message in your wallet to continue.');
      return;
    }

    const jobId = crypto.randomUUID();
    const previousVersion = detail.dataset.version;
    let wsCompleted = false;
    let wsErrored = false;

    setVersionUploading(true);
    setVersionUploadPercent(0);
    setVersionUploadStage(0);

    // Open the WS progress channel before POSTing (best-effort — falls back to polling).
    const ws = new WebSocket(`${WS_BASE}/ws/uploads/${jobId}`);
    versionWsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'progress') {
          setVersionUploadPercent(msg.data?.percent ?? 0);
          const stage = msg.data?.stage;
          if (stage === 'complete') setVersionUploadStage(4);
          else if (stage === 'confirming') setVersionUploadStage(3);
          else if (stage === 'registering') setVersionUploadStage(2);
          else if (stage === 'encoding' || stage === 'reading') setVersionUploadStage(0);
        } else if (msg.type === 'complete') {
          wsCompleted = true;
          ws.close();
          setVersionUploadPercent(100);
          setVersionUploadStage(4);
        } else if (msg.type === 'error') {
          wsErrored = true;
          ws.close();
          setVersionUploading(false);
          alert(msg.error || 'Failed to add version');
          fetchDetail();
        }
      } catch {
        // Ignore malformed frames.
      }
    };
    ws.onerror = () => {
      // Progress stream is best-effort; the polling fallback below still completes the flow.
      ws.close();
    };
    ws.onclose = () => {
      versionWsRef.current = null;
    };

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', detail.dataset.name);
      formData.append('description', detail.dataset.description);
      formData.append('license', detail.dataset.license);
      formData.append('accessType', detail.dataset.access_type);
      formData.append('publisherAddress', address);
      formData.append('jobId', jobId);
      if (changelog) formData.append('changelog', changelog);
      detail.dataset.tags.forEach((tag) => formData.append('tags', tag));
      if (detail.dataset.price_per_access) {
        formData.append('pricePerAccess', String(detail.dataset.price_per_access));
      }

      await addDatasetVersion(Number(id), formData, jobId);

      // Wait for the worker to finish: WS completion when available, otherwise poll.
      const deadline = Date.now() + 180_000;
      while (!wsCompleted && !wsErrored && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        try {
          const refreshed = await getDataset(Number(id));
          if (refreshed.dataset.version > previousVersion) {
            wsCompleted = true;
            break;
          }
        } catch {
          // Transient error — keep polling.
        }
      }

      if (wsCompleted) {
        setVersionUploadPercent(100);
        setVersionUploadStage(4);
        fetchDetail();
      } else if (!wsErrored) {
        alert('The new version is still processing on the server. Check back in a moment.');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add version');
    } finally {
      ws.close();
      setVersionUploading(false);
    }
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
  const alreadyVerified = verifStatus === 'verified' || verifStatus === 'tampered';
  const isDescriptionLong = dataset.description.length > 400;
  const displayDesc = descExpanded || !isDescriptionLong ? dataset.description : dataset.description.slice(0, 397) + '...';
  const aiDesc = dataset.ai_description;
  const showAiSummaryActive = showAiSummary && !!aiDesc;
  const qualityScore = dataset.quality_score ?? null;
  const qualityBreakdown = dataset.quality_breakdown ?? null;
  const suggestedTags = dataset.suggested_tags ?? [];
  const formatLabel = guessFileFormat(dataset);
  const rowCount = guessRowCount(dataset);
  const colCount = guessColCount(dataset);
  const versionCount = versions.length;
  const provCount = provenance_chain.length;
  const OCTAS_PER_APT = 100_000_000;
  const priceStr = dataset.price_per_access
    ? `${(dataset.price_per_access / OCTAS_PER_APT).toFixed(2)} APT`
    : '—';
  const isOwner = connected && address === dataset.publisher_address;
  const isLocked = dataset.access_type === 'pay_per_access' && walletState !== 'active' && !isOwner;

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
        <Link to="/marketplace">Marketplace</Link>
        <span className="dd-breadcrumb-sep"> / </span>
        {dataset.name}
      </div>

      {/* PAYWALL BANNER */}
      {isLocked && (
        <div className="dd-paywall-banner">
          <div className="dd-paywall-lock"><LockIcon /></div>
          <div className="dd-paywall-info">
            <span className="dd-paywall-label">LOCKED</span>
            <span className="dd-paywall-price">{priceStr}</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => setActiveTab('access')}>
            Unlock Dataset
          </Button>
        </div>
      )}

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
              <OwnershipBadge
                isOnChain={!!dataset.on_chain_owner_verified || !!onChainRegistered}
                isOwner={isOwner}
                ownerAddress={dataset.publisher_address}
                compact
              />
              <span className="dd-timestamp">{formatDate(dataset.created_at)}</span>
            </div>
          </div>
          <div className="dd-header-actions">
            <IntegrityBadge status={verifStatus} size="lg" />
            <Button variant="teal-outline" size="sm" loading={verifyLoading} onClick={handleVerify}>
              {alreadyVerified ? 'Re-verify Integrity' : 'Verify Integrity'}
            </Button>
            <div className="dd-action-menu-wrap" ref={actionMenuRef}>
              <button
                className={`dd-action-btn ${actionMenuOpen ? 'dd-action-btn-open' : ''}`}
                title="Actions"
                aria-label="Actions menu"
                aria-expanded={actionMenuOpen}
                onClick={() => setActionMenuOpen((open) => !open)}
              >
                <DotsIcon />
              </button>
              {actionMenuOpen && (
                <div className="dd-action-menu" role="menu">
                  <button
                    role="menuitem"
                    onClick={() => handleCopy(dataset.shelby_blob_id, 'blobId')}
                  >
                    <span>Copy blob ID</span>
                    {copiedAction === 'blobId' && <span className="dd-menu-check">✓</span>}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => handleCopy(dataset.merkle_root, 'merkleRoot')}
                  >
                    <span>Copy merkle root</span>
                    {copiedAction === 'merkleRoot' && <span className="dd-menu-check">✓</span>}
                  </button>
                  <a
                    role="menuitem"
                    href={dataset.provenance_receipt?.txHash
                      ? `${SHELBYNET_EXPLORER}/txn/${dataset.provenance_receipt.txHash}?network=testnet`
                      : `${SHELBYNET_EXPLORER}/account/${dataset.publisher_address}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setActionMenuOpen(false)}
                  >
                    View on Explorer ↗
                  </a>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setActionMenuOpen(false);
                      handleVerify();
                    }}
                  >
                    Verify Integrity
                  </button>
                  <div className="dd-menu-sep" />
                  <button
                    role="menuitem"
                    onClick={() => {
                      setActionMenuOpen(false);
                      handleExportJson();
                    }}
                  >
                    Export JSON
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setActionMenuOpen(false);
                      handleExportCsv();
                    }}
                  >
                    Export CSV
                  </button>
                </div>
              )}
            </div>
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
            <span className="dd-chip-label">{dataset.access_count ?? 0} accesses</span>
          </div>
          {/* AI Content Type Detection */}
          {dataset.modality && (
            <div className="dd-chip dd-chip-ai">
              <span className="dd-chip-icon">{MODALITY_ICONS[dataset.modality] ?? '📦'}</span>
              <span className="dd-chip-label">{getModalityLabel(dataset.modality)}</span>
              <span className="dd-chip-ai-badge">AI</span>
            </div>
          )}
          {getContentTypeLabel(dataset.schema_profile) && (
            <div className="dd-chip">
              <span className="dd-chip-icon">🔍</span>
              <span className="dd-chip-label">{getContentTypeLabel(dataset.schema_profile)}</span>
            </div>
          )}
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
                {aiDesc && (
                  <div className="dd-ai-summary-toggle">
                    <button
                      className={`dd-ai-toggle-btn ${showAiSummaryActive ? 'dd-ai-toggle-active' : ''}`}
                      onClick={() => setShowAiSummary(true)}
                    >
                      AI Summary
                    </button>
                    <button
                      className={`dd-ai-toggle-btn ${!showAiSummaryActive ? 'dd-ai-toggle-active' : ''}`}
                      onClick={() => setShowAiSummary(false)}
                    >
                      Publisher Description
                    </button>
                  </div>
                )}
                <div className="dd-overview-desc">
                  {showAiSummaryActive ? (
                    <>
                      <span className="dd-ai-badge">AI-generated</span>
                      <span> {aiDesc}</span>
                    </>
                  ) : (
                    <>
                      {displayDesc}
                      {isDescriptionLong && (
                        <button className="dd-desc-toggle" onClick={() => setDescExpanded(!descExpanded)}>
                          {descExpanded ? 'Show less ↑' : 'Show full description ↓'}
                        </button>
                      )}
                    </>
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

                {/* AI-SUGGESTED TAGS */}
                {suggestedTags.length > 0 && (
                  <div className="dd-tags-section">
                    <span className="dd-suggested-label">AI-suggested:</span>
                    {suggestedTags.map((tag) => (
                      <TagPill key={tag} className="tag-pill-ai" onClick={() => navigate(`/?tag=${tag}`)}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {versionUploading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                            <span>{VERSION_STAGE_LABELS[versionUploadStage] ?? 'Uploading'}</span>
                            <span>{versionUploadPercent}%</span>
                          </div>
                          <div style={{ width: 160, height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                            <div style={{ width: `${versionUploadPercent}%`, height: '100%', background: 'var(--teal-400)', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={handleAddVersionClick} loading={versionUploading}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          + Add New Version
                        </span>
                      </Button>
                      <input
                        ref={versionInputRef}
                        type="file"
                        hidden
                        accept=".csv,.json,.parquet,.zip,.hdf5,.pkl,.pickle"
                        onChange={handleVersionFileSelected}
                      />
                    </div>
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
                              {alreadyVerified ? 'Re-verify This Version' : 'Verify This Version'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleStream}>
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
                    {isOwner && connected && (
                      <Button variant="teal-outline" size="sm" onClick={() => handleEmitProvenance(4, 'Accessed via marketplace')}>
                        Emit Access Event
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleExportJson}>Export JSON</Button>
                    <Button variant="ghost" size="sm" onClick={handleExportCsv}>Export CSV</Button>
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
                      <Button variant="primary" size="lg" onClick={() => { if (!sessionId) { createAccessSession(Number(id), address ?? '').then(s => { setSessionId(s.sessionId); setSessionExpires(s.expiresAt); setWalletState('active'); sessionStorage.setItem(`session_${id}`, JSON.stringify({ sessionId: s.sessionId, expiresAt: s.expiresAt })); }); } else { handleStream(); } }}>Stream Dataset</Button>
                      <Button variant="ghost" size="lg" onClick={handleDownload}>Download ZIP</Button>
                    </div>
                  </div>
                ) : dataset.access_type === 'subscription' ? (
                  <div>
                    <SubscriptionTier
                      monthlyPrice={detail.dataset.price_per_access ?? 0}
                      quarterlyPrice={Math.round((detail.dataset.price_per_access ?? 0) * 2.7)}
                      annualPrice={Math.round((detail.dataset.price_per_access ?? 0) * 10)}
                      onSelect={(tier) => {
                        if (!connected) {
                          handleConnectWallet();
                          return;
                        }
                        setAccessLoading(true);
                        setWalletState('processing');
                        const tierPrice = tier === 'monthly' ? detail.dataset.price_per_access ?? 0 : tier === 'quarterly' ? Math.round((detail.dataset.price_per_access ?? 0) * 2.7) : Math.round((detail.dataset.price_per_access ?? 0) * 10);
                        signAndSubmitTransaction({
                          data: {
                            function: `${MARKETPLACE_CONTRACT_ADDRESS}::subscriptions::subscribe`,
                            functionArguments: [address, tier === 'monthly' ? 0 : tier === 'quarterly' ? 1 : 2],
                          },
                        }).then(() => {
                          // Record subscription payment on-chain
                          const feeBreakdown = calculateFeeBreakdown(tierPrice);
                          return signAndSubmitTransaction({
                            data: {
                              function: `${MARKETPLACE_CONTRACT_ADDRESS}::revenue::record_payment`,
                              functionArguments: [address, detail.dataset.publisher_address, tierPrice, feeBreakdown.feeAmount, Number(id), 1],
                            },
                          }).catch(() => {});
                        }).then(() => {
                          createAccessSession(Number(id), address!);
                          setWalletState('active');
                        }).catch(() => {
                          setWalletState('connected');
                        }).finally(() => setAccessLoading(false));
                      }}
                      loading={accessLoading}
                    />
                    {connected && (
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                        <Button
                          variant="ghost"
                          size="lg"
                          fullWidth
                          loading={accessLoading}
                          onClick={() => handleRenewSubscription('monthly')}
                          disabled={!connected}
                        >
                          Renew Subscription
                        </Button>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 8 }}>
                          Extends your current active subscription by one billing cycle
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="dd-price-display">{priceStr}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      per 24-hour session
                    </div>

                    {detail.dataset.price_per_access && (
                      <FeeBreakdown priceOctas={detail.dataset.price_per_access} compact />
                    )}

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
                          {hasPaidAccess ? 'Get Access — Already Unlocked' : `Get Access — ${priceStr}`}
                        </Button>
                        {hasPaidAccess && (
                          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 8 }}>
                            You paid for this dataset before — access is free forever.
                          </p>
                        )}
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
                        {escrowId && (
                          <EscrowStatus
                            escrowId={escrowOnChainId}
                            dbEscrowId={escrowId}
                            deadline={escrowDeadline}
                            status={escrowStatus}
                            onConfirm={async (txHash) => {
                              if (escrowId) {
                                try {
                                  await updateEscrowStatus(escrowId, 'released', txHash);
                                } catch (err) {
                                  console.error('Failed to sync escrow release:', err);
                                }
                              }
                              setEscrowStatus('released');
                            }}
                            onDispute={async (txHash) => {
                              if (escrowId) {
                                try {
                                  await updateEscrowStatus(escrowId, 'disputed', txHash);
                                } catch (err) {
                                  console.error('Failed to sync escrow dispute:', err);
                                }
                              }
                              setEscrowStatus('disputed');
                            }}
                          />
                        )}
                        <div className="dd-access-actions" style={{ marginTop: 12 }}>
                          <Button variant="primary" size="lg" onClick={handleStream}>Stream Dataset</Button>
                          <Button variant="ghost" size="lg" onClick={handleDownload}>Download ZIP</Button>
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
                <div className="dd-quick-stat-value">{dataset.access_count ?? 0}</div>
                <div className="dd-quick-stat-label">Accesses</div>
              </div>
              <div className="dd-quick-stat">
                <div className="dd-quick-stat-value">{dataset.download_count ?? 0}</div>
                <div className="dd-quick-stat-label">Downloads</div>
              </div>
              <div className="dd-quick-stat">
                <div className="dd-quick-stat-value">{dataset.unique_accessors ?? 0}</div>
                <div className="dd-quick-stat-label">Accessors</div>
              </div>
            </div>
          </div>

          {/* PANEL 1b: Data Quality (AI) */}
          {qualityScore !== null && (
            <div className="dd-panel-card">
              <div className="dd-panel-title">
                Data Quality <span className="dd-ai-badge">AI</span>
              </div>
              <div className="dd-quality-head">
                <div className="dd-quality-score" style={{ color: qualityColor(qualityScore) }}>
                  {(qualityScore * 10).toFixed(1)}
                </div>
                <div className="dd-quality-outof">/ 10</div>
              </div>
              {qualityBreakdown && (
                <div className="dd-quality-bars">
                  {QUALITY_DIMENSIONS.map((d) => {
                    const v = qualityBreakdown[d.key];
                    return (
                      <div key={d.key} className="dd-quality-bar-row">
                        <span className="dd-quality-bar-label">{d.label}</span>
                        <div className="dd-quality-bar-track">
                          <div
                            className="dd-quality-bar-fill"
                            style={{ width: `${Math.round((v ?? 0) * 100)}%`, background: qualityColor(v ?? 0) }}
                          />
                        </div>
                        <span className="dd-quality-bar-val">{Math.round((v ?? 0) * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="dd-quality-foot">Scored by Verida AI</div>
            </div>
          )}

          {/* PANEL 1c: Schema Analysis (AI) */}
          {dataset.schema_profile && (
            <div className="dd-panel-card">
              <div className="dd-panel-title">
                Schema Analysis <span className="dd-ai-badge">AI</span>
              </div>
              <div className="dd-schema-section">
                {dataset.schema_profile.columns && dataset.schema_profile.columns.length > 0 && (
                  <>
                    <div className="dd-schema-stat">
                      <span className="dd-schema-stat-label">Columns detected</span>
                      <span className="dd-schema-stat-value">{dataset.schema_profile.columns.length}</span>
                    </div>
                    <div className="dd-schema-stat">
                      <span className="dd-schema-stat-label">Estimated rows</span>
                      <span className="dd-schema-stat-value">
                        {dataset.schema_profile.estimatedRowCount?.toLocaleString() ?? dataset.estimated_row_count?.toLocaleString() ?? '—'}
                      </span>
                    </div>
                    {dataset.schema_profile.language && (
                      <div className="dd-schema-stat">
                        <span className="dd-schema-stat-label">Language</span>
                        <span className="dd-schema-stat-value">{dataset.schema_profile.language}</span>
                      </div>
                    )}
                    <div className="dd-schema-columns">
                      <div className="dd-schema-columns-title">Column Details</div>
                      {dataset.schema_profile.columns.slice(0, 10).map((col, i) => (
                        <div key={i} className="dd-schema-col">
                          <div className="dd-schema-col-header">
                            <span className="dd-schema-col-name">{col.name}</span>
                            <span className="dd-schema-col-type">{col.inferredType}</span>
                          </div>
                          <div className="dd-schema-col-meta">
                            <span className="dd-schema-col-stat">{((col.nullRate ?? 0) * 100).toFixed(1)}% null</span>
                            <span className="dd-schema-col-stat">{col.cardinality.toLocaleString()} unique</span>
                            {col.semanticCategory && (
                              <span className="dd-schema-col-cat">{col.semanticCategory}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {dataset.schema_profile.columns.length > 10 && (
                        <div className="dd-schema-more">
                          +{dataset.schema_profile.columns.length - 10} more columns
                        </div>
                      )}
                    </div>
                  </>
                )}
                {getSemanticCategories(dataset.schema_profile).length > 0 && (
                  <div className="dd-schema-categories">
                    <div className="dd-schema-cats-title">Semantic Categories</div>
                    <div className="dd-schema-cats-list">
                      {getSemanticCategories(dataset.schema_profile).map((cat) => (
                        <span key={cat} className="dd-schema-cat-pill">{cat}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PANEL 1d: AI Pipeline Status */}
          <div className="dd-panel-card">
            <div className="dd-panel-title">
              AI Pipeline <span className="dd-ai-badge">AI</span>
            </div>
            <div className="dd-pipeline-list">
              <div className="dd-pipeline-item">
                <span className={`dd-pipeline-dot ${dataset.describe_status === 'completed' ? 'dd-pipeline-dot-done' : ''}`} />
                <span className="dd-pipeline-label">Content Detection</span>
                <span className="dd-pipeline-status">{dataset.describe_status === 'completed' ? 'Done' : 'Pending'}</span>
              </div>
              <div className="dd-pipeline-item">
                <span className={`dd-pipeline-dot ${dataset.ai_description ? 'dd-pipeline-dot-done' : ''}`} />
                <span className="dd-pipeline-label">AI Description</span>
                <span className="dd-pipeline-status">{dataset.ai_description ? 'Done' : 'Pending'}</span>
              </div>
              <div className="dd-pipeline-item">
                <span className={`dd-pipeline-dot ${dataset.suggested_tags && dataset.suggested_tags.length > 0 ? 'dd-pipeline-dot-done' : ''}`} />
                <span className="dd-pipeline-label">Tag Prediction</span>
                <span className="dd-pipeline-status">{dataset.suggested_tags && dataset.suggested_tags.length > 0 ? `${dataset.suggested_tags.length} tags` : 'Pending'}</span>
              </div>
              <div className="dd-pipeline-item">
                <span className={`dd-pipeline-dot ${dataset.quality_score !== null ? 'dd-pipeline-dot-done' : ''}`} />
                <span className="dd-pipeline-label">Quality Scoring</span>
                <span className="dd-pipeline-status">{dataset.quality_score !== null ? `${(dataset.quality_score * 10).toFixed(1)}/10` : 'Pending'}</span>
              </div>
              <div className="dd-pipeline-item">
                <span className={`dd-pipeline-dot ${dataset.embedded_at ? 'dd-pipeline-dot-done' : ''}`} />
                <span className="dd-pipeline-label">Embeddings</span>
                <span className="dd-pipeline-status">{dataset.embedded_at ? 'Generated' : 'Pending'}</span>
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
              {alreadyVerified ? 'Re-verify Now' : 'Verify Now'}
            </Button>
          </div>

          {/* PANEL 4: Similar Datasets (AI) */}
          <div className="dd-panel-card">
            <div className="dd-panel-title">
              Similar Datasets <span className="dd-ai-badge">AI</span>
            </div>
            {relatedLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton variant="card" height="80px" />
                <Skeleton variant="card" height="80px" />
                <Skeleton variant="card" height="80px" />
              </div>
            ) : relatedDatasets.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                No similar datasets found
              </div>
            ) : (
              <div className="dd-related-list">
                {relatedDatasets.map((rel) => (
                  <Link key={rel.id} to={`/datasets/${rel.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="dd-related-card">
                      <div className="dd-related-name">{rel.name}</div>
                      <div className="dd-related-meta">
                        <Badge variant="version">{formatBytes(rel.size_bytes)}</Badge>
                        {typeof rel.similarity === 'number' && (
                          <span className="dd-related-sim">{Math.round(rel.similarity * 100)}% match</span>
                        )}
                        {rel.quality_score !== null && rel.quality_score !== undefined && (
                          <span className="dd-related-quality" style={{ color: qualityColor(rel.quality_score) }}>
                            {(rel.quality_score * 10).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* PANEL 5: Publisher On-Chain Actions */}
          {isOwner && connected && (
            <div className="dd-panel-card">
              <div className="dd-panel-title">Publisher Actions (On-Chain)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {!dataset.on_chain_owner_verified && !onChainRegistered && (
                  <Button variant="teal-outline" size="sm" fullWidth onClick={handleRegisterOnChain}>
                    Register Ownership On-Chain
                  </Button>
                )}
                {onChainRegistered && (
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--teal-400)', textAlign: 'center', padding: '6px 0' }}>
                    ✓ Ownership registered on-chain
                  </div>
                )}
                <TransferOwnershipButton datasetId={Number(id)} isOwner={isOwner} />
                <Button variant="ghost" size="sm" fullWidth onClick={handleGrantAccess}>
                  Grant Access
                </Button>
                <Button variant="ghost" size="sm" fullWidth onClick={handleRevokeAccess}>
                  Revoke Access
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
