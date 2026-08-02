import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Terminal, Copy, Check, Play, BookOpen, GithubLogo, DiscordLogo,
  Lightning, ShieldCheck, Key, Globe, Database, Wallet, ChartBar,
  Package, Gear, CaretRight, ArrowRight,
  HardDrive, Code, FolderOpen,
  Download, ShoppingCart, Upload, GitBranch,
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import './CLI.css';

/* ─── DATA ───────────────────────────────────────────────────────────── */

const INSTALL_TABS = [
  { id: 'npm', label: 'npm', cmd: 'npm install -g @verida/cli' },
  { id: 'homebrew', label: 'Homebrew', cmd: 'brew install verida-cli' },
  { id: 'cargo', label: 'Cargo', cmd: 'cargo install verida-cli' },
  { id: 'docker', label: 'Docker', cmd: 'docker pull verida/cli:latest' },
  { id: 'binary', label: 'Binary', cmd: 'curl -fsSL https://cli.verida.ai/install.sh | sh' },
];

const PLATFORMS = [
  { os: 'macOS', items: ['Apple Silicon', 'Intel'], icon: '🍎' },
  { os: 'Linux', items: ['Ubuntu', 'Debian', 'Fedora'], icon: '🐧' },
  { os: 'Windows', items: ['PowerShell', 'WSL', 'Chocolatey'], icon: '🪟' },
];

const COMMON_COMMANDS = [
  { icon: Upload, cmd: 'verida upload', desc: 'Upload a dataset', color: '#4ade80' },
  { icon: Database, cmd: 'verida datasets list', desc: 'Browse marketplace', color: '#60a5fa' },
  { icon: ShieldCheck, cmd: 'verida verify', desc: 'Verify dataset', color: '#00E5FF' },
  { icon: Code, cmd: 'verida deploy', desc: 'Deploy metadata', color: '#8B5CF6' },
  { icon: Wallet, cmd: 'verida wallet', desc: 'Manage wallet', color: '#fbbf24' },
  { icon: ChartBar, cmd: 'verida analytics', desc: 'View analytics', color: '#ff007f' },
];

const COMMAND_CATEGORIES = [
  { id: 'auth', label: 'Authentication', icon: Key },
  { id: 'datasets', label: 'Datasets', icon: Database },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'verify', label: 'Verification', icon: ShieldCheck },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'analytics', label: 'Analytics', icon: ChartBar },
  { id: 'deploy', label: 'Deployments', icon: Lightning },
  { id: 'config', label: 'Configuration', icon: Gear },
  { id: 'plugins', label: 'Plugins', icon: Package },
  { id: 'utils', label: 'Utilities', icon: Terminal },
];

const COMMANDS: Record<string, {
  cmd: string;
  desc: string;
  args?: { name: string; required: boolean; desc: string }[];
  flags?: { name: string; desc: string }[];
  example: string;
  output: string;
  related?: string[];
}[]> = {
  auth: [
    {
      cmd: 'verida login',
      desc: 'Authenticate with your Verida account via browser or API key.',
      args: [],
      flags: [
        { name: '--token <key>', desc: 'Login with an API key directly' },
        { name: '--network <env>', desc: 'Target network: production, sandbox' },
      ],
      example: `verida login --network production`,
      output: `✓ Connected to production network
✓ Wallet: 0x1a2b...3c4d
✓ Authenticated as medlab`,
    },
    {
      cmd: 'verida logout',
      desc: 'Sign out and clear stored credentials.',
      example: `verida logout`,
      output: `✓ Logged out successfully`,
    },
    {
      cmd: 'verida whoami',
      desc: 'Display current authenticated user and wallet info.',
      example: `verida whoami`,
      output: `User:       medlab
Wallet:     0x1a2b...3c4d
Network:    production
Role:       publisher
Datasets:   14`,
    },
  ],
  datasets: [
    {
      cmd: 'verida upload <path>',
      desc: 'Upload a dataset to the marketplace with automatic verification.',
      args: [
        { name: 'path', required: true, desc: 'Dataset directory or file' },
      ],
      flags: [
        { name: '--license <type>', desc: 'License type (MIT, CC-BY, etc.)' },
        { name: '--price <apt>', desc: 'Price in APT tokens' },
        { name: '--private', desc: 'Upload as private dataset' },
        { name: '--verify', desc: 'Run verification after upload' },
        { name: '--tags <tags>', desc: 'Comma-separated tags' },
      ],
      example: `verida upload ./medical-images \\
  --license CC-BY-4.0 \\
  --price 25 \\
  --verify \\
  --tags medical,nlp,text`,
      output: `⠋ Analyzing dataset...
✓ Content detected: images (DICOM)
✓ Quality score: 96/100
✓ Uploading to Shelby Protocol...
✓ Verified on blockchain
✓ Published to marketplace

  Dataset ID:    ds_12934
  Price:         25 APT
  Verification:  ✓ Passed`,
    },
    {
      cmd: 'verida datasets list',
      desc: 'List your datasets or browse the marketplace.',
      flags: [
        { name: '--mine', desc: 'Show only your datasets' },
        { name: '--category <cat>', desc: 'Filter by category' },
        { name: '--sort <field>', desc: 'Sort: newest, trending, price' },
        { name: '--limit <n>', desc: 'Number of results (default: 20)' },
      ],
      example: `verida datasets list --mine --sort newest`,
      output: `Found 142 datasets

  ds_12934  Medical NLP Corpus      25 APT   ✓ Verified
  ds_12935  ImageNet Subset         120 APT  ✓ Verified
  ds_12936  Financial Timeseries    80 APT   ✓ Verified
  ds_12937  Audio Speech Set        45 APT   Pending

  Showing 4 of 142`,
    },
    {
      cmd: 'verida datasets get <id>',
      desc: 'Get detailed information about a specific dataset.',
      args: [
        { name: 'id', required: true, desc: 'Dataset ID' },
      ],
      example: `verida datasets get ds_12934`,
      output: `Dataset:     Medical NLP Corpus
ID:          ds_12934
Category:    nlp
Quality:     96/100
Price:       25 APT
Downloads:   1,243
Publisher:   0x1a2b...3c4d
License:     CC-BY-4.0
Provenance:  ✓ Verified on Aptos L1`,
    },
    {
      cmd: 'verida datasets delete <id>',
      desc: 'Permanently remove a dataset from the marketplace.',
      args: [
        { name: 'id', required: true, desc: 'Dataset ID' },
      ],
      flags: [
        { name: '--force', desc: 'Skip confirmation prompt' },
      ],
      example: `verida datasets delete ds_12934 --force`,
      output: `✓ Dataset ds_12934 deleted`,
    },
  ],
  marketplace: [
    {
      cmd: 'verida browse',
      desc: 'Browse available datasets in the marketplace.',
      flags: [
        { name: '--category <cat>', desc: 'Filter by category' },
        { name: '--search <query>', desc: 'Search datasets' },
        { name: '--max-price <apt>', desc: 'Maximum price filter' },
      ],
      example: `verida browse --category medical --max-price 50`,
      output: `Found 23 datasets in "medical" under 50 APT

  ds_12934  Medical NLP Corpus      25 APT   ✓ Verified
  ds_12940  Radiology Captions      40 APT   ✓ Verified
  ds_12945  Clinical Notes NLP      15 APT   ✓ Verified`,
    },
    {
      cmd: 'verida search <query>',
      desc: 'Full-text search across all marketplace datasets.',
      args: [
        { name: 'query', required: true, desc: 'Search query' },
      ],
      example: `verida search "medical imaging"`,
      output: `Found 8 results for "medical imaging"

  ds_12934  Medical NLP Corpus      25 APT
  ds_12940  Radiology Captions      40 APT
  ds_12951  X-Ray Annotations       60 APT`,
    },
    {
      cmd: 'verida purchase <id>',
      desc: 'Purchase access to a dataset.',
      args: [
        { name: 'id', required: true, desc: 'Dataset ID' },
      ],
      example: `verida purchase ds_12934`,
      output: `✓ Purchased Medical NLP Corpus
  Amount:     25 APT
  Session:    sess_345
  Expires:    2026-01-01T00:00:00Z`,
    },
  ],
  storage: [
    {
      cmd: 'verida sync',
      desc: 'Sync local files with Shelby Protocol storage.',
      flags: [
        { name: '--force', desc: 'Force full re-sync' },
        { name: '--dry-run', desc: 'Preview changes without applying' },
      ],
      example: `verida sync --dry-run`,
      output: `Sync preview:
  Upload:  3 files (12.4 MB)
  Update:  1 file (2.1 MB)
  Delete:  0 files`,
    },
    {
      cmd: 'verida pin <hash>',
      desc: 'Pin a blob to permanent storage.',
      args: [
        { name: 'hash', required: true, desc: 'Content hash or blob ID' },
      ],
      example: `verida pin blob_456`,
      output: `✓ Pinned blob_456 to 16 storage nodes`,
    },
    {
      cmd: 'verida export <id>',
      desc: 'Download a dataset to local storage.',
      args: [
        { name: 'id', required: true, desc: 'Dataset ID' },
      ],
      flags: [
        { name: '--output <dir>', desc: 'Output directory' },
      ],
      example: `verida export ds_12934 --output ./data`,
      output: `✓ Downloaded Medical NLP Corpus
  Size:     524 MB
  Path:     ./data/medical-nlp-corpus/`,
    },
  ],
  verify: [
    {
      cmd: 'verida verify <id>',
      desc: 'Verify dataset integrity against blockchain provenance.',
      args: [
        { name: 'id', required: true, desc: 'Dataset ID' },
      ],
      example: `verida verify ds_12934`,
      output: `✓ Verification complete

  Status:      Verified
  Merkle:     0xabc...def
  On-chain:   0xabc...def
  Match:      ✓
  Block:      12345678`,
    },
  ],
  wallet: [
    {
      cmd: 'verida wallet connect',
      desc: 'Connect an Aptos wallet for transactions.',
      example: `verida wallet connect`,
      output: `✓ Wallet connected
  Address:  0x1a2b...3c4d
  Balance:  1,250 APT
  Network:  Aptos Mainnet`,
    },
    {
      cmd: 'verida wallet balance',
      desc: 'Check wallet balance and recent transactions.',
      example: `verida wallet balance`,
      output: `Balance: 1,250 APT

Recent transactions:
  +50 APT   Sale: Medical NLP Corpus
  -25 APT   Purchase: ImageNet Subset
  +80 APT   Sale: Financial Timeseries`,
    },
  ],
  projects: [
    {
      cmd: 'verida init',
      desc: 'Initialize a new Verida project in the current directory.',
      flags: [
        { name: '--name <name>', desc: 'Project name' },
        { name: '--template <type>', desc: 'Template: blank, dataset, marketplace' },
      ],
      example: `verida init --name my-project --template dataset`,
      output: `✓ Created verida.config.yaml
✓ Initialized project "my-project"
✓ Template: dataset`,
    },
    {
      cmd: 'verida deploy',
      desc: 'Deploy project metadata and configuration.',
      example: `verida deploy`,
      output: `✓ Validating configuration...
✓ Uploading metadata to Shelby...
✓ Anchored to Aptos L1
✓ Deployed successfully

  Project:  my-project
  Version:  1.0.0
  TX:       0x789...012`,
    },
  ],
  analytics: [
    {
      cmd: 'verida analytics usage',
      desc: 'View usage analytics and download metrics.',
      flags: [
        { name: '--period <range>', desc: 'Time period: 7d, 30d, 90d' },
      ],
      example: `verida analytics usage --period 30d`,
      output: `Usage (last 30 days):
  Downloads:     2,847
  Unique users:  412
  Top dataset:   Medical NLP Corpus (1,243)
  Avg quality:   94.2/100`,
    },
    {
      cmd: 'verida analytics revenue',
      desc: 'View earnings and transaction history.',
      example: `verida analytics revenue`,
      output: `Revenue:
  Total:     12,500 APT
  This month: 2,100 APT
  Pending:    350 APT

  Top earning: Medical NLP Corpus (4,500 APT)`,
    },
  ],
  config: [
    {
      cmd: 'verida config get <key>',
      desc: 'Read a configuration value.',
      args: [
        { name: 'key', required: true, desc: 'Config key (e.g., network)' },
      ],
      example: `verida config get network`,
      output: `production`,
    },
    {
      cmd: 'verida config set <key> <value>',
      desc: 'Update a configuration value.',
      args: [
        { name: 'key', required: true, desc: 'Config key' },
        { name: 'value', required: true, desc: 'New value' },
      ],
      example: `verida config set network sandbox`,
      output: `✓ network set to sandbox`,
    },
    {
      cmd: 'verida doctor',
      desc: 'Diagnose common issues and verify installation.',
      example: `verida doctor`,
      output: `Verida CLI Doctor

  ✓ CLI installed (v2.1.0)
  ✓ Node.js v20.10.0
  ✓ Network reachable
  ✓ Wallet connected
  ✓ Storage nodes: 16/16 online

  All checks passed!`,
    },
  ],
  plugins: [
    {
      cmd: 'verida plugins list',
      desc: 'List installed plugins.',
      example: `verida plugins list`,
      output: `Installed plugins:
  @verida/storage-plugin     v1.2.0
  @verida/auth-plugin        v1.1.0
  @verida/analytics-plugin   v1.0.0`,
    },
    {
      cmd: 'verida plugins install <name>',
      desc: 'Install a CLI plugin.',
      args: [
        { name: 'name', required: true, desc: 'Plugin package name' },
      ],
      example: `verida plugins install @verida/ai-plugin`,
      output: `✓ Installed @verida/ai-plugin v1.0.0`,
    },
  ],
  utils: [
    {
      cmd: 'verida version',
      desc: 'Show CLI and connected service versions.',
      example: `verida version`,
      output: `CLI:        v2.1.0
API:        v1.2.0
Shelby:     v3.4.1
Network:    Aptos Mainnet`,
    },
    {
      cmd: 'verida update',
      desc: 'Update the CLI to the latest version.',
      example: `verida update`,
      output: `✓ Current: v2.1.0
✓ Latest:  v2.2.0
✓ Updated to v2.2.0`,
    },
  ],
};

const CONFIG_YAML = `# verida.config.yaml
project:
  id: ai-marketplace
  name: "My AI Marketplace"

network:
  name: production
  rpc: https://rpc.verida.ai

storage:
  provider: shelby
  replication: 16

wallet:
  address: 0x1a2b...3c4d
  connected: true

datasets:
  auto_verify: true
  default_license: CC-BY-4.0

plugins:
  - "@verida/storage-plugin"
  - "@verida/auth-plugin"
  - "@verida/analytics-plugin"`;

const ENV_VARS = `VERIDA_API_KEY=sk_live_xxxxxxxxx
VERIDA_PROJECT=ai-marketplace
VERIDA_NETWORK=production
VERIDA_STORAGE=shelby
VERIDA_WALLET=0x1a2b...3c4d`;

const ARCHITECTURE_STEPS = [
  { label: 'Developer', icon: Terminal },
  { label: 'CLI', icon: Code },
  { label: 'REST API', icon: Globe },
  { label: 'Shelby Protocol', icon: Database },
  { label: 'Blockchain', icon: ShieldCheck },
  { label: 'Storage', icon: HardDrive },
  { label: 'Marketplace', icon: ShoppingCart },
];

const SHELLS = [
  { name: 'Bash', cmd: 'echo \'eval "$(verida completions bash)"\' >> ~/.bashrc' },
  { name: 'Zsh', cmd: 'echo \'eval "$(verida completions zsh)"\' >> ~/.zshrc' },
  { name: 'Fish', cmd: 'verida completions fish > ~/.config/fish/completions/verida.fish' },
  { name: 'PowerShell', cmd: 'verida completions powershell >> $PROFILE' },
];

const RELEASES = [
  {
    version: 'v2.1.0',
    date: 'Today',
    added: ['Dataset sync command', 'Plugin system', 'Shell completions'],
    improved: ['Authentication flow', 'Upload speed 3x faster'],
    fixed: ['Wallet connection timeout', 'Config file parsing'],
  },
  {
    version: 'v2.0.0',
    date: 'Nov 2025',
    added: ['Marketplace commands', 'Analytics dashboard', 'Binary distribution'],
    improved: ['New CLI architecture', 'Interactive prompts'],
    fixed: ['Memory usage on large uploads'],
  },
  {
    version: 'v1.5.0',
    date: 'Oct 2025',
    added: ['Verification commands', 'Docker support', 'Config management'],
    improved: ['Error messages', 'Help system'],
    fixed: ['Windows path handling'],
  },
];

const TERMINAL_LINES = [
  { type: 'input', text: '$ verida login' },
  { type: 'success', text: '✔ Connected to production network' },
  { type: 'input', text: '$ verida datasets list --mine' },
  { type: 'success', text: '✓ 142 datasets found' },
  { type: 'input', text: '$ verida upload ./medical-images' },
  { type: 'info', text: 'Uploading...' },
  { type: 'progress', text: '████████████████████████' },
  { type: 'success', text: '✓ Verified on Shelby Protocol' },
  { type: 'success', text: '✓ Published to marketplace' },
  { type: 'input', text: '$ verida verify ds_12934' },
  { type: 'success', text: '✓ Dataset integrity verified on Aptos L1' },
];

const PLAYGROUND_COMMANDS = [
  'verida login',
  'verida datasets list',
  'verida upload ./my-dataset',
  'verida verify ds_12934',
  'verida wallet balance',
  'verida analytics usage',
  'verida deploy',
  'verida doctor',
];

const PLAYGROUND_OUTPUTS: Record<string, string> = {
  'verida login': `✓ Connected to production network
✓ Wallet: 0x1a2b...3c4d
✓ Authenticated as medlab`,
  'verida datasets list': `Found 142 datasets

  ds_12934  Medical NLP Corpus      25 APT   ✓ Verified
  ds_12935  ImageNet Subset         120 APT  ✓ Verified
  ds_12936  Financial Timeseries    80 APT   ✓ Verified
  ds_12937  Audio Speech Set        45 APT   Pending`,
  'verida upload ./my-dataset': `⠋ Analyzing dataset...
✓ Content detected: images (DICOM)
✓ Quality score: 96/100
✓ Uploading to Shelby Protocol...
✓ Verified on blockchain
✓ Published to marketplace

  Dataset ID:    ds_12938
  Price:         0 APT
  Verification:  ✓ Passed`,
  'verida verify ds_12934': `✓ Verification complete

  Status:      Verified
  Merkle:     0xabc...def
  On-chain:   0xabc...def
  Match:      ✓
  Block:      12345678`,
  'verida wallet balance': `Balance: 1,250 APT

Recent transactions:
  +50 APT   Sale: Medical NLP Corpus
  -25 APT   Purchase: ImageNet Subset
  +80 APT   Sale: Financial Timeseries`,
  'verida analytics usage': `Usage (last 30 days):
  Downloads:     2,847
  Unique users:  412
  Top dataset:   Medical NLP Corpus (1,243)
  Avg quality:   94.2/100`,
  'verida deploy': `✓ Validating configuration...
✓ Uploading metadata to Shelby...
✓ Anchored to Aptos L1
✓ Deployed successfully

  Project:  my-project
  Version:  1.0.0
  TX:       0x789...012`,
  'verida doctor': `Verida CLI Doctor

  ✓ CLI installed (v2.1.0)
  ✓ Node.js v20.10.0
  ✓ Network reachable
  ✓ Wallet connected
  ✓ Storage nodes: 16/16 online

  All checks passed!`,
};

/* ─── HELPERS ─────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="cli-copy-btn"
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.06 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ─── ANIMATED TERMINAL ──────────────────────────────────────────────── */

function AnimatedTerminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (visibleLines >= TERMINAL_LINES.length) return;

    const line = TERMINAL_LINES[visibleLines];
    if (!line) return;

    if (line.type === 'input') {
      if (currentChar < line.text.length) {
        const timer = setTimeout(() => setCurrentChar(c => c + 1), 35);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setVisibleLines(v => v + 1);
          setCurrentChar(0);
        }, 400);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => {
        setVisibleLines(v => v + 1);
        setCurrentChar(0);
      }, line.type === 'progress' ? 600 : 200);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, currentChar]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cli-terminal">
      <div className="cli-terminal-bar">
        <span className="cli-terminal-dot red" />
        <span className="cli-terminal-dot yellow" />
        <span className="cli-terminal-dot green" />
        <span className="cli-terminal-title">Terminal</span>
      </div>
      <div className="cli-terminal-body">
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className={`cli-terminal-line ${line.type}`}>
            {line.type === 'input' ? (
              <span>
                <span className="cli-terminal-prompt">$</span> {line.text.slice(2)}
              </span>
            ) : line.type === 'progress' ? (
              <span className="cli-terminal-progress">{line.text}</span>
            ) : (
              <span>{line.text}</span>
            )}
          </div>
        ))}
        {visibleLines < TERMINAL_LINES.length && TERMINAL_LINES[visibleLines] && (
          <div className="cli-terminal-line input">
            <span className="cli-terminal-prompt">$</span>{' '}
            <span>{TERMINAL_LINES[visibleLines]!.text.slice(2).slice(0, currentChar)}</span>
            <span className={`cli-terminal-cursor ${showCursor ? 'visible' : ''}`}>▌</span>
          </div>
        )}
        {visibleLines >= TERMINAL_LINES.length && (
          <div className="cli-terminal-line input">
            <span className="cli-terminal-prompt">$</span>{' '}
            <span className={`cli-terminal-cursor ${showCursor ? 'visible' : ''}`}>▌</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── INTERACTIVE TERMINAL ───────────────────────────────────────────── */

function InteractiveTerminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ type: string; text: string }[]>([]);
  const [running, setRunning] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const runCommand = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    setHistory(h => [...h, { type: 'input', text: `$ ${cmd}` }]);
    setRunning(true);
    setInput('');

    setTimeout(() => {
      const output = PLAYGROUND_OUTPUTS[cmd];
      if (output) {
        const lines = output.split('\n').map(l => ({
          type: l.startsWith('✓') || l.startsWith('✔') ? 'success' :
                l.startsWith('  ') ? 'dim' : 'output',
          text: l,
        }));
        setHistory(h => [...h, ...lines]);
      } else {
        setHistory(h => [...h, { type: 'error', text: `Unknown command: ${cmd}` }]);
      }
      setRunning(false);
    }, 600);
  }, []);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className="cli-playground">
      <div className="cli-playground-bar">
        <span className="cli-terminal-dot red" />
        <span className="cli-terminal-dot yellow" />
        <span className="cli-terminal-dot green" />
        <span className="cli-terminal-title">Interactive Terminal</span>
      </div>
      <div className="cli-playground-quick">
        {PLAYGROUND_COMMANDS.map(cmd => (
          <button key={cmd} className="cli-playground-chip" onClick={() => runCommand(cmd)}>
            {cmd}
          </button>
        ))}
      </div>
      <div className="cli-playground-body" ref={bodyRef}>
        {history.length === 0 && (
          <div className="cli-playground-empty">
            Type a command or click one above to get started
          </div>
        )}
        {history.map((line, i) => (
          <div key={i} className={`cli-playground-line ${line.type}`}>
            {line.type === 'input' ? (
              <span><span className="cli-terminal-prompt">$</span> {line.text.slice(2)}</span>
            ) : (
              <span>{line.text}</span>
            )}
          </div>
        ))}
        {running && (
          <div className="cli-playground-line info">
            <span className="cli-playground-spinner">⠋</span> Running...
          </div>
        )}
      </div>
      <div className="cli-playground-input-row">
        <span className="cli-terminal-prompt">$</span>
        <input
          className="cli-playground-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runCommand(input);
          }}
          placeholder="Type a command..."
          disabled={running}
        />
        <button
          className="cli-playground-run"
          onClick={() => runCommand(input)}
          disabled={running || !input.trim()}
        >
          <Play size={14} /> Run
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */

export default function CLI() {
  const navigate = useNavigate();
  const [installTab, setInstallTab] = useState('npm');
  const [activeCategory, setActiveCategory] = useState('auth');
  const [expandedRelease, setExpandedRelease] = useState<number | null>(0);
  const [activeCmd, setActiveCmd] = useState(0);

  const currentCommands = COMMANDS[activeCategory] || [];
  const currentCmd = currentCommands[activeCmd] || currentCommands[0];

  return (
    <div className="cli">

      {/* ═══ HERO ═══ */}
      <section className="cli-hero">
        <div className="cli-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="section-label"><Terminal size={13} /> CLI</span>
            <h1 className="cli-hero-title">
              VERIDA <span className="grad">CLI</span>
            </h1>
            <p className="cli-hero-desc">
              Everything you need. Right from your terminal.
            </p>
            <div className="cli-hero-verbs">
              <span>Deploy.</span>
              <span>Upload.</span>
              <span>Verify.</span>
              <span>Manage.</span>
            </div>
            <div className="cli-hero-version">
              <span className="cli-version-badge">v2.1.0</span>
            </div>
            <div className="cli-hero-actions">
              <Button
                variant="primary"
                icon={<Download size={16} />}
                onClick={() => {
                  const el = document.getElementById('cli-section-install');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Install CLI
              </Button>
              <Button variant="ghost" icon={<BookOpen size={16} />} onClick={() => navigate('/docs')}>
                Documentation
              </Button>
            </div>
          </motion.div>
        </div>
        <motion.div
          className="cli-hero-terminal"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatedTerminal />
        </motion.div>
      </section>

      {/* ═══ INSTALLATION ═══ */}
      <section className="cli-section" id="cli-section-install">
        <h2 className="cli-section-heading">Installation</h2>
        <div className="cli-install-tabs">
          {INSTALL_TABS.map(tab => (
            <button
              key={tab.id}
              className={`cli-install-tab ${installTab === tab.id ? 'active' : ''}`}
              onClick={() => setInstallTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="cli-install-card">
          <code className="cli-install-cmd">
            {INSTALL_TABS.find(t => t.id === installTab)?.cmd}
          </code>
          <CopyButton text={INSTALL_TABS.find(t => t.id === installTab)?.cmd || ''} />
        </div>

        <h3 className="cli-sub-heading">Platform Support</h3>
        <div className="cli-platform-grid">
          {PLATFORMS.map(p => (
            <div key={p.os} className="cli-platform-card">
              <div className="cli-platform-os">
                <span className="cli-platform-icon">{p.icon}</span>
                {p.os}
              </div>
              <div className="cli-platform-items">
                {p.items.map(item => (
                  <span key={item} className="cli-platform-item">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ AUTHENTICATION ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Authentication</h2>
        <p className="cli-section-desc">
          Connect your wallet or use an API key to authenticate the CLI.
        </p>
        <div className="cli-auth-card">
          <div className="cli-auth-row">
            <code className="cli-auth-cmd">verida login</code>
            <CopyButton text="verida login" />
          </div>
        </div>
        <div className="cli-auth-alt">
          <span className="cli-auth-alt-label">Or with API key:</span>
          <div className="cli-auth-row">
            <code className="cli-auth-cmd">verida login --token YOUR_API_KEY</code>
            <CopyButton text="verida login --token YOUR_API_KEY" />
          </div>
        </div>
        <div className="cli-auth-methods">
          {[
            { icon: Globe, label: 'Browser Login', desc: 'Opens browser for OAuth flow' },
            { icon: Key, label: 'API Key', desc: 'Direct key authentication' },
            { icon: Wallet, label: 'Wallet Connect', desc: 'Sign with Aptos wallet' },
            { icon: ShieldCheck, label: 'OAuth (Future)', desc: 'Third-party integration' },
          ].map(m => (
            <div key={m.label} className="cli-auth-method">
              <m.icon size={16} />
              <div>
                <strong>{m.label}</strong>
                <p>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ COMMON COMMANDS ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Common Commands</h2>
        <div className="cli-command-grid">
          {COMMON_COMMANDS.map((c, i) => (
            <motion.div
              key={c.cmd}
              className="cli-command-card"
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
            >
              <c.icon size={20} style={{ color: c.color }} />
              <code className="cli-command-cmd">{c.cmd}</code>
              <span className="cli-command-desc">{c.desc}</span>
              <ArrowRight size={14} className="cli-command-arrow" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ COMMAND REFERENCE ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Command Reference</h2>
        <div className="cli-ref-layout">
          <div className="cli-ref-sidebar">
            {COMMAND_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`cli-ref-link ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => { setActiveCategory(cat.id); setActiveCmd(0); }}
              >
                <cat.icon size={14} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          <div className="cli-ref-content">
            {currentCmd && (
              <>
                <div className="cli-ref-title-row">
                  <code className="cli-ref-cmd">{currentCmd.cmd}</code>
                </div>
                <p className="cli-ref-desc">{currentCmd.desc}</p>

                {currentCmd.args && currentCmd.args.length > 0 && (
                  <>
                    <h4 className="cli-ref-sub-title">Arguments</h4>
                    <div className="cli-ref-table">
                      <div className="cli-ref-table-header">
                        <span>Name</span><span>Required</span><span>Description</span>
                      </div>
                      {currentCmd.args.map(a => (
                        <div key={a.name} className="cli-ref-table-row">
                          <code>{a.name}</code>
                          <span className={a.required ? 'cli-ref-required' : ''}>{a.required ? 'Required' : 'Optional'}</span>
                          <span>{a.desc}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {currentCmd.flags && currentCmd.flags.length > 0 && (
                  <>
                    <h4 className="cli-ref-sub-title">Flags</h4>
                    <div className="cli-ref-table">
                      <div className="cli-ref-table-header">
                        <span>Flag</span><span>Description</span>
                      </div>
                      {currentCmd.flags.map(f => (
                        <div key={f.name} className="cli-ref-table-row">
                          <code>{f.name}</code>
                          <span>{f.desc}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <h4 className="cli-ref-sub-title">Example</h4>
                <div className="cli-code-block">
                  <div className="cli-code-header">
                    <span>Terminal</span>
                    <CopyButton text={currentCmd.example} />
                  </div>
                  <pre className="cli-code">{currentCmd.example}</pre>
                </div>

                <h4 className="cli-ref-sub-title">Output</h4>
                <div className="cli-code-block output">
                  <pre className="cli-code">{currentCmd.output}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══ INTERACTIVE TERMINAL ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Interactive Terminal</h2>
        <p className="cli-section-desc">
          Try Verida CLI commands directly in your browser.
        </p>
        <InteractiveTerminal />
      </section>

      {/* ═══ CONFIGURATION ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Configuration</h2>
        <p className="cli-section-desc">
          The CLI uses a YAML config file in your project root.
        </p>
        <div className="cli-config-layout">
          <div className="cli-code-block">
            <div className="cli-code-header">
              <span>verida.config.yaml</span>
              <CopyButton text={CONFIG_YAML} />
            </div>
            <pre className="cli-code">{CONFIG_YAML}</pre>
          </div>
          <div className="cli-env-card">
            <h4 className="cli-ref-sub-title">Environment Variables</h4>
            <div className="cli-code-block">
              <div className="cli-code-header">
                <span>.env</span>
                <CopyButton text={ENV_VARS} />
              </div>
              <pre className="cli-code">{ENV_VARS}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PLUGINS ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Plugins</h2>
        <p className="cli-section-desc">
          Extend the CLI with official and community plugins.
        </p>
        <div className="cli-plugins-grid">
          {[
            { name: 'Storage Plugin', desc: 'Shelby Protocol integration', icon: HardDrive, official: true },
            { name: 'Auth Plugin', desc: 'Advanced authentication flows', icon: Key, official: true },
            { name: 'Analytics Plugin', desc: 'Extended usage metrics', icon: ChartBar, official: true },
            { name: 'Marketplace Plugin', desc: 'Marketplace automation', icon: ShoppingCart, official: true },
            { name: 'AI Plugin', desc: 'AI-powered dataset analysis', icon: Lightning, official: true },
          ].map(p => (
            <div key={p.name} className="cli-plugin-card">
              <p.icon size={20} className="cli-plugin-icon" />
              <div>
                <div className="cli-plugin-name">
                  {p.name}
                  {p.official && <span className="cli-plugin-badge">Official</span>}
                </div>
                <div className="cli-plugin-desc">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ ARCHITECTURE ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">CLI Architecture</h2>
        <div className="cli-arch">
          {ARCHITECTURE_STEPS.map((step, i) => (
            <div key={step.label} className="cli-arch-step">
              <div className="cli-arch-node">
                <step.icon size={20} />
                <span>{step.label}</span>
              </div>
              {i < ARCHITECTURE_STEPS.length - 1 && (
                <div className="cli-arch-arrow">
                  <ArrowRight size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SHELL INTEGRATION ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Shell Integration</h2>
        <p className="cli-section-desc">
          Enable tab completion and shell suggestions for your preferred shell.
        </p>
        <div className="cli-shell-grid">
          {SHELLS.map(s => (
            <div key={s.name} className="cli-shell-card">
              <div className="cli-shell-name">{s.name}</div>
              <div className="cli-shell-cmd">
                <code>{s.cmd}</code>
                <CopyButton text={s.cmd} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ RELEASE NOTES ═══ */}
      <section className="cli-section">
        <h2 className="cli-section-heading">Release Notes</h2>
        <div className="cli-releases">
          {RELEASES.map((rel, i) => (
            <div
              key={rel.version}
              className={`cli-release ${expandedRelease === i ? 'expanded' : ''}`}
              onClick={() => setExpandedRelease(expandedRelease === i ? null : i)}
            >
              <div className="cli-release-header">
                <div className="cli-release-version">
                  <GitBranch size={14} />
                  <span>{rel.version}</span>
                </div>
                <span className="cli-release-date">{rel.date}</span>
                <CaretRight size={14} className="cli-release-chevron" />
              </div>
              {expandedRelease === i && (
                <div className="cli-release-body" onClick={(e) => e.stopPropagation()}>
                  {rel.added.length > 0 && (
                    <div className="cli-release-group">
                      <span className="cli-release-tag added">Added</span>
                      {rel.added.map((a, j) => <div key={j} className="cli-release-item">{a}</div>)}
                    </div>
                  )}
                  {rel.improved.length > 0 && (
                    <div className="cli-release-group">
                      <span className="cli-release-tag improved">Improved</span>
                      {rel.improved.map((a, j) => <div key={j} className="cli-release-item">{a}</div>)}
                    </div>
                  )}
                  {rel.fixed.length > 0 && (
                    <div className="cli-release-group">
                      <span className="cli-release-tag fixed">Fixed</span>
                      {rel.fixed.map((a, j) => <div key={j} className="cli-release-item">{a}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER CTA ═══ */}
      <section className="cli-section cli-footer-cta">
        <div className="cli-footer-inner">
          <h2 className="cli-footer-title">Ready to automate your workflow?</h2>
          <div className="cli-footer-links">
            <Button variant="primary" icon={<Download size={16} />}>
              Install CLI
            </Button>
            <Button variant="ghost" icon={<BookOpen size={16} />} onClick={() => navigate('/docs')}>
              Read Documentation
            </Button>
            <Button variant="ghost" icon={<GithubLogo size={16} />}>
              GitHub
            </Button>
            <Button variant="ghost" icon={<DiscordLogo size={16} />}>
              Join Discord
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
