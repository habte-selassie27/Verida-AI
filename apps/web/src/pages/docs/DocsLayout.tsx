import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { MagnifyingGlass, GithubLogo, CaretDown, CaretRight, ArrowLeft, ArrowRight, Copy, Check } from '@phosphor-icons/react';
import { SIDEBAR, PAGES } from './docsData';
import './DocsLayout.css';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="dl-copy-btn" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  return (
    <div className="dl-code-block">
      <div className="dl-code-header">
        <span className="dl-code-lang">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="dl-code-body">{code}</pre>
    </div>
  );
}

function Callout({ type, children }: { type: 'info' | 'warning' | 'tip' | 'success'; children: React.ReactNode }) {
  return (
    <div className={`dl-callout dl-callout--${type}`}>
      <span className="dl-callout-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
      <p className="dl-callout-text">{children}</p>
    </div>
  );
}

/* ─── Page Content ──────────────────────────────────────────────────── */

function PageContent({ slug }: { slug: string }) {
  const page = PAGES[slug];
  if (!page) return <div className="dl-empty">Page not found.</div>;

  switch (page.content) {
    case 'introduction':
      return (
        <>
          <h1 className="dl-title">Introduction</h1>
          <p className="dl-lead">
            <strong>Verida AI</strong> is a trust-first AI dataset marketplace and infrastructure layer built on <strong>Shelby Protocol</strong> and the <strong>Aptos L1</strong> blockchain.
          </p>
          <p className="dl-p">We solve the "black box" problem in AI training by providing verifiable, immutable, and decentralized data assets.</p>
          <h2 id="what-is-verida" className="dl-h2">What is Verida AI</h2>
          <p className="dl-p">With Verida AI, developers can:</p>
          <ul className="dl-list">
            <li><strong>Discover Datasets:</strong> Search a global marketplace of verified AI training data.</li>
            <li><strong>Upload AI Data:</strong> Contribute your own datasets and earn rewards.</li>
            <li><strong>Verify Provenance:</strong> Cryptographically prove the origin and integrity of data.</li>
            <li><strong>Access Decentralized Storage:</strong> Leverage Shelby Protocol for permanent, censorship-resistant data hosting.</li>
            <li><strong>Build AI Applications:</strong> Integrate trustless data pipelines into your agents and models.</li>
          </ul>
          <h2 id="key-features" className="dl-h2">Key Features</h2>
          <div className="dl-features-grid">
            {[
              { title: 'Decentralized Storage', desc: 'Data stored across 16 Shelby nodes worldwide.' },
              { title: 'On-Chain Verification', desc: 'Every dataset anchored on Aptos L1.' },
              { title: 'Trustless Access', desc: 'Smart contract-gated data permissions.' },
              { title: 'Developer First', desc: 'Full SDK support for JS, Python, Rust, Go.' },
            ].map((f) => (
              <div key={f.title} className="dl-feature-card">
                <h4 className="dl-feature-title">{f.title}</h4>
                <p className="dl-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
          <h2 id="architecture" className="dl-h2">Architecture</h2>
          <div className="dl-arch-diagram">
            <div className="dl-arch-step"><span className="dl-arch-num">1</span>Client App</div>
            <div className="dl-arch-arrow">&#8594;</div>
            <div className="dl-arch-step"><span className="dl-arch-num">2</span>Verida API</div>
            <div className="dl-arch-arrow">&#8594;</div>
            <div className="dl-arch-step"><span className="dl-arch-num">3</span>Shelby Nodes</div>
            <div className="dl-arch-arrow">&#8594;</div>
            <div className="dl-arch-step"><span className="dl-arch-num">4</span>Aptos L1</div>
          </div>
        </>
      );

    case 'quickstart':
      return (
        <>
          <h1 className="dl-title">Quickstart</h1>
          <p className="dl-lead">Get up and running in 5 minutes.</p>
          <h2 id="install" className="dl-h2">Step 1: Install the SDK</h2>
          <CodeBlock language="bash" code="npm install @verida/sdk" />
          <h2 id="init" className="dl-h2">Step 2: Initialize the Client</h2>
          <CodeBlock language="typescript" code={`import { Verida } from "@verida/sdk";

const client = new Verida({
  apiKey: process.env.VERIDA_API_KEY,
  network: "testnet" // or "mainnet"
});`} />
          <h2 id="query" className="dl-h2">Step 3: Query a Dataset</h2>
          <CodeBlock language="typescript" code={`const dataset = await client.datasets.get("ds_8f7a9b2c");
console.log(dataset.metadata.name); // "Imagenet-subset-verified"`} />
          <h2 id="upload" className="dl-h2">Step 4: Upload Data</h2>
          <CodeBlock language="typescript" code={`const uploadReceipt = await client.datasets.upload({
  name: "My Custom NLP Data",
  tags: ["nlp", "sentiment-analysis"],
  file: fs.createReadStream("./data.jsonl")
});
console.log("Transaction Hash:", uploadReceipt.txHash);`} />
        </>
      );

    case 'authentication':
      return (
        <>
          <h1 className="dl-title">Authentication</h1>
          <p className="dl-lead">Verida AI supports two primary authentication methods depending on your use case.</p>
          <h2 id="api-key" className="dl-h2">API Key Authentication (Server-side)</h2>
          <p className="dl-p">Best for backend services, automated pipelines, and CI/CD.</p>
          <CodeBlock language="typescript" code={`const client = new Verida({
  apiKey: "verida_sk_live_..." 
});`} />
          <h2 id="wallet" className="dl-h2">Wallet Authentication (Client-side)</h2>
          <p className="dl-p">Best for dApps, browser extensions, and user-facing interfaces. Uses Aptos wallet adapters.</p>
          <CodeBlock language="typescript" code={`import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Verida } from "@verida/sdk";

const { signMessage } = useWallet();

const client = await Verida.connectWallet({
  signMessage,
  network: "mainnet"
});`} />
        </>
      );

    case 'api-keys':
      return (
        <>
          <h1 className="dl-title">API Keys</h1>
          <p className="dl-lead">Manage your keys in the Verida Dashboard.</p>
          <h2 id="creating" className="dl-h2">Creating Keys</h2>
          <ol className="dl-list dl-list-ordered">
            <li>Navigate to <strong>Settings</strong> &rarr; <strong>Developer</strong> &rarr; <strong>API Keys</strong>.</li>
            <li>Click <strong>Create Key</strong>.</li>
            <li>Select the environment (<strong>Test</strong> or <strong>Production</strong>).</li>
            <li>Assign <strong>Scopes</strong> (e.g., <code>datasets:read</code>, <code>datasets:write</code>, <code>payments:execute</code>).</li>
          </ol>
          <h2 id="scopes" className="dl-h2">Scopes</h2>
          <div className="dl-table-wrap">
            <table className="dl-table">
              <thead><tr><th>Scope</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>datasets:read</code></td><td>Read and list datasets</td></tr>
                <tr><td><code>datasets:write</code></td><td>Upload and modify datasets</td></tr>
                <tr><td><code>payments:execute</code></td><td>Purchase datasets</td></tr>
              </tbody>
            </table>
          </div>
          <h2 id="security" className="dl-h2">Security</h2>
          <Callout type="warning">
            Never expose Production keys (verida_sk_live_...) in client-side code. Use Wallet Authentication for browser environments.
          </Callout>
        </>
      );

    case 'dataset-overview':
      return (
        <>
          <h1 className="dl-title">Dataset Overview</h1>
          <p className="dl-lead">Datasets are immutable AI assets stored through Shelby decentralized storage. Every dataset uploaded to Verida AI is anchored on the Aptos blockchain.</p>
          <h2 id="anatomy" className="dl-h2">Anatomy of a Dataset Object</h2>
          <CodeBlock language="json" code={`{
  "id": "ds_8f7a9b2c",
  "name": "Financial Sentiment Corpus",
  "owner": "0x7a2...9f1",
  "ipfs_hash": "QmXoypiz...8kL",
  "license": "CC-BY-4.0",
  "verification_score": 98.5,
  "created_at": "2025-01-15T08:30:00Z",
  "metadata": {
    "format": "jsonl",
    "size_mb": 450,
    "tags": ["finance", "nlp"]
  }
}`} />
          <h2 id="states" className="dl-h2">Dataset States</h2>
          <div className="dl-states-list">
            {['Processing', 'Validating', 'Anchored', 'Published', 'Suspended'].map((s) => (
              <div key={s} className="dl-state-badge">{s}</div>
            ))}
          </div>
          <h2 id="schema" className="dl-h2">Metadata Schema</h2>
          <p className="dl-p">All datasets must include: <code>name</code>, <code>tags</code>, <code>license</code>, and <code>file</code>.</p>
        </>
      );

    case 'uploading':
      return (
        <>
          <h1 className="dl-title">Uploading Datasets</h1>
          <p className="dl-lead">The upload process ensures data integrity before it hits the blockchain.</p>
          <h2 id="upload-flow" className="dl-h2">Upload Flow</h2>
          <div className="dl-steps">
            {['Prepare: Format data into supported structures (JSONL, Parquet, CSV).', 'Metadata: Attach descriptive tags and licensing info.', 'Upload: Stream data to Shelby storage nodes.', 'Validation: AI validators check for corruption and format compliance.', 'Anchoring: Content hash is minted on Aptos L1.', 'Publish: Dataset becomes searchable in the marketplace.'].map((s, i) => (
              <div key={i} className="dl-step"><span className="dl-step-num">{i + 1}</span><span>{s}</span></div>
            ))}
          </div>
          <h2 id="formats" className="dl-h2">Supported Formats</h2>
          <div className="dl-format-tags">
            {['JSONL', 'Parquet', 'CSV', 'ZIP'].map((f) => (
              <span key={f} className="dl-format-tag">{f}</span>
            ))}
          </div>
          <h2 id="code" className="dl-h2">Code Example</h2>
          <CodeBlock language="typescript" code={`const receipt = await client.datasets.upload({
  name: "Q4 Earnings Transcripts",
  tags: ["finance", "text"],
  license: "MIT",
  file: dataStream,
  onProgress: (percent) => console.log(\`\${percent}% uploaded\`)
});`} />
        </>
      );

    case 'marketplace':
      return (
        <>
          <h1 className="dl-title">Marketplace</h1>
          <p className="dl-lead">Access thousands of verified datasets.</p>
          <h2 id="purchasing" className="dl-h2">Purchasing Flow</h2>
          <div className="dl-steps">
            {['Search: Filter by tags, size, or verification score.', 'Purchase: Pay in APT or USDC via smart contract.', 'Permission: Smart contract grants your wallet address decryption keys.', 'Download: Stream securely directly from Shelby nodes.'].map((s, i) => (
              <div key={i} className="dl-step"><span className="dl-step-num">{i + 1}</span><span>{s}</span></div>
            ))}
          </div>
          <h2 id="access" className="dl-h2">Access Control</h2>
          <p className="dl-p">Datasets are encrypted at rest. Access is governed by smart contracts; only wallets that have purchased or been granted access receive the decryption keys.</p>
          <h2 id="pricing" className="dl-h2">Pricing</h2>
          <p className="dl-p">Dataset prices are set by publishers and denominated in APT or USDC.</p>
        </>
      );

    case 'verification':
      return (
        <>
          <h1 className="dl-title">Verification</h1>
          <p className="dl-lead">Verify the integrity of any dataset using its on-chain provenance record.</p>
          <h2 id="integrity" className="dl-h2">Integrity Score</h2>
          <p className="dl-p">Every dataset has an <strong>Integrity Score</strong> (0-100) based on:</p>
          <ul className="dl-list">
            <li><strong>Blockchain Proof:</strong> Is the hash anchored on Aptos?</li>
            <li><strong>Storage Nodes:</strong> Is it replicated across enough Shelby nodes?</li>
            <li><strong>Format Check:</strong> Does the data match the declared schema?</li>
          </ul>
          <h2 id="method" className="dl-h2">Verification Method</h2>
          <CodeBlock language="typescript" code={`const verification = await client.datasets.verify("ds_8f7a9b2c");

if (verification.score >= 90) {
  console.log("Data is highly trusted.");
}`} />
          <h2 id="code" className="dl-h2">Full Response</h2>
          <CodeBlock language="json" code={`{
  "status": "verified",
  "score": 98.5,
  "blockchain_proof": true,
  "node_replication": 16,
  "format_valid": true
}`} />
        </>
      );

    case 'sdk-js':
      return (
        <>
          <h1 className="dl-title">JavaScript SDK</h1>
          <p className="dl-lead">The official SDK for Node.js and browser environments.</p>
          <h2 id="install" className="dl-h2">Installation</h2>
          <CodeBlock language="bash" code="npm install @verida/sdk" />
          <h2 id="features" className="dl-h2">Features</h2>
          <ul className="dl-list">
            <li>Full API coverage</li>
            <li>Streaming uploads</li>
            <li>Aptos wallet integration</li>
            <li>TypeScript definitions</li>
          </ul>
          <h2 id="example" className="dl-h2">Quick Example</h2>
          <CodeBlock language="typescript" code={`import { Verida } from "@verida/sdk";

const client = new Verida({ apiKey: "verida_sk_..." });
const datasets = await client.datasets.list({ tags: ["nlp"] });
console.log(datasets.total);`} />
        </>
      );

    case 'sdk-python':
      return (
        <>
          <h1 className="dl-title">Python SDK</h1>
          <p className="dl-lead">Optimized for ML engineers and data scientists.</p>
          <h2 id="install" className="dl-h2">Installation</h2>
          <CodeBlock language="bash" code="pip install verida-ai" />
          <h2 id="features" className="dl-h2">Features</h2>
          <ul className="dl-list">
            <li>Pandas integration</li>
            <li>NumPy array support</li>
            <li>Async operations</li>
            <li>Jupyter notebook friendly</li>
          </ul>
          <h2 id="example" className="dl-h2">Quick Example</h2>
          <CodeBlock language="python" code={`from verida import Verida

client = Verida(api_key="verida_sk_live_...")
dataset = client.datasets.get("ds_8f7a9b2c")
df = dataset.to_pandas()  # Direct Pandas integration`} />
        </>
      );

    case 'sdk-rust':
      return (
        <>
          <h1 className="dl-title">Rust SDK</h1>
          <p className="dl-lead">For high-performance infrastructure and blockchain developers.</p>
          <h2 id="install" className="dl-h2">Installation</h2>
          <CodeBlock language="bash" code="cargo add verida-sdk" />
          <h2 id="use-cases" className="dl-h2">Use Cases</h2>
          <ul className="dl-list">
            <li>Building custom validation nodes</li>
            <li>High-throughput data pipelines</li>
            <li>Core protocol integrations</li>
          </ul>
        </>
      );

    case 'sdk-go':
      return (
        <>
          <h1 className="dl-title">Go SDK</h1>
          <p className="dl-lead">For enterprise backend systems and microservices.</p>
          <h2 id="install" className="dl-h2">Installation</h2>
          <CodeBlock language="bash" code="go get github.com/verida-ai/verida-go" />
          <h2 id="use-cases" className="dl-h2">Use Cases</h2>
          <ul className="dl-list">
            <li>Scalable backend ingestion services</li>
            <li>Enterprise data warehouses</li>
          </ul>
        </>
      );

    case 'rest-api':
      return (
        <>
          <h1 className="dl-title">REST API</h1>
          <p className="dl-lead">Base URL: <code>https://api.verida.ai/v1</code></p>
          <h2 id="upload" className="dl-h2">Upload Dataset</h2>
          <div className="dl-api-badge">POST</div>
          <code className="dl-api-endpoint">/datasets/upload</code>
          <p className="dl-p">Uploads a new dataset to Shelby storage and anchors it on-chain.</p>
          <CodeBlock language="http" code={`Authorization: Bearer verida_sk_live_...
Content-Type: multipart/form-data`} />
          <h3 className="dl-h3">Parameters</h3>
          <div className="dl-table-wrap">
            <table className="dl-table">
              <thead><tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>name</code></td><td>string</td><td>Yes</td><td>Display name of the dataset</td></tr>
                <tr><td><code>tags</code></td><td>array</td><td>No</td><td>Comma-separated tags</td></tr>
                <tr><td><code>license</code></td><td>string</td><td>Yes</td><td>SPDX license identifier</td></tr>
                <tr><td><code>file</code></td><td>binary</td><td>Yes</td><td>The dataset file (Max 5GB)</td></tr>
              </tbody>
            </table>
          </div>
          <h2 id="list" className="dl-h2">List Datasets</h2>
          <div className="dl-api-badge dl-api-get">GET</div>
          <code className="dl-api-endpoint">/datasets</code>
          <CodeBlock language="json" code={`{
  "total": 15234,
  "data": [{ "id": "ds_01JN8K...", "name": "GPT-4 Training Set" }]
}`} />
          <h2 id="verify" className="dl-h2">Verify Dataset</h2>
          <div className="dl-api-badge dl-api-get">GET</div>
          <code className="dl-api-endpoint">/datasets/:id/verify</code>
          <h2 id="errors" className="dl-h2">Error Codes</h2>
          <div className="dl-table-wrap">
            <table className="dl-table">
              <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
              <tbody>
                <tr><td><code>400</code></td><td>Invalid file format or missing metadata</td></tr>
                <tr><td><code>402</code></td><td>Insufficient storage credits</td></tr>
                <tr><td><code>413</code></td><td>File exceeds 5GB limit</td></tr>
              </tbody>
            </table>
          </div>
        </>
      );

    case 'cli':
      return (
        <>
          <h1 className="dl-title">CLI</h1>
          <p className="dl-lead">Manage Verida AI directly from your terminal.</p>
          <h2 id="install" className="dl-h2">Installation</h2>
          <CodeBlock language="bash" code="npm install -g @verida/cli" />
          <h2 id="auth" className="dl-h2">Authentication</h2>
          <CodeBlock language="bash" code="verida login" />
          <Callout type="info">Opens browser for secure wallet/API key authentication.</Callout>
          <h2 id="commands" className="dl-h2">Commands</h2>
          <CodeBlock language="bash" code={`# List your datasets
verida datasets list

# Upload a dataset
verida upload ./training_data.jsonl --name "My Data" --tags "nlp"

# Verify a dataset's on-chain integrity
verida verify ds_8f7a9b2c

# Download a purchased dataset
verida download ds_8f7a9b2c --output ./local_data/`} />
        </>
      );

    case 'examples':
      return (
        <>
          <h1 className="dl-title">Examples</h1>
          <p className="dl-lead">Open-source reference implementations to get you started.</p>
          <div className="dl-examples-grid">
            {[
              { title: 'AI Chatbot', desc: 'RAG application using verified Verida datasets.', lang: 'TypeScript' },
              { title: 'Dataset Explorer', desc: 'Next.js app to browse and visualize marketplace data.', lang: 'React' },
              { title: 'Training Pipeline', desc: 'Python script to automatically fetch and validate data for PyTorch.', lang: 'Python' },
              { title: 'Agent Application', desc: 'Autonomous agent that buys data to improve its own weights.', lang: 'Python' },
            ].map((ex) => (
              <div key={ex.title} className="dl-example-card">
                <h3 className="dl-example-title">{ex.title}</h3>
                <p className="dl-example-desc">{ex.desc}</p>
                <span className="dl-example-lang">{ex.lang}</span>
              </div>
            ))}
          </div>
        </>
      );

    case 'tutorials':
      return (
        <>
          <h1 className="dl-title">Tutorials</h1>
          <p className="dl-lead">Step-by-step guides for common use cases.</p>
          <div className="dl-steps">
            {[
              'Build your first AI Agent: Connect an LLM to the Verida marketplace.',
              'Create a Dataset Marketplace: Build a frontend for users to buy/sell data.',
              'Upload ML Training Data: Best practices for formatting and tagging.',
              'Verify AI Data Provenance: Deep dive into the cryptographic proofs.',
            ].map((s, i) => (
              <div key={i} className="dl-step"><span className="dl-step-num">{i + 1}</span><span>{s}</span></div>
            ))}
          </div>
        </>
      );

    case 'faq':
      return (
        <>
          <h1 className="dl-title">FAQ</h1>
          <p className="dl-lead">Frequently asked questions about Verida AI.</p>
          {[
            { q: 'What blockchain does Verida AI use?', a: 'Verida AI is built on the Aptos L1 blockchain for high throughput and low fees, utilizing Shelby Protocol for decentralized storage.' },
            { q: 'How is data privacy handled?', a: 'Datasets are encrypted at rest. Access is governed by smart contracts; only wallets that have purchased or been granted access receive the decryption keys.' },
            { q: 'What file formats are supported?', a: 'We currently support JSONL, Parquet, CSV, and ZIP archives.' },
            { q: 'How much does it cost?', a: 'Storage costs are denominated in APT. Dataset prices are set by individual publishers.' },
          ].map((item) => (
            <div key={item.q} className="dl-faq-item">
              <h3 className="dl-faq-q">{item.q}</h3>
              <p className="dl-faq-a">{item.a}</p>
            </div>
          ))}
        </>
      );

    case 'changelog':
      return (
        <>
          <h1 className="dl-title">Changelog</h1>
          <p className="dl-lead">Latest updates and releases.</p>
          <div className="dl-changelog-entries">
            <div className="dl-changelog-entry">
              <h2 id="v241" className="dl-h2">v2.4.1 &mdash; Jan 2025</h2>
              <ul className="dl-list">
                <li>Official Rust SDK released.</li>
                <li>Improved upload streaming speed by 40%.</li>
                <li>New verification API endpoints.</li>
              </ul>
            </div>
            <div className="dl-changelog-entry">
              <h2 id="v240" className="dl-h2">v2.4.0 &mdash; Dec 2024</h2>
              <ul className="dl-list">
                <li>Public Marketplace launch.</li>
                <li>Added USDC payment support alongside APT.</li>
              </ul>
            </div>
          </div>
        </>
      );

    default:
      return <div className="dl-empty">Content coming soon.</div>;
  }
}

/* ─── Main Layout ───────────────────────────────────────────────────── */

export default function DocsLayout() {
  const location = useLocation();
  const path = location.pathname;
  const page = PAGES[path];

  const [sidebarState, setSidebarState] = useState(SIDEBAR);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [path]);

  const toggleSection = (idx: number) => {
    setSidebarState((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  // Find current section for sidebar active state
  const currentSection = SIDEBAR.find((s) =>
    s.items.some((item) => item.path === path)
  );

  return (
    <div className="dl">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <header className="dl-header">
        <div className="dl-header-left">
          <Link to="/developers" className="dl-header-logo">
            <span className="dl-header-logo-mark">V</span>
            <span className="dl-header-logo-text">Docs</span>
          </Link>
          <button className="dl-mobile-menu-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
            <CaretRight size={16} style={{ transform: mobileSidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          <div className={`dl-search ${searchFocused ? 'focused' : ''}`}>
            <MagnifyingGlass size={14} className="dl-search-icon" />
            <input type="text" placeholder="Search documentation..." className="dl-search-input"
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            <kbd className="dl-search-kbd">&#8984; K</kbd>
          </div>
        </div>
        <div className="dl-header-right">
          <Link to="/github" className="dl-header-link"><GithubLogo size={16} /></Link>
          <span className="dl-header-version">v2.4.1</span>
        </div>
      </header>

      <div className="dl-layout">
        {/* ─── Sidebar ──────────────────────────────────────────────── */}
        <aside className={`dl-sidebar ${mobileSidebarOpen ? 'dl-sidebar--open' : ''}`}>
          <nav className="dl-sidebar-nav">
            {sidebarState.map((section, si) => {
              const isActive = section.title === currentSection?.title;
              return (
                <div key={section.title} className="dl-sidebar-section">
                  <button className={`dl-sidebar-section-title ${isActive ? 'active' : ''}`} onClick={() => toggleSection(si)}>
                    {section.collapsed ? <CaretRight size={14} /> : <CaretDown size={14} />}
                    {section.title}
                  </button>
                  {!section.collapsed && (
                    <div className="dl-sidebar-items">
                      {section.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`dl-sidebar-link ${item.path === path ? 'active' : ''}`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ─── Content ──────────────────────────────────────────────── */}
        <main className="dl-content">
          <div className="dl-content-inner">
            {/* Breadcrumb */}
            <div className="dl-breadcrumb">
              <Link to="/docs">Docs</Link>
              <CaretRight size={12} />
              {page && (
                <>
                  <span>{page.category}</span>
                  <CaretRight size={12} />
                  <span>{page.title}</span>
                </>
              )}
            </div>

            {/* Page Content */}
            <article className="dl-article">
              <PageContent slug={path} />
            </article>

            {/* Was this helpful */}
            <div className="dl-helpful">
              <span className="dl-helpful-text">Was this page helpful?</span>
              <button className="dl-helpful-btn">Yes</button>
              <button className="dl-helpful-btn">No</button>
            </div>

            {/* Edit on GitHub */}
            <div className="dl-edit-link">
              <Link to="/github">
                <GithubLogo size={13} /> Edit this page on GitHub
              </Link>
            </div>

            {/* Prev / Next */}
            {page && (
              <div className="dl-nav-bottom">
                {page.prev ? (
                  <Link to={page.prev.path} className="dl-nav-prev">
                    <ArrowLeft size={14} />
                    <div>
                      <span className="dl-nav-label">Previous</span>
                      <span className="dl-nav-title">{page.prev.label}</span>
                    </div>
                  </Link>
                ) : <div />}
                {page.next ? (
                  <Link to={page.next.path} className="dl-nav-next">
                    <div>
                      <span className="dl-nav-label">Next</span>
                      <span className="dl-nav-title">{page.next.label}</span>
                    </div>
                    <ArrowRight size={14} />
                  </Link>
                ) : <div />}
              </div>
            )}
          </div>
        </main>

        {/* ─── Right TOC ───────────────────────────────────────────── */}
        {page && (
          <aside className="dl-toc">
            <span className="dl-toc-title">On This Page</span>
            <nav className="dl-toc-nav">
              {page.toc.map((item) => (
                <a key={item.slug} href={`#${item.slug}`} className="dl-toc-link"
                  onClick={(e) => { e.preventDefault(); document.getElementById(item.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
