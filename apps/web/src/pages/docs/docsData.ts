export type DocPage = {
  title: string;
  description: string;
  category: string;
  prev?: { label: string; path: string };
  next?: { label: string; path: string };
  toc: { label: string; slug: string }[];
  content: string;
};

export type DocsSidebarSection = {
  title: string;
  items: { label: string; path: string }[];
  collapsed?: boolean;
};

export const SIDEBAR: DocsSidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', path: '/docs/getting-started/introduction' },
      { label: 'Quickstart', path: '/docs/getting-started/quickstart' },
      { label: 'Authentication', path: '/docs/getting-started/authentication' },
      { label: 'API Keys', path: '/docs/getting-started/api-keys' },
    ],
  },
  {
    title: 'Datasets',
    items: [
      { label: 'Overview', path: '/docs/datasets/overview' },
      { label: 'Uploading', path: '/docs/datasets/uploading' },
      { label: 'Marketplace', path: '/docs/datasets/marketplace' },
      { label: 'Verification', path: '/docs/datasets/verification' },
    ],
  },
  {
    title: 'SDK',
    items: [
      { label: 'JavaScript', path: '/docs/sdk/javascript' },
      { label: 'Python', path: '/docs/sdk/python' },
      { label: 'Rust', path: '/docs/sdk/rust' },
      { label: 'Go', path: '/docs/sdk/go' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'REST API', path: '/docs/api/rest' },
      { label: 'CLI', path: '/docs/cli' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Examples', path: '/docs/resources/examples' },
      { label: 'Tutorials', path: '/docs/resources/tutorials' },
      { label: 'FAQ', path: '/docs/resources/faq' },
      { label: 'Changelog', path: '/docs/resources/changelog' },
    ],
  },
];

export const PAGES: Record<string, DocPage> = {
  '/docs/getting-started/introduction': {
    title: 'Introduction',
    description: 'Verida AI is a trust-first AI dataset marketplace and infrastructure layer built on Shelby Protocol and the Aptos L1 blockchain.',
    category: 'Getting Started',
    prev: { label: 'Docs Home', path: '/docs' },
    next: { label: 'Quickstart', path: '/docs/getting-started/quickstart' },
    toc: [
      { label: 'What is Verida AI', slug: 'what-is-verida' },
      { label: 'Key Features', slug: 'key-features' },
      { label: 'Architecture', slug: 'architecture' },
    ],
    content: 'introduction',
  },
  '/docs/getting-started/quickstart': {
    title: 'Quickstart',
    description: 'Get up and running in 5 minutes.',
    category: 'Getting Started',
    prev: { label: 'Introduction', path: '/docs/getting-started/introduction' },
    next: { label: 'Authentication', path: '/docs/getting-started/authentication' },
    toc: [
      { label: 'Install the SDK', slug: 'install' },
      { label: 'Initialize the Client', slug: 'init' },
      { label: 'Query a Dataset', slug: 'query' },
      { label: 'Upload Data', slug: 'upload' },
    ],
    content: 'quickstart',
  },
  '/docs/getting-started/authentication': {
    title: 'Authentication',
    description: 'Verida AI supports two primary authentication methods.',
    category: 'Getting Started',
    prev: { label: 'Quickstart', path: '/docs/getting-started/quickstart' },
    next: { label: 'API Keys', path: '/docs/getting-started/api-keys' },
    toc: [
      { label: 'API Key Authentication', slug: 'api-key' },
      { label: 'Wallet Authentication', slug: 'wallet' },
    ],
    content: 'authentication',
  },
  '/docs/getting-started/api-keys': {
    title: 'API Keys',
    description: 'Manage your keys in the Verida Dashboard.',
    category: 'Getting Started',
    prev: { label: 'Authentication', path: '/docs/getting-started/authentication' },
    next: { label: 'Dataset Overview', path: '/docs/datasets/overview' },
    toc: [
      { label: 'Creating Keys', slug: 'creating' },
      { label: 'Scopes', slug: 'scopes' },
      { label: 'Security', slug: 'security' },
    ],
    content: 'api-keys',
  },
  '/docs/datasets/overview': {
    title: 'Dataset Overview',
    description: 'Datasets are immutable AI assets stored through Shelby decentralized storage.',
    category: 'Datasets',
    prev: { label: 'API Keys', path: '/docs/getting-started/api-keys' },
    next: { label: 'Uploading', path: '/docs/datasets/uploading' },
    toc: [
      { label: 'Anatomy of a Dataset', slug: 'anatomy' },
      { label: 'Dataset States', slug: 'states' },
      { label: 'Metadata Schema', slug: 'schema' },
    ],
    content: 'dataset-overview',
  },
  '/docs/datasets/uploading': {
    title: 'Uploading Datasets',
    description: 'The upload process ensures data integrity before it hits the blockchain.',
    category: 'Datasets',
    prev: { label: 'Overview', path: '/docs/datasets/overview' },
    next: { label: 'Marketplace', path: '/docs/datasets/marketplace' },
    toc: [
      { label: 'Upload Flow', slug: 'upload-flow' },
      { label: 'Supported Formats', slug: 'formats' },
      { label: 'Code Example', slug: 'code' },
    ],
    content: 'uploading',
  },
  '/docs/datasets/marketplace': {
    title: 'Marketplace',
    description: 'Access thousands of verified datasets.',
    category: 'Datasets',
    prev: { label: 'Uploading', path: '/docs/datasets/uploading' },
    next: { label: 'Verification', path: '/docs/datasets/verification' },
    toc: [
      { label: 'Purchasing Flow', slug: 'purchasing' },
      { label: 'Access Control', slug: 'access' },
      { label: 'Pricing', slug: 'pricing' },
    ],
    content: 'marketplace',
  },
  '/docs/datasets/verification': {
    title: 'Verification',
    description: 'Verify the integrity of any dataset using its on-chain provenance record.',
    category: 'Datasets',
    prev: { label: 'Marketplace', path: '/docs/datasets/marketplace' },
    next: { label: 'JavaScript SDK', path: '/docs/sdk/javascript' },
    toc: [
      { label: 'Integrity Score', slug: 'integrity' },
      { label: 'Verification Method', slug: 'method' },
      { label: 'Code Example', slug: 'code' },
    ],
    content: 'verification',
  },
  '/docs/sdk/javascript': {
    title: 'JavaScript SDK',
    description: 'The official SDK for Node.js and browser environments.',
    category: 'SDK',
    prev: { label: 'Verification', path: '/docs/datasets/verification' },
    next: { label: 'Python SDK', path: '/docs/sdk/python' },
    toc: [
      { label: 'Installation', slug: 'install' },
      { label: 'Features', slug: 'features' },
      { label: 'Quick Example', slug: 'example' },
    ],
    content: 'sdk-js',
  },
  '/docs/sdk/python': {
    title: 'Python SDK',
    description: 'Optimized for ML engineers and data scientists.',
    category: 'SDK',
    prev: { label: 'JavaScript SDK', path: '/docs/sdk/javascript' },
    next: { label: 'Rust SDK', path: '/docs/sdk/rust' },
    toc: [
      { label: 'Installation', slug: 'install' },
      { label: 'Features', slug: 'features' },
      { label: 'Quick Example', slug: 'example' },
    ],
    content: 'sdk-python',
  },
  '/docs/sdk/rust': {
    title: 'Rust SDK',
    description: 'For high-performance infrastructure and blockchain developers.',
    category: 'SDK',
    prev: { label: 'Python SDK', path: '/docs/sdk/python' },
    next: { label: 'Go SDK', path: '/docs/sdk/go' },
    toc: [
      { label: 'Installation', slug: 'install' },
      { label: 'Use Cases', slug: 'use-cases' },
    ],
    content: 'sdk-rust',
  },
  '/docs/sdk/go': {
    title: 'Go SDK',
    description: 'For enterprise backend systems and microservices.',
    category: 'SDK',
    prev: { label: 'Rust SDK', path: '/docs/sdk/rust' },
    next: { label: 'REST API', path: '/docs/api/rest' },
    toc: [
      { label: 'Installation', slug: 'install' },
      { label: 'Use Cases', slug: 'use-cases' },
    ],
    content: 'sdk-go',
  },
  '/docs/api/rest': {
    title: 'REST API',
    description: 'Comprehensive REST API endpoints, parameters, and response schemas.',
    category: 'API Reference',
    prev: { label: 'Go SDK', path: '/docs/sdk/go' },
    next: { label: 'CLI', path: '/docs/cli' },
    toc: [
      { label: 'Base URL', slug: 'base-url' },
      { label: 'Upload Dataset', slug: 'upload' },
      { label: 'List Datasets', slug: 'list' },
      { label: 'Verify Dataset', slug: 'verify' },
      { label: 'Error Codes', slug: 'errors' },
    ],
    content: 'rest-api',
  },
  '/docs/cli': {
    title: 'CLI',
    description: 'Manage Verida AI directly from your terminal.',
    category: 'API Reference',
    prev: { label: 'REST API', path: '/docs/api/rest' },
    next: { label: 'Examples', path: '/docs/resources/examples' },
    toc: [
      { label: 'Installation', slug: 'install' },
      { label: 'Authentication', slug: 'auth' },
      { label: 'Commands', slug: 'commands' },
    ],
    content: 'cli',
  },
  '/docs/resources/examples': {
    title: 'Examples',
    description: 'Open-source reference implementations to get you started.',
    category: 'Resources',
    prev: { label: 'CLI', path: '/docs/cli' },
    next: { label: 'Tutorials', path: '/docs/resources/tutorials' },
    toc: [
      { label: 'AI Chatbot', slug: 'chatbot' },
      { label: 'Dataset Explorer', slug: 'explorer' },
      { label: 'Training Pipeline', slug: 'pipeline' },
      { label: 'Agent Application', slug: 'agent' },
    ],
    content: 'examples',
  },
  '/docs/resources/tutorials': {
    title: 'Tutorials',
    description: 'Step-by-step guides for common use cases.',
    category: 'Resources',
    prev: { label: 'Examples', path: '/docs/resources/examples' },
    next: { label: 'FAQ', path: '/docs/resources/faq' },
    toc: [
      { label: 'Build an AI Agent', slug: 'agent' },
      { label: 'Create a Marketplace', slug: 'marketplace' },
      { label: 'Upload ML Data', slug: 'ml-data' },
      { label: 'Verify Provenance', slug: 'provenance' },
    ],
    content: 'tutorials',
  },
  '/docs/resources/faq': {
    title: 'FAQ',
    description: 'Frequently asked questions about Verida AI.',
    category: 'Resources',
    prev: { label: 'Tutorials', path: '/docs/resources/tutorials' },
    next: { label: 'Changelog', path: '/docs/resources/changelog' },
    toc: [
      { label: 'Blockchain', slug: 'blockchain' },
      { label: 'Data Privacy', slug: 'privacy' },
      { label: 'File Formats', slug: 'formats' },
      { label: 'Pricing', slug: 'pricing' },
    ],
    content: 'faq',
  },
  '/docs/resources/changelog': {
    title: 'Changelog',
    description: 'Latest updates and releases.',
    category: 'Resources',
    prev: { label: 'FAQ', path: '/docs/resources/faq' },
    toc: [
      { label: 'v2.4.1', slug: 'v241' },
      { label: 'v2.4.0', slug: 'v240' },
    ],
    content: 'changelog',
  },
};
