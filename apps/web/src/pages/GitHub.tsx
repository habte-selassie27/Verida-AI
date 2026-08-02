import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GithubLogo, Star, GitFork, ArrowSquareOut, Code, Terminal, ShieldCheck, ArrowRight, Copy, Check, Bug, Lightbulb, Wrench, BookOpen, Clock, Users, GitCommit, GitPullRequest, Eye, Lock, CheckCircle, XCircle } from '@phosphor-icons/react';
import './GitHubHub.css';

/* ─── Data ──────────────────────────────────────────────────────────── */

const STATS = [
  { label: 'Repos', value: '42', icon: <Code size={16} /> },
  { label: 'Contributors', value: '850+', icon: <Users size={16} /> },
  { label: 'Commits', value: '12.4k', icon: <GitCommit size={16} /> },
  { label: 'Test Pass Rate', value: '99.8%', icon: <ShieldCheck size={16} /> },
];

const FEATURED_REPOS = [
  { name: 'shelby-sdk', desc: 'Decentralized AI data access SDK. Connect to 16 storage nodes, verify datasets on-chain, and stream access sessions.', lang: 'TypeScript', stars: 2400, forks: 340, updated: '2 days ago', license: 'MIT', color: '#fbbf24' },
  { name: 'verida-marketplace', desc: 'AI dataset discovery platform. Browse, purchase, and manage verified AI training data.', lang: 'React', stars: 1800, forks: 280, updated: '5 days ago', license: 'MIT', color: '#60a5fa' },
  { name: 'verida-contracts', desc: 'Aptos Move smart contracts for dataset ownership, payments, and provenance tracking.', lang: 'Move', stars: 890, forks: 120, updated: '1 week ago', license: 'Apache-2.0', color: '#f87171' },
];

const ALL_REPOS = [
  { name: 'verida-sdk-js', desc: 'TypeScript SDK for AI data access', lang: 'TypeScript', category: 'sdk', stars: 2400, forks: 340, updated: '2 days ago', color: '#fbbf24' },
  { name: 'verida-sdk-python', desc: 'Python SDK for data science workflows', lang: 'Python', category: 'sdk', stars: 890, forks: 120, updated: '5 days ago', color: '#60a5fa' },
  { name: 'verida-sdk-rust', desc: 'High-performance Rust SDK', lang: 'Rust', category: 'sdk', stars: 456, forks: 67, updated: '1 week ago', color: '#f87171' },
  { name: 'verida-sdk-go', desc: 'Go client with concurrency support', lang: 'Go', category: 'sdk', stars: 320, forks: 45, updated: '3 days ago', color: '#00E5FF' },
  { name: 'verida-marketplace', desc: 'AI dataset discovery platform', lang: 'React', category: 'ai', stars: 1800, forks: 280, updated: '5 days ago', color: '#60a5fa' },
  { name: 'verida-contracts', desc: 'Aptos Move smart contracts', lang: 'Move', category: 'infrastructure', stars: 890, forks: 120, updated: '1 week ago', color: '#f87171' },
  { name: 'verida-cli', desc: 'Command-line tools', lang: 'TypeScript', category: 'tools', stars: 560, forks: 78, updated: '4 days ago', color: '#fbbf24' },
  { name: 'verida-docs', desc: 'Documentation source', lang: 'MDX', category: 'tools', stars: 230, forks: 34, updated: '1 day ago', color: '#8B5CF6' },
  { name: 'verida-auth', desc: 'Authentication microservice', lang: 'Go', category: 'infrastructure', stars: 410, forks: 56, updated: '6 days ago', color: '#00E5FF' },
  { name: 'verida-analytics', desc: 'Analytics and metrics pipeline', lang: 'Python', category: 'ai', stars: 280, forks: 42, updated: '2 weeks ago', color: '#60a5fa' },
];

const CATEGORIES = ['All', 'SDK', 'AI', 'Infrastructure', 'Tools'];

const CONTRIBUTION_STEPS = [
  { step: '01', title: 'Fork Repository', desc: 'Fork the repo you want to contribute to.' },
  { step: '02', title: 'Clone Project', desc: 'Clone your fork locally.' },
  { step: '03', title: 'Install Dependencies', desc: 'Run the install command.' },
  { step: '04', title: 'Create Feature Branch', desc: 'Branch off main for your changes.' },
  { step: '05', title: 'Submit Pull Request', desc: 'Open a PR with a clear description.' },
];

const ACTIVITY = [
  { user: '@alex', action: 'opened Pull Request', detail: 'Improve dataset indexing performance', time: '2 hours ago', type: 'pr' },
  { user: '@maria', action: 'merged commit', detail: 'Update SDK authentication flow', time: '4 hours ago', type: 'commit' },
  { user: '@john', action: 'created issue', detail: 'CLI documentation request', time: '6 hours ago', type: 'issue' },
  { user: '@sarah', action: 'released v2.4.1', detail: 'Bug fixes and performance improvements', time: '1 day ago', type: 'release' },
  { user: '@chen', action: 'opened Pull Request', detail: 'Add Python async support', time: '2 days ago', type: 'pr' },
];

const CONTRIBUTORS = [
  { name: 'Alex', role: 'Core Developer', contributions: 342, color: '#fbbf24' },
  { name: 'Maria', role: 'SDK Maintainer', contributions: 289, color: '#60a5fa' },
  { name: 'John', role: 'Community Contributor', contributions: 156, color: '#f87171' },
  { name: 'Sarah', role: 'DevOps Lead', contributions: 198, color: '#00E5FF' },
  { name: 'Chen', role: 'Python SDK', contributions: 134, color: '#8B5CF6' },
  { name: 'Priya', role: 'Documentation', contributions: 98, color: '#f472b6' },
];

const ROADMAP_DONE = ['SDK v1 Release', 'Dataset API', 'CLI Tools', 'Authentication', 'Storage Layer'];
const ROADMAP_UPCOMING = ['Python SDK v2', 'Rust SDK Stable', 'Enterprise Toolkit', 'GraphQL API', 'Edge Runtime'];

const CI_STATUS = [
  { name: 'Frontend', status: 'passing', builds: '99.9%' },
  { name: 'Backend API', status: 'passing', builds: '99.8%' },
  { name: 'SDK Tests', status: 'passing', builds: '100%' },
  { name: 'Smart Contracts', status: 'passing', builds: '99.7%' },
];

/* ─── Helpers ───────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="ghh-copy-btn" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function GitHubPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRepos = ALL_REPOS.filter((r) => {
    const matchesCategory = activeCategory === 'All' || r.category === activeCategory.toLowerCase();
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="ghh">
      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="ghh-hero">
        <div className="ghh-hero-glow" />
        <div className="container ghh-hero-inner">
          <GithubLogo size={40} className="ghh-hero-icon" />
          <h1 className="ghh-hero-title">
            Build With<br />
            <span className="grad">Verida AI</span>
          </h1>
          <p className="ghh-hero-sub">
            Explore our open-source ecosystem, contribute to infrastructure,
            and build the future of AI data.
          </p>
          <div className="ghh-hero-actions">
            <a href="https://github.com/verida-ai" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <GithubLogo size={16} /> View GitHub Organization
            </a>
            <a href="#contribute" className="btn btn-ghost">Read Contribution Guide</a>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="ghh-stats-grid">
            {STATS.map((s) => (
              <div key={s.label} className="ghh-stat-card">
                <div className="ghh-stat-icon">{s.icon}</div>
                <span className="ghh-stat-value">{s.value}</span>
                <span className="ghh-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Repos ────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="section-label"><Star size={13} /> Featured Projects</div>
          <h2 className="ghh-section-title">Our most active repositories</h2>
          <div className="ghh-featured-grid">
            {FEATURED_REPOS.map((repo) => (
              <a key={repo.name} href={`https://github.com/verida-ai/${repo.name}`} target="_blank" rel="noopener noreferrer" className="ghh-featured-card">
                <div className="ghh-featured-header">
                  <GithubLogo size={18} className="ghh-featured-gh" />
                  <span className="ghh-featured-name">{repo.name}</span>
                  <span className="ghh-featured-license">{repo.license}</span>
                </div>
                <p className="ghh-featured-desc">{repo.desc}</p>
                <div className="ghh-featured-meta">
                  <span className="ghh-lang-badge" style={{ color: repo.color }}>{repo.lang}</span>
                  <span className="ghh-featured-stat"><Star size={12} /> {repo.stars.toLocaleString()}</span>
                  <span className="ghh-featured-stat"><GitFork size={12} /> {repo.forks}</span>
                  <span className="ghh-featured-stat"><Clock size={11} /> {repo.updated}</span>
                </div>
                <span className="ghh-featured-view">View Repo <ArrowRight size={13} /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Repository Explorer ───────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="section-label"><Code size={13} /> Repository Explorer</div>
          <h2 className="ghh-section-title">Browse all repositories</h2>
          <div className="ghh-explorer-toolbar">
            <div className="ghh-explorer-search">
              <GithubLogo size={14} />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="ghh-explorer-filters">
              {CATEGORIES.map((cat) => (
                <button key={cat} className={`ghh-filter-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="ghh-repo-list">
            {filteredRepos.map((repo) => (
              <a key={repo.name} href={`https://github.com/verida-ai/${repo.name}`} target="_blank" rel="noopener noreferrer" className="ghh-repo-row">
                <div className="ghh-repo-row-info">
                  <GithubLogo size={16} className="ghh-repo-row-icon" />
                  <div>
                    <span className="ghh-repo-row-name">{repo.name}</span>
                    <span className="ghh-repo-row-desc">{repo.desc}</span>
                  </div>
                </div>
                <div className="ghh-repo-row-meta">
                  <span className="ghh-lang-badge" style={{ color: repo.color }}>{repo.lang}</span>
                  <span className="ghh-repo-row-stat"><Star size={11} /> {repo.stars}</span>
                  <span className="ghh-repo-row-stat"><Clock size={11} /> {repo.updated}</span>
                  <ArrowSquareOut size={14} className="ghh-repo-row-arrow" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contribution Guide ────────────────────────────────────── */}
      <section id="contribute" className="ghh-section">
        <div className="container">
          <div className="section-label"><Wrench size={13} /> Contribute</div>
          <h2 className="ghh-section-title">Start contributing in 5 steps</h2>
          <div className="ghh-contribution-grid">
            <div className="ghh-contribution-steps">
              {CONTRIBUTION_STEPS.map((s) => (
                <div key={s.step} className="ghh-step-card">
                  <span className="ghh-step-num">{s.step}</span>
                  <div>
                    <h3 className="ghh-step-title">{s.title}</h3>
                    <p className="ghh-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="ghh-contribution-terminal">
              <div className="ghh-terminal-header">
                <span className="ghh-terminal-dot" style={{ background: '#f87171' }} />
                <span className="ghh-terminal-dot" style={{ background: '#fbbf24' }} />
                <span className="ghh-terminal-dot" style={{ background: '#4ade80' }} />
                <span className="ghh-terminal-title">terminal</span>
              </div>
              <pre className="ghh-terminal-body">
{`git clone https://github.com/verida-ai/sdk
cd sdk
npm install
npm run dev`}
              </pre>
              <CopyButton text={`git clone https://github.com/verida-ai/sdk\ncd sdk\nnpm install\nnpm run dev`} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Activity Feed ─────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="section-label"><GitCommit size={13} /> Activity</div>
          <h2 className="ghh-section-title">Latest developer activity</h2>
          <div className="ghh-activity-list">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="ghh-activity-row">
                <div className={`ghh-activity-dot ${a.type}`} />
                <div className="ghh-activity-info">
                  <span className="ghh-activity-user">{a.user}</span>
                  <span className="ghh-activity-action">{a.action}</span>
                  <span className="ghh-activity-detail">{a.detail}</span>
                </div>
                <span className="ghh-activity-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Contributors ──────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="section-label"><Users size={13} /> Contributors</div>
          <h2 className="ghh-section-title">Meet the contributors</h2>
          <div className="ghh-contributors-grid">
            {CONTRIBUTORS.map((c) => (
              <div key={c.name} className="ghh-contributor-card">
                <div className="ghh-contributor-avatar" style={{ background: `${c.color}22`, borderColor: `${c.color}44` }}>
                  <span style={{ color: c.color }}>{c.name[0]}</span>
                </div>
                <span className="ghh-contributor-name">{c.name}</span>
                <span className="ghh-contributor-role">{c.role}</span>
                <span className="ghh-contributor-count">{c.contributions} contributions</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Roadmap ───────────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="section-label"><ArrowRight size={13} /> Roadmap</div>
          <h2 className="ghh-section-title">2026 Open Source Roadmap</h2>
          <div className="ghh-roadmap">
            <div className="ghh-roadmap-col">
              <h3 className="ghh-roadmap-heading">Completed</h3>
              {ROADMAP_DONE.map((item) => (
                <div key={item} className="ghh-roadmap-item done">
                  <CheckCircle size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="ghh-roadmap-divider" />
            <div className="ghh-roadmap-col">
              <h3 className="ghh-roadmap-heading">Coming Soon</h3>
              {ROADMAP_UPCOMING.map((item) => (
                <div key={item} className="ghh-roadmap-item upcoming">
                  <span className="ghh-roadmap-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security ──────────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="ghh-security-card">
            <ShieldCheck size={28} className="ghh-security-icon" />
            <div className="ghh-security-body">
              <h2 className="ghh-security-title">Security First</h2>
              <p className="ghh-security-desc">We take security seriously. Report vulnerabilities responsibly.</p>
            </div>
            <div className="ghh-security-actions">
              <a href="#" className="btn btn-ghost btn-sm"><Lock size={13} /> Security Policy</a>
              <a href="#" className="btn btn-ghost btn-sm"><Bug size={13} /> Bug Bounty</a>
              <a href="#" className="btn btn-ghost btn-sm"><ShieldCheck size={13} /> Contact Security</a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CI Status ─────────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="section-label"><CheckCircle size={13} /> Build Status</div>
          <h2 className="ghh-section-title">CI/CD pipeline</h2>
          <div className="ghh-ci-grid">
            {CI_STATUS.map((c) => (
              <div key={c.name} className="ghh-ci-card">
                <div className="ghh-ci-header">
                  <span className={`ghh-ci-dot ${c.status}`} />
                  <span className="ghh-ci-name">{c.name}</span>
                  <span className="ghh-ci-status">{c.status}</span>
                </div>
                <span className="ghh-ci-builds">{c.builds} successful builds</span>
              </div>
            ))}
          </div>
          <div className="ghh-ci-summary">
            <CheckCircle size={14} className="ghh-ci-summary-icon" />
            <span>Production Ready — 99.8% successful builds across all pipelines</span>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="ghh-section">
        <div className="container">
          <div className="ghh-cta-card">
            <h2 className="ghh-cta-title">Ready to build?</h2>
            <p className="ghh-cta-desc">Join thousands of developers building the next generation of AI infrastructure.</p>
            <div className="ghh-cta-actions">
              <a href="https://github.com/verida-ai" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Star size={14} /> Star on GitHub
              </a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
