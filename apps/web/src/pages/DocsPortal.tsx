import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MagnifyingGlass, GithubLogo, BookOpen, Code, Terminal, ShieldCheck, Database, Key, FileText, ArrowRight, ArrowLeft, Copy, Check, CaretDown, CaretRight } from '@phosphor-icons/react';
import './DocsPortal.css';

type SidebarSection = {
  title: string;
  items: { label: string; slug: string; active?: boolean }[];
  collapsed?: boolean;
};

const SIDEBAR: SidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', slug: 'installation', active: true },
      { label: 'Quickstart', slug: 'authentication' },
      { label: 'Authentication', slug: 'create-client' },
      { label: 'API Keys', slug: 'api-keys' },
    ],
  },
  {
    title: 'Datasets',
    items: [
      { label: 'Uploading', slug: 'upload-dataset' },
      { label: 'Marketplace', slug: 'list-datasets' },
      { label: 'Verification', slug: 'verify-dataset' },
    ],
  },
  {
    title: 'SDK',
    items: [
      { label: 'JavaScript', slug: 'sdk-js' },
      { label: 'Python', slug: 'sdk-py' },
      { label: 'Rust', slug: 'sdk-rs' },
      { label: 'Go', slug: 'sdk-go' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'REST API', slug: 'rest-api' },
      { label: 'CLI', slug: 'cli' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Examples', slug: 'examples' },
      { label: 'Tutorials', slug: 'tutorials' },
      { label: 'FAQ', slug: 'faq' },
      { label: 'Changelog', slug: 'changelog' },
    ],
  },
];

const TABLE_OF_CONTENTS = [
  { label: 'Installation', slug: 'installation' },
  { label: 'Authentication', slug: 'authentication' },
  { label: 'Create Client', slug: 'create-client' },
  { label: 'List Datasets', slug: 'list-datasets' },
  { label: 'Upload Dataset', slug: 'upload-dataset' },
  { label: 'Verify Dataset', slug: 'verify-dataset' },
  { label: 'Next Steps', slug: 'next-steps' },
];

const SDK_LINKS: Record<string, string> = {
  'sdk-js': '/sdk/javascript',
  'sdk-py': '/sdk/python',
  'sdk-rs': '/sdk/rust',
  'sdk-go': '/sdk/go',
};

const PAGE_LINKS: Record<string, string> = {
  'rest-api': '/api',
  'cli': '/cli',
  'examples': '/developers',
  'tutorials': '/developers',
  'faq': '/developers',
  'changelog': '/developers',
  'api-keys': '#api-keys',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="dp-copy-btn"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  return (
    <div className="dp-code-block">
      <div className="dp-code-header">
        <span className="dp-code-lang">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="dp-code-body">{code}</pre>
    </div>
  );
}

function Callout({ type, children }: { type: 'info' | 'warning' | 'tip' | 'success'; children: React.ReactNode }) {
  return (
    <div className={`dp-callout dp-callout--${type}`}>
      <span className="dp-callout-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
      <p className="dp-callout-text">{children}</p>
    </div>
  );
}

function SidebarLink({ item, onClick }: { item: { label: string; slug: string; active?: boolean }; onClick?: () => void }) {
  const sdkLink = SDK_LINKS[item.slug];
  const pageLink = PAGE_LINKS[item.slug];

  if (sdkLink) {
    return (
      <Link to={sdkLink} className="dp-sidebar-link" onClick={onClick}>
        {item.label}
      </Link>
    );
  }

  if (pageLink && pageLink !== '#api-keys') {
    return (
      <Link to={pageLink} className="dp-sidebar-link" onClick={onClick}>
        {item.label}
      </Link>
    );
  }

  return (
    <a
      href={`#${item.slug}`}
      className={`dp-sidebar-link ${item.active ? 'active' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        document.getElementById(item.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onClick?.();
      }}
    >
      {item.label}
    </a>
  );
}

export default function DocsPortal() {
  const [sidebarState, setSidebarState] = useState(SIDEBAR);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSection = (idx: number) => {
    setSidebarState((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  return (
    <div className="dp">
      {/* ─── Sticky Header ─────────────────────────────────────────── */}
      <header className="dp-header">
        <div className="dp-header-left">
          <Link to="/developers" className="dp-header-logo">
            <span className="dp-header-logo-mark">V</span>
            <span className="dp-header-logo-text">Docs</span>
          </Link>
          <button className="dp-mobile-menu-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
            <CaretRight size={16} style={{ transform: mobileSidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          <div className={`dp-search ${searchFocused ? 'focused' : ''}`}>
            <MagnifyingGlass size={14} className="dp-search-icon" />
            <input
              type="text"
              placeholder="Search documentation..."
              className="dp-search-input"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <kbd className="dp-search-kbd">Ctrl K</kbd>
          </div>
        </div>
        <div className="dp-header-right">
          <Link to="/github" className="dp-header-link">
            <GithubLogo size={16} />
          </Link>
          <span className="dp-header-version">v2.4.1</span>
        </div>
      </header>

      <div className="dp-layout">
        {/* ─── Sidebar ──────────────────────────────────────────────── */}
        <aside className={`dp-sidebar ${mobileSidebarOpen ? 'dp-sidebar--open' : ''}`}>
          <nav className="dp-sidebar-nav">
            {sidebarState.map((section, si) => (
              <div key={section.title} className="dp-sidebar-section">
                <button
                  className="dp-sidebar-section-title"
                  onClick={() => toggleSection(si)}
                >
                  {section.collapsed ? <CaretRight size={14} /> : <CaretDown size={14} />}
                  {section.title}
                </button>
                {!section.collapsed && (
                  <div className="dp-sidebar-items">
                    {section.items.map((item) => (
                      <SidebarLink key={item.slug} item={item} onClick={() => setMobileSidebarOpen(false)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* ─── Content ──────────────────────────────────────────────── */}
        <main className="dp-content">
          <div className="dp-content-inner">
            {/* Breadcrumb */}
            <div className="dp-breadcrumb">
              <Link to="/developers">Developers</Link>
              <CaretRight size={12} />
              <span>Getting Started</span>
              <CaretRight size={12} />
              <span>Introduction</span>
            </div>

            <h1 className="dp-title">Introduction</h1>
            <p className="dp-lead">
              Verida AI is a trust-first data infrastructure platform built on Shelby Protocol and Aptos L1.
              This guide walks you through setting up your environment and making your first API call.
            </p>

            {/* Installation */}
            <section id="installation" className="dp-section">
              <h2 className="dp-h2">Installation</h2>
              <p className="dp-p">Install the SDK using your preferred package manager:</p>
              <CodeBlock language="bash" code={`npm install @verida/sdk`} />
              <Callout type="tip">
                The SDK requires Node.js 18+ and supports both ESM and CommonJS.
              </Callout>
            </section>

            {/* Authentication */}
            <section id="authentication" className="dp-section">
              <h2 className="dp-h2">Authentication</h2>
              <p className="dp-p">
                Verida uses wallet-based authentication with Ed25519 signatures. Your Aptos wallet signs a message
                to prove ownership, and the server issues a JWT token.
              </p>
              <CodeBlock language="typescript" code={`import { Verida } from "@verida/sdk"

const client = new Verida({
  apiKey: process.env.VERIDA_API_KEY
})`} />
              <Callout type="info">
                Store your API key in environment variables. Never commit it to source control.
              </Callout>
            </section>

            {/* Create Client */}
            <section id="create-client" className="dp-section">
              <h2 className="dp-h2">Create Client</h2>
              <p className="dp-p">
                Initialize the client with your API key. The client handles authentication,
                retries, and connection pooling automatically.
              </p>
              <CodeBlock language="typescript" code={`const client = new Verida({
  apiKey: process.env.VERIDA_API_KEY,
  network: "mainnet"  // or "testnet"
})

// Verify connection
const status = await client.health()
console.log(status.ok)  // true`} />
            </section>

            {/* List Datasets */}
            <section id="list-datasets" className="dp-section">
              <h2 className="dp-h2">List Datasets</h2>
              <p className="dp-p">
                Query available datasets with filters for tags, access type, and sorting.
              </p>
              <CodeBlock language="typescript" code={`const datasets = await client.datasets.list({
  tags: ["nlp", "cv"],
  access: "free",
  sort: "latest",
  page: 1,
  limit: 20
})

console.log(datasets.total)  // 15234
console.log(datasets.data)   // Dataset[]`} />

              <h3 className="dp-h3">Response</h3>
              <div className="dp-json-block">
                <div className="dp-code-header">
                  <span className="dp-code-lang">json</span>
                </div>
                <pre className="dp-code-body">{`{
  "total": 15234,
  "data": [
    {
      "id": "ds_01JN8K...",
      "name": "GPT-4 Training Set",
      "tags": ["nlp", "cv"],
      "verified": true,
      "quality": 97,
      "price": 25,
      "size": "48GB"
    }
  ]
}`}</pre>
              </div>
            </section>

            {/* Upload Dataset */}
            <section id="upload-dataset" className="dp-section">
              <h2 className="dp-h2">Upload Dataset</h2>
              <p className="dp-p">
                Upload a dataset with metadata. The SDK handles chunking, hashing, and blockchain anchoring automatically.
              </p>
              <CodeBlock language="typescript" code={`const result = await client.datasets.upload({
  name: "My Training Dataset",
  description: "High-quality NLP data",
  tags: ["nlp", "text"],
  accessType: "paid",
  price: 10,  // APT
  file: fs.createReadStream("./data.jsonl")
}, (progress) => {
  console.log(\`\${progress.percent}% - \${progress.stage}\`)
})

console.log(result.blobId)    // "bafybeig..."
console.log(result.txHash)    // "0x1a2b..."`} />
              <Callout type="success">
                Datasets are automatically verified on-chain and distributed to 16 Shelby storage nodes.
              </Callout>
            </section>

            {/* Verify Dataset */}
            <section id="verify-dataset" className="dp-section">
              <h2 className="dp-h2">Verify Dataset</h2>
              <p className="dp-p">
                Verify the integrity of any dataset using its on-chain provenance record.
              </p>
              <CodeBlock language="typescript" code={`const verification = await client.datasets.verify("ds_01JN8K...")

console.log(verification.status)     // "verified"
console.log(verification.integrity)  // 99.98
console.log(verification.nodeCount)  // 16`} />
            </section>

            {/* Next Steps */}
            <section id="next-steps" className="dp-section">
              <h2 className="dp-h2">Next Steps</h2>
              <div className="dp-next-steps">
                <Link to="/api" className="dp-next-card">
                  <Code size={16} />
                  <span>API Reference</span>
                  <ArrowRight size={14} />
                </Link>
                <Link to="/sdk" className="dp-next-card">
                  <Terminal size={16} />
                  <span>SDK Reference</span>
                  <ArrowRight size={14} />
                </Link>
                <Link to="/github" className="dp-next-card">
                  <GithubLogo size={16} />
                  <span>Open Source</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </section>

            {/* Prev / Next Navigation */}
            <div className="dp-nav-bottom">
              <Link to="/developers" className="dp-nav-prev">
                <ArrowLeft size={14} />
                <div>
                  <span className="dp-nav-label">Previous</span>
                  <span className="dp-nav-title">Developers Hub</span>
                </div>
              </Link>
              <Link to="/api" className="dp-nav-next">
                <div>
                  <span className="dp-nav-label">Next</span>
                  <span className="dp-nav-title">API Reference</span>
                </div>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Footer */}
            <div className="dp-content-footer">
              <Link to="/github" className="dp-content-footer-link">
                <GithubLogo size={13} /> Edit on GitHub
              </Link>
              <a href="https://github.com/verida-ai" target="_blank" rel="noopener noreferrer" className="dp-content-footer-link">
                Report Issue
              </a>
              <span className="dp-content-footer-meta">Last updated: Jan 2025</span>
            </div>
          </div>
        </main>

        {/* ─── Right Sidebar (Table of Contents) ────────────────────── */}
        <aside className="dp-toc">
          <span className="dp-toc-title">On This Page</span>
          <nav className="dp-toc-nav">
            {TABLE_OF_CONTENTS.map((item) => (
              <a
                key={item.slug}
                href={`#${item.slug}`}
                className="dp-toc-link"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
