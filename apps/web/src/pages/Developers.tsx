import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code, Terminal, GithubLogo, BookOpen, ShieldCheck, Database, Key, CreditCard, ChartLineUp, FileCode, MagnifyingGlass, Lightning, Globe, DiscordLogo, PaperPlaneTilt, Copy, Check } from '@phosphor-icons/react';
import './Developers.css';

const SDKS = [
  { name: 'JavaScript', lang: 'js', version: '2.4.1', install: 'npm install @verida/sdk', color: '#fbbf24' },
  { name: 'Python', lang: 'py', version: '1.8.3', install: 'pip install verida-sdk', color: '#60a5fa' },
  { name: 'Rust', lang: 'rs', version: '0.9.2', install: 'cargo add verida-sdk', color: '#f87171' },
  { name: 'Go', lang: 'go', version: '1.2.0', install: 'go get github.com/verida/go-sdk', color: '#00E5FF' },
  { name: 'Java', lang: 'java', version: '0.8.1', install: 'implementation "ai.verida:sdk:0.8.1"', color: '#8B5CF6' },
  { name: 'Swift', lang: 'swift', version: '0.7.1', install: 'pod "VeridaSDK"', color: '#f472b6' },
];

const QUICK_START = [
  { step: '01', title: 'Create Account', desc: 'Connect your Aptos wallet and verify your identity.', icon: <Key size={20} /> },
  { step: '02', title: 'Get API Key', desc: 'Generate your API key from the dashboard.', icon: <Lightning size={20} /> },
  { step: '03', title: 'Install SDK', desc: 'Install the SDK for your language of choice.', icon: <Terminal size={20} /> },
  { step: '04', title: 'Upload Dataset', desc: 'Publish your first dataset in minutes.', icon: <Database size={20} /> },
];

const API_FEATURES = [
  { title: 'Dataset API', desc: 'Upload, query, and manage AI datasets with full provenance tracking.', method: 'GET', endpoint: '/api/datasets', latency: '45ms' },
  { title: 'Auth API', desc: 'Wallet-based authentication with Ed25519 signature verification.', method: 'POST', endpoint: '/api/auth/verify', latency: '120ms' },
  { title: 'Marketplace API', desc: 'Browse, purchase, and stream access to verified AI datasets.', method: 'GET', endpoint: '/api/marketplace', latency: '38ms' },
];

const FEATURES = [
  { title: 'Blockchain Verification', desc: 'On-chain provenance for every dataset.', icon: <ShieldCheck size={18} /> },
  { title: 'Dataset Marketplace', desc: 'Pay-per-access micropayments.', icon: <CreditCard size={18} /> },
  { title: 'Decentralized Storage', desc: '16-node Shelby network.', icon: <Database size={18} /> },
  { title: 'Authentication', desc: 'Wallet-based Ed25519 auth.', icon: <Key size={18} /> },
  { title: 'Payments', desc: 'APT micropayments on Aptos L1.', icon: <CreditCard size={18} /> },
  { title: 'AI Metadata', desc: 'Auto-extracted quality scores.', icon: <ChartLineUp size={18} /> },
  { title: 'Analytics', desc: 'Real-time download and revenue tracking.', icon: <MagnifyingGlass size={18} /> },
  { title: 'Monitoring', desc: 'Network health and node status.', icon: <Globe size={18} /> },
];

const CODE_EXAMPLES = {
  js: `import { Verida } from "@verida/sdk"

const client = new Verida({
  apiKey: process.env.API_KEY
})

const datasets = await client.datasets.list({
  tags: ["nlp", "cv"],
  sort: "latest"
})

console.log(datasets)`,
  py: `from verida import VeridaClient

client = VeridaClient(
    api_key="your-api-key"
)

datasets = client.datasets.list(
    tags=["nlp", "cv"],
    sort="latest"
)

print(datasets)`,
  rust: `use verida_sdk::{VeridaClient, ListParams};

let client = VeridaClient::new("your-api-key")?;

let datasets = client.datasets().list(
    ListParams::builder()
        .tags(vec!["nlp".into(), "cv".into()])
        .sort("latest")
        .build()
).await?;

println!("{:?}", datasets);`,
};

const LANG_LABELS: Record<string, string> = { js: 'JavaScript', py: 'Python', rust: 'Rust' };

const ARCH_STEPS = [
  { label: 'Developer', icon: <Code size={16} /> },
  { label: 'SDK', icon: <Terminal size={16} /> },
  { label: 'API', icon: <Lightning size={16} /> },
  { label: 'Shelby Protocol', icon: <Globe size={16} /> },
  { label: 'Storage', icon: <Database size={16} /> },
  { label: 'Blockchain', icon: <ShieldCheck size={16} /> },
  { label: 'Marketplace', icon: <CreditCard size={16} /> },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="dev-copy-btn" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
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
    const interval = setInterval(() => {
      setLine((prev) => (prev + 1) % (codeLines.length + 3));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dev-hero-code">
      <div className="dev-hero-code-header">
        <span className="dev-hero-code-dot" style={{ background: '#f87171' }} />
        <span className="dev-hero-code-dot" style={{ background: '#fbbf24' }} />
        <span className="dev-hero-code-dot" style={{ background: '#4ade80' }} />
        <span className="dev-hero-code-filename">index.ts</span>
      </div>
      <pre className="dev-hero-code-body">
        {codeLines.map((l, i) => (
          <span key={i} className={`dev-hero-code-line ${i <= line ? 'visible' : ''}`}>
            <span className="dev-hero-code-num">{String(i + 1).padStart(2, ' ')}</span>
            {l || '\u00A0'}
            {i === line && <span className="dev-hero-code-cursor" />}
          </span>
        ))}
      </pre>
    </div>
  );
}

export default function Developers() {
  const [activeLang, setActiveLang] = useState<'js' | 'py' | 'rust'>('js');
  const [activeSdk, setActiveSdk] = useState(0);

  return (
    <div className="dev-page">
      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="dev-hero">
        <div className="container dev-hero-grid">
          <div className="dev-hero-text">
            <div className="section-label"><Code size={13} /> Developer Platform</div>
            <h1 className="dev-hero-title">
              Build trusted AI infrastructure<br />
              <span className="grad">on Shelby Protocol.</span>
            </h1>
            <p className="dev-hero-sub">
              Upload datasets. Verify provenance. Access AI data through APIs.
            </p>
            <div className="dev-hero-actions">
              <Link to="/docs" className="btn btn-primary">Read Documentation</Link>
              <Link to="/sdk" className="btn btn-ghost">View SDKs</Link>
            </div>
            <div className="dev-hero-langs">
              {SDKS.map((s) => (
                <span key={s.lang} className="dev-hero-lang" style={{ color: s.color }}>{s.lang}</span>
              ))}
            </div>
          </div>
          <div className="dev-hero-visual">
            <AnimatedCodeBlock />
          </div>
        </div>
      </section>

      {/* ─── Quick Start ───────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="section-label">Quick Start</div>
          <h2 className="dev-section-title">Start building in 4 steps</h2>
          <div className="dev-quickstart-grid">
            {QUICK_START.map((qs) => (
              <div key={qs.step} className="dev-quickstart-card">
                <div className="dev-quickstart-icon">{qs.icon}</div>
                <span className="dev-quickstart-step">Step {qs.step}</span>
                <h3 className="dev-quickstart-title">{qs.title}</h3>
                <p className="dev-quickstart-desc">{qs.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SDKs ──────────────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="section-label"><Terminal size={13} /> SDKs</div>
          <h2 className="dev-section-title">Official SDKs</h2>
          <div className="dev-sdk-grid">
            {SDKS.map((sdk, i) => (
              <div
                key={sdk.name}
                className={`dev-sdk-card ${activeSdk === i ? 'active' : ''}`}
                onMouseEnter={() => setActiveSdk(i)}
              >
                <div className="dev-sdk-header">
                  <span className="dev-sdk-dot" style={{ background: sdk.color }} />
                  <span className="dev-sdk-name">{sdk.name}</span>
                  <span className="dev-sdk-version">v{sdk.version}</span>
                </div>
                <div className="dev-sdk-rating">{'★'.repeat(5)}</div>
                <div className="dev-sdk-install">
                  <code>{sdk.install}</code>
                  <CopyButton text={sdk.install} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── APIs ──────────────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="section-label"><Lightning size={13} /> APIs</div>
          <h2 className="dev-section-title">Powerful APIs</h2>
          <div className="dev-api-grid">
            {API_FEATURES.map((api) => (
              <div key={api.title} className="dev-api-card">
                <h3 className="dev-api-title">{api.title}</h3>
                <p className="dev-api-desc">{api.desc}</p>
                <div className="dev-api-code">
                  <span className="dev-api-method">{api.method}</span>
                  <code className="dev-api-endpoint">{api.endpoint}</code>
                  <span className="dev-api-latency">{api.latency}</span>
                </div>
                <Link to="/api" className="dev-api-link">
                  View docs <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="section-label">Platform</div>
          <h2 className="dev-section-title">Everything you need</h2>
          <div className="dev-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="dev-feature-card">
                <div className="dev-feature-icon">{f.icon}</div>
                <h3 className="dev-feature-title">{f.title}</h3>
                <p className="dev-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Code Examples ─────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="section-label"><FileCode size={13} /> Code Examples</div>
          <h2 className="dev-section-title">See it in action</h2>
          <div className="dev-code-tabs">
            {(Object.keys(CODE_EXAMPLES) as Array<'js' | 'py' | 'rust'>).map((lang) => (
              <button
                key={lang}
                className={`dev-code-tab ${activeLang === lang ? 'active' : ''}`}
                onClick={() => setActiveLang(lang)}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
          <div className="dev-code-block">
            <div className="dev-code-header">
              <span>{LANG_LABELS[activeLang]}</span>
              <CopyButton text={CODE_EXAMPLES[activeLang]} />
            </div>
            <pre className="dev-code-body">{CODE_EXAMPLES[activeLang]}</pre>
          </div>
        </div>
      </section>

      {/* ─── Architecture ──────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="section-label"><Globe size={13} /> Architecture</div>
          <h2 className="dev-section-title">How it works</h2>
          <div className="dev-arch">
            {ARCH_STEPS.map((step, i) => (
              <div key={step.label} className="dev-arch-step">
                <div className="dev-arch-node">
                  {step.icon}
                  <span>{step.label}</span>
                </div>
                {i < ARCH_STEPS.length - 1 && <div className="dev-arch-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Open Source ───────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="dev-oss-card">
            <div className="dev-oss-info">
              <GithubLogo size={24} className="dev-oss-icon" />
              <h2 className="dev-oss-title">Open Source</h2>
              <p className="dev-oss-desc">Built in the open. Contributions welcome.</p>
            </div>
            <div className="dev-oss-stats">
              <div className="dev-oss-stat"><span className="dev-oss-stat-value">12</span><span className="dev-oss-stat-label">Repos</span></div>
              <div className="dev-oss-stat"><span className="dev-oss-stat-value">615</span><span className="dev-oss-stat-label">Stars</span></div>
              <div className="dev-oss-stat"><span className="dev-oss-stat-value">48</span><span className="dev-oss-stat-label">Contributors</span></div>
              <div className="dev-oss-stat"><span className="dev-oss-stat-value">v2.4.1</span><span className="dev-oss-stat-label">Latest</span></div>
            </div>
            <Link to="/github" className="btn btn-ghost">View on GitHub <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      {/* ─── Community ─────────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="dev-community-grid">
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="dev-community-card">
              <DiscordLogo size={20} />
              <span>Discord</span>
            </a>
            <Link to="/github" className="dev-community-card">
              <GithubLogo size={20} />
              <span>GitHub</span>
            </Link>
            <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="dev-community-card">
              <PaperPlaneTilt size={20} />
              <span>Telegram</span>
            </a>
            <Link to="/blog" className="dev-community-card">
              <BookOpen size={20} />
              <span>Blog</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="dev-section">
        <div className="container">
          <div className="dev-cta-card">
            <h2 className="dev-cta-title">Ready to build?</h2>
            <p className="dev-cta-desc">Start with our API key and SDK today.</p>
            <div className="dev-cta-actions">
              <Link to="/dashboard" className="btn btn-primary">Get API Key</Link>
              <Link to="/docs" className="btn btn-ghost">Read Docs</Link>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Join Discord</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
