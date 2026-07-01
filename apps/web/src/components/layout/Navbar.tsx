import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { List, X, Wallet } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useWalletContext } from '../../context/WalletContext';
import './Navbar.css';

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const mobileMenuVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '100%', transition: { duration: 0.15, ease: [0.32, 0.72, 0, 1] } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const navItemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.08 * i, duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  }),
};

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

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    logout();
    setWalletDropdown(false);
  };

  const navLinks = [
    { to: '/', label: 'Marketplace', end: true },
    { to: '/upload', label: 'Upload' },
    { to: '/dashboard', label: 'Dashboard' },
  ];

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
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-right">
          <div className="navbar-network-badge">
            <span className="network-dot" />
            shelbynet
          </div>

          {connected && address ? (
            <div ref={dropdownRef} className="wallet-wrapper">
              <button
                className="wallet-btn-connected"
                onClick={() => setWalletDropdown((prev) => !prev)}
              >
                <span className={`wallet-dot ${isAuthenticated ? 'authenticated' : ''}`} />
                {truncateAddress(address)}
                {isAuthenticating && <span className="auth-spinner" />}
              </button>
              <AnimatePresence>
                {walletDropdown && (
                  <motion.div
                    className="wallet-dropdown"
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="wallet-dropdown-item wallet-dropdown-status">
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
                    <button className="wallet-dropdown-item" onClick={handleDisconnect}>
                      Disconnect
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button variant="ghost" icon={<Wallet size={16} />} onClick={handleConnect}>
              Connect Wallet
            </Button>
          )}

          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="navbar-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="navbar-mobile-menu"
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="navbar-mobile-header">
                <span className="navbar-mobile-logo">VERIDA</span>
                <button className="navbar-mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
              <div className="navbar-mobile-nav">
                {navLinks.map((link, i) => (
                  <motion.div key={link.to} custom={i} variants={navItemVariants} initial="hidden" animate="visible">
                    <NavLink to={link.to} end={link.end} className={linkClass} onClick={() => setMenuOpen(false)}>
                      {link.label}
                    </NavLink>
                  </motion.div>
                ))}
              </div>
              {connected && (
                <motion.button
                  className="navbar-mobile-disconnect"
                  custom={navLinks.length}
                  variants={navItemVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={() => {
                    handleDisconnect();
                    setMenuOpen(false);
                  }}
                >
                  Disconnect
                </motion.button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
