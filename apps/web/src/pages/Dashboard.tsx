import { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { listDatasets } from '../api/client';
import type { Dataset } from '@verida/shared';
import { useWalletContext } from '../context/WalletContext';
import './Dashboard.css';

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="12" y2="12" />
      <line x1="15" y1="15" x2="12" y2="12" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Dashboard() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const { connected, address } = useWalletContext();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await listDatasets({ page: 1, limit: 100 });
        setDatasets(result.items);
      } catch {
        setDatasets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalDatasets = datasets.length;
  const totalAccesses = '—';
  const verifiedCount = datasets.filter((d) => d.verified === true).length;
  const totalRevenue = '—';

  const recentDatasets = datasets.slice(0, 4).map((ds) => ({
    id: ds.id,
    name: ds.name,
    accesses: '—',
    status: ds.tampered ? 'tampered' as const : ds.verified === true ? 'verified' as const : 'pending' as const,
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Overview of your datasets and activity on Shelby.</p>
        </div>
        <Button icon={<UploadIcon />}>Upload Dataset</Button>
      </div>

      <div className="dashboard-metrics">
        <Card variant="metric" className="dashboard-metric">
          <span className="card-label">Total Datasets</span>
          <span className="card-value">{loading ? '...' : totalDatasets}</span>
        </Card>
        <Card variant="metric" className="dashboard-metric">
          <span className="card-label">Total Accesses</span>
          <span className="card-value">{totalAccesses}</span>
        </Card>
        <Card variant="metric" className="dashboard-metric">
          <span className="card-label">Verified</span>
          <span className="card-value">{loading ? '...' : verifiedCount}</span>
        </Card>
        <Card variant="metric" className="dashboard-metric">
          <span className="card-label">Revenue</span>
          <span className="card-value">{totalRevenue}</span>
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-section">
          <div className="dashboard-section-header">
            <span className="dashboard-section-title"><DatabaseIcon /> Recent Datasets</span>
          </div>
          <div className="dashboard-section-body">
            {loading ? (
              <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading...</div>
            ) : recentDatasets.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 13 }}>No datasets uploaded yet.</div>
            ) : (
              recentDatasets.map((ds) => (
                <div key={ds.id} className="dashboard-dataset-row">
                  <div className="dashboard-dataset-info">
                    <span className="dashboard-dataset-name">{ds.name}</span>
                    <span className="dashboard-dataset-accesses">{ds.accesses} accesses</span>
                  </div>
                  <Badge variant={ds.status} icon={<CheckIcon />}>
                    {ds.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="dashboard-section">
          <div className="dashboard-section-header">
            <span className="dashboard-section-title"><ActivityIcon /> Recent Activity</span>
          </div>
          <div className="dashboard-section-body">
            {datasets.length === 0 && !loading ? (
              <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 13 }}>No activity yet.</div>
            ) : (
              datasets.slice(0, 4).map((ds, i) => (
                <div key={ds.id} className="dashboard-activity-row">
                  <div className="dashboard-activity-dot" />
                  <div className="dashboard-activity-info">
                    <span className="dashboard-activity-action">
                      {i === 0 ? 'Dataset uploaded' : i === 1 ? 'Integrity verified' : 'Dataset created'}
                    </span>
                    <span className="dashboard-activity-detail">{ds.name}</span>
                  </div>
                  <span className="dashboard-activity-time">v{ds.version}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {connected && address && (
        <Card className="dashboard-wallet-card">
          <div className="dashboard-wallet-info">
            <span className="dashboard-wallet-label">Connected Wallet</span>
            <AddressDisplay value={address} />
          </div>
          <Badge variant="network">
            <UsersIcon />
            shelbynet
          </Badge>
        </Card>
      )}
    </div>
  );
}
