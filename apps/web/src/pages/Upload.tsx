import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatasetTag, AccessType } from '@verida/shared';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { TagPill } from '../components/ui/TagPill';
import { uploadDataset, getAptPrice } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWalletContext } from '../context/WalletContext';
import './Upload.css';

const ALL_TAGS = Object.values(DatasetTag);

// Extension -> modality tags (best guess from the file type alone).
const EXTENSION_TAGS: Record<string, string[]> = {
  '.csv': ['tabular'],
  '.tsv': ['tabular'],
  '.xlsx': ['tabular'],
  '.xls': ['tabular'],
  '.parquet': ['tabular'],
  '.arrow': ['tabular'],
  '.json': ['nlp'],
  '.jsonl': ['nlp'],
  '.ndjson': ['nlp'],
  '.txt': ['nlp'],
  '.md': ['nlp'],
  '.xml': ['nlp'],
  '.jpg': ['vision'],
  '.jpeg': ['vision'],
  '.png': ['vision'],
  '.webp': ['vision'],
  '.gif': ['vision'],
  '.bmp': ['vision'],
  '.tiff': ['vision'],
  '.wav': ['audio'],
  '.mp3': ['audio'],
  '.flac': ['audio'],
  '.ogg': ['audio'],
  '.m4a': ['audio'],
  '.aac': ['audio'],
  '.mp4': ['vision'],
  '.mov': ['vision'],
  '.avi': ['vision'],
  '.webm': ['vision'],
  '.mkv': ['vision'],
  '.pdf': ['education'],
  '.doc': ['nlp'],
  '.docx': ['nlp'],
  '.ppt': ['education'],
  '.pptx': ['education'],
};

// Filename keywords -> tags. Matches run against the lowercased filename, so
// "Exponential and Logarithmic Functions.pdf" predicts education + mathematics.
const FILENAME_KEYWORD_TAGS: Array<{ pattern: RegExp; tags: string[] }> = [
  {
    pattern: /math|calculus|algebra|geometry|logarithm|exponential|trigonom|equation|arithmetic|statistic|probab|function/i,
    tags: ['education', 'mathematics'],
  },
  {
    pattern: /exam|test|quiz|homework|assignment|worksheet|textbook|lesson|curriculum|grade|classroom/i,
    tags: ['education'],
  },
  {
    pattern: /medical|clinical|patient|health|disease|radiology|\bmri\b|xray|x-ray|cancer|drug|genome|genomic|biomedical/i,
    tags: ['medical'],
  },
  {
    pattern: /image|photo|pictur|object detection|segmentation|\bface\b|vision|ocr/i,
    tags: ['vision'],
  },
  {
    pattern: /speech|voice|audio|music|speaker|asr|tts|sound/i,
    tags: ['audio'],
  },
  { pattern: /video|action|motion|frame/i, tags: ['vision', 'video'] },
  {
    pattern: /finance|stock|trading|market|crypto|bank|economic|price|forecast|fintech|portfolio/i,
    tags: ['finance'],
  },
  {
    pattern: /climate|weather|temperature|rainfall|ocean|environmental|emission|carbon|hydrolog/i,
    tags: ['climate'],
  },
  { pattern: /energy|solar|wind|power|grid|battery|electric/i, tags: ['energy'] },
  {
    pattern: /legal|law|contract|court|regulation|compliance|statute|litigation/i,
    tags: ['legal'],
  },
  {
    pattern: /code|programming|source|github|\bbug\b|repository|algorithm|software|api|developer/i,
    tags: ['code'],
  },
  { pattern: /game|gaming|player|esports|chess/i, tags: ['gaming'] },
  {
    pattern: /robot|robotics|manipulation|navigation|autonomous|drone/i,
    tags: ['robotics'],
  },
  {
    pattern: /satellite|geo|gps|\bmap\b|spatial|remote sensing|gis/i,
    tags: ['geospatial'],
  },
  { pattern: /synthetic|generated|gan|diffusion|augmented/i, tags: ['synthetic'] },
  {
    pattern: /time.?series|temporal|sensor|iot|hourly|daily|timestamp|trend/i,
    tags: ['time_series'],
  },
  {
    pattern: /government|census|public policy|election|municipal|federal/i,
    tags: ['government'],
  },
  { pattern: /web|crawl|internet|social|twitter|reddit|forum|browser/i, tags: ['web'] },
  {
    pattern: /physics|chemistry|biology|astronomy|genetics|neuroscien|quantum|molecular|cells/i,
    tags: ['science'],
  },
  {
    pattern: /language|translation|nlp|text|sentence|corpus|sentiment|dialogue|qa\b/i,
    tags: ['nlp'],
  },
  { pattern: /dataset|table|record|tabular|spreadsheet|survey|sample/i, tags: ['tabular'] },
];

// Lowercase, strip invalid characters, collapse whitespace into single underscores.
function normalizeTag(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_ -]+/g, '')
    .replace(/[\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

// Predict tags from a chosen file using its extension + filename keywords.
function predictTagsFromFile(file: File): string[] {
  const name = file.name.toLowerCase();
  const predicted = new Set<string>();

  for (const [ext, tags] of Object.entries(EXTENSION_TAGS)) {
    if (name.endsWith(ext)) {
      tags.forEach((t) => predicted.add(t));
      break;
    }
  }

  for (const { pattern, tags } of FILENAME_KEYWORD_TAGS) {
    if (pattern.test(name)) {
      tags.forEach((t) => predicted.add(t));
    }
  }

  // Prefer known marketplace tags first so the filters stay useful.
  const known = new Set<string>(ALL_TAGS);
  const ordered = Array.from(predicted).sort(
    (a, b) => Number(known.has(b)) - Number(known.has(a)),
  );
  return ordered.slice(0, 4);
}

const LICENSE_OPTIONS = [
  'MIT',
  'Apache 2.0',
  'CC BY 4.0',
  'CC BY-NC',
  'CC BY-NC-ND',
  'GPL 3.0',
  'Custom',
];
const UPLOAD_DRAFT_KEY = 'verida_upload_draft';
const UPLOAD_STAGES = [
  'Hashing & encoding',
  'Anchoring to Aptos L1',
  'Uploading to Shelby RPC',
  'Distributing to 16 SP nodes',
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

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function CloudUploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2a4 4 0 0 1 4 4 4 4 0 0 1 0 8H6a4 4 0 1 1 0-8 4 4 0 0 1 0 0" />
      <path d="M12 22V12" />
      <path d="m9 15 3-3 3 3" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 1 2 2c0 1.02-.1 2.51-.26 4-.16 1.48-.4 3.12-.54 4" />
      <path d="M7 10a5 5 0 0 1 5-5 5 5 0 0 1 5 5" />
      <path d="M4 10c0-4.42 3.58-8 8-8s8 3.58 8 8" />
      <path d="M2 10c0-5.52 4.48-10 10-10s10 4.48 10 10" />
      <path d="M17 16.5c.24-1.1.5-2.47.64-3.5" />
      <path d="M9 17.5c-.24-1.1-.5-2.47-.64-3.5" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5 5 5 0 0 1 4.5 3 5 5 0 0 1 4.5-3 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export default function Upload() {
  const navigate = useNavigate();
  const { address, connected } = useWalletContext();
  const { isAuthenticated, isAuthenticating, login, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [fileHashComputing, setFileHashComputing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [license, setLicense] = useState('CC BY 4.0');
  const [accessType, setAccessType] = useState<AccessType>(AccessType.FREE);
  const [price, setPrice] = useState('');
  const [aptPriceUsd, setAptPriceUsd] = useState<number | null>(null);
  const [priceLastUpdated, setPriceLastUpdated] = useState<Date | null>(null);
  const [selectedVolumeTab, setSelectedVolumeTab] = useState<10 | 100 | 500 | 'custom'>(100);
  const [customAccesses, setCustomAccesses] = useState('250');
  const [calcExpanded, setCalcExpanded] = useState(false);
  const [annualExpanded, setAnnualExpanded] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadStage, setUploadStage] = useState(0);
  const [uploadDetailOpen, setUploadDetailOpen] = useState(false);
  const [chunksDone, setChunksDone] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    jobId: string;
    blobId: string;
    merkleRoot: string;
    txHash: string;
    uploadedAt: string;
    chunks: number;
  } | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Live APT reference price, refreshed every 60s so the "Updated X min ago"
  // footer stays honest.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getAptPrice()
        .then((p) => {
          if (cancelled) return;
          setAptPriceUsd(p);
          setPriceLastUpdated(new Date());
        })
        .catch(() => { if (!cancelled) setAptPriceUsd(null); });
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  // Clear any stale draft from previous sessions on mount
  useEffect(() => {
    try { localStorage.removeItem(UPLOAD_DRAFT_KEY); } catch { /* ignore */ }
  }, []);



  useEffect(() => {
    if (!file) {
      setFileHash('');
      setFileHashComputing(false);
      return;
    }
    setFileHashComputing(true);
    computeSHA256(file).then((hash) => {
      setFileHash(hash);
      setFileHashComputing(false);
    });
  }, [file]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      // Auto-tag the file from its name + type; user can edit freely afterwards.
      setTags(predictTagsFromFile(f));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setTags(predictTagsFromFile(f));
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileHash('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Add any tag the user typed — known marketplace tags or a custom one.
  const addTag = useCallback(
    (value: string) => {
      const normalized = normalizeTag(value);
      if (!normalized || tags.includes(normalized) || tags.length >= 10) return;
      setTags((prev) => [...prev, normalized]);
      setTagInput('');
    },
    [tags],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ',') {
        e.preventDefault();
        addTag(tagInput);
        return;
      }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      addTag(tagInput);
    },
    [addTag, tagInput],
  );

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // Scenario calculator derived values (Step 3 pricing).
  const activeAccesses =
    selectedVolumeTab === 'custom'
      ? Math.max(0, Number.parseInt(customAccesses, 10) || 0)
      : selectedVolumeTab;
  const priceNum = Number.parseFloat(price) || 0;
  const grossRevenue = priceNum * activeAccesses;
  const platformFeePercent = 0; // v1: Verida takes no platform fee
  const platformFeeApt = (grossRevenue * platformFeePercent) / 100;
  const creatorRevenue = grossRevenue - platformFeeApt;
  const creatorRevenueUsd = aptPriceUsd !== null ? creatorRevenue * aptPriceUsd : null;
  const priceUpdatedMinutes = priceLastUpdated
    ? Math.max(0, Math.floor((Date.now() - priceLastUpdated.getTime()) / 60_000))
    : null;
  const priceStale = priceUpdatedMinutes !== null && priceUpdatedMinutes > 5;

  const canGoNext = useCallback((): boolean => {
    if (currentStep === 1) return !!file && !fileHashComputing && !!fileHash;
    if (currentStep === 2) {
      return (
        name.length >= 3 &&
        name.length <= 120 &&
        description.length >= 20 &&
        description.length <= 2000
      );
    }
    if (currentStep === 3) {
      if (accessType === AccessType.FREE) return true;
      return !!price && parseFloat(price) > 0 && activeAccesses >= 1;
    }
    return true;
  }, [currentStep, file, fileHashComputing, fileHash, name, description, accessType, price, activeAccesses]);

  const handleNext = useCallback(() => {
    if (currentStep === 2 && accessType === AccessType.FREE) {
      setCurrentStep(4);
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, 4));
  }, [currentStep, accessType]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const startUpload = useCallback(async () => {
    if (!file || !address) {
      if (!address) alert('Please connect your wallet first.');
      return;
    }

    // Always authenticate fresh before upload
    try {
      logout();
      await login();
    } catch {
      alert('Please sign the authentication message in your wallet to continue.');
      return;
    }

    setUploading(true);
    setUploadPercent(0);
    setUploadStage(0);
    setChunksDone(0);
    setUploadDetailOpen(false);
    setUploadError(null);

    // 1️⃣ Generate jobId client-side so WS channel exists before the POST
    const jobId = crypto.randomUUID();

    // 2️⃣ Open WebSocket FIRST — listen before the worker emits anything
    const wsUrl = `${WS_BASE}/ws/uploads/${jobId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // 3️⃣ Wait for WS to connect
    try {
      await new Promise<void>((resolve, reject) => {
        if (ws.readyState === WebSocket.OPEN) { resolve(); return; }
        const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        ws.onopen = () => { clearTimeout(timeout); resolve(); };
        ws.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket failed')); };
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to connect to progress stream');
      setUploading(false);
      return;
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'progress') {
          const progress = msg.data;
          setUploadPercent(progress.percent);
          if (progress.stage === 'reading' || progress.stage === 'encoding') setUploadStage(0);
          else if (progress.stage === 'registering') setUploadStage(1);
          else if (progress.stage === 'confirming') setUploadStage(2);
          else if (progress.stage === 'complete') setUploadStage(4);
        } else if (msg.type === 'complete') {
          setUploadStage(4);
          setUploadPercent(100);
          setChunksDone(16);
          ws.close();
          setTimeout(() => {
            setUploading(false);
            setReceipt({
              jobId,
              blobId: msg.dataset?.shelby_blob_id ?? 'Pending...',
              merkleRoot: msg.dataset?.merkle_root ?? 'Pending...',
              txHash: msg.dataset?.tx_hash ?? 'Pending...',
              uploadedAt: new Date().toLocaleString(),
              chunks: 16,
            });
          }, 500);
        } else if (msg.type === 'error') {
          setUploadError(msg.error || 'Upload failed');
          ws.close();
          setUploading(false);
        }
      } catch {
        setUploadError('Failed to parse upload progress.');
      }
    };

    ws.onerror = () => {
      setUploadError(
        'Lost connection to the upload progress stream. The upload may still be ' +
          'processing — check your dashboard in a moment.',
      );
      setUploading(false);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    // 4️⃣ Now POST with the pre-generated jobId
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('license', license);
      formData.append('accessType', accessType);
      formData.append('publisherAddress', address);
      formData.append('jobId', jobId);
      tags.forEach((t) => formData.append('tags', t));
      if (accessType !== AccessType.FREE && price) {
        formData.append('pricePerAccess', String(Math.round(parseFloat(price) * 100_000_000)));
      }

      await uploadDataset(formData, jobId);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      ws.close();
    }
  }, [file, address, name, description, license, accessType, price, tags]);

  const handleCloseReceipt = useCallback(() => {
    setReceipt(null);
  }, []);

  const handleUploadAnother = useCallback(() => {
    setReceipt(null);
    setCurrentStep(1);
    setFile(null);
    setFileHash('');
    setName('');
    setDescription('');
    setTags([]);
    setLicense('CC BY 4.0');
    setAccessType(AccessType.FREE);
    setPrice('');
    setUploadPercent(0);
    setUploadStage(0);
    setChunksDone(0);
  }, []);

  const step = (s: number, label: string) => {
    const isComplete = currentStep > s;
    const isActive = currentStep === s;
    const isUpcoming = currentStep < s;

    return (
      <div className="step-item">
        {isComplete ? (
          <div className="step-circle step-complete">
            <CheckIcon />
          </div>
        ) : isActive ? (
          <div className="step-circle step-active">{(s)}</div>
        ) : (
          <div className="step-circle step-upcoming">{(s)}</div>
        )}
        <span
          className={`step-label${isActive ? ' step-label-active' : ''}${isComplete ? ' step-label-complete' : ''}`}
        >
          {label}
        </span>
      </div>
    );
  };

  const tagSuggestions = useMemo(() => {
    const input = tagInput.trim();
    if (!input) return [];
    const matches: Array<{ value: string; label: string; isNew: boolean }> = ALL_TAGS.filter(
      (t) =>
        t.replace(/_/g, ' ').toLowerCase().startsWith(input.toLowerCase()) &&
        !tags.includes(t),
    )
      .slice(0, 4)
      .map((t) => ({ value: t, label: t.replace(/_/g, ' '), isNew: false }));
    // Typed text that isn't a known tag becomes a "create" suggestion, so
    // users are never limited to the hardcoded tag list.
    const normalized = normalizeTag(input);
    if (
      normalized &&
      !tags.includes(normalized) &&
      !matches.some((m) => m.value === normalized)
    ) {
      matches.push({
        value: normalized,
        label: `Add “${normalized.replace(/_/g, ' ')}”`,
        isNew: true,
      });
    }
    return matches;
  }, [tagInput, tags]);

  return (
    <div className="upload-page">
      <header className="upload-header">
        <h1 className="upload-title">Upload Dataset</h1>
        <p className="upload-subtext">
          Your dataset will be stored on Shelby Protocol with an immutable provenance chain.
        </p>
      </header>

      <nav className="step-indicator">
        {step(1, 'File')}
        <span className={`step-connector${currentStep > 1 ? ' step-connector-done' : ''}`} />
        {step(2, 'Metadata')}
        <span className={`step-connector${currentStep > 2 ? ' step-connector-done' : ''}`} />
        {step(3, 'Pricing')}
        <span className={`step-connector${currentStep > 3 ? ' step-connector-done' : ''}`} />
        {step(4, 'Review')}
      </nav>

      <div className="wizard-content">
        {currentStep === 1 && (
          <div className="step-panel">
            {!file ? (
              <div>
                <div
                  ref={dropRef}
                  className={`drop-zone${dragOver ? ' drop-zone-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="drop-icon">
                    <CloudUploadIcon />
                  </div>
                  <p className="drop-title">Drop your dataset here</p>
                  <p className="drop-browse">or click to browse</p>
                  <p className="drop-formats">
                    Supported formats: CSV · JSON · Parquet · ZIP · HDF5 · Pickle
                  </p>
                  <p className="drop-limit">Max 10 GB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="drop-input-hidden"
                    onChange={handleFileSelect}
                    accept=".csv,.json,.parquet,.zip,.hdf5,.pkl,.pickle"
                  />
                </div>
              </div>
            ) : (
              <div className="file-preview">
                <div className="file-preview-card">
                  <div className="file-preview-icon">
                    <FileIcon />
                  </div>
                  <div className="file-preview-info">
                    <span className="file-preview-name">{file.name}</span>
                    <span className="file-preview-size">{formatSize(file.size)}</span>
                  </div>
                  <div className="file-preview-hash">
                    <FingerprintIcon />
                    <span className="file-preview-hash-label">Content hash:</span>
                    {fileHashComputing ? (
                      <span className="file-preview-hash-computing">Computing SHA-256...</span>
                    ) : (
                      <AddressDisplay value={fileHash} type="contentHash" />
                    )}
                  </div>
                  <button className="file-preview-remove" onClick={handleRemoveFile}>
                    x Remove file
                  </button>
                </div>
              </div>
            )}
            <div className="step-footer">
              <Button
                variant="primary"
                disabled={!canGoNext()}
                onClick={handleNext}
              >
                Next: Add Metadata
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="step-panel">
            <div className="metadata-layout">
              <div className="metadata-left">
                <Input
                  label="Dataset Name"
                  placeholder="e.g. ImageNet Subset"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  helper={`${name.length}/120`}
                />
                <div className="upload-field">
                  <label className="input-label">
                    Description
                    <span className="input-required">*</span>
                  </label>
                  <textarea
                    className="upload-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your dataset..."
                    rows={5}
                  />
                  <span className="input-helper">{description.length}/2000</span>
                </div>
                <div className="upload-field">
                  <label className="input-label">Tags</label>
                  <div className="tag-input-area">
                    <input
                      className="input"
                      placeholder="Type a tag and press Enter or comma..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                    />
                    {tagSuggestions.length > 0 && (
                      <div className="tag-suggestions">
                        {tagSuggestions.map((s) => (
                          <button
                            key={s.value}
                            className={`tag-suggestion${s.isNew ? ' tag-suggestion-new' : ''}`}
                            onClick={() => addTag(s.value)}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="upload-tags">
                    {tags.map((tag) => (
                      <TagPill key={tag} active onClick={() => removeTag(tag)}>
                        {tag.replace(/_/g, ' ')} x
                      </TagPill>
                    ))}
                  </div>
                  <span className="input-helper">
                    {tags.length}/10 tags
                    {file && tags.length === 0 && ' · no tags yet'}
                  </span>
                  {file && tags.length > 0 && (
                    <span className="input-helper tag-predict-hint">
                      Predicted from “{file.name}” — click a tag to remove it or type your own.
                    </span>
                  )}
                </div>
                <div className="upload-field">
                  <label className="input-label">License</label>
                  <select
                    className="input upload-select"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                  >
                    {LICENSE_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="metadata-right">
                <label className="input-label">Access Type</label>
                <div className="access-type-group">
                  <div
                    className={`access-card${accessType === AccessType.FREE ? ' access-card-selected' : ''}`}
                    onClick={() => setAccessType(AccessType.FREE)}
                  >
                    <span className="access-card-icon"><GiftIcon /></span>
                    <div className="access-card-body">
                      <span className="access-card-title">Free Access</span>
                      <span className="access-card-desc">Anyone can stream and download for free</span>
                    </div>
                  </div>
                  <div
                    className={`access-card${accessType === AccessType.PAY_PER_ACCESS ? ' access-card-selected' : ''}`}
                    onClick={() => setAccessType(AccessType.PAY_PER_ACCESS)}
                  >
                    <span className="access-card-icon"><CoinsIcon /></span>
                    <div className="access-card-body">
                      <span className="access-card-title">Pay Per Access</span>
                      <span className="access-card-desc">Users pay in APT per 24-hour session</span>
                    </div>
                  </div>
                  <div
                    className={`access-card${accessType === AccessType.SUBSCRIPTION ? ' access-card-selected' : ''}`}
                    onClick={() => setAccessType(AccessType.SUBSCRIPTION)}
                  >
                    <span className="access-card-icon"><RefreshIcon /></span>
                    <div className="access-card-body">
                      <span className="access-card-title">Subscription</span>
                      <span className="access-card-desc">Monthly unlimited access</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="step-footer step-footer-split">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button variant="primary" disabled={!canGoNext()} onClick={handleNext}>
                Next: Pricing
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="step-panel">
            {accessType === AccessType.FREE ? (
              <div className="pricing-skip">
                <Badge variant="free" icon={<GiftIcon />}>Free Access</Badge>
                <p className="pricing-skip-text">
                  Your dataset is set to free — no pricing needed. This step will be skipped.
                </p>
              </div>
            ) : (
              <div className="pricing-content">
                <div className="pricing-section">
                  <h3 className="pricing-section-title">Your pricing</h3>
                  <div className="pricing-row">
                    <label className="input-label" htmlFor="price-per-access">Price per access</label>
                    <div className="pricing-input-group">
                      <input
                        id="price-per-access"
                        className={`pricing-input${price && parseFloat(price) <= 0 ? ' pricing-input-error' : ''}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                      <span className="pricing-currency">APT</span>
                      {aptPriceUsd !== null && price && parseFloat(price) > 0 && (
                        <span
                          className="pricing-usd"
                          aria-label={`approximately ${(parseFloat(price) * aptPriceUsd).toFixed(2)} US dollars`}
                        >
                          ≈ ${(parseFloat(price) * aptPriceUsd).toFixed(2)} USD
                        </span>
                      )}
                    </div>
                    {price && parseFloat(price) <= 0 && (
                      <span className="pricing-error">Price must be greater than 0</span>
                    )}
                  </div>
                  <div className="pricing-info">
                    <span className="pricing-info-label">Access duration</span>
                    <span className="pricing-info-value">24 hours (fixed)</span>
                  </div>
                  <div className="pricing-info">
                    <span className="pricing-info-label">Platform fee</span>
                    <span className="pricing-info-value">0%</span>
                  </div>
                </div>

                <Card className="pricing-estimator">
                  <h3 className="pricing-estimator-title">Scenario-based earnings estimate</h3>
                  <p className="pricing-disclaimer">
                    <InfoIcon /> Illustrative calculations based on the access volume you select.
                    Not a prediction or guarantee of earnings.
                  </p>

                  <p className="pricing-volume-label">If your dataset receives...</p>
                  <div className="pricing-tabs" role="tablist" aria-label="Access volume scenario">
                    {([10, 100, 500] as const).map((v) => (
                      <button
                        key={v}
                        role="tab"
                        aria-selected={selectedVolumeTab === v}
                        className={`pricing-tab${selectedVolumeTab === v ? ' pricing-tab-active' : ''}`}
                        onClick={() => setSelectedVolumeTab(v)}
                      >
                        {v}
                      </button>
                    ))}
                    <button
                      role="tab"
                      aria-selected={selectedVolumeTab === 'custom'}
                      className={`pricing-tab${selectedVolumeTab === 'custom' ? ' pricing-tab-active' : ''}`}
                      onClick={() => setSelectedVolumeTab('custom')}
                    >
                      Custom
                    </button>
                  </div>

                  {selectedVolumeTab === 'custom' && (
                    <div className="pricing-custom-row">
                      <label className="pricing-info-label" htmlFor="custom-accesses">
                        Monthly accesses
                      </label>
                      <input
                        id="custom-accesses"
                        className="pricing-input pricing-input-sm"
                        type="number"
                        min="1"
                        max="999999"
                        value={customAccesses}
                        onChange={(e) => setCustomAccesses(e.target.value)}
                        aria-label="Custom monthly accesses"
                      />
                    </div>
                  )}

                  <div className="revenue-card">
                    <div className="revenue-row">
                      <span className="revenue-label">Monthly accesses</span>
                      <span className="revenue-value">
                        {activeAccesses > 0 ? activeAccesses.toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="revenue-row">
                      <span className="revenue-label">× Price per access</span>
                      <span className="revenue-value">
                        {priceNum > 0 ? `${priceNum.toFixed(2)} APT` : '—'}
                      </span>
                    </div>
                    <div className="revenue-divider" />
                    <div className="revenue-row">
                      <span className="revenue-label">Gross revenue</span>
                      <span className="revenue-value">
                        {priceNum > 0 && activeAccesses > 0 ? `${grossRevenue.toFixed(2)} APT` : '—'}
                      </span>
                    </div>
                    <div className="revenue-row">
                      <span className="revenue-label">Platform fee</span>
                      <span className="revenue-value">
                        {priceNum > 0 && activeAccesses > 0
                          ? `${platformFeeApt.toFixed(2)} APT (${platformFeePercent}%)`
                          : '—'}
                      </span>
                    </div>
                    <div className="revenue-divider" />
                    <div className="revenue-row revenue-total">
                      <span className="revenue-label">Estimated revenue</span>
                      <span className="revenue-apt">
                        {priceNum > 0 && activeAccesses > 0
                          ? `${creatorRevenue.toFixed(2)} APT`
                          : '—'}
                        {creatorRevenueUsd !== null && priceNum > 0 && activeAccesses > 0 && (
                          <span
                            className="revenue-usd"
                            aria-label={`approximately ${creatorRevenueUsd.toFixed(2)} US dollars`}
                          >
                            ≈ ${creatorRevenueUsd.toFixed(2)} USD
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="pricing-calc">
                    <button
                      className="pricing-calc-toggle"
                      onClick={() => setCalcExpanded((v) => !v)}
                      aria-expanded={calcExpanded}
                      aria-controls="pricing-calc-detail"
                    >
                      <span className={`pricing-calc-chevron${calcExpanded ? ' pricing-calc-chevron-open' : ''}`}>▶</span>
                      How is this calculated?
                    </button>
                    {calcExpanded && (
                      <div id="pricing-calc-detail" className="pricing-calc-body">
                        <div className="pricing-calc-block">
                          <span className="pricing-calc-caption">Monthly revenue formula</span>
                          <pre className="pricing-calc-formula">
                            {`Price per access  ×  Monthly accesses
= ${priceNum.toFixed(2)} APT          ×  ${activeAccesses}
= ${grossRevenue.toFixed(2)} APT  (gross revenue)`}
                          </pre>
                        </div>
                        <div className="pricing-calc-block">
                          <span className="pricing-calc-caption">Creator revenue</span>
                          <pre className="pricing-calc-formula">
                            {`Gross revenue  −  Platform fee
= ${grossRevenue.toFixed(2)} APT     −  ${platformFeeApt.toFixed(2)} APT
= ${creatorRevenue.toFixed(2)} APT  (estimated creator revenue)`}
                          </pre>
                        </div>
                        <p className="pricing-calc-note">
                          APT/USD conversion uses the current indicative market price.
                          Actual USD value will change as the APT market price changes.
                        </p>
                      </div>
                    )}
                  </div>

                  {(selectedVolumeTab === 'custom' || selectedVolumeTab === 500) && (
                    <div className="pricing-calc">
                      <button
                        className="pricing-calc-toggle"
                        onClick={() => setAnnualExpanded((v) => !v)}
                        aria-expanded={annualExpanded}
                        aria-controls="pricing-annual-detail"
                      >
                        <span className={`pricing-calc-chevron${annualExpanded ? ' pricing-calc-chevron-open' : ''}`}>▶</span>
                        Illustrative annual revenue
                      </button>
                      {annualExpanded && (
                        <div id="pricing-annual-detail" className="pricing-calc-body">
                          <p className="pricing-calc-note">If the same access volume occurs every month:</p>
                          <pre className="pricing-calc-formula">
                            {`${creatorRevenue.toFixed(2)} APT/month × 12 = ${(creatorRevenue * 12).toFixed(2)} APT/year`}
                            {creatorRevenueUsd !== null
                              ? `\n                        ≈ $${(creatorRevenueUsd * 12).toFixed(2)} USD/year`
                              : ''}
                          </pre>
                          <p className="pricing-calc-warn">
                            ⚠ This assumes consistent monthly access volume, which is not guaranteed.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pricing-meta">
                    <span className="pricing-meta-line">
                      APT reference price:{' '}
                      {aptPriceUsd !== null ? `$${aptPriceUsd.toFixed(4)}` : 'unavailable'}
                      {aptPriceUsd !== null && (
                        <>
                          {' '}· Updated {priceUpdatedMinutes} min ago
                          {priceStale && (
                            <span className="pricing-meta-stale"> ⚠ Price data may be outdated</span>
                          )}
                        </>
                      )}
                    </span>
                    <span className="pricing-meta-line">
                      Platform fee: 0% · Revenue scenarios are mathematical illustrations,
                      not demand forecasts or guarantees. Actual earnings depend on the number
                      of paid accesses and applicable fees.
                    </span>
                  </div>
                </Card>
              </div>
            )}
            <div className="step-footer step-footer-split">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button variant="primary" disabled={!canGoNext()} onClick={handleNext}>
                Next: Review
              </Button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="step-panel">
            <div className="review-summary">
              <Card className="review-card">
                <div className="review-card-header">
                  <span className="review-card-title">File</span>
                  <button className="review-edit" onClick={() => setCurrentStep(1)}>Edit</button>
                </div>
                <div className="review-card-body">
                  <span className="review-label">Name</span>
                  <span className="review-value">{file?.name}</span>
                  <span className="review-label">Size</span>
                  <span className="review-value">{file ? formatSize(file.size) : '-'}</span>
                  <span className="review-label">Content hash</span>
                  <AddressDisplay value={fileHash} type="contentHash" />
                </div>
              </Card>
              <Card className="review-card">
                <div className="review-card-header">
                  <span className="review-card-title">Metadata</span>
                  <button className="review-edit" onClick={() => setCurrentStep(2)}>Edit</button>
                </div>
                <div className="review-card-body">
                  <span className="review-label">Name</span>
                  <span className="review-value">{name}</span>
                  <span className="review-label">License</span>
                  <span className="review-value">{license}</span>
                  <span className="review-label">Tags</span>
                  <div className="review-tags">
                    {tags.map((t) => (
                      <TagPill key={t} active>{t.replace(/_/g, ' ')}</TagPill>
                    ))}
                    {tags.length === 0 && <span className="review-value">None</span>}
                  </div>
                </div>
              </Card>
              <Card className="review-card">
                <div className="review-card-header">
                  <span className="review-card-title">Access &amp; Pricing</span>
                  <button className="review-edit" onClick={() => setCurrentStep(3)}>Edit</button>
                </div>
                <div className="review-card-body">
                  <span className="review-label">Access type</span>
                  <span className="review-value">
                    {accessType === AccessType.FREE
                      ? 'Free'
                      : accessType === AccessType.PAY_PER_ACCESS
                        ? 'Pay Per Access'
                        : 'Subscription'}
                  </span>
                  {accessType !== AccessType.FREE && (
                    <>
                      <span className="review-label">Price</span>
                      <span className="review-value">{price} APT</span>
                    </>
                  )}
                </div>
              </Card>
              <Card className="review-card">
                <div className="review-card-header">
                  <span className="review-card-title">Storage</span>
                </div>
                <div className="review-card-body">
                  <span className="review-label">Network</span>
                  <span className="review-value">Will be stored on Shelby Protocol (shelbynet)</span>
                  <span className="review-label">Expected chunks</span>
                  <span className="review-value">16 chunks</span>
                  <span className="review-label">Nodes</span>
                  <span className="review-value">16+ nodes</span>
                </div>
              </Card>
            </div>
            <p className="review-disclosure">
              By uploading, you confirm that you have the right to distribute this dataset
              and that it complies with the Verida AI terms of service.
            </p>
            <div className="step-footer">
              <Button variant="primary" fullWidth size="lg" onClick={startUpload} disabled={uploading}>
                Upload &amp; Publish Dataset
              </Button>
            </div>
          </div>
        )}
      </div>

      {uploading && (
        <div className="upload-progress-overlay">
          <div className="upload-progress-panel">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${uploadPercent}%` }} />
            </div>
            <div className="progress-percent">{uploadPercent}%</div>
            <div className="progress-stages">
              {UPLOAD_STAGES.map((stageName, i) => (
                <div
                  key={stageName}
                  className={`progress-stage${uploadStage > i ? ' progress-stage-done' : ''}${uploadStage === i ? ' progress-stage-current' : ''}`}
                >
                  <span className="progress-stage-bullet">
                    {uploadStage > i ? <CheckIcon /> : i + 1}
                  </span>
                  <span className="progress-stage-label">{stageName}...</span>
                </div>
              ))}
            </div>
            {uploadError && (
              <div className="progress-error">{uploadError}</div>
            )}
            <button className="progress-cancel" onClick={() => { setUploading(false); }}>
              Cancel upload
            </button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="receipt-overlay" onClick={handleCloseReceipt}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-checkmark">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="22" />
                <polyline points="14 24 21 31 34 18" />
              </svg>
            </div>
            <h2 className="receipt-title">Dataset Published</h2>
            <div className="receipt-table">
              <div className="receipt-row">
                <span className="receipt-row-label">Job ID</span>
                <span className="receipt-row-value">{receipt.jobId}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-row-label">blobId</span>
                <AddressDisplay value={receipt.blobId} type="blobId" />
              </div>
              <div className="receipt-row">
                <span className="receipt-row-label">merkleRoot</span>
                <AddressDisplay value={receipt.merkleRoot} type="merkleRoot" showAptosLink />
              </div>
              <div className="receipt-row">
                <span className="receipt-row-label">txHash</span>
                <AddressDisplay value={receipt.txHash} type="txHash" showAptosLink />
              </div>
              <div className="receipt-row">
                <span className="receipt-row-label">Uploaded</span>
                <span className="receipt-row-value">{receipt.uploadedAt}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-row-label">Chunks</span>
                <span className="receipt-row-value">{receipt.chunks}</span>
              </div>
            </div>
            <p className="receipt-note">
              Your provenance receipt is permanently recorded on Aptos L1.
            </p>
            <div className="receipt-actions">
              <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/')}>View Marketplace</Button>
              <Button variant="ghost" size="lg" fullWidth onClick={handleUploadAnother}>
                Upload Another
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
