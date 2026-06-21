import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Dataset, Publisher } from '@verida/shared';
import DatasetCard from '../components/DatasetCard';
import { getPublisher } from '../api/client';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PublisherProfile() {
  const { address } = useParams<{ address: string }>();
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPublisher = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPublisher(address);
      setPublisher(result.publisher);
      setDatasets(result.datasets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load publisher');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPublisher();
  }, [fetchPublisher]);

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 60, width: 400, marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-empty">
        <p>{error}</p>
        <button className="btn btn-primary mt-4" onClick={fetchPublisher}>Retry</button>
      </div>
    );
  }

  if (!publisher) return null;

  return (
    <div>
      <Link to="/" className="detail-back">&larr; Back to datasets</Link>

      <div className="profile-header">
        <div className="profile-avatar">
          {publisher.address.slice(2, 4).toUpperCase()}
        </div>
        <div className="profile-info">
          <div className="flex items-center gap-2">
            <h1 className="page-title mb-0">
              {publisher.username ?? `${publisher.address.slice(0, 8)}...${publisher.address.slice(-4)}`}
            </h1>
            {publisher.verified && (
              <span className="badge" style={{ borderColor: 'var(--color-green)', color: 'var(--color-green)' }}>
                Verified
              </span>
            )}
          </div>
          <p className="text-muted text-sm" style={{ fontFamily: 'monospace' }}>{publisher.address}</p>
          {publisher.bio && <p className="profile-bio">{publisher.bio}</p>}
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat-value">{publisher.total_datasets}</span>
              <span className="text-muted text-xs">Datasets</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{publisher.total_earnings}</span>
              <span className="text-muted text-xs">Earnings</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-value">{formatDate(publisher.created_at)}</span>
              <span className="text-muted text-xs">Joined</span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="profile-section-title">Datasets ({datasets.length})</h2>

      {datasets.length === 0 ? (
        <div className="profile-empty">
          <p className="text-muted">No datasets published yet.</p>
        </div>
      ) : (
        <div className="home-grid">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      )}
    </div>
  );
}
