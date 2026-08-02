import { Link } from 'react-router-dom';
import { GithubLogo, DiscordLogo, ArrowSquareOut, Lightning, Shield, FileText, BookOpen, Code, Terminal, ChatCircle, PaperPlaneTilt, TwitterLogo } from '@phosphor-icons/react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top-glow" />

      <div className="footer-inner">
        {/* ─── Brand Column ─────────────────────────────────────────── */}
        <div className="footer-brand">
          <div className="footer-logo-card">
            <span className="footer-logo-mark">V</span>
          </div>
          <span className="footer-wordmark">VERIDA</span>
          <p className="footer-tagline">Trust-first AI infrastructure</p>
          <div className="footer-pills">
            <span className="footer-built-pill">Built on Shelby Protocol</span>
            <span className="footer-powered">Powered by Aptos L1</span>
          </div>

          {/* Mini network visualization */}
          <div className="footer-mini-network">
            <svg viewBox="0 0 120 50" className="footer-mini-svg">
              <line x1="10" y1="25" x2="35" y2="12" className="footer-mini-line" />
              <line x1="35" y1="12" x2="60" y2="30" className="footer-mini-line" />
              <line x1="60" y1="30" x2="85" y2="15" className="footer-mini-line" />
              <line x1="85" y1="15" x2="110" y2="25" className="footer-mini-line" />
              <line x1="35" y1="12" x2="60" y2="42" className="footer-mini-line" />
              <circle cx="10" cy="25" r="2" className="footer-mini-node footer-mini-node--sm" />
              <circle cx="35" cy="12" r="2.5" className="footer-mini-node footer-mini-node--md" />
              <circle cx="60" cy="30" r="3.5" className="footer-mini-node footer-mini-node--lg" />
              <circle cx="85" cy="15" r="2.5" className="footer-mini-node footer-mini-node--md" />
              <circle cx="110" cy="25" r="2" className="footer-mini-node footer-mini-node--sm" />
              <circle cx="60" cy="42" r="1.8" className="footer-mini-node footer-mini-node--sm" />
            </svg>
          </div>
        </div>

        {/* ─── Separator ────────────────────────────────────────────── */}
        <div className="footer-separator" />

        {/* ─── Marketplace ──────────────────────────────────────────── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Marketplace</h4>
          <nav className="footer-col-nav">
            <Link to="/browse" className="footer-link">Browse</Link>
            <Link to="/categories" className="footer-link">Categories</Link>
            <Link to="/upload" className="footer-link">Upload Dataset</Link>
            <Link to="/dashboard" className="footer-link">Dashboard</Link>
          </nav>
        </div>

        {/* ─── Separator ────────────────────────────────────────────── */}
        <div className="footer-separator" />

        {/* ─── Developers ───────────────────────────────────────────── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Developers</h4>
          <nav className="footer-col-nav">
            <Link to="/docs" className="footer-link"><BookOpen size={13} /> Docs</Link>
            <Link to="/api" className="footer-link"><Code size={13} /> API</Link>
            <Link to="/sdk" className="footer-link"><Terminal size={13} /> SDK</Link>
            <Link to="/cli" className="footer-link"><Terminal size={13} /> CLI</Link>
            <Link to="/github" className="footer-link"><GithubLogo size={13} /> GitHub</Link>
          </nav>
        </div>

        {/* ─── Separator ────────────────────────────────────────────── */}
        <div className="footer-separator" />

        {/* ─── Community ────────────────────────────────────────────── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Community</h4>
          <nav className="footer-col-nav">
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="footer-link">
              <DiscordLogo size={13} /> Discord <ArrowSquareOut size={10} />
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="footer-link">
              <TwitterLogo size={13} /> X <ArrowSquareOut size={10} />
            </a>
            <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="footer-link">
              <PaperPlaneTilt size={13} /> Telegram <ArrowSquareOut size={10} />
            </a>
            <Link to="/blog" className="footer-link"><FileText size={13} /> Blog</Link>
          </nav>
        </div>

        {/* ─── Separator ────────────────────────────────────────────── */}
        <div className="footer-separator" />

        {/* ─── Network Status Card ──────────────────────────────────── */}
        <div className="footer-status-card">
          <div className="footer-status-header">
            <span className="footer-status-dot" />
            <span className="footer-status-name">Shelby Network</span>
          </div>
          <span className="footer-status-state">Operational</span>
          <span className="footer-status-uptime">99.98% uptime</span>
          <Link to="/status" className="footer-status-link">View Status <ArrowSquareOut size={10} /></Link>
        </div>
      </div>

      {/* ─── Bottom Bar ────────────────────────────────────────────── */}
      <div className="footer-bottom">
        <div className="footer-bottom-left">
          <span className="footer-copy">&copy; 2025 Verida AI</span>
          <span className="footer-built-badge">Built on Shelby Protocol</span>
        </div>
        <div className="footer-bottom-right">
          <div className="footer-bottom-links">
            <Link to="/status">Status</Link>
          </div>
          <div className="footer-social">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="X">
              <TwitterLogo size={14} weight="fill" />
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="GitHub">
              <GithubLogo size={14} weight="fill" />
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="Discord">
              <DiscordLogo size={14} weight="fill" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
