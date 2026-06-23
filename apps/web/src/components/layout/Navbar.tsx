import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useWalletContext } from '../../context/WalletContext';
import './Navbar.css';

const menuIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const closeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const walletIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M16 12h4v2h-4z" />
  </svg>
);

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletDropdown, setWalletDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { connected, address, connect, disconnect } = useWalletContext();
  const { isAuthenticated, isAuthenticating, login, logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWalletDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = async () => {
    try {
      await connect();
      // SIWE login is triggered automatically by AuthProvider when wallet connects
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    logout();
    setWalletDropdown(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <NavLink to="/" className="navbar-logo-link">
            <span className="navbar-logo-mark">V</span>
            <span className="navbar-wordmark">VERIDA</span>
          </NavLink>
          <span className="navbar-tagline">AI Dataset Marketplace</span>
        </div>

        <nav className="navbar-center">
          <NavLink to="/" end className={linkClass}>Marketplace</NavLink>
          <NavLink to="/upload" className={linkClass}>Upload</NavLink>
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
        </nav>

        <div className="navbar-right">
          <div className="navbar-network-badge">
            <span className="network-dot" />
            shelbynet
          </div>

          {connected && address ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                className="wallet-btn-connected"
                onClick={() => setWalletDropdown((prev) => !prev)}
              >
                <span className={`wallet-dot ${isAuthenticated ? 'authenticated' : ''}`} />
                {truncateAddress(address)}
                {isAuthenticating && <span className="auth-spinner" />}
              </button>
              {walletDropdown && (
                <div className="wallet-dropdown">
                  <div className="wallet-dropdown-item" style={{ fontSize: 11, color: 'var(--text-tertiary)', cursor: 'default' }}>
                    {isAuthenticated ? 'Authenticated' : 'Read-only mode'}
                  </div>
                  <NavLink to={`/publishers/${address}`} className="wallet-dropdown-item" onClick={() => setWalletDropdown(false)}>
                    View Profile
                  </NavLink>
                  <NavLink to="/settings" className="wallet-dropdown-item" onClick={() => setWalletDropdown(false)}>
                    Settings
                  </NavLink>
                  {!isAuthenticated && (
                    <button
                      className="wallet-dropdown-item"
                      onClick={() => { login(); setWalletDropdown(false); }}
                    >
                      Sign In
                    </button>
                  )}
                  <button
                    className="wallet-dropdown-item"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button variant="ghost" icon={walletIcon} onClick={handleConnect}>
              Connect Wallet
            </Button>
          )}

          <Button
            variant="icon"
            icon={menuIcon}
            onClick={() => setMenuOpen(true)}
            className="navbar-hamburger"
          />
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="navbar-overlay" onClick={() => setMenuOpen(false)} />
          <div className="navbar-mobile-menu">
            <div className="navbar-mobile-header">
              <button className="navbar-mobile-close" onClick={() => setMenuOpen(false)}>
                {closeIcon}
              </button>
            </div>
            <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>
              Marketplace
            </NavLink>
            <NavLink to="/upload" className={linkClass} onClick={() => setMenuOpen(false)}>
              Upload
            </NavLink>
            <NavLink to="/dashboard" className={linkClass} onClick={() => setMenuOpen(false)}>
              Dashboard
            </NavLink>
            {connected && (
              <button
                className="navbar-mobile-disconnect"
                onClick={() => {
                  disconnect();
                  logout();
                  setMenuOpen(false);
                }}
              >
                Disconnect
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}
