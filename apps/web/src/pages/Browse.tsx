import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, SlidersHorizontal, X } from '@phosphor-icons/react';
import DatasetCard from '../components/DatasetCard';
import { listDatasets, type Dataset } from '../api/client';
import './Browse.css';

const TAGS = [
  { value: 'nlp', label: 'NLP' },
  { value: 'cv', label: 'Vision' },
  { value: 'tabular', label: 'Tabular' },
  { value: 'audio', label: 'Audio' },
  { value: 'medical', label: 'Medical' },
  { value: 'code', label: 'Code' },
  { value: 'financial', label: 'Finance' },
  { value: 'multimodal', label: 'Multimodal' },
];

const ACCESS_TYPES = [
  { value: '', label: 'All Access' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'subscription', label: 'Subscription' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'accessed', label: 'Most Accessed' },
  { value: 'size', label: 'Largest' },
  { value: 'verified', label: 'Verified Only' },
];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const access = searchParams.get('access') || '';
  const sort = searchParams.get('sort') || 'latest';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 12;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listDatasets({ search, tags, accessType: access, sort, page, limit })
      .then((res) => {
        if (!cancelled) {
          setDatasets(res.items);
          setTotal(res.totalItems);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, tags.join(','), access, sort, page]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  function toggleTag(tag: string) {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    updateParam('tags', next.join(','));
  }

  const activeFilterCount = [tags.length > 0, !!access].filter(Boolean).length;

  return (
    <div className="browse">
      <div className="container">
        {/* ─── Header ──────────────────────────────────────────────── */}
        <div className="browse-header">
          <h1 className="browse-title">Browse Datasets</h1>
          <span className="browse-count">{total.toLocaleString()} datasets</span>
        </div>

        {/* ─── Search + Filters ────────────────────────────────────── */}
        <div className="browse-toolbar">
          <div className="browse-search">
            <MagnifyingGlass size={16} className="browse-search-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
              className="browse-search-input"
            />
            {search && (
              <button className="browse-search-clear" onClick={() => updateParam('search', '')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className={`browse-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && <span className="browse-filter-count">{activeFilterCount}</span>}
          </button>
          <select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="browse-sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ─── Filter Panel ────────────────────────────────────────── */}
        {showFilters && (
          <div className="browse-filter-panel">
            <div className="browse-filter-group">
              <span className="browse-filter-label">AI Domain</span>
              <div className="browse-filter-pills">
                {TAGS.map((t) => (
                  <button
                    key={t.value}
                    className={`browse-filter-pill ${tags.includes(t.value) ? 'active' : ''}`}
                    onClick={() => toggleTag(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="browse-filter-group">
              <span className="browse-filter-label">Access Type</span>
              <div className="browse-filter-pills">
                {ACCESS_TYPES.map((a) => (
                  <button
                    key={a.value}
                    className={`browse-filter-pill ${access === a.value ? 'active' : ''}`}
                    onClick={() => updateParam('access', a.value)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Results Grid ────────────────────────────────────────── */}
        {loading ? (
          <div className="browse-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="browse-skeleton" />
            ))}
          </div>
        ) : datasets.length === 0 ? (
          <div className="browse-empty">
            <p>No datasets found matching your filters.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setSearchParams({})}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="browse-grid">
            {datasets.map((ds) => (
              <DatasetCard key={ds.id} dataset={ds} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
