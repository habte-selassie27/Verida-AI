import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Code, Terminal, GithubLogo, FileText, DiscordLogo } from '@phosphor-icons/react';
import './Docs.css';

const SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', desc: 'What is Verida AI and how it works', icon: <BookOpen size={16} /> },
      { label: 'Quick Start', desc: 'Connect wallet and browse datasets in 2 minutes', icon: <Terminal size={16} /> },
      { label: 'Authentication', desc: 'Wallet-based auth with Aptos signatures', icon: <Code size={16} /> },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { label: 'Datasets', desc: 'On-chain dataset structure, versions, and metadata', icon: <FileText size={16} /> },
      { label: 'Access Control', desc: 'Pay-per-access, sessions, and streaming', icon: <Code size={16} /> },
      { label: 'Shelby Network', desc: 'Decentralized storage and verification', icon: <Terminal size={16} /> },
    ],
  },
  {
    title: 'Integration',
    items: [
      { label: 'REST API', desc: 'Full API reference for all endpoints', icon: <Code size={16} /> },
      { label: 'JavaScript SDK', desc: 'npm package for Node.js and browser', icon: <Code size={16} /> },
      { label: 'CLI', desc: 'Command-line tools for dataset management', icon: <Terminal size={16} /> },
    ],
  },
];

export default function Docs() {
  return (
    <div className="docs-page">
      <div className="container">
        <div className="docs-header">
          <div className="section-label"><BookOpen size={13} /> Documentation</div>
          <h1 className="docs-title">Developer Documentation</h1>
          <p className="docs-sub">Everything you need to build with Verida AI.</p>
        </div>
        <div className="docs-grid">
          {SECTIONS.map((section) => (
            <div key={section.title} className="docs-section">
              <h2 className="docs-section-title">{section.title}</h2>
              <div className="docs-items">
                {section.items.map((item) => (
                  <a key={item.label} href="#" className="docs-card">
                    <div className="docs-card-icon">{item.icon}</div>
                    <div className="docs-card-body">
                      <span className="docs-card-label">{item.label}</span>
                      <span className="docs-card-desc">{item.desc}</span>
                    </div>
                    <ArrowRight size={14} className="docs-card-arrow" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
