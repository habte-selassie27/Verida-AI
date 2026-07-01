import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Database, X, Sliders } from '@phosphor-icons/react';
import DatasetCard from '../components/DatasetCard';
import Pagination from '../components/Pagination';
import { TagPill } from '../components/ui/TagPill';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { listDatasets, type PaginatedResponse } from '../api/client';
import type { Dataset } from '@verida/shared';
import './Home.css';

const TAGS = ['nlp', 'cv', 'medical', 'tabular', 'audio', 'financial', 'multimodal', 'code'] as const;

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'most_accessed', label: 'Most Accessed' },
  { value: 'largest', label: 'Largest' },
  { value: 'verified_only', label: 'Verified Only' },
] as const;

const ACCESS_OPTIONS = [
  { value: 'all', label: 'All Access' },
  { value: 'free', label: 'Free' },
  { value: 'pay_per_access', label: 'Paid' },
  { value: 'subscription', label: 'Subscription' },
] as const;

function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    function animate(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(animate);
    }
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

interface StatsData {
  totalDatasets: number;
  verified: number;
  totalAccesses: number;
  shelbySize: number;
  latency: number;
  uptime: number;
}

function StatsPanel({ stats }: { stats: StatsData | null }) {
  return (
    <Card className="home-stats-card">
      <div className="home-stats-header">
        <span className="home-stats-title">Live Network Stats</span>
        <span className="home-stats-live">● LIVE</span>
      </div>
      <div className="home-stats-grid">
        {[
          { label: 'Total Datasets', value: stats ? <CountUp value={stats.totalDatasets} /> : '—' },
          { label: 'Verified', value: stats ? <CountUp value={stats.verified} /> : '—' },
          { label: 'Total Accesses', value: stats ? <CountUp value={stats.totalAccesses} /> : '—' },
          { label: 'On Shelby', value: stats ? `${stats.shelbySize.toFixed(1)} TB` : '—' },
        ].map((item, i) => (
          <motion.div key={item.label} className="home-stat" custom={i} variants={fadeUp} initial="hidden" animate="visible">
            <span className="home-stat-label">{item.label}</span>
            <span className="home-stat-value">{item.value}</span>
          </motion.div>
        ))}
      </div>
      <div className="home-stats-footer">
        shelbynet · {stats ? stats.latency : '—'}ms avg · {stats ? stats.uptime : '—'}% uptime
      </div>
    </Card>
  );
}

export default function Home() {
  const [data, setData] = useState<PaginatedResponse<Dataset> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [accessType, setAccessType] = useState('all');
  const [sort, setSort] = useState('latest');

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listDatasets({
        page,
        limit: 20,
        ...(activeTags.length > 0 ? { tags: activeTags } : {}),
        ...(accessType !== 'all' ? { accessType } : {}),
        ...(search ? { search } : {}),
        sort,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  }, [page, activeTags, accessType, sort, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/stats/live`);
        if (!res.ok) throw new Error('Stats unavailable');
        const json = await res.json();
        if (json.success) setStats(json.data);
      } catch { /* silent */ }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setActiveTags([]);
    setAccessType('all');
    setSort('latest');
    setPage(1);
  }, []);

  const hasFilters = search || activeTags.length > 0 || accessType !== 'all' || sort !== 'latest';
  const activeFilterCount = activeTags.length + (accessType !== 'all' ? 1 : 0) + (sort !== 'latest' ? 1 : 0);

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <motion.div
              className="home-eyebrow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="home-eyebrow-dot" />
              <span>Shelby Protocol × Verida AI</span>
            </motion.div>

            <motion.h1
              className="home-h1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="home-h1-line1">Verifiable AI Datasets.</span>
              <span className="home-h1-line2">Provenance you can trust.</span>
            </motion.h1>

            <motion.p
              className="home-body"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              Every dataset anchored to Aptos. Every upload cryptographically proven.
              Every access metered and permanently auditable.
            </motion.p>

            <motion.div
              className="home-cta-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Button variant="primary" size="lg" onClick={() => navigate('/marketplace')}>Browse Datasets</Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/upload')}>Upload Dataset</Button>
            </motion.div>

            <motion.div
              className="home-trust-strip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="home-trust-item">
                <span className="home-check-icon"><CheckIcon /></span>
                <span>Clay erasure-coded storage</span>
              </div>
              <div className="home-trust-item">
                <span className="home-check-icon"><CheckIcon /></span>
                <span>Immutable provenance chain</span>
              </div>
              <div className="home-trust-item">
                <span className="home-check-icon"><CheckIcon /></span>
                <span>Pay-per-access streaming</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="home-hero-side"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <StatsPanel stats={stats} />
          </motion.div>
        </div>
      </section>

      <div className="home-filter-bar">
        <div className="home-filter-inner">
          <div className="home-search-wrapper">
            <MagnifyingGlass size={14} className="home-search-icon" />
            <input
              className="home-search-input"
              type="text"
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="home-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="home-tag-strip">
            {TAGS.map((tag) => (
              <TagPill key={tag} active={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </TagPill>
            ))}
          </div>

          <div className="home-filter-actions">
            <select
              className="home-filter-select"
              value={accessType}
              onChange={(e) => { setAccessType(e.target.value); setPage(1); }}
              aria-label="Access type filter"
            >
              {ACCESS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              className="home-filter-select"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            className="home-mobile-filter-btn"
            onClick={() => setShowMobileFilters(true)}
            aria-label="Open filters"
          >
            <Sliders size={16} />
          </button>
        </div>
      </div>

      <div className="container">
        {loading && (
          <div className="home-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {error && (
          <motion.div className="home-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card variant="danger" className="home-error-card">
              <p>{error}</p>
              <Button variant="primary" onClick={fetchData}>Retry</Button>
            </Card>
          </motion.div>
        )}

        {!loading && !error && data && (
          <>
            {data.items.length === 0 ? (
              <motion.div className="home-empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Database size={48} className="home-empty-icon" />
                <p className="home-empty-title">No datasets found</p>
                <p className="home-empty-text">Try adjusting your filters or search query</p>
                {hasFilters && (
                  <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
                )}
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`grid-${page}`}
                    className="home-grid"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {data.items.map((dataset) => (
                      <DatasetCard key={dataset.id} dataset={dataset} />
                    ))}
                  </motion.div>
                </AnimatePresence>
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              className="home-sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMobileFilters(false)}
            />
            <motion.div
              className="home-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="home-sheet-handle" />
              <div className="home-sheet-content">
                <div className="home-sheet-header">
                  <h3 className="home-sheet-title">Filters</h3>
                  {hasFilters && (
                    <button className="home-sheet-clear" onClick={clearFilters}>Clear all</button>
                  )}
                </div>

                <label className="home-sheet-label">Access Type</label>
                <select
                  className="home-filter-select home-sheet-select"
                  value={accessType}
                  onChange={(e) => { setAccessType(e.target.value); setPage(1); }}
                >
                  {ACCESS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <label className="home-sheet-label">Sort By</label>
                <select
                  className="home-filter-select home-sheet-select"
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <label className="home-sheet-label">Tags</label>
                <div className="home-sheet-tags">
                  {TAGS.map((tag) => (
                    <TagPill key={tag} active={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>
                      {tag}
                    </TagPill>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
