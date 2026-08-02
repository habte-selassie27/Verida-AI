import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, ArrowLeft, Copy, Check, BookOpen, Terminal, Code, ShieldCheck, Lightning, Clock, GithubLogo } from '@phosphor-icons/react';
import './SDKDetail.css';

const SDK_DATA: Record<string, { name: string; version: string; install: string; color: string; runtime: string; description: string }> = {
  js: { name: 'JavaScript', version: '2.4.1', install: 'npm install @verida/sdk', color: '#fbbf24', runtime: 'Node.js 18+', description: 'Full-featured SDK for Node.js and browser environments.' },
  ts: { name: 'TypeScript', version: '2.4.1', install: 'npm install @verida/sdk', color: '#8B5CF6', runtime: 'Node.js 18+', description: 'TypeScript-first SDK with full type definitions.' },
  py: { name: 'Python', version: '1.8.3', install: 'pip install verida-sdk', color: '#60a5fa', runtime: 'Python 3.10+', description: 'Pythonic API for data science and ML workflows.' },
  rs: { name: 'Rust', version: '0.9.2', install: 'cargo add verida-sdk', color: '#f87171', runtime: 'Rust 1.75+', description: 'High-performance SDK for systems programming.' },
  go: { name: 'Go', version: '1.2.0', install: 'go get github.com/verida/go-sdk', color: '#00E5FF', runtime: 'Go 1.22+', description: 'Idiomatic Go client with strong concurrency support.' },
  java: { name: 'Java', version: '0.8.1', install: 'implementation "ai.verida:sdk:0.8.1"', color: '#a78bfa', runtime: 'Java 17+', description: 'Enterprise-grade SDK for JVM applications.' },
  swift: { name: 'Swift', version: '0.7.1', install: 'pod "VeridaSDK"', color: '#f472b6', runtime: 'Swift 5.9+', description: 'Native iOS and macOS SDK.' },
  kt: { name: 'Kotlin', version: '0.6.0', install: 'implementation "ai.verida:sdk-kotlin:0.6.0"', color: '#c084fc', runtime: 'Kotlin 1.9+', description: 'Kotlin Multiplatform SDK for Android and JVM.' },
  cs: { name: '.NET', version: '0.5.2', install: 'dotnet add package Verida.SDK', color: '#60a5fa', runtime: '.NET 8+', description: 'Cross-platform .NET SDK.' },
  php: { name: 'PHP', version: '0.4.0', install: 'composer require verida/sdk', color: '#a78bfa', runtime: 'PHP 8.2+', description: 'PHP SDK for web backends.' },
};

const SIDEBAR_ITEMS = [
  { label: 'Installation', slug: 'installation' },
  { label: 'Requirements', slug: 'requirements' },
  { label: 'Authentication', slug: 'authentication' },
  { label: 'Quick Start', slug: 'quickstart' },
  { label: 'Core Concepts', slug: 'concepts' },
  { label: 'API Examples', slug: 'examples' },
  { label: 'Advanced Usage', slug: 'advanced' },
  { label: 'Error Handling', slug: 'errors' },
  { label: 'Migration Guide', slug: 'migration' },
  { label: 'Changelog', slug: 'changelog' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="sdkd-copy-btn" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function SDKDetail() {
  const { lang } = useParams<{ lang: string }>();
  const sdk = (SDK_DATA[lang || 'js'] ?? SDK_DATA.js)!;
  const [activeTab, setActiveTab] = useState('install');

  return (
    <div className="sdkd">
      {/* ─── Sidebar ──────────────────────────────────────────────── */}
      <aside className="sdkd-sidebar">
        <Link to="/sdk" className="sdkd-sidebar-back">
          <ArrowLeft size={14} /> All SDKs
        </Link>
        <div className="sdkd-sidebar-sdk">
          <span className="sdkd-sidebar-dot" style={{ background: sdk.color }} />
          <span className="sdkd-sidebar-name">{sdk.name} SDK</span>
        </div>
        <nav className="sdkd-sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
            <a key={item.slug} href={`#${item.slug}`} className="sdkd-sidebar-link">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* ─── Content ──────────────────────────────────────────────── */}
      <main className="sdkd-content">
        <div className="sdkd-content-inner">
          {/* Hero */}
          <div className="sdkd-hero">
            <div className="sdkd-hero-badge" style={{ color: sdk.color, borderColor: `${sdk.color}33` }}>
              <span className="sdkd-hero-dot" style={{ background: sdk.color }} />
              {sdk.name} SDK
            </div>
            <h1 className="sdkd-title">{sdk.name} SDK</h1>
            <p className="sdkd-desc">{sdk.description}</p>
            <div className="sdkd-meta">
              <span className="sdkd-meta-item"><Clock size={13} /> v{sdk.version}</span>
              <span className="sdkd-meta-item">{sdk.runtime}</span>
              <span className="sdkd-meta-item"><GithubLogo size={13} /> View on GitHub</span>
            </div>
          </div>

          {/* Installation */}
          <section id="installation" className="sdkd-section">
            <h2 className="sdkd-h2">Installation</h2>
            <div className="sdkd-install-block">
              <code>{sdk.install}</code>
              <CopyButton text={sdk.install} />
            </div>
          </section>

          {/* Requirements */}
          <section id="requirements" className="sdkd-section">
            <h2 className="sdkd-h2">Requirements</h2>
            <ul className="sdkd-list">
              <li>{sdk.runtime}</li>
              <li>An active Verida API key</li>
              <li>Aptos wallet (for authentication)</li>
            </ul>
          </section>

          {/* Authentication */}
          <section id="authentication" className="sdkd-section">
            <h2 className="sdkd-h2">Authentication</h2>
            <p className="sdkd-p">
              The SDK uses API key authentication. Get your key from the{' '}
              <Link to="/dashboard">dashboard</Link>.
            </p>
            <div className="sdkd-code-block">
              <div className="sdkd-code-header">
                <span>{sdk.name}</span>
                <CopyButton text={`const client = new Verida({ apiKey: "your-key" })`} />
              </div>
              <pre className="sdkd-code-body">{`const client = new Verida({
  apiKey: "your-api-key"
})`}</pre>
            </div>
          </section>

          {/* Quick Start */}
          <section id="quickstart" className="sdkd-section">
            <h2 className="sdkd-h2">Quick Start</h2>
            <p className="sdkd-p">List datasets with a few lines of code:</p>
            <div className="sdkd-code-block">
              <div className="sdkd-code-header">
                <span>{sdk.name}</span>
                <CopyButton text={`const datasets = await client.datasets.list()\nconsole.log(datasets.total)`} />
              </div>
              <pre className="sdkd-code-body">{`const datasets = await client.datasets.list({
  tags: ["nlp", "cv"],
  sort: "latest"
})

console.log(datasets.total)  // 15234
console.log(datasets.data)   // Dataset[]`}</pre>
            </div>
          </section>

          {/* Core Concepts */}
          <section id="concepts" className="sdkd-section">
            <h2 className="sdkd-h2">Core Concepts</h2>
            <div className="sdkd-concepts-grid">
              <div className="sdkd-concept-card">
                <ShieldCheck size={18} className="sdkd-concept-icon" />
                <h3 className="sdkd-concept-title">Verification</h3>
                <p className="sdkd-concept-desc">Verify dataset integrity on-chain.</p>
              </div>
              <div className="sdkd-concept-card">
                <Lightning size={18} className="sdkd-concept-icon" />
                <h3 className="sdkd-concept-title">Streaming</h3>
                <p className="sdkd-concept-desc">Stream access sessions in real-time.</p>
              </div>
              <div className="sdkd-concept-card">
                <Code size={18} className="sdkd-concept-icon" />
                <h3 className="sdkd-concept-title">Upload</h3>
                <p className="sdkd-concept-desc">Upload datasets with progress tracking.</p>
              </div>
            </div>
          </section>

          {/* API Examples */}
          <section id="examples" className="sdkd-section">
            <h2 className="sdkd-h2">API Examples</h2>
            <div className="sdkd-code-block">
              <div className="sdkd-code-header">
                <span>Upload Dataset</span>
                <CopyButton text="await client.datasets.upload({...})" />
              </div>
              <pre className="sdkd-code-body">{`const result = await client.datasets.upload({
  name: "My Dataset",
  tags: ["nlp"],
  accessType: "paid",
  price: 10,
  file: fs.createReadStream("./data.jsonl")
})

console.log(result.blobId)`}</pre>
            </div>
          </section>

          {/* Advanced */}
          <section id="advanced" className="sdkd-section">
            <h2 className="sdkd-h2">Advanced Usage</h2>
            <p className="sdkd-p">
              Configure retries, timeouts, and custom endpoints.
            </p>
            <div className="sdkd-code-block">
              <div className="sdkd-code-header">
                <span>Configuration</span>
              </div>
              <pre className="sdkd-code-body">{`const client = new Verida({
  apiKey: process.env.API_KEY,
  network: "mainnet",
  timeout: 30000,
  retries: 3
})`}</pre>
            </div>
          </section>

          {/* Error Handling */}
          <section id="errors" className="sdkd-section">
            <h2 className="sdkd-h2">Error Handling</h2>
            <div className="sdkd-code-block">
              <div className="sdkd-code-header">
                <span>Error Handling</span>
              </div>
              <pre className="sdkd-code-body">{`try {
  const datasets = await client.datasets.list()
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Wait and retry
  }
}`}</pre>
            </div>
          </section>

          {/* Migration */}
          <section id="migration" className="sdkd-section">
            <h2 className="sdkd-h2">Migration Guide</h2>
            <p className="sdkd-p">
              Migrating from v1 to v2? See the{' '}
              <a href="#">migration guide</a>.
            </p>
          </section>

          {/* Changelog */}
          <section id="changelog" className="sdkd-section">
            <h2 className="sdkd-h2">Changelog</h2>
            <div className="sdkd-changelog-item">
              <span className="sdkd-changelog-version">v{sdk.version}</span>
              <span className="sdkd-changelog-date">2 days ago</span>
              <ul className="sdkd-changelog-list">
                <li>Bug fixes and performance improvements</li>
                <li>Improved error messages</li>
              </ul>
            </div>
          </section>

          {/* Prev / Next */}
          <div className="sdkd-nav-bottom">
            <Link to="/sdk" className="sdkd-nav-prev">
              <ArrowLeft size={14} />
              <div>
                <span className="sdkd-nav-label">Back</span>
                <span className="sdkd-nav-title">All SDKs</span>
              </div>
            </Link>
            <Link to="/docs" className="sdkd-nav-next">
              <div>
                <span className="sdkd-nav-label">Next</span>
                <span className="sdkd-nav-title">Documentation</span>
              </div>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
