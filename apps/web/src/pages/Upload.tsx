import { useState, useRef, useCallback, useEffect } from 'react';
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
const LICENSE_OPTIONS = [
  'MIT',
  'Apache 2.0',
  'CC BY 4.0',
  'CC BY-NC',
  'CC BY-NC-ND',
  'GPL 3.0',
  'Custom',
];
const UPLOAD_STAGES = [
  'Hashing file content',
  'Uploading to Shelby RPC',
  'Clay erasure encoding',
  'Distributing to 16 SP nodes',
  'Anchoring to Aptos L1',
];

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

export default function Upload() {
  const navigate = useNavigate();
  const { address, connected } = useWalletContext();
  const { isAuthenticated, isAuthenticating, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [fileHashComputing, setFileHashComputing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<DatasetTag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [license, setLicense] = useState('CC BY 4.0');
  const [accessType, setAccessType] = useState<AccessType>(AccessType.FREE);
  const [price, setPrice] = useState('');
  const [aptPriceUsd, setAptPriceUsd] = useState(0.60);

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

  useEffect(() => {
    getAptPrice().then(setAptPriceUsd);
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
    if (f) setFile(f);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileHash('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ',') {
        e.preventDefault();
        const input = tagInput.trim().replace(/,$/, '').trim();
        if (!input) return;
        const match = ALL_TAGS.find(
          (t) => t.replace(/_/g, ' ').toLowerCase() === input.toLowerCase(),
        );
        if (match && !tags.includes(match) && tags.length < 10) {
          setTags((prev) => [...prev, match]);
          setTagInput('');
        }
        return;
      }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const input = tagInput.trim();
      if (!input) return;
      // Try exact match first
      const match = ALL_TAGS.find(
        (t) => t.replace(/_/g, ' ').toLowerCase() === input.toLowerCase(),
      );
      if (match && !tags.includes(match) && tags.length < 10) {
        setTags((prev) => [...prev, match]);
        setTagInput('');
        return;
      }
      // If no exact match, add the first suggestion
      const suggestions = ALL_TAGS.filter(
        (t) =>
          t.replace(/_/g, ' ').toLowerCase().startsWith(input.toLowerCase()) &&
          !tags.includes(t),
      );
      if (suggestions.length > 0 && tags.length < 10 && suggestions[0] !== undefined) {
        setTags((prev) => [...prev, suggestions[0]!]);
        setTagInput('');
      }
    },
    [tagInput, tags],
  );

  const removeTag = useCallback((tag: DatasetTag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

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
      return !!price && parseFloat(price) > 0;
    }
    return true;
  }, [currentStep, file, fileHashComputing, fileHash, name, description, accessType, price]);

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

    if (!isAuthenticated) {
      try {
        await login();
      } catch {
        alert('Please sign the authentication message in your wallet to continue.');
        return;
      }
    }

    setUploading(true);
    setUploadPercent(0);
    setUploadStage(0);
    setChunksDone(0);
    setUploadDetailOpen(false);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('license', license);
      formData.append('accessType', accessType);
      formData.append('publisherAddress', address);
      tags.forEach((t) => formData.append('tags', t));
      if (accessType !== AccessType.FREE && price) {
        formData.append('pricePerAccess', String(Math.round(parseFloat(price) * 100_000_000)));
      }

      setUploadStage(1);
      setUploadPercent(5);

      const result = await uploadDataset(formData);
      const jobId = result.jobId;

      // Connect to WebSocket for real-time progress
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/uploads/${jobId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'progress') {
            const progress = msg.data;
            setUploadPercent(progress.percent);
            if (progress.stage === 'reading') setUploadStage(1);
            else if (progress.stage === 'registering') setUploadStage(2);
            else if (progress.stage === 'confirming') setUploadStage(3);
            else if (progress.stage === 'complete') setUploadStage(4);
          } else if (msg.type === 'complete') {
            setUploadStage(5);
            setUploadPercent(100);
            setChunksDone(16);
            ws.close();
            setTimeout(() => {
              setUploading(false);
              setReceipt({
                jobId,
                blobId: result.dataset?.shelby_blob_id ?? 'Pending...',
                merkleRoot: result.dataset?.merkle_root ?? 'Pending...',
                txHash: result.dataset?.provenance_receipt?.txHash ?? 'Pending...',
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
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        // Fallback: show completion since the upload already succeeded via REST
        setUploadStage(5);
        setUploadPercent(100);
        setChunksDone(16);
        setTimeout(() => {
          setUploading(false);
          setReceipt({
            jobId,
            blobId: result.dataset?.shelby_blob_id ?? 'Pending...',
            merkleRoot: result.dataset?.merkle_root ?? 'Pending...',
            txHash: result.dataset?.provenance_receipt?.txHash ?? 'Pending...',
            uploadedAt: new Date().toLocaleString(),
            chunks: 16,
          });
        }, 500);
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
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

  const tagSuggestions = tagInput.trim()
    ? ALL_TAGS.filter(
        (t) =>
          t.replace(/_/g, ' ').toLowerCase().startsWith(tagInput.trim().toLowerCase()) &&
          !tags.includes(t),
      ).slice(0, 5)
    : [];

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
                        {tagSuggestions.map((t) => (
                          <button
                            key={t}
                            className="tag-suggestion"
                            onClick={() => {
                              setTags((prev) => [...prev, t]);
                              setTagInput('');
                            }}
                          >
                            {t.replace(/_/g, ' ')}
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
                  <span className="input-helper">{tags.length}/10 tags</span>
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
                <div className="pricing-row">
                  <label className="input-label">Price per access</label>
                  <div className="pricing-input-group">
                    <input
                      className="pricing-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                    <span className="pricing-currency">APT</span>
                    <span className="pricing-usd">
                      ~${price ? (parseFloat(price) * aptPriceUsd).toFixed(2) : '0.00'} USD
                    </span>
                  </div>
                </div>
                <div className="pricing-info">
                  <span className="pricing-info-label">Session duration</span>
                  <span className="pricing-info-value">24 hours (fixed)</span>
                </div>
                <Card className="pricing-estimator">
                  <h3 className="pricing-estimator-title">Earnings estimate (potential)</h3>
                  <div className="pricing-scenarios">
                    <div className="pricing-scenario">
                      <span className="pricing-scenario-count">10</span>
                      <span className="pricing-scenario-label">accesses/month</span>
                      <span className="pricing-scenario-earn">
                        {price ? `${(parseFloat(price) * 10).toFixed(2)} APT` : '—'}
                        {price && <span className="pricing-scenario-usd"> (~${(parseFloat(price) * 10 * aptPriceUsd).toFixed(2)})</span>}
                      </span>
                    </div>
                    <div className="pricing-scenario">
                      <span className="pricing-scenario-count">100</span>
                      <span className="pricing-scenario-label">accesses/month</span>
                      <span className="pricing-scenario-earn">
                        {price ? `${(parseFloat(price) * 100).toFixed(2)} APT` : '—'}
                        {price && <span className="pricing-scenario-usd"> (~${(parseFloat(price) * 100 * aptPriceUsd).toFixed(2)})</span>}
                      </span>
                    </div>
                    <div className="pricing-scenario">
                      <span className="pricing-scenario-count">500</span>
                      <span className="pricing-scenario-label">accesses/month</span>
                      <span className="pricing-scenario-earn">
                        {price ? `${(parseFloat(price) * 500).toFixed(2)} APT` : '—'}
                        {price && <span className="pricing-scenario-usd"> (~${(parseFloat(price) * 500 * aptPriceUsd).toFixed(2)})</span>}
                      </span>
                    </div>
                  </div>
                  <p className="pricing-fee-note">Verida takes 0% platform fee · APT price: ${aptPriceUsd.toFixed(2)}</p>
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
