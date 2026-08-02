import { ShieldCheck, ArrowRight } from '@phosphor-icons/react';
import './Status.css';

const SYSTEMS = [
  { name: 'API', status: 'operational', uptime: '99.99%' },
  { name: 'Upload Service', status: 'operational', uptime: '99.98%' },
  { name: 'Download Service', status: 'operational', uptime: '99.97%' },
  { name: 'Blockchain', status: 'operational', uptime: '100%' },
  { name: 'Authentication', status: 'operational', uptime: '99.99%' },
  { name: 'Search Index', status: 'operational', uptime: '99.95%' },
];

const INCIDENTS = [
  { title: 'Scheduled Maintenance - Jan 28', date: 'Jan 28, 2025', status: 'completed', duration: '2h 15m' },
  { title: 'Upload service latency spike', date: 'Jan 20, 2025', status: 'resolved', duration: '45m' },
];

export default function Status() {
  return (
    <div className="status-page">
      <div className="container">
        <div className="status-header">
          <div className="status-badge">
            <ShieldCheck size={14} />
            <span>All Systems Operational</span>
          </div>
          <h1 className="status-title">System Status</h1>
          <p className="status-uptime-text">99.98% uptime over the last 90 days</p>
        </div>

        {/* Systems */}
        <div className="status-systems">
          {SYSTEMS.map((s) => (
            <div key={s.name} className="status-system-row">
              <div className="status-system-left">
                <span className="status-system-dot" />
                <span className="status-system-name">{s.name}</span>
              </div>
              <div className="status-system-right">
                <span className="status-system-uptime">{s.uptime}</span>
                <span className="status-system-status">{s.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime bar placeholder */}
        <div className="status-uptime-section">
          <h2 className="status-section-title">Uptime History</h2>
          <div className="status-uptime-bar">
            {Array.from({ length: 90 }).map((_, i) => (
              <div key={i} className="status-uptime-day" />
            ))}
          </div>
          <div className="status-uptime-labels">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Incidents */}
        <div className="status-incidents">
          <h2 className="status-section-title">Past Incidents</h2>
          {INCIDENTS.map((inc) => (
            <div key={inc.title} className="status-incident-row">
              <div className="status-incident-info">
                <span className="status-incident-title">{inc.title}</span>
                <span className="status-incident-meta">{inc.date} · {inc.duration}</span>
              </div>
              <span className={`status-incident-badge ${inc.status}`}>{inc.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
