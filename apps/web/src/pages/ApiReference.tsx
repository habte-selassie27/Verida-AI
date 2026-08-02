import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Code, Copy, Check, Key, ShieldCheck, Wallet, Lightning,
  GitBranch, BookOpen, GithubLogo, DiscordLogo, Package,
  Terminal, MagnifyingGlass, CaretRight, Play, Globe, Bell,
  WarningCircle,
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import './ApiReference.css';

/* ─── DATA ───────────────────────────────────────────────────────────── */

const SIDEBAR = [
  { group: 'Overview', items: [
    { id: 'auth', label: 'Authentication', icon: Key },
    { id: 'quickstart', label: 'Quick Start', icon: Lightning },
  ]},
  { group: 'Endpoints', items: [
    { id: 'datasets-list', label: 'List Datasets', method: 'GET', parent: 'Datasets' },
    { id: 'datasets-get', label: 'Get Dataset', method: 'GET', parent: 'Datasets' },
    { id: 'datasets-upload', label: 'Upload Dataset', method: 'POST', parent: 'Datasets' },
    { id: 'datasets-delete', label: 'Delete Dataset', method: 'DELETE', parent: 'Datasets' },
    { id: 'marketplace-browse', label: 'Browse', method: 'GET', parent: 'Marketplace' },
    { id: 'marketplace-purchase', label: 'Purchase', method: 'POST', parent: 'Marketplace' },
    { id: 'verify-dataset', label: 'Verify Dataset', method: 'POST', parent: 'Verification' },
    { id: 'verify-proof', label: 'Proof', method: 'GET', parent: 'Verification' },
    { id: 'users-wallet', label: 'Wallet', method: 'GET', parent: 'Users' },
    { id: 'analytics', label: 'Analytics', method: 'GET', parent: 'Analytics' },
    { id: 'billing', label: 'Billing', method: 'GET', parent: 'Billing' },
  ]},
  { group: 'Reference', items: [
    { id: 'errors', label: 'Errors', icon: WarningCircle },
    { id: 'webhooks', label: 'Webhooks', icon: Bell },
    { id: 'rate-limits', label: 'Rate Limits', icon: ShieldCheck },
  ]},
];

const ENDPOINTS: Record<string, {
  method: string;
  path: string;
  title: string;
  desc: string;
  params?: { name: string; type: string; required: boolean; desc: string }[];
  exampleReq: string;
  exampleRes: string;
  codes: { code: number; label: string }[];
}> = {
  'datasets-list': {
    method: 'GET',
    path: '/v1/datasets',
    title: 'List Datasets',
    desc: 'Returns all public datasets with optional filtering by category, verification status, and pagination.',
    params: [
      { name: 'page', type: 'integer', required: false, desc: 'Page number (default: 1)' },
      { name: 'limit', type: 'integer', required: false, desc: 'Items per page (default: 20, max: 100)' },
      { name: 'category', type: 'string', required: false, desc: 'Filter by category tag' },
      { name: 'verified', type: 'boolean', required: false, desc: 'Only verified datasets' },
      { name: 'search', type: 'string', required: false, desc: 'Full-text search query' },
      { name: 'sort', type: 'string', required: false, desc: 'Sort field: created, quality, price' },
    ],
    exampleReq: `curl -X GET "https://api.verida.ai/v1/datasets?category=nlp&verified=true&limit=10" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": [
    {
      "id": "ds_123",
      "name": "Medical NLP Corpus",
      "description": "Annotated medical text data",
      "category": "nlp",
      "verified": true,
      "price": 50,
      "quality": 98,
      "publisher": "0x1a2b...3c4d",
      "sizeBytes": 524288000,
      "createdAt": "2025-12-01T08:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 247,
    "hasMore": true
  }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 400, label: 'Bad Request' },
      { code: 401, label: 'Unauthorized' },
      { code: 429, label: 'Rate Limited' },
      { code: 500, label: 'Internal Error' },
    ],
  },
  'datasets-get': {
    method: 'GET',
    path: '/v1/datasets/:id',
    title: 'Get Dataset',
    desc: 'Retrieve detailed information about a specific dataset including metadata, quality scores, and provenance data.',
    params: [
      { name: 'id', type: 'string', required: true, desc: 'Dataset ID (e.g., ds_123)' },
    ],
    exampleReq: `curl -X GET "https://api.verida.ai/v1/datasets/ds_123" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": {
    "id": "ds_123",
    "name": "Medical NLP Corpus",
    "description": "Annotated medical text data...",
    "category": "nlp",
    "tags": ["medical", "nlp", "text"],
    "verified": true,
    "tampered": false,
    "price": 50,
    "license": "CC-BY-4.0",
    "quality": {
      "completeness": 96,
      "consistency": 98,
      "uniqueness": 94,
      "validity": 99,
      "coverage": 92,
      "timeliness": 88,
      "overall": 98
    },
    "publisher": {
      "address": "0x1a2b...3c4d",
      "username": "medlab",
      "verified": true
    },
    "provenance": {
      "merkleRoot": "0xabc...def",
      "shelbyBlobId": "blob_456",
      "uploadTxHash": "0x789...012"
    }
  }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 401, label: 'Unauthorized' },
      { code: 404, label: 'Not Found' },
      { code: 500, label: 'Internal Error' },
    ],
  },
  'datasets-upload': {
    method: 'POST',
    path: '/v1/datasets/upload',
    title: 'Upload Dataset',
    desc: 'Upload a new dataset to the marketplace. Returns a job ID for tracking upload progress via WebSocket.',
    params: [
      { name: 'name', type: 'string', required: true, desc: 'Dataset name' },
      { name: 'description', type: 'string', required: true, desc: 'Dataset description' },
      { name: 'category', type: 'string', required: true, desc: 'Category tag' },
      { name: 'tags', type: 'string[]', required: false, desc: 'Array of tags' },
      { name: 'price', type: 'number', required: true, desc: 'Price in APT' },
      { name: 'license', type: 'string', required: false, desc: 'License type' },
    ],
    exampleReq: `curl -X POST "https://api.verida.ai/v1/datasets/upload" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx" \\
  -H "Content-Type: multipart/form-data" \\
  -F "name=Medical NLP Corpus" \\
  -F "description=Annotated medical text" \\
  -F "category=nlp" \\
  -F "price=50" \\
  -F "file=@dataset.zip"`,
    exampleRes: `{
  "data": {
    "jobId": "job_789",
    "status": "processing",
    "wsUrl": "wss://api.verida.ai/ws/uploads/job_789"
  }
}`,
    codes: [
      { code: 201, label: 'Created' },
      { code: 400, label: 'Bad Request' },
      { code: 401, label: 'Unauthorized' },
      { code: 413, label: 'File Too Large' },
      { code: 429, label: 'Rate Limited' },
    ],
  },
  'datasets-delete': {
    method: 'DELETE',
    path: '/v1/datasets/:id',
    title: 'Delete Dataset',
    desc: 'Permanently remove a dataset. Only the original publisher can delete their datasets.',
    params: [
      { name: 'id', type: 'string', required: true, desc: 'Dataset ID' },
    ],
    exampleReq: `curl -X DELETE "https://api.verida.ai/v1/datasets/ds_123" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "status": "success",
  "message": "Dataset ds_123 deleted"
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 401, label: 'Unauthorized' },
      { code: 403, label: 'Forbidden' },
      { code: 404, label: 'Not Found' },
    ],
  },
  'marketplace-browse': {
    method: 'GET',
    path: '/v1/marketplace/datasets',
    title: 'Browse Marketplace',
    desc: 'Browse all available datasets in the marketplace with advanced filtering and sorting.',
    params: [
      { name: 'page', type: 'integer', required: false, desc: 'Page number' },
      { name: 'limit', type: 'integer', required: false, desc: 'Items per page' },
      { name: 'category', type: 'string', required: false, desc: 'Filter by category' },
      { name: 'minPrice', type: 'number', required: false, desc: 'Minimum price in APT' },
      { name: 'maxPrice', type: 'number', required: false, desc: 'Maximum price in APT' },
      { name: 'sort', type: 'string', required: false, desc: 'Sort: trending, newest, price_asc, price_desc' },
    ],
    exampleReq: `curl -X GET "https://api.verida.ai/v1/marketplace/datasets?category=cv&sort=trending" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": [
    {
      "id": "ds_456",
      "name": "ImageNet Subset",
      "category": "cv",
      "price": 120,
      "quality": 95,
      "downloads": 1243,
      "trending": true
    }
  ],
  "meta": { "page": 1, "total": 89 }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 400, label: 'Bad Request' },
      { code: 500, label: 'Internal Error' },
    ],
  },
  'marketplace-purchase': {
    method: 'POST',
    path: '/v1/marketplace/purchase',
    title: 'Purchase Dataset',
    desc: 'Initiate a purchase for a dataset. Creates an access session and processes payment.',
    params: [
      { name: 'datasetId', type: 'string', required: true, desc: 'Dataset to purchase' },
      { name: 'paymentMethod', type: 'string', required: false, desc: 'Payment method: apt, card' },
    ],
    exampleReq: `curl -X POST "https://api.verida.ai/v1/marketplace/purchase" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"datasetId": "ds_123", "paymentMethod": "apt"}'`,
    exampleRes: `{
  "data": {
    "purchaseId": "pur_012",
    "sessionId": "sess_345",
    "amount": 50,
    "currency": "APT",
    "status": "completed",
    "accessExpiresAt": "2026-01-01T00:00:00Z"
  }
}`,
    codes: [
      { code: 201, label: 'Created' },
      { code: 400, label: 'Bad Request' },
      { code: 402, label: 'Payment Required' },
      { code: 404, label: 'Dataset Not Found' },
      { code: 409, label: 'Already Purchased' },
    ],
  },
  'verify-dataset': {
    method: 'POST',
    path: '/v1/datasets/:id/verify',
    title: 'Verify Dataset',
    desc: 'Verify the integrity of a dataset against its blockchain provenance record.',
    params: [
      { name: 'id', type: 'string', required: true, desc: 'Dataset ID' },
    ],
    exampleReq: `curl -X POST "https://api.verida.ai/v1/datasets/ds_123/verify" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": {
    "verified": true,
    "tampered": false,
    "merkleRoot": "0xabc...def",
    "onChainRoot": "0xabc...def",
    "match": true,
    "verifiedAt": "2025-12-15T10:30:00Z"
  }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 401, label: 'Unauthorized' },
      { code: 404, label: 'Not Found' },
      { code: 500, label: 'Internal Error' },
    ],
  },
  'verify-proof': {
    method: 'GET',
    path: '/v1/datasets/:id/proof',
    title: 'Get Provenance Proof',
    desc: 'Retrieve the full provenance proof including on-chain receipts and Shelby storage attestation.',
    params: [
      { name: 'id', type: 'string', required: true, desc: 'Dataset ID' },
    ],
    exampleReq: `curl -X GET "https://api.verida.ai/v1/datasets/ds_123/proof" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": {
    "merkleRoot": "0xabc...def",
    "txHash": "0x789...012",
    "blockHeight": 12345678,
    "timestamp": "2025-12-01T08:30:00Z",
    "shelbyReceipt": {
      "blobId": "blob_456",
      "storageProof": "...",
      "replicationFactor": 16
    }
  }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 404, label: 'Not Found' },
    ],
  },
  'users-wallet': {
    method: 'GET',
    path: '/v1/users/:address',
    title: 'Get Wallet Profile',
    desc: 'Retrieve user profile and publishing history for a wallet address.',
    params: [
      { name: 'address', type: 'string', required: true, desc: 'Aptos wallet address' },
    ],
    exampleReq: `curl -X GET "https://api.verida.ai/v1/users/0x1a2b...3c4d" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": {
    "address": "0x1a2b...3c4d",
    "username": "medlab",
    "bio": "Medical AI researcher",
    "totalDatasets": 12,
    "totalEarnings": 4500,
    "verified": true,
    "joinedAt": "2025-06-15T00:00:00Z"
  }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 404, label: 'Not Found' },
    ],
  },
  'analytics': {
    method: 'GET',
    path: '/v1/analytics/overview',
    title: 'Get Analytics',
    desc: 'Get usage analytics including downloads, earnings, and dataset performance metrics.',
    params: [
      { name: 'period', type: 'string', required: false, desc: 'Time period: 7d, 30d, 90d, all' },
    ],
    exampleReq: `curl -X GET "https://api.verida.ai/v1/analytics/period=30d" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": {
    "totalDownloads": 2847,
    "totalEarnings": 12500,
    "activeDatasets": 8,
    "avgQuality": 94.2,
    "topDataset": {
      "id": "ds_123",
      "name": "Medical NLP Corpus",
      "downloads": 1243
    }
  }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 401, label: 'Unauthorized' },
    ],
  },
  'billing': {
    method: 'GET',
    path: '/v1/billing/history',
    title: 'Billing History',
    desc: 'Retrieve transaction history including purchases, sales, and withdrawals.',
    params: [
      { name: 'page', type: 'integer', required: false, desc: 'Page number' },
      { name: 'limit', type: 'integer', required: false, desc: 'Items per page' },
    ],
    exampleReq: `curl -X GET "https://api.verida.ai/v1/billing/history?limit=5" \\
  -H "Authorization: Bearer sk_live_xxxxxxxxx"`,
    exampleRes: `{
  "data": [
    {
      "id": "txn_001",
      "type": "sale",
      "amount": 50,
      "currency": "APT",
      "dataset": "Medical NLP Corpus",
      "buyer": "0x5e6f...7g8h",
      "createdAt": "2025-12-10T14:22:00Z"
    }
  ],
  "meta": { "page": 1, "total": 34 }
}`,
    codes: [
      { code: 200, label: 'Success' },
      { code: 401, label: 'Unauthorized' },
    ],
  },
};

const WEBHOOKS = [
  { event: 'dataset.uploaded', desc: 'Fired when a new dataset finishes processing', retry: '3 retries with exponential backoff' },
  { event: 'purchase.completed', desc: 'Fired when a purchase is confirmed', retry: '3 retries' },
  { event: 'verification.complete', desc: 'Fired after dataset verification finishes', retry: '1 retry' },
  { event: 'payment.received', desc: 'Fired when payment is received for your dataset', retry: '3 retries' },
  { event: 'metadata.updated', desc: 'Fired when dataset metadata is updated', retry: '1 retry' },
];

const SDKS = [
  { name: 'JavaScript', pkg: 'npm install @verida/sdk', lang: 'npm' },
  { name: 'Python', pkg: 'pip install verida-sdk', lang: 'pip' },
  { name: 'Rust', pkg: 'cargo add verida-sdk', lang: 'cargo' },
  { name: 'Go', pkg: 'go get github.com/verida/sdk-go', lang: 'go' },
  { name: 'Java', pkg: 'implementation "ai.verida:sdk:1.0.0"', lang: 'gradle' },
];

const CHANGELOG = [
  { version: 'v1.2.0', date: 'Dec 2025', changes: ['Added Verification API', 'Added Provenance Proof endpoint', 'Improved rate limit headers'] },
  { version: 'v1.1.0', date: 'Nov 2025', changes: ['Added Marketplace API', 'Added Purchase endpoint', 'Added Billing History'] },
  { version: 'v1.0.0', date: 'Oct 2025', changes: ['Initial API release', 'Datasets CRUD', 'Authentication', 'Analytics'] },
];

const RATE_LIMITS = [
  { tier: 'Free', limit: '100/hour', color: '#9AA3B2' },
  { tier: 'Builder', limit: '1,000/hour', color: '#8B5CF6' },
  { tier: 'Pro', limit: '10,000/hour', color: '#ff007f' },
  { tier: 'Enterprise', limit: 'Unlimited', color: '#00E5FF' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: '#4ade80',
  POST: '#60a5fa',
  PUT: '#fbbf24',
  DELETE: '#f87171',
  PATCH: '#c084fc',
};

/* ─── HELPERS ─────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="api-copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className="api-method-badge"
      style={{ color: METHOD_COLORS[method], borderColor: `${METHOD_COLORS[method]}33` }}
    >
      {method}
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.06 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */

export default function ApiReference() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('auth');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [playgroundMethod, setPlaygroundMethod] = useState('GET');
  const [playgroundPath, setPlaygroundPath] = useState('/v1/datasets');
  const [playgroundBody, setPlaygroundBody] = useState('');
  const [playgroundResponse, setPlaygroundResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedWebhook, setExpandedWebhook] = useState<number | null>(null);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [expandedChangelog, setExpandedChangelog] = useState<number | null>(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const filteredSidebar = SIDEBAR.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(group => group.items.length > 0);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setSidebarOpen(false);
    const el = document.getElementById(`api-section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePlaygroundSend = () => {
    setSending(true);
    setTimeout(() => {
      const ep = Object.values(ENDPOINTS).find(e => e.path === playgroundPath);
      setPlaygroundResponse(ep?.exampleRes || '{\n  "status": "success"\n}');
      setSending(false);
    }, 800);
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-api-section]');
      let current = 'auth';
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 120) {
          current = section.getAttribute('data-api-section') || 'auth';
        }
      });
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const errors = [
    { code: 400, label: 'Bad Request', desc: 'The request body is malformed or missing required fields.', color: '#f59e0b' },
    { code: 401, label: 'Unauthorized', desc: 'Invalid or missing API key. Check your Authorization header.', color: '#f87171' },
    { code: 403, label: 'Forbidden', desc: 'You do not have permission to access this resource.', color: '#f87171' },
    { code: 404, label: 'Not Found', desc: 'The requested dataset or endpoint does not exist.', color: '#9AA3B2' },
    { code: 409, label: 'Conflict', desc: 'A resource with the same identifier already exists.', color: '#f59e0b' },
    { code: 413, label: 'Payload Too Large', desc: 'The uploaded file exceeds the maximum size limit.', color: '#f59e0b' },
    { code: 429, label: 'Too Many Requests', desc: 'Rate limit exceeded. Check Retry-After header.', color: '#ff007f' },
    { code: 500, label: 'Internal Server Error', desc: 'Something went wrong on our end. Try again later.', color: '#f87171' },
  ];

  return (
    <div className="api-ref">
      {/* ── MOBILE SIDEBAR TOGGLE ── */}
      <button className="api-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Terminal size={18} />
        <span>Menu</span>
      </button>

      {/* ── SIDEBAR ── */}
      <aside className={`api-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="api-sidebar-inner">
          <div className="api-sidebar-search">
            <MagnifyingGlass size={14} />
            <input
              type="text"
              placeholder="Search endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <nav className="api-sidebar-nav">
            {filteredSidebar.map((group) => (
              <div key={group.group} className="api-sidebar-group">
                <span className="api-sidebar-group-label">{group.group}</span>
                {group.items.map((item) => {
                  const isOverview = 'icon' in item;
                  return (
                    <button
                      key={item.id}
                      className={`api-sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => scrollTo(item.id)}
                    >
                      {isOverview && <item.icon size={14} />}
                      {!isOverview && 'method' in item && <MethodBadge method={item.method} />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── OVERLAY ── */}
      {sidebarOpen && <div className="api-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── MAIN CONTENT ── */}
      <main className="api-main" ref={mainRef}>

        {/* ═══ HERO ═══ */}
        <section className="api-hero">
          <div className="api-hero-left">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <span className="section-label"><Code size={13} /> API Reference</span>
              <h1 className="api-hero-title">
                VERIDA AI <span className="grad">API</span>
              </h1>
              <p className="api-hero-desc">
                Build AI-powered applications with trusted datasets and blockchain verification.
              </p>
              <div className="api-hero-tags">
                <span className="api-tag">REST API</span>
                <span className="api-tag">Version v1.0</span>
                <span className="api-tag">HTTPS</span>
                <span className="api-tag">JSON</span>
              </div>
              <div className="api-hero-actions">
                <Button variant="primary" icon={<Key size={16} />} onClick={() => scrollTo('auth')}>
                  Get API Key
                </Button>
                <Button variant="ghost" icon={<Play size={16} />} onClick={() => scrollTo('quickstart')}>
                  Open Playground
                </Button>
              </div>
            </motion.div>
          </div>
          <motion.div
            className="api-hero-right"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="api-hero-stat-card">
              <div className="api-hero-stat-row">
                <span className="api-hero-stat-label">POST /v1/datasets</span>
                <span className="api-hero-stat-badge">✓ 200 OK</span>
              </div>
              <div className="api-hero-stat-row">
                <span className="api-hero-stat-label">Latency</span>
                <span className="api-hero-stat-value cyan">120 ms</span>
              </div>
              <div className="api-hero-stat-row">
                <span className="api-hero-stat-label">Availability</span>
                <span className="api-hero-stat-value green">99.98%</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══ BASE URL ═══ */}
        <section className="api-section" data-api-section="base-url">
          <h2 className="api-section-title">Base URL</h2>
          <div className="api-base-url-grid">
            <div className="api-base-url-card">
              <div className="api-base-url-label">
                <Globe size={14} /> Production
              </div>
              <div className="api-base-url-row">
                <code>https://api.verida.ai/v1</code>
                <CopyButton text="https://api.verida.ai/v1" />
              </div>
            </div>
            <div className="api-base-url-card">
              <div className="api-base-url-label">
                <Lightning size={14} /> Sandbox
              </div>
              <div className="api-base-url-row">
                <code>https://sandbox.api.verida.ai/v1</code>
                <CopyButton text="https://sandbox.api.verida.ai/v1" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══ AUTHENTICATION ═══ */}
        <section className="api-section" data-api-section="auth" id="api-section-auth">
          <h2 className="api-section-title">Authentication</h2>
          <p className="api-section-desc">
            All API requests require authentication via a Bearer token in the Authorization header.
          </p>
          <div className="api-auth-card">
            <div className="api-auth-header">
              <Key size={16} />
              <span>Authorization</span>
            </div>
            <div className="api-auth-code">
              <code>Bearer YOUR_API_KEY</code>
              <CopyButton text="Bearer YOUR_API_KEY" />
            </div>
          </div>
          <div className="api-code-block">
            <div className="api-code-header">
              <span>Example Request</span>
              <CopyButton text={`GET /v1/datasets HTTP/1.1\nHost: api.verida.ai\nAuthorization: Bearer sk_live_xxxxxxxxx\nContent-Type: application/json`} />
            </div>
            <pre className="api-code">{`GET /v1/datasets HTTP/1.1
Host: api.verida.ai
Authorization: Bearer sk_live_xxxxxxxxx
Content-Type: application/json`}</pre>
          </div>
          <div className="api-auth-methods">
            <div className="api-auth-method">
              <ShieldCheck size={16} />
              <div>
                <strong>API Keys</strong>
                <p>Generate keys from your dashboard. Supports read-only and full-access scopes.</p>
              </div>
            </div>
            <div className="api-auth-method">
              <Wallet size={16} />
              <div>
                <strong>Wallet Authentication</strong>
                <p>Sign a message with your Aptos wallet for session-based access.</p>
              </div>
            </div>
            <div className="api-auth-method">
              <ShieldCheck size={16} />
              <div>
                <strong>OAuth (Coming Soon)</strong>
                <p>OAuth 2.0 flow for third-party integrations and delegated access.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ QUICK START / PLAYGROUND ═══ */}
        <section className="api-section" data-api-section="quickstart" id="api-section-quickstart">
          <h2 className="api-section-title">API Playground</h2>
          <p className="api-section-desc">
            Test API endpoints directly from the browser.
          </p>
          <div className="api-playground">
            <div className="api-playground-controls">
              <div className="api-playground-method-row">
                <select
                  className="api-playground-method"
                  value={playgroundMethod}
                  onChange={(e) => setPlaygroundMethod(e.target.value)}
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <input
                  className="api-playground-path"
                  value={playgroundPath}
                  onChange={(e) => setPlaygroundPath(e.target.value)}
                  placeholder="/v1/endpoint"
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play size={14} />}
                  onClick={handlePlaygroundSend}
                  loading={sending}
                >
                  Send
                </Button>
              </div>
              <div className="api-playground-tabs">
                <span className="api-playground-tab active">Headers</span>
                <span className="api-playground-tab">Body</span>
                <span className="api-playground-tab">Params</span>
              </div>
              <div className="api-playground-headers">
                <div className="api-playground-header-row">
                  <span className="api-playground-header-key">Authorization</span>
                  <input
                    className="api-playground-header-val"
                    defaultValue="Bearer sk_live_xxxxxxxxx"
                    readOnly
                  />
                </div>
                <div className="api-playground-header-row">
                  <span className="api-playground-header-key">Content-Type</span>
                  <input
                    className="api-playground-header-val"
                    defaultValue="application/json"
                    readOnly
                  />
                </div>
              </div>
              {playgroundMethod === 'POST' && (
                <div className="api-playground-body-area">
                  <textarea
                    className="api-playground-body"
                    value={playgroundBody}
                    onChange={(e) => setPlaygroundBody(e.target.value)}
                    placeholder='{"name": "My Dataset", "category": "nlp"}'
                    rows={6}
                  />
                </div>
              )}
            </div>
            <div className="api-playground-response">
              <div className="api-playground-response-header">
                <span>Response</span>
                {playgroundResponse && (
                  <span className="api-playground-status">200 OK</span>
                )}
              </div>
              <pre className="api-playground-response-body">
                {playgroundResponse || '// Response will appear here after sending a request'}
              </pre>
            </div>
          </div>
        </section>

        {/* ═══ ENDPOINTS ═══ */}
        {Object.entries(ENDPOINTS).map(([id, ep]) => (
          <section key={id} className="api-section api-endpoint-section" data-api-section={id} id={`api-section-${id}`}>
            <div className="api-endpoint-title-row">
              <MethodBadge method={ep.method} />
              <code className="api-endpoint-path">{ep.path}</code>
            </div>
            <h3 className="api-endpoint-heading">{ep.title}</h3>
            <p className="api-section-desc">{ep.desc}</p>

            {ep.params && ep.params.length > 0 && (
              <>
                <h4 className="api-subsection-title">Parameters</h4>
                <div className="api-params-table">
                  <div className="api-params-header">
                    <span>Name</span>
                    <span>Type</span>
                    <span>Required</span>
                    <span>Description</span>
                  </div>
                  {ep.params.map((p) => (
                    <div key={p.name} className="api-params-row">
                      <code className="api-param-name">{p.name}</code>
                      <span className="api-param-type">{p.type}</span>
                      <span className={`api-param-required ${p.required ? 'yes' : ''}`}>
                        {p.required ? 'Required' : 'Optional'}
                      </span>
                      <span className="api-param-desc">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="api-code-block">
              <div className="api-code-header">
                <span>Example Request</span>
                <CopyButton text={ep.exampleReq} />
              </div>
              <pre className="api-code">{ep.exampleReq}</pre>
            </div>

            <div className="api-code-block">
              <div className="api-code-header">
                <span>Response</span>
              </div>
              <pre className="api-code">{ep.exampleRes}</pre>
            </div>

            <div className="api-response-codes">
              <h4 className="api-subsection-title">Response Codes</h4>
              <div className="api-response-codes-grid">
                {ep.codes.map((c) => (
                  <div key={c.code} className="api-response-code">
                    <span className="api-response-code-num" style={{
                      color: c.code < 300 ? '#4ade80' : c.code < 500 ? '#f59e0b' : '#f87171'
                    }}>{c.code}</span>
                    <span className="api-response-code-label">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* ═══ RATE LIMITS ═══ */}
        <section className="api-section" data-api-section="rate-limits" id="api-section-rate-limits">
          <h2 className="api-section-title">Rate Limits</h2>
          <p className="api-section-desc">
            Rate limits are applied per API key. Exceeding the limit returns a 429 status code.
          </p>
          <div className="api-rate-grid">
            {RATE_LIMITS.map((rl) => (
              <div key={rl.tier} className="api-rate-card" style={{ borderColor: `${rl.color}33` }}>
                <div className="api-rate-tier" style={{ color: rl.color }}>{rl.tier}</div>
                <div className="api-rate-limit">{rl.limit}</div>
                <div className="api-rate-bar">
                  <div className="api-rate-bar-fill" style={{
                    width: rl.tier === 'Enterprise' ? '100%' :
                           rl.tier === 'Pro' ? '75%' :
                           rl.tier === 'Builder' ? '40%' : '15%',
                    background: rl.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div className="api-rate-headers">
            <h4 className="api-subsection-title">Rate Limit Headers</h4>
            <div className="api-code-block">
              <pre className="api-code">{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1703980800
Retry-After: 3600  (only on 429)`}</pre>
            </div>
          </div>
        </section>

        {/* ═══ ERRORS ═══ */}
        <section className="api-section" data-api-section="errors" id="api-section-errors">
          <h2 className="api-section-title">Error Reference</h2>
          <p className="api-section-desc">
            All errors return a consistent JSON body with a machine-readable code and human-readable message.
          </p>
          <div className="api-errors-list">
            {errors.map((err, i) => (
              <div
                key={err.code}
                className={`api-error-item ${expandedError === i ? 'expanded' : ''}`}
                onClick={() => setExpandedError(expandedError === i ? null : i)}
              >
                <div className="api-error-header">
                  <span className="api-error-code" style={{ color: err.color }}>{err.code}</span>
                  <span className="api-error-label">{err.label}</span>
                  <CaretRight size={14} className="api-error-chevron" />
                </div>
                {expandedError === i && (
                  <div className="api-error-body" onClick={(e) => e.stopPropagation()}>
                    <p>{err.desc}</p>
                    <div className="api-code-block">
                      <pre className="api-code">{`{
  "error": {
    "code": ${err.code},
    "message": "${err.label}",
    "details": "..."
  }
}`}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ WEBHOOKS ═══ */}
        <section className="api-section" data-api-section="webhooks" id="api-section-webhooks">
          <h2 className="api-section-title">Webhooks</h2>
          <p className="api-section-desc">
            Receive real-time notifications when events occur on your datasets or account.
          </p>
          <div className="api-webhooks-list">
            {WEBHOOKS.map((wh, i) => (
              <div
                key={wh.event}
                className={`api-webhook-item ${expandedWebhook === i ? 'expanded' : ''}`}
                onClick={() => setExpandedWebhook(expandedWebhook === i ? null : i)}
              >
                <div className="api-webhook-header">
                  <Bell size={14} />
                  <code className="api-webhook-event">{wh.event}</code>
                  <span className="api-webhook-desc">{wh.desc}</span>
                  <CaretRight size={14} className="api-webhook-chevron" />
                </div>
                {expandedWebhook === i && (
                  <div className="api-webhook-body" onClick={(e) => e.stopPropagation()}>
                    <div className="api-webhook-detail">
                      <span className="api-webhook-detail-label">Retry Policy</span>
                      <span>{wh.retry}</span>
                    </div>
                    <div className="api-code-block">
                      <div className="api-code-header">
                        <span>Example Payload</span>
                      </div>
                      <pre className="api-code">{`{
  "event": "${wh.event}",
  "timestamp": "2025-12-15T10:30:00Z",
  "data": {
    "id": "ds_123",
    "status": "completed"
  }
}`}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ SDKs ═══ */}
        <section className="api-section">
          <h2 className="api-section-title">SDKs & Libraries</h2>
          <p className="api-section-desc">
            Official client libraries to accelerate your integration.
          </p>
          <div className="api-sdk-grid">
            {SDKS.map((sdk) => (
              <div key={sdk.name} className="api-sdk-card">
                <div className="api-sdk-name">{sdk.name}</div>
                <div className="api-sdk-install">
                  <code>{sdk.pkg}</code>
                  <CopyButton text={sdk.pkg} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ CHANGELOG ═══ */}
        <section className="api-section">
          <h2 className="api-section-title">Changelog</h2>
          <div className="api-changelog">
            {CHANGELOG.map((entry, i) => (
              <div
                key={entry.version}
                className={`api-changelog-item ${expandedChangelog === i ? 'expanded' : ''}`}
                onClick={() => setExpandedChangelog(expandedChangelog === i ? null : i)}
              >
                <div className="api-changelog-header">
                  <div className="api-changelog-version">
                    <GitBranch size={14} />
                    <span>{entry.version}</span>
                  </div>
                  <span className="api-changelog-date">{entry.date}</span>
                  <CaretRight size={14} className="api-changelog-chevron" />
                </div>
                {expandedChangelog === i && (
                  <ul className="api-changelog-changes">
                    {entry.changes.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ STATUS ═══ */}
        <section className="api-section">
          <h2 className="api-section-title">API Status</h2>
          <div className="api-status-grid">
            <div className="api-status-card">
              <span className="api-status-label">Status</span>
              <span className="api-status-value green">
                <span className="api-status-dot" />
                Operational
              </span>
            </div>
            <div className="api-status-card">
              <span className="api-status-label">Latency</span>
              <span className="api-status-value cyan">118 ms</span>
            </div>
            <div className="api-status-card">
              <span className="api-status-label">Requests</span>
              <span className="api-status-value">2.8M/day</span>
            </div>
            <div className="api-status-card">
              <span className="api-status-label">Version</span>
              <span className="api-status-value pink">1.2.0</span>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER CTA ═══ */}
        <section className="api-section api-footer-cta">
          <div className="api-footer-cta-inner">
            <h2 className="api-footer-cta-title">Need more?</h2>
            <div className="api-footer-cta-links">
              <Button variant="ghost" icon={<BookOpen size={16} />} onClick={() => navigate('/docs')}>
                View Docs
              </Button>
              <Button variant="ghost" icon={<Package size={16} />} onClick={() => navigate('/sdk')}>
                SDK
              </Button>
              <Button variant="ghost" icon={<DiscordLogo size={16} />}>
                Discord
              </Button>
              <Button variant="ghost" icon={<GithubLogo size={16} />}>
                GitHub
              </Button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
