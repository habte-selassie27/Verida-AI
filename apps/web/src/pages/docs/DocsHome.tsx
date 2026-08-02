import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlass, ArrowRight, BookOpen, Code, Terminal, GithubLogo } from '@phosphor-icons/react';
import './DocsHome.css';

const QUICKSTART_CARDS = [
  {
    icon: <BookOpen size={20} />,
    title: 'Getting Started',
    desc: 'Set up your first project, authenticate, and make your first API call in under 5 minutes.',
    link: '/docs/getting-started/introduction',
  },
  {
    icon: <Code size={20} />,
    title: 'API Reference',
    desc: 'Explore comprehensive REST API endpoints, parameters, and response schemas.',
    link: '/docs/api/rest',
  },
  {
    icon: <Terminal size={20} />,
    title: 'SDK Guides',
    desc: 'Official libraries for JavaScript, Python, Rust, and Go.',
    link: '/docs/sdk/javascript',
  },
];

const CHANGELOG = [
  { date: 'Jan 15, 2025', text: 'Rust SDK v1.0 released.', link: '/docs/sdk/rust' },
  { date: 'Jan 10, 2025', text: 'Added multi-file upload support to the JS SDK.', link: '/docs/datasets/uploading' },
  { date: 'Jan 5, 2025', text: 'New verification API endpoints.', link: '/docs/api/rest' },
];

export default function DocsHome() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div className="doch">
      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="doch-hero">
        <div className="doch-hero-glow" />
        <div className="container doch-hero-inner">
          <h1 className="doch-hero-title">
            Build the future of<br />
            <span className="grad">AI data infrastructure</span>
          </h1>
          <p className="doch-hero-sub">
            Access decentralized datasets, upload AI training data, and integrate
            seamlessly with Shelby Protocol on Aptos L1.
          </p>
          <div className="doch-hero-actions">
            <Link to="/docs/getting-started/quickstart" className="btn btn-primary">
              Start Building <ArrowRight size={14} />
            </Link>
            <Link to="/docs/api/rest" className="btn btn-ghost">
              View API Reference
            </Link>
          </div>
          <div className={`doch-search ${searchFocused ? 'focused' : ''}`}>
            <MagnifyingGlass size={16} className="doch-search-icon" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="doch-search-input"
            />
            <kbd className="doch-search-kbd">&#8984; K</kbd>
          </div>
        </div>
      </section>

      {/* ─── Quickstart Cards ──────────────────────────────────────── */}
      <section className="doch-section">
        <div className="container">
          <div className="doch-cards-grid">
            {QUICKSTART_CARDS.map((card) => (
              <Link key={card.title} to={card.link} className="doch-card">
                <div className="doch-card-icon">{card.icon}</div>
                <h3 className="doch-card-title">{card.title}</h3>
                <p className="doch-card-desc">{card.desc}</p>
                <span className="doch-card-link">Read Guide <ArrowRight size={13} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What's New ────────────────────────────────────────────── */}
      <section className="doch-section">
        <div className="container">
          <h2 className="doch-section-title">What's New</h2>
          <div className="doch-changelog">
            {CHANGELOG.map((item) => (
              <Link key={item.date} to={item.link} className="doch-changelog-item">
                <span className="doch-changelog-date">{item.date}</span>
                <span className="doch-changelog-text">{item.text}</span>
                <ArrowRight size={14} className="doch-changelog-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
