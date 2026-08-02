import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Download as DownloadIcon, ShieldCheck, WarningCircle,
  TrendUp, ArrowUpRight,
} from '@phosphor-icons/react';
import { useWalletContext } from '../context/WalletContext';
import { listDatasets } from '../api/client';
import type { Dataset } from '@verida/shared';
import './Downloads.css';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Downloads() {
  const navigate = useNavigate();
  const { address, connected } = useWalletContext();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !address) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    listDatasets({ publisher: address, limit: 50, sort: 'accessed' })
      .then((res) => { if (!cancelled) setDatasets(res.items); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [address, connected]);

  const totalDownloads = useMemo(() =>
    datasets.reduce((sum, d) => sum + Number(d.access_count ?? 0), 0),
    [datasets],
  );

  const verifiedCount = useMemo(() =>
    datasets.filter(d => d.verified === true).length,
    [datasets],
  );

  const tamperedCount = useMemo(() =>
    datasets.filter(d => d.tampered).length,
    [datasets],
  );

  const topPerformer = useMemo(() =>
    datasets.reduce((best, d) =>
      Number(d.access_count ?? 0) > Number(best?.access_count ?? 0) ? d : best,
      datasets[0] ?? null,
    ),
    [datasets],
  );

  const maxAccesses = useMemo(() =>
    Math.max(1, ...datasets.map(d => Number(d.access_count ?? 0))),
    [datasets],
  );

  if (!connected) {
    return (
      <div className="dl">
        <div className="dl-empty">
          <DownloadIcon size={48} className="dl-empty-icon" />
          <h2>Connect your wallet</h2>
          <p>View download metrics for your datasets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dl">
      <h1 className="dl-title">Downloads</h1>

      {/* ─── Summary Cards ──────────────────────────────────────────── */}
      <div className="dl-summary-grid">
        <div className="dl-summary-card">
          <span className="dl-summary-label">Total Downloads</span>
          <span className="dl-summary-value">{totalDownloads.toLocaleString()}</span>
          <span className="dl-summary-change up">
            <ArrowUpRight size={12} />
            {datasets.length} datasets
          </span>
        </div>
        <div className="dl-summary-card">
          <span className="dl-summary-label">Verified</span>
          <span className="dl-summary-value green">{verifiedCount}</span>
          <span className="dl-summary-change up">
            <ShieldCheck size={12} />
            On-chain provenance
          </span>
        </div>
        <div className="dl-summary-card">
          <span className="dl-summary-label">Tampered</span>
          <span className="dl-summary-value red">{tamperedCount}</span>
          <span className={`dl-summary-change ${tamperedCount > 0 ? 'down' : 'up'}`}>
            {tamperedCount > 0 ? <WarningCircle size={12} /> : <ShieldCheck size={12} />}
            {tamperedCount > 0 ? 'Needs attention' : 'All clean'}
          </span>
        </div>
        <div className="dl-summary-card">
          <span className="dl-summary-label">Top Performer</span>
          <span className="dl-summary-value pink">
            {topPerformer?.name ? (topPerformer.name.length > 16 ? topPerformer.name.slice(0, 16) + '...' : topPerformer.name) : '—'}
          </span>
          <span className="dl-summary-change up">
            <TrendUp size={12} />
            {Number(topPerformer?.access_count ?? 0).toLocaleString()} downloads
          </span>
        </div>
      </div>

      {/* ─── Download Chart ─────────────────────────────────────────── */}
      <div className="dl-chart-section">
        <h2 className="dl-section-title">Downloads by Dataset</h2>
        {loading ? (
          <div className="dl-chart-skeleton" />
        ) : datasets.length === 0 ? (
          <div className="dl-empty-chart">
            <DownloadIcon size={24} />
            <span>No download data yet</span>
          </div>
        ) : (
          <div className="dl-chart-card">
            <div className="dl-chart">
              {datasets.slice(0, 12).map((ds, i) => (
                <motion.div
                  key={ds.id}
                  className="dl-chart-row"
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  onClick={() => navigate(`/datasets/${ds.id}`)}
                >
                  <div className="dl-chart-rank">#{i + 1}</div>
                  <div className="dl-chart-info">
                    <div className="dl-chart-name">{ds.name}</div>
                    <div className="dl-chart-meta">
                      {ds.tampered ? (
                        <span className="dl-chart-badge tampered"><WarningCircle size={10} /> Tampered</span>
                      ) : ds.verified === true ? (
                        <span className="dl-chart-badge verified"><ShieldCheck size={10} /> Verified</span>
                      ) : (
                        <span className="dl-chart-badge pending">Pending</span>
                      )}
                      <span className="dl-chart-accesses">{Number(ds.access_count ?? 0).toLocaleString()} downloads</span>
                    </div>
                  </div>
                  <div className="dl-chart-bar-container">
                    <motion.div
                      className={`dl-chart-bar ${ds.tampered ? 'tampered' : ds.verified ? 'verified' : 'pending'}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(Number(ds.access_count ?? 0) / maxAccesses) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Dataset Table ──────────────────────────────────────────── */}
      <div className="dl-table-section">
        <h2 className="dl-section-title">All Datasets</h2>
        {loading ? (
          <div className="dl-table-skeleton" />
        ) : datasets.length === 0 ? (
          <div className="dl-empty-chart">
            <span>No datasets found</span>
          </div>
        ) : (
          <div className="dl-table-card">
            <div className="dl-table-header">
              <span className="dl-th-rank">#</span>
              <span className="dl-th-name">Dataset</span>
              <span className="dl-th-status">Status</span>
              <span className="dl-th-size">Size</span>
              <span className="dl-th-downloads">Downloads</span>
              <span className="dl-th-quality">Quality</span>
            </div>
            {datasets.map((ds, i) => (
              <motion.div
                key={ds.id}
                className="dl-table-row"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                onClick={() => navigate(`/datasets/${ds.id}`)}
              >
                <span className="dl-td-rank">{i + 1}</span>
                <div className="dl-td-name">
                  <span className="dl-td-name-text">{ds.name}</span>
                  <span className="dl-td-tags">
                    {ds.tags.slice(0, 2).map((t: string) => t.replace(/_/g, ' ')).join(', ')}
                  </span>
                </div>
                <span className="dl-td-status">
                  {ds.tampered ? (
                    <span className="dl-status-badge tampered"><WarningCircle size={11} /> Tampered</span>
                  ) : ds.verified === true ? (
                    <span className="dl-status-badge verified"><ShieldCheck size={11} /> Verified</span>
                  ) : (
                    <span className="dl-status-badge pending">Pending</span>
                  )}
                </span>
                <span className="dl-td-size">{formatBytes(ds.size_bytes)}</span>
                <span className="dl-td-downloads">
                  <DownloadIcon size={12} />
                  {Number(ds.access_count ?? 0).toLocaleString()}
                </span>
                <span
                  className="dl-td-quality"
                  style={{
                    color: (ds.quality_score ?? 0) >= 0.8 ? '#4ade80'
                         : (ds.quality_score ?? 0) >= 0.6 ? '#fbbf24'
                         : '#f87171',
                  }}
                >
                  {ds.quality_score !== null ? `${(ds.quality_score * 10).toFixed(1)}` : '—'}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
