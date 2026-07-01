import { Link } from 'react-router-dom';
import { GithubLogo, DiscordLogo, ArrowSquareOut } from '@phosphor-icons/react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-top">
            <span className="footer-logo-mark">V</span>
            <span className="footer-wordmark">VERIDA</span>
          </div>
          <p className="footer-tagline">Trust-first AI data infrastructure</p>
          <div className="footer-pills">
            <span className="footer-built-pill">Built on Shelby Protocol</span>
            <span className="footer-powered">Powered by Aptos L1</span>
          </div>
        </div>

        <div className="footer-links">
          <div className="footer-links-column">
            <h4>Product</h4>
            <Link to="/">Marketplace</Link>
            <Link to="/upload">Upload Dataset</Link>
            <Link to="/dashboard">Dashboard</Link>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-links-column">
            <h4>Developer</h4>
            <a href="#api">API Reference</a>
            <a href="#docs">Documentation</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <GithubLogo size={12} /> GitHub <ArrowSquareOut size={10} />
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
              <DiscordLogo size={12} /> Discord <ArrowSquareOut size={10} />
            </a>
          </div>
        </div>

        <div className="footer-status">
          <span className="footer-status-dot" />
          <span>Shelby Network: Operational</span>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="footer-copy">&copy; 2025 Verida AI. Open source.</span>
        <div className="footer-legal">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
