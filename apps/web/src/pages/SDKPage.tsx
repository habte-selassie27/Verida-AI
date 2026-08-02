import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Code, Terminal, Copy, Check, ArrowRight, GithubLogo, BookOpen, Lightning, Globe, ShieldCheck, Database, CreditCard, ChartLineUp, Package, Clock, ArrowUpRight, DiscordLogo, PaperPlaneTilt } from '@phosphor-icons/react';
import './SDKPage.css';

/* ─── Data ──────────────────────────────────────────────────────────── */

const SDKS = [
  { name: 'JavaScript', lang: 'js', version: '2.4.1', install: 'npm install @verida/sdk', color: '#fbbf24', stars: 342, updated: '2 days ago', runtime: 'Node.js 18+', downloads: '12.4k/week', verified: true },
  { name: 'TypeScript', lang: 'ts', version: '2.4.1', install: 'npm install @verida/sdk', color: '#8B5CF6', stars: 342, updated: '2 days ago', runtime: 'Node.js 18+', downloads: '12.4k/week', verified: true },
  { name: 'Python', lang: 'py', version: '1.8.3', install: 'pip install verida-sdk', color: '#60a5fa', stars: 128, updated: '5 days ago', runtime: 'Python 3.10+', downloads: '4.2k/week', verified: true },
  { name: 'Rust', lang: 'rs', version: '0.9.2', install: 'cargo add verida-sdk', color: '#f87171', stars: 89, updated: '1 week ago', runtime: 'Rust 1.75+', downloads: '1.1k/week', verified: true },
  { name: 'Go', lang: 'go', version: '1.2.0', install: 'go get github.com/verida/go-sdk', color: '#00E5FF', stars: 67, updated: '3 days ago', runtime: 'Go 1.22+', downloads: '890/week', verified: true },
  { name: 'Java', lang: 'java', version: '0.8.1', install: 'implementation "ai.verida:sdk:0.8.1"', color: '#a78bfa', stars: 34, updated: '2 weeks ago', runtime: 'Java 17+', downloads: '520/week', verified: false },
  { name: 'Swift', lang: 'swift', version: '0.7.1', install: 'pod "VeridaSDK"', color: '#f472b6', stars: 23, updated: '1 month ago', runtime: 'Swift 5.9+', downloads: '310/week', verified: false },
  { name: 'Kotlin', lang: 'kt', version: '0.6.0', install: 'implementation "ai.verida:sdk-kotlin:0.6.0"', color: '#c084fc', stars: 18, updated: '3 weeks ago', runtime: 'Kotlin 1.9+', downloads: '240/week', verified: false },
  { name: '.NET', lang: 'cs', version: '0.5.2', install: 'dotnet add package Verida.SDK', color: '#60a5fa', stars: 15, updated: '1 month ago', runtime: '.NET 8+', downloads: '180/week', verified: false },
  { name: 'PHP', lang: 'php', version: '0.4.0', install: 'composer require verida/sdk', color: '#a78bfa', stars: 11, updated: '2 months ago', runtime: 'PHP 8.2+', downloads: '90/week', verified: false },
];

const PKG_MANAGERS = [
  { id: 'npm', label: 'npm', command: 'npm install @verida/sdk' },
  { id: 'pnpm', label: 'pnpm', command: 'pnpm add @verida/sdk' },
  { id: 'bun', label: 'bun', command: 'bun add @verida/sdk' },
  { id: 'yarn', label: 'yarn', command: 'yarn add @verida/sdk' },
];

const FEATURES = [
  { name: 'Authentication', js: true, py: true, rs: true, go: true, java: true, swift: true },
  { name: 'Upload', js: true, py: true, rs: true, go: true, java: true, swift: true },
  { name: 'Marketplace', js: true, py: true, rs: true, go: true, java: true, swift: true },
  { name: 'Verification', js: true, py: true, rs: true, go: true, java: true, swift: true },
  { name: 'Streaming', js: true, py: false, rs: true, go: false, java: false, swift: false },
  { name: 'Webhooks', js: true, py: true, rs: true, go: true, java: true, swift: false },
  { name: 'Type Safety', js: true, py: false, rs: true, go: true, java: true, swift: true },
  { name: 'Async Support', js: true, py: true, rs: true, go: true, java: true, swift: true },
];

const QUICK_START: Record<string, string> = {
  js: `import { Verida } from "@verida/sdk"

const client = new Verida({
  apiKey: process.env.VERIDA_API_KEY
})

const datasets = await client.datasets.list({
  tags: ["nlp", "cv"],
  sort: "latest"
})

console.log(datasets.total)
console.log(datasets.data)`,
  py: `from verida import VeridaClient

client = VeridaClient(
    api_key="your-api-key"
)

datasets = client.datasets.list(
    tags=["nlp", "cv"],
    sort="latest"
)

print(datasets.total)
print(datasets.data)`,
  rs: `use verida_sdk::{VeridaClient, ListParams};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = VeridaClient::new("your-api-key")?;

    let datasets = client.datasets().list(
        ListParams::builder()
            .tags(vec!["nlp".into(), "cv".into()])
            .sort("latest")
            .build()
    ).await?;

    println!("Total: {}", datasets.total);
    Ok(())
}`,
  go: `package main

import (
    "fmt"
    verida "github.com/verida/go-sdk"
)

func main() {
    client, _ := verida.NewClient("your-api-key")

    datasets, _ := client.Datasets.List(&verida.ListParams{
        Tags: []string{"nlp", "cv"},
        Sort: "latest",
    })

    fmt.Println("Total:", datasets.Total)
}`,
};

const ARCH_STEPS = [
  { label: 'Application', icon: <Code size={14} /> },
  { label: 'SDK', icon: <Terminal size={14} /> },
  { label: 'REST API', icon: <Lightning size={14} /> },
  { label: 'Shelby Protocol', icon: <Globe size={14} /> },
  { label: 'Blockchain', icon: <ShieldCheck size={14} /> },
  { label: 'Storage', icon: <Database size={14} /> },
  { label: 'Marketplace', icon: <CreditCard size={14} /> },
];

const PACKAGES = [
  { name: '@verida/sdk', desc: 'Core SDK for all platforms', version: '2.4.1', install: 'npm install @verida/sdk' },
  { name: '@verida/react', desc: 'React hooks and components', version: '1.2.0', install: 'npm install @verida/react' },
  { name: '@verida/auth', desc: 'Standalone auth module', version: '1.1.3', install: 'npm install @verida/auth' },
  { name: '@verida/storage', desc: 'Direct storage access', version: '0.9.1', install: 'npm install @verida/storage' },
  { name: '@verida/payments', desc: 'Payment processing', version: '0.8.0', install: 'npm install @verida/payments' },
  { name: '@verida/analytics', desc: 'Analytics and metrics', version: '0.7.2', install: 'npm install @verida/analytics' },
];

const RELEASES = [
  { version: '2.4.1', date: '2 days ago', items: ['Fixed streaming reconnection', 'Improved error messages', 'Performance optimizations'] },
  { version: '2.4.0', date: '1 week ago', items: ['Added Marketplace API', 'New streaming support', 'Webhook improvements'] },
  { version: '2.3.0', date: '3 weeks ago', items: ['Python SDK v1.8', 'Go SDK v1.2', 'Bug fixes'] },
  { version: '2.2.0', date: '1 month ago', items: ['Rust SDK beta', 'Type generation', 'Rate limit handling'] },
];

const ROADMAP_COMPLETED = ['Authentication', 'Storage', 'Marketplace', 'Verification', 'Payments'];
const ROADMAP_UPCOMING = ['AI Agents', 'Streaming', 'GraphQL', 'Edge Runtime', 'Real-time Events'];

const EXAMPLES = [
  { title: 'Dataset Marketplace', desc: 'Full-stack marketplace with search, filters, and payments.', framework: 'React', color: '#60a5fa' },
  { title: 'Upload Portal', desc: 'Drag-and-drop upload with progress tracking.', framework: 'Next.js', color: '#fbbf24' },
  { title: 'Analytics Dashboard', desc: 'Real-time metrics and revenue tracking.', framework: 'Vue', color: '#4ade80' },
];

/* ─── Helpers ───────────────────────────────────────────────────────── */

function CopyButton({ text, size = 13 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="sdk-copy-btn" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}

function AnimatedCodeBlock() {
  const [line, setLine] = useState(0);
  const codeLines = [
    'import { Verida } from "@verida/sdk"',
    '',
    'const client = new Verida({',
    '  apiKey: process.env.API_KEY',
    '})',
    '',
    'const datasets = await client.datasets.list()',
    '',
    'console.log(datasets)',
  ];

  useEffect(() => {
    const interval = setInterval(() => setLine((p) => (p + 1) % (codeLines.length + 3)), 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sdk-hero-code">
      <div className="sdk-hero-code-header">
        <span className="sdk-hero-code-dot" style={{ background: '#f87171' }} />
        <span className="sdk-hero-code-dot" style={{ background: '#fbbf24' }} />
        <span className="sdk-hero-code-dot" style={{ background: '#4ade80' }} />
        <span className="sdk-hero-code-file">index.ts</span>
      </div>
      <pre className="sdk-hero-code-body">
        {codeLines.map((l, i) => (
          <span key={i} className={`sdk-hero-code-line ${i <= line ? 'visible' : ''}`}>
            <span className="sdk-hero-code-num">{String(i + 1).padStart(2, ' ')}</span>
            {l || '\u00A0'}
            {i === line && <span className="sdk-hero-code-cursor" />}
          </span>
        ))}
      </pre>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function SDKPage() {
  const [activePkg, setActivePkg] = useState('npm');
  const [activeLang, setActiveLang] = useState('js');
  const [changelogOpen, setChangelogOpen] = useState<number | null>(0);

  return (
    <div className="sdk-p">
      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="sdk-hero">
        <div className="container sdk-hero-grid">
          <div className="sdk-hero-text">
            <div className="section-label"><Terminal size={13} /> Verida SDKs</div>
            <h1 className="sdk-hero-title">
              Official client libraries for building<br />
              <span className="grad">AI applications on Shelby Protocol.</span>
            </h1>
            <p className="sdk-hero-sub">JavaScript · Python · Rust · Go · Java</p>
            <div className="sdk-hero-release">
              <span className="sdk-hero-release-badge">Latest Release</span>
              <span className="sdk-hero-release-version">v2.4.1</span>
            </div>
            <div className="sdk-hero-actions">
              <a href="#sdks" className="btn btn-primary">Browse SDKs</a>
              <Link to="/docs" className="btn btn-ghost">Read Docs</Link>
            </div>
          </div>
          <div className="sdk-hero-visual">
            <AnimatedCodeBlock />
          </div>
        </div>
      </section>

      {/* ─── SDK Grid ──────────────────────────────────────────────── */}
      <section id="sdks" className="sdk-section">
        <div className="container">
          <div className="section-label"><Package size={13} /> Official SDKs</div>
          <h2 className="sdk-section-title">Choose your language</h2>
          <div className="sdk-grid">
            {SDKS.map((sdk) => (
              <Link key={sdk.name} to={`/sdk/${sdk.lang}`} className="sdk-card">
                <div className="sdk-card-top">
                  <span className="sdk-card-dot" style={{ background: sdk.color }} />
                  <span className="sdk-card-name">{sdk.name}</span>
                  {sdk.verified && <span className="sdk-card-verified">Official</span>}
                </div>
                <div className="sdk-card-meta">
                  <span className="sdk-card-version">v{sdk.version}</span>
                  <span className="sdk-card-runtime">{sdk.runtime}</span>
                </div>
                <div className="sdk-card-rating">{'★'.repeat(5)}</div>
                <div className="sdk-card-install">
                  <code>{sdk.install}</code>
                  <CopyButton text={sdk.install} />
                </div>
                <div className="sdk-card-footer">
                  <span className="sdk-card-stat"><GithubLogo size={11} /> {sdk.stars}</span>
                  <span className="sdk-card-stat">{sdk.downloads}</span>
                  <span className="sdk-card-stat"><Clock size={11} /> {sdk.updated}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Installation ──────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><Terminal size={13} /> Installation</div>
          <h2 className="sdk-section-title">Install the JavaScript SDK</h2>
          <div className="sdk-pkg-tabs">
            {PKG_MANAGERS.map((pm) => (
              <button key={pm.id} className={`sdk-pkg-tab ${activePkg === pm.id ? 'active' : ''}`} onClick={() => setActivePkg(pm.id)}>
                {pm.label}
              </button>
            ))}
          </div>
          <div className="sdk-install-block">
            <code>{PKG_MANAGERS.find((p) => p.id === activePkg)?.command}</code>
            <CopyButton text={PKG_MANAGERS.find((p) => p.id === activePkg)?.command || ''} size={16} />
          </div>
        </div>
      </section>

      {/* ─── Feature Comparison ────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><Lightning size={13} /> Feature Comparison</div>
          <h2 className="sdk-section-title">Compare SDK capabilities</h2>
          <div className="sdk-comparison-table">
            <div className="sdk-comparison-header">
              <span className="sdk-comparison-feature">Feature</span>
              <span>JS</span><span>Py</span><span>Rs</span><span>Go</span><span>Java</span><span>Swift</span>
            </div>
            {FEATURES.map((f) => (
              <div key={f.name} className="sdk-comparison-row">
                <span className="sdk-comparison-feature">{f.name}</span>
                {[f.js, f.py, f.rs, f.go, f.java, f.swift].map((v, i) => (
                  <span key={i} className={`sdk-comparison-check ${v ? 'yes' : 'no'}`}>{v ? '✓' : '—'}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quick Start ───────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><Code size={13} /> Quick Start</div>
          <h2 className="sdk-section-title">Start building in minutes</h2>
          <div className="sdk-lang-tabs">
            {Object.keys(QUICK_START).map((lang) => (
              <button key={lang} className={`sdk-lang-tab ${activeLang === lang ? 'active' : ''}`} onClick={() => setActiveLang(lang)}>
                {lang === 'js' ? 'JavaScript' : lang === 'py' ? 'Python' : lang === 'rs' ? 'Rust' : 'Go'}
              </button>
            ))}
          </div>
          <div className="sdk-code-block">
            <div className="sdk-code-header">
              <span>{activeLang === 'js' ? 'JavaScript' : activeLang === 'py' ? 'Python' : activeLang === 'rs' ? 'Rust' : 'Go'}</span>
              <CopyButton text={QUICK_START[activeLang] ?? ''} />
            </div>
            <pre className="sdk-code-body">{QUICK_START[activeLang]}</pre>
          </div>
        </div>
      </section>

      {/* ─── Packages ──────────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><Package size={13} /> Packages</div>
          <h2 className="sdk-section-title">Official packages</h2>
          <div className="sdk-packages-grid">
            {PACKAGES.map((pkg) => (
              <div key={pkg.name} className="sdk-package-card">
                <div className="sdk-package-header">
                  <code className="sdk-package-name">{pkg.name}</code>
                  <span className="sdk-package-version">v{pkg.version}</span>
                </div>
                <p className="sdk-package-desc">{pkg.desc}</p>
                <div className="sdk-package-install">
                  <code>{pkg.install}</code>
                  <CopyButton text={pkg.install} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Architecture ──────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><Globe size={13} /> Architecture</div>
          <h2 className="sdk-section-title">How the SDK works</h2>
          <div className="sdk-arch">
            {ARCH_STEPS.map((step, i) => (
              <div key={step.label} className="sdk-arch-step">
                <div className="sdk-arch-node">
                  {step.icon}
                  <span>{step.label}</span>
                </div>
                {i < ARCH_STEPS.length - 1 && <div className="sdk-arch-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Example Apps ──────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><BookOpen size={13} /> Example Applications</div>
          <h2 className="sdk-section-title">Learn from examples</h2>
          <div className="sdk-examples-grid">
            {EXAMPLES.map((ex) => (
              <a key={ex.title} href="https://github.com" target="_blank" rel="noopener noreferrer" className="sdk-example-card">
                <div className="sdk-example-preview" style={{ borderColor: `${ex.color}22` }}>
                  <span className="sdk-example-fw" style={{ color: ex.color }}>{ex.framework}</span>
                </div>
                <div className="sdk-example-body">
                  <h3 className="sdk-example-title">{ex.title}</h3>
                  <p className="sdk-example-desc">{ex.desc}</p>
                  <span className="sdk-example-link">GitHub <ArrowUpRight size={12} /></span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Releases ──────────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><Clock size={13} /> Releases</div>
          <h2 className="sdk-section-title">Recent releases</h2>
          <div className="sdk-releases">
            {RELEASES.map((r, i) => (
              <div key={r.version} className="sdk-release-item">
                <div className="sdk-release-header" onClick={() => setChangelogOpen(changelogOpen === i ? null : i)}>
                  <div className="sdk-release-left">
                    <span className="sdk-release-version">v{r.version}</span>
                    <span className="sdk-release-date">{r.date}</span>
                  </div>
                  <span className={`sdk-release-chevron ${changelogOpen === i ? 'open' : ''}`}>▶</span>
                </div>
                {changelogOpen === i && (
                  <ul className="sdk-release-items">
                    {r.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Roadmap ───────────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="section-label"><ChartLineUp size={13} /> Roadmap</div>
          <h2 className="sdk-section-title">What's next</h2>
          <div className="sdk-roadmap">
            <div className="sdk-roadmap-col">
              <h3 className="sdk-roadmap-heading">Completed</h3>
              {ROADMAP_COMPLETED.map((item) => (
                <div key={item} className="sdk-roadmap-item done">
                  <Check size={14} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="sdk-roadmap-divider" />
            <div className="sdk-roadmap-col">
              <h3 className="sdk-roadmap-heading">Coming Soon</h3>
              {ROADMAP_UPCOMING.map((item) => (
                <div key={item} className="sdk-roadmap-item upcoming">
                  <span className="sdk-roadmap-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Community ─────────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="sdk-community-grid">
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="sdk-community-card">
              <DiscordLogo size={18} />
              <span>Discord</span>
            </a>
            <Link to="/github" className="sdk-community-card">
              <GithubLogo size={18} />
              <span>GitHub</span>
            </Link>
            <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="sdk-community-card">
              <PaperPlaneTilt size={18} />
              <span>Telegram</span>
            </a>
            <Link to="/blog" className="sdk-community-card">
              <BookOpen size={18} />
              <span>Blog</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="sdk-section">
        <div className="container">
          <div className="sdk-cta-card">
            <h2 className="sdk-cta-title">Ready to build?</h2>
            <p className="sdk-cta-desc">Install the SDK and make your first API call in minutes.</p>
            <div className="sdk-cta-actions">
              <a href="#sdks" className="btn btn-primary">Install SDK</a>
              <Link to="/docs" className="btn btn-ghost">Read Docs</Link>
              <Link to="/api" className="btn btn-ghost">View API</Link>
              <Link to="/github" className="btn btn-ghost"><GithubLogo size={14} /> GitHub</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
