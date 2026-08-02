import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight, ChartBar, ChartLineUp,
  ShieldCheck, WarningCircle, Database, TrendUp,
} from '@phosphor-icons/react';
import { useWalletContext } from '../context/WalletContext';
import { listDatasets, getPublisher } from '../api/client';
import { ContractStatePanel } from '../components/ContractStatePanel';
import type { Dataset } from '@verida/shared';
import './DashboardHome.css';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatApt(pricePerAccess: number | null): string {
  if (!pricePerAccess) return 'Free';
  const apt = pricePerAccess / 100_000_000;
  return apt >= 1 ? `${apt.toFixed(1)} APT` : `${apt.toFixed(2)} APT`;
}

const CATEGORY_ICONS: Record<string, { bg: string; icon: string; color: string }> = {
  nlp: { bg: 'rgba(59,130,246,0.12)', icon: 'NL', color: '#60a5fa' },
  cv: { bg: 'rgba(245,158,11,0.12)', icon: 'CV', color: '#fbbf24' },
  tabular: { bg: 'rgba(34,197,94,0.12)', icon: 'TB', color: '#4ade80' },
  audio: { bg: 'rgba(0,212,200,0.12)', icon: 'AU', color: '#00d4c8' },
  medical: { bg: 'rgba(239,68,68,0.12)', icon: 'MD', color: '#f87171' },
  code: { bg: 'rgba(139,92,246,0.12)', icon: 'CD', color: '#c4b5fd' },
  financial: { bg: 'rgba(245,158,11,0.12)', icon: 'FN', color: '#fbbf24' },
  multimodal: { bg: 'rgba(99,102,241,0.12)', icon: 'MM', color: '#a5b4fc' },
  legal: { bg: 'rgba(156,163,175,0.12)', icon: 'LG', color: '#9ca3af' },
  other: { bg: 'rgba(107,114,128,0.12)', icon: 'OT', color: '#9ca3af' },
  software_engineering: { bg: 'rgba(59,130,246,0.12)', icon: 'SE', color: '#60a5fa' },
  brand: { bg: 'rgba(236,72,153,0.12)', icon: 'BR', color: '#f472b6' },
  design: { bg: 'rgba(168,85,247,0.12)', icon: 'DS', color: '#a855f7' },
  graphic: { bg: 'rgba(168,85,247,0.12)', icon: 'GR', color: '#a855f7' },
  image: { bg: 'rgba(34,197,94,0.12)', icon: 'IM', color: '#4ade80' },
  video: { bg: 'rgba(245,158,11,0.12)', icon: 'VD', color: '#fbbf24' },
  text: { bg: 'rgba(59,130,246,0.12)', icon: 'TX', color: '#60a5fa' },
  document: { bg: 'rgba(156,163,175,0.12)', icon: 'DC', color: '#9ca3af' },
};

function getCategory(tags: string[]): string {
  const known = Object.keys(CATEGORY_ICONS);
  for (const tag of tags) {
    if (known.includes(tag)) return tag;
  }
  return tags[0] ?? 'other';
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const { address, connected } = useWalletContext();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [totalDatasets, setTotalDatasets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !address) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listDatasets({ publisher: address, limit: 50 }),
      getPublisher(address).catch(() => null),
    ])
      .then(([dsRes, pubRes]) => {
        if (cancelled) return;
        const ds = dsRes.items;
        setDatasets(ds);
        // Use || to handle stale total_datasets counter (0 should fall back to actual count)
        setTotalDatasets(pubRes?.publisher.total_datasets || ds.length);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address, connected]);

  const verifiedCount = useMemo(() => datasets.filter(d => d.verified === true).length, [datasets]);
  const tamperedCount = useMemo(() => datasets.filter(d => d.tampered === true).length, [datasets]);
  const totalAccesses = useMemo(() => datasets.reduce((sum, d) => sum + Number(d.access_count), 0), [datasets]);
  const avgQuality = useMemo(() => {
    const scored = datasets.filter(d => d.quality_score !== null && d.quality_score !== undefined);
    if (scored.length === 0) return 0;
    return scored.reduce((sum, d) => sum + Number(d.quality_score ?? 0), 0) / scored.length;
  }, [datasets]);

  const downloadsByDataset = useMemo(() =>
    [...datasets]
      .sort((a, b) => Number(b.access_count) - Number(a.access_count))
      .slice(0, 8),
    [datasets],
  );

  const maxAccesses = useMemo(() =>
    Math.max(1, ...downloadsByDataset.map(d => Number(d.access_count))),
    [downloadsByDataset],
  );

  const revenueByDataset = useMemo(() =>
    datasets
      .filter(d => d.price_per_access && d.price_per_access > 0)
      .map(d => ({
        ...d,
        revenue: (Number(d.access_count) * (d.price_per_access ?? 0)) / 100_000_000,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
    [datasets],
  );

  const maxRevenue = useMemo(() =>
    Math.max(1, ...revenueByDataset.map(d => d.revenue)),
    [revenueByDataset],
  );

  if (!connected) {
    return (
      <div className="dash-home">
        <div className="dash-empty">
          <Database size={48} className="dash-empty-icon" />
          <h2 className="dash-empty-title">Connect your wallet</h2>
          <p className="dash-empty-desc">
            Connect your Aptos wallet to view your dashboard and analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-home">
      <div className="dash-header">
        <h1 className="dash-title">Overview</h1>
        <span className="dash-subtitle">Your dashboard at a glance</span>
      </div>

      {/* ─── Metrics ────────────────────────────────────────────────── */}
      <div className="dash-metrics">
        {[
          { label: 'Total Datasets', value: String(totalDatasets), change: `+${verifiedCount} verified`, up: true },
          { label: 'Total Accesses', value: totalAccesses.toLocaleString(), change: `${datasets.length} active`, up: true },
          { label: 'Avg Quality', value: `${(avgQuality * 100).toFixed(0)}%`, change: avgQuality >= 0.8 ? 'Excellent' : 'Good', up: avgQuality >= 0.7 },
          { label: 'Verified', value: String(verifiedCount), change: tamperedCount > 0 ? `${tamperedCount} tampered` : 'All clean', up: tamperedCount === 0 },
        ].map((m) => (
          <motion.div
            key={m.label}
            className="dash-metric-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
          >
            <span className="dash-metric-label">{m.label}</span>
            <span className="dash-metric-value">{m.value}</span>
            <span className={`dash-metric-change ${m.up ? 'up' : 'down'}`}>
              {m.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {m.change}
            </span>
          </motion.div>
        ))}
      </div>

      {/* ─── Contract State ──────────────────────────────────────────── */}
      <div className="dash-section">
        <ContractStatePanel />
      </div>

      {/* ─── Charts ────────────────────────────────────────────────── */}
      <div className="dash-charts-row">
        {/* Downloads Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <ChartBar size={16} />
            <span>Downloads by Dataset</span>
          </div>
          {downloadsByDataset.length > 0 ? (
            <div className="dash-bar-chart">
              {downloadsByDataset.map((ds) => (
                <div
                  key={ds.id}
                  className="dash-bar-row"
                  onClick={() => navigate(`/datasets/${ds.id}`)}
                >
                  <span className="dash-bar-label" title={ds.name}>
                    {ds.name.length > 18 ? ds.name.slice(0, 18) + '...' : ds.name}
                  </span>
                  <div className="dash-bar-track">
                    <motion.div
                      className="dash-bar-fill downloads"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(Number(ds.access_count) / maxAccesses) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="dash-bar-value">{Number(ds.access_count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-chart-empty">
              <ChartLineUp size={24} className="dash-chart-empty-icon" />
              <span>No download data yet</span>
            </div>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="dash-chart-card">
          <div className="dash-chart-header">
            <ChartLineUp size={16} />
            <span>Revenue by Dataset</span>
          </div>
          {revenueByDataset.length > 0 ? (
            <div className="dash-bar-chart">
              {revenueByDataset.map((ds) => (
                <div
                  key={ds.id}
                  className="dash-bar-row"
                  onClick={() => navigate(`/datasets/${ds.id}`)}
                >
                  <span className="dash-bar-label" title={ds.name}>
                    {ds.name.length > 18 ? ds.name.slice(0, 18) + '...' : ds.name}
                  </span>
                  <div className="dash-bar-track">
                    <motion.div
                      className="dash-bar-fill revenue"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(ds.revenue / maxRevenue) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="dash-bar-value">{ds.revenue.toFixed(1)} APT</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dash-chart-empty">
              <TrendUp size={24} className="dash-chart-empty-icon" />
              <span>No paid datasets yet</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── My Datasets ────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">My Datasets</h2>
          <button className="dash-view-all" onClick={() => navigate('/upload')}>
            + Upload New
          </button>
        </div>
        {loading ? (
          <div className="dash-dataset-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dash-dataset-skeleton" />
            ))}
          </div>
        ) : datasets.length === 0 ? (
          <div className="dash-dataset-empty">
            <Database size={32} className="dash-dataset-empty-icon" />
            <span>No datasets yet</span>
            <button className="dash-upload-btn" onClick={() => navigate('/upload')}>
              Upload your first dataset
            </button>
          </div>
        ) : (
          <div className="dash-dataset-grid">
            {datasets.map((ds, i) => {
              const cat = getCategory(ds.tags);
              const catInfo = CATEGORY_ICONS[cat] ?? { bg: 'var(--bg-raised)', icon: 'DT', color: 'var(--text-tertiary)' };
              const isTampered = ds.tampered;
              const isVerified = ds.verified === true;
              const qualityScore = ds.quality_score;

              return (
                <motion.div
                  key={ds.id}
                  className={`dash-dataset-card ${isTampered ? 'tampered' : isVerified ? 'verified' : 'pending'}`}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                  onClick={() => navigate(`/datasets/${ds.id}`)}
                >
                  <div className="dash-ds-status">
                    {isTampered ? (
                      <span className="dash-ds-badge tampered"><WarningCircle size={12} /> Tampered</span>
                    ) : isVerified ? (
                      <span className="dash-ds-badge verified"><ShieldCheck size={12} /> Verified</span>
                    ) : (
                      <span className="dash-ds-badge pending">Pending</span>
                    )}
                  </div>

                  <div className="dash-ds-header">
                    <div className="dash-ds-cat" style={{ background: catInfo.bg, color: catInfo.color }}>
                      {catInfo.icon}
                    </div>
                    <div className="dash-ds-info">
                      <span className="dash-ds-name">{ds.name}</span>
                      <span className="dash-ds-meta">
                        {formatBytes(ds.size_bytes)} · {Number(ds.access_count).toLocaleString()} accesses
                      </span>
                    </div>
                  </div>

                  <div className="dash-ds-tags">
                    {ds.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="dash-ds-tag">{tag.replace(/_/g, ' ')}</span>
                    ))}
                    {ds.tags.length > 3 && <span className="dash-ds-tag">+{ds.tags.length - 3}</span>}
                  </div>

                  <div className="dash-ds-footer">
                    <span className="dash-ds-price">{formatApt(ds.price_per_access)}</span>
                    {qualityScore !== null && qualityScore !== undefined && (
                      <span
                        className="dash-ds-quality"
                        style={{ color: Number(qualityScore) >= 0.8 ? '#4ade80' : Number(qualityScore) >= 0.6 ? '#fbbf24' : '#f87171' }}
                      >
                        {(Number(qualityScore) * 10).toFixed(1)}
                      </span>
                    )}
                    <span className="dash-ds-date">
                      {new Date(ds.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
