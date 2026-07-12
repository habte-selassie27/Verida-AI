import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, Database, X, Sliders } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import DatasetCard from '../components/DatasetCard';
import Pagination from '../components/Pagination';
import { TagPill } from '../components/ui/TagPill';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { listDatasets, type PaginatedResponse } from '../api/client';
import type { Dataset } from '@verida/shared';
import './Marketplace.css';

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

export default function Marketplace() {
  const [data, setData] = useState<PaginatedResponse<Dataset> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [activeTags, setActiveTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [],
  );
  const [accessType, setAccessType] = useState(searchParams.get('access') ?? 'all');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'latest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const navigate = useNavigate();

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
    <div className="mp">
      {/* HERO HEADER */}
      <section className="mp-hero">
        <div className="mp-hero-inner">
          <motion.div
            className="mp-hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="mp-hero-title">Marketplace</h1>
            <p className="mp-hero-sub">
              Explore verified AI datasets with immutable provenance on Shelby Protocol
            </p>
          </motion.div>
          <motion.div
            className="mp-hero-stats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mp-hero-stat">
              <span className="mp-hero-stat-value">{data?.totalItems ?? '—'}</span>
              <span className="mp-hero-stat-label">Datasets</span>
            </div>
            <div className="mp-hero-stat-divider" />
            <div className="mp-hero-stat">
              <span className="mp-hero-stat-value">16</span>
              <span className="mp-hero-stat-label">SP Nodes</span>
            </div>
            <div className="mp-hero-stat-divider" />
            <div className="mp-hero-stat">
              <span className="mp-hero-stat-value">shelbynet</span>
              <span className="mp-hero-stat-label">Network</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="mp-filter-bar">
        <div className="mp-filter-inner">
          <div className="mp-search-wrapper">
            <MagnifyingGlass size={14} className="mp-search-icon" />
            <input
              className="mp-search-input"
              type="text"
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="mp-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mp-tag-strip">
            {TAGS.map((tag) => (
              <TagPill key={tag} active={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tag}
              </TagPill>
            ))}
          </div>

          <div className="mp-filter-actions">
            <select
              className="mp-filter-select"
              value={accessType}
              onChange={(e) => { setAccessType(e.target.value); setPage(1); }}
              aria-label="Access type filter"
            >
              {ACCESS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              className="mp-filter-select"
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
            className="mp-mobile-filter-btn"
            onClick={() => setShowMobileFilters(true)}
            aria-label="Open filters"
          >
            <Sliders size={16} />
            {activeFilterCount > 0 && (
              <span className="mp-mobile-filter-count">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <div className="container">
        {/* Result count bar */}
        {!loading && !error && data && (
          <div className="mp-result-bar">
            <span className="mp-result-count">
              {search ? (
                <>
                  <strong>{data.totalItems}</strong> result{data.totalItems !== 1 ? 's' : ''} for "<span className="mp-result-query">{search}</span>"
                </>
              ) : (
                <>
                  <strong>{data.totalItems}</strong> dataset{data.totalItems !== 1 ? 's' : ''}
                  {activeTags.length > 0 && <> tagged {activeTags.map((t, i) => (
                    <span key={t}>
                      {i > 0 && ', '}
                      <span className="mp-result-tag">{t}</span>
                    </span>
                  ))}</>}
                </>
              )}
            </span>
            {hasFilters && (
              <button className="mp-result-clear" onClick={clearFilters}>Clear all filters</button>
            )}
          </div>
        )}

        {loading && (
          <div className="mp-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        )}

        {error && (
          <motion.div className="mp-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card variant="danger" className="mp-error-card">
              <p>{error}</p>
              <Button variant="primary" onClick={fetchData}>Retry</Button>
            </Card>
          </motion.div>
        )}

        {!loading && !error && data && (
          <>
            {data.items.length === 0 ? (
              <motion.div className="mp-empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Database size={48} className="mp-empty-icon" />
                <p className="mp-empty-title">No datasets found</p>
                <p className="mp-empty-text">Try adjusting your filters or search query</p>
                {hasFilters && (
                  <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
                )}
              </motion.div>
            ) : (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`grid-${page}`}
                    className="mp-grid"
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

      {/* MOBILE FILTER SHEET */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              className="mp-sheet-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowMobileFilters(false)}
            />
            <motion.div
              className="mp-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mp-sheet-handle" />
              <div className="mp-sheet-content">
                <div className="mp-sheet-header">
                  <h3 className="mp-sheet-title">Filters</h3>
                  {hasFilters && (
                    <button className="mp-sheet-clear" onClick={clearFilters}>Clear all</button>
                  )}
                </div>

                <label className="mp-sheet-label">Access Type</label>
                <select
                  className="mp-filter-select mp-sheet-select"
                  value={accessType}
                  onChange={(e) => { setAccessType(e.target.value); setPage(1); }}
                >
                  {ACCESS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <label className="mp-sheet-label">Sort By</label>
                <select
                  className="mp-filter-select mp-sheet-select"
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <label className="mp-sheet-label">Tags</label>
                <div className="mp-sheet-tags">
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
