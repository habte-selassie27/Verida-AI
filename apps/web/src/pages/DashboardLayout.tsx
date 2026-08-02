import { NavLink, Outlet } from 'react-router-dom';
import { ChartLineUp, Wallet, Download, Gear, ArrowLeft, Link as LinkIcon } from '@phosphor-icons/react';
import './DashboardLayout.css';

const SIDEBAR_LINKS = [
  { to: '/dashboard', label: 'Overview', icon: <ChartLineUp size={16} />, end: true },
  { to: '/dashboard/revenue', label: 'Revenue', icon: <Wallet size={16} /> },
  { to: '/dashboard/downloads', label: 'Downloads', icon: <Download size={16} /> },
  { to: '/dashboard/on-chain', label: 'On-Chain Activity', icon: <LinkIcon size={16} /> },
  { to: '/dashboard/settings', label: 'Settings', icon: <Gear size={16} /> },
];

export default function DashboardLayout() {
  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <NavLink to="/" className="dash-sidebar-back">
          <ArrowLeft size={14} />
          Back to site
        </NavLink>
        <nav className="dash-sidebar-nav">
          {SIDEBAR_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end === true}
              className={({ isActive }) => `dash-sidebar-link ${isActive ? 'active' : ''}`}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  );
}
