import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

/* ─── CountUp Animation Component ───────────────────────────────────────────── */
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

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="12" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

/* ─── Stats Panel ───────────────────────────────────────────────────────────── */
function StatsPanel({ stats }: { stats: StatsData | null }) {
  return (
    <Card className="home-stats-card">
      <div className="home-stats-header">
        <span className="home-stats-title">Live Network Stats</span>
        <span className="home-stats-live">● LIVE</span>
      </div>
      <div className="home-stats-grid">
        <div className="home-stat">
          <span className="home-stat-label">Total Datasets</span>
          <span className="home-stat-value">
            {stats ? <CountUp value={stats.totalDatasets} /> : '—'}
          </span>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">Verified</span>
          <span className="home-stat-value">
            {stats ? <CountUp value={stats.verified} /> : '—'}
          </span>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">Total Accesses</span>
          <span className="home-stat-value">
            {stats ? <CountUp value={stats.totalAccesses} /> : '—'}
          </span>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">On Shelby</span>
          <span className="home-stat-value">
            {stats ? `${stats.shelbySize.toFixed(1)} TB` : '—'}
          </span>
        </div>
      </div>
      <div className="home-stats-footer">
        shelbynet · {stats ? stats.latency : '—'}ms avg · {stats ? stats.uptime : '—'}% uptime
      </div>
    </Card>
  );
}

interface StatsData {
  totalDatasets: number;
  verified: number;
  totalAccesses: number;
  shelbySize: number;
  latency: number;
  uptime: number;
}

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function Home() {
  /* Dataset list state */
  const [data, setData] = useState<PaginatedResponse<Dataset> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  /* Filter state */
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [accessType, setAccessType] = useState('all');
  const [sort, setSort] = useState('latest');

  /* UI state */
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  /* Navigation */
  const navigate = useNavigate();

  /* Stats */
  const [stats, setStats] = useState<StatsData | null>(null);

  /* ── Fetch datasets ────────────────────────────────────────────────────────── */
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Fetch live stats (poll every 30s) ────────────────────────────────────── */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/stats/live`);
        if (!res.ok) throw new Error('Stats unavailable');
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch {
        // stats unavailable silently
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ── Filter handlers ───────────────────────────────────────────────────────── */
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

  return (
    <div className="home">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-left">
            <div className="home-eyebrow">
              <span className="home-eyebrow-dot" />
              <span className="home-eyebrow-text">Shelby Protocol × Verida AI</span>
            </div>

            <h1 className="home-h1">
              <span className="home-h1-line1">Verifiable AI Datasets.</span>
              <span className="home-h1-line2">Provenance you can trust.</span>
            </h1>

            <p className="home-body">
              Every dataset anchored to Aptos. Every upload cryptographically proven.
              Every access metered and permanently auditable.
            </p>

            <div className="home-cta-row">
              <Button variant="primary" size="lg" onClick={() => navigate('/marketplace')}>Browse Datasets</Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/upload')}>Upload a Dataset</Button>
            </div>

            <div className="home-trust-strip">
              <div className="home-trust-item">
                <CheckIcon />
                <span>Clay erasure-coded storage</span>
              </div>
              <div className="home-trust-item">
                <CheckIcon />
                <span>Immutable provenance chain</span>
              </div>
              <div className="home-trust-item">
                <CheckIcon />
                <span>Pay-per-access streaming</span>
              </div>
            </div>
          </div>

          <div className="home-hero-right">
            <StatsPanel stats={stats} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FILTER / SEARCH BAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="home-filter-bar">
        <div className="home-filter-inner">
          <div className="home-search-wrapper">
            <span className="home-search-icon"><SearchIcon /></span>
            <input
              className="home-search-input"
              type="text"
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="home-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                ×
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

          <button
            className="home-mobile-filter-btn"
            onClick={() => setShowMobileFilters(true)}
            aria-label="Open filters"
          >
            <FilterIcon />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DATASET GRID
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="container">
        {/* Loading state */}
        {loading && (
          <div className="home-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="home-error">
            <Card variant="danger" className="home-error-card">
              <p>{error}</p>
              <Button variant="primary" onClick={fetchData}>Retry</Button>
            </Card>
          </div>
        )}

        {/* Loaded state */}
        {!loading && !error && data && (
          <>
            {data.items.length === 0 ? (
              /* Empty state */
              <div className="home-empty">
                <DatabaseIcon />
                <p className="home-empty-title">No datasets found</p>
                <p className="home-empty-text">Try adjusting your filters or search query</p>
                {hasFilters && (
                  <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
                )}
              </div>
            ) : (
              <>
                <div className="home-grid">
                  {data.items.map((dataset) => (
                    <DatasetCard key={dataset.id} dataset={dataset} />
                  ))}
                </div>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE FILTER BOTTOM SHEET
          ═══════════════════════════════════════════════════════════════════════ */}
      {showMobileFilters && (
        <div className="home-sheet-overlay" onClick={() => setShowMobileFilters(false)}>
          <div className="home-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="home-sheet-handle" />

            <div className="home-sheet-content">
              <h3 className="home-sheet-title">Filters</h3>

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

              {hasFilters && (
                <Button variant="ghost" fullWidth onClick={clearFilters}>Clear All Filters</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
