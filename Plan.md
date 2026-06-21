Verida AI# Plan.md — Verida AI: Verifiable Dataset Marketplace on Shelby

> **Agent Assignment Key**
> - 🧠 **Qwen** (Qwen2.5-Coder-32B / Qwen3) — Architecture decisions, complex reasoning, multi-file planning, system design
> - ⚡ **Codex** (o4-mini / GPT-4.1) — Boilerplate generation, repetitive code patterns, test scaffolding, type definitions
> - 🔀 **OpenCode Orchestrator** — Task routing, context injection, file boundary enforcement, agent handoffs

---

## 1. Project Identity

| Field           | Value                                                      |
|-----------------|------------------------------------------------------------|
| **Project Name**| Verida AI                                                  |
| **Tagline**     | Trust-First AI Dataset Marketplace                         |
| **Storage Layer**| Shelby Protocol (`@shelby-protocol/sdk`)                  |
| **Chain Layer** | Aptos (Shelby-managed smart contracts)                     |
| **Target Users**| AI researchers, data engineers, ML teams, independent data contributors |
| **MVP Scope**   | Upload → Provenance Stamp → Access Control → Stream → Pay |

---

## 2. Problem Statement

```
Today's AI ecosystem problem:
  ┌─────────────────────────────────────────────────────┐
  │ • No trust/transparency in datasets                  │
  │ • No verified provenance (who uploaded? when?)       │
  │ • Data poisoning risk with no detection mechanism    │
  │ • Expensive, fragmented global dataset distribution  │
  │ • No economic model for dataset contributors         │
  └─────────────────────────────────────────────────────┘

Shelby solves:
  ┌─────────────────────────────────────────────────────┐
  │ ✓ Single global namespace → no regional duplication  │
  │ ✓ Built-in verification layer → tamper-proof blobs   │
  │ ✓ Low egress costs → affordable distribution         │
  │ ✓ Sub-second reads → live streaming to training jobs │
  │ ✓ Cryptographic provenance receipts on every write   │
  └─────────────────────────────────────────────────────┘
```

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        VERIDA AI PLATFORM                        │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ React + Vite │    │  Express API │    │  PostgreSQL       │   │
│  │  Frontend    │───▶│  (REST +     │───▶│  (Metadata DB)    │   │
│  │ (React Router)│   │   WebSocket) │    │                   │   │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘   │
│                             │                                    │
│                    ┌────────▼────────┐                           │
│                    │  Shelby SDK     │                           │
│                    │  Integration    │                           │
│                    │  Layer          │                           │
│                    └────────┬────────┘                           │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
  ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐
  │ Shelby RPC   │  │ Shelby Storage   │  │ Aptos Smart    │
  │ Nodes        │  │ Provider Network │  │ Contracts      │
  │ (S3-compat)  │  │ (Fiber mesh)     │  │ (Provenance)   │
  └──────────────┘  └──────────────────┘  └────────────────┘
```

### 3.1 Frontend (React 18 + Vite + React Router)
- `/` — Landing page with hero + featured datasets
- `/marketplace` — Dataset browsing and discovery
- `/upload` — Dataset upload wizard
- `/dataset/:id` — Dataset detail, provenance tree, access purchase
- `/dashboard` — Publisher analytics, earnings, downloads
- `/profile/:address` — Publisher profile

### 3.2 Backend API (Express + TypeScript)
- `POST /api/datasets/upload` — Chunked upload pipeline → Shelby
- `GET /api/datasets` — Paginated marketplace listings
- `GET /api/datasets/:id` — Full dataset metadata + provenance chain
- `POST /api/datasets/:id/access` — Create pay-per-access session
- `GET /api/datasets/:id/stream` — Proxy stream from Shelby RPC
- `POST /api/datasets/:id/verify` — Trigger on-chain integrity check
- `GET /api/publishers/:address` — Publisher profile + earnings

### 3.3 Shelby Integration Layer (`src/lib/shelby/`)
```
shelby/
  ├── client.ts        — SDK init + RPC connection
  ├── upload.ts        — Multipart blob upload with progress
  ├── download.ts      — Streaming read with chunk validation
  ├── verify.ts        — Merkle root check + on-chain audit
  ├── provenance.ts    — Write/read provenance receipts
  └── access.ts        — Micropayment session management
```

### 3.4 Database Schema (PostgreSQL)

```sql
-- Core tables (abridged)
datasets         (id, shelby_blob_id, name, description, tags[], size_bytes,
                  version, publisher_address, created_at, access_type,
                  price_per_access, license, provenance_receipt, merkle_root)

dataset_versions (id, dataset_id, version, shelby_blob_id, changelog,
                  created_at, merkle_root, size_bytes)

access_sessions  (id, dataset_id, accessor_address, session_id,
                  created_at, expires_at, bytes_consumed, status)

publishers       (address, username, bio, total_datasets,
                  total_earnings, verified, created_at)

provenance_chain (id, dataset_id, version, event_type, actor_address,
                  timestamp, shelby_receipt, tx_hash, metadata jsonb)
```

---

## 4. Feature Breakdown

### Phase 1 — Core MVP (Builder Competition Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| Dataset Upload | Multipart upload via Shelby SDK with progress tracking | P0 |
| Provenance Stamping | Auto-generate + store provenance receipt on every upload | P0 |
| Integrity Verification | Merkle root check on-demand, flag if tampered | P0 |
| Marketplace Listing | Search/filter datasets by tag, size, license, publisher | P0 |
| Dataset Detail Page | Full metadata, provenance history, preview, access | P0 |
| Pay-Per-Access | Micropayment session → stream dataset from Shelby | P0 |
| Publisher Dashboard | Upload stats, access counts, earnings overview | P1 |
| Versioning | Upload new version, keep immutable history | P1 |
| Dataset Streaming | Proxy stream for distributed training workloads | P1 |

### Phase 2 — Post-Competition

| Feature | Description |
|---------|-------------|
| Subscription Access | Monthly access passes per dataset or per publisher |
| Data Poisoning Alerts | Hash-based anomaly detection across versions |
| On-Chain Attestations | Aptos-native attestation NFTs per dataset version |
| API Keys | Headless access for ML training pipelines |
| Team Workspaces | Org-level access control and billing |

---

## 5. Tech Stack

```yaml
Frontend:
  framework: React 18 + Vite
  routing: React Router
  ui: Tailwind CSS + shadcn/ui
  state: Zustand + TanStack Query
  wallet: Aptos Wallet Adapter (for provenance signing)
  charts: Recharts

Backend:
  runtime: Node.js 20
  framework: Express 5 + TypeScript
  orm: Drizzle ORM
  db: PostgreSQL 16
  cache: Redis (session + rate limiting)
  queue: BullMQ (chunked upload jobs)

Shelby Integration:
  sdk: "@shelby-protocol/sdk"
  cli: "@shelby-protocol/cli" (dev/scripts)
  auth: Shelby API key (from Early Access dashboard)

DevOps:
  containerization: Docker + docker-compose
  env: .env.local (Vite frontend) + .env (API)
  testing: Vitest (unit), Playwright (e2e), supertest (API)
  linting: ESLint + Prettier
  version control: Git (conventional commits)

AI Agents (OpenCode):
  orchestrator: OpenCode
  architecture_agent: Qwen2.5-Coder-32B (via OpenCode)
  implementation_agent: Codex / o4-mini (via OpenCode)
```

---

## 6. OpenCode Agent Role Map

```
AGENTS.md (project root) defines:

┌─────────────────────────────────────────────────────────────┐
│  ARCHITECT AGENT (Qwen)                                      │
│  Model: qwen2.5-coder:32b                                    │
│  Trigger: "architect:" prefix or new feature planning        │
│  Owns: src/lib/**, database/schema.ts, docs/**, Plan.md      │
│  Forbidden: Direct UI code, test files                       │
│  Prompt context: Architecture goals, Shelby constraints,     │
│                  Phase 1 scope, DB schema                    │
├─────────────────────────────────────────────────────────────┤
│  IMPLEMENTER AGENT (Codex)                                   │
│  Model: o4-mini / gpt-4.1                                    │
│  Trigger: "implement:" prefix or specific file task          │
│  Owns: apps/web/src/**, apps/api/src/**                       │
│  Forbidden: schema changes, lib/ architecture changes        │
│  Prompt context: Component spec, API contract, Shelby SDK    │
│                  method signatures                           │
├─────────────────────────────────────────────────────────────┤
│  TESTER AGENT (Codex)                                        │
│  Model: o4-mini                                              │
│  Trigger: "test:" prefix or after Implementer completes file │
│  Owns: src/**/*.test.ts, src/**/*.spec.ts, e2e/**            │
│  Forbidden: Modifying source files                           │
│  Prompt context: Test.md, API contracts, expected behaviors  │
├─────────────────────────────────────────────────────────────┤
│  REVIEWER AGENT (Qwen)                                       │
│  Model: qwen2.5-coder:32b                                    │
│  Trigger: "review:" prefix or pre-commit                     │
│  Owns: READ-ONLY across all files                            │
│  Output: Review comments → Review.md log                     │
│  Prompt context: Review.md checklist, security rules,        │
│                  Shelby best practices                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Directory Structure

```
verida-ai/
├── AGENTS.md                   ← OpenCode agent definitions
├── Plan.md                     ← This file
├── Build.md                    ← Build workflow
├── Test.md                     ← Test strategy
├── Review.md                   ← Review checklist
├── docker-compose.yml
├── .env.example
│
├── apps/
│   ├── web/                    ← React + Vite frontend
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── routes/
│   │       │   ├── HomePage.tsx
│   │       │   ├── MarketplacePage.tsx
│   │       │   ├── DatasetDetailPage.tsx
│   │       │   ├── UploadPage.tsx
│   │       │   ├── DashboardPage.tsx
│   │       │   └── ProfilePage.tsx
│   │       ├── components/
│   │       │   ├── dataset/
│   │       │   │   ├── DatasetCard.tsx
│   │       │   │   ├── ProvenanceTree.tsx
│   │       │   │   ├── IntegrityBadge.tsx
│   │       │   │   └── UploadWizard.tsx
│   │       │   ├── ui/         ← shadcn primitives
│   │       │   └── layout/
│   │       └── lib/
│   │           ├── shelby/     ← Shelby SDK client-side wrappers
│   │           └── api/        ← TanStack Query hooks
│   │
│   └── api/                    ← Express backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── datasets.ts
│       │   │   ├── publishers.ts
│       │   │   └── access.ts
│       │   ├── lib/
│       │   │   ├── shelby/     ← Shelby SDK server-side
│       │   │   ├── db/         ← Drizzle ORM
│       │   │   └── queue/      ← BullMQ jobs
│       │   ├── middleware/
│       │   └── index.ts
│       └── tests/
│
└── packages/
    └── shared/                 ← Shared types (Dataset, Publisher, etc.)
```

---

## 8. Shelby Integration Plan

### 8.1 SDK Initialization
```typescript
// apps/api/src/lib/shelby/client.ts
// Architect (Qwen) owns this file's design
// Implementer (Codex) fills the implementation

import { ShelbyClient } from '@shelby-protocol/sdk';

export const shelby = new ShelbyClient({
  apiKey: process.env.SHELBY_API_KEY,
  rpcUrl: process.env.SHELBY_RPC_URL,
  network: process.env.SHELBY_NETWORK, // 'shelbynet' for testnet
});
```

### 8.2 Upload Flow (Critical Path)
```
1. Client sends multipart form to POST /api/datasets/upload
2. BullMQ job queued → UploadWorker picks up
3. Worker streams file to Shelby via sdk.blobs.upload()
4. Shelby returns: { blobId, merkleRoot, receipt, expiresAt }
5. receipt = cryptographic provenance proof (save to DB)
6. merkleRoot = stored for future integrity checks
7. Dataset record inserted to PostgreSQL
8. WebSocket event pushed to client: upload complete + blobId
```

### 8.3 Provenance Receipt Structure
```typescript
interface ShelbyProvenanceReceipt {
  blobId: string;
  merkleRoot: string;       // for integrity verification
  uploadedAt: number;       // unix timestamp
  uploaderAddress: string;  // Aptos wallet
  txHash: string;           // on-chain commitment
  size: number;
  chunkCount: number;
}
```

### 8.4 Streaming for Training Workloads
```typescript
// Shelby blob streaming → forwarded to AI training client
// Uses Node.js pipeline() to avoid buffering entire dataset in memory
import { pipeline } from 'stream/promises';

const shelbyStream = await shelby.blobs.stream(blobId, { sessionId });
await pipeline(shelbyStream, res); // Express response stream
```

---

## 9. Environment Variables

```bash
# .env.example
# Shelby
SHELBY_API_KEY=sk_shelby_...
SHELBY_RPC_URL=https://rpc.shelby.xyz
SHELBY_NETWORK=shelbynet

# Database
DATABASE_URL=postgresql://verida:password@localhost:5432/verida_ai

# Redis
REDIS_URL=redis://localhost:6379

# Aptos (for wallet verification)
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com

# App
VITE_API_URL=http://localhost:4000
JWT_SECRET=...
```

---

## 10. Milestones

```
Week 1 — Foundation
  [ ] Repo init, monorepo setup, docker-compose
  [ ] PostgreSQL schema (Drizzle migrations)
  [ ] Shelby SDK initialized, test blob upload in isolation
  [ ] Express API skeleton with auth middleware

Week 2 — Core Upload Pipeline
  [ ] UploadWizard component (frontend)
  [ ] POST /api/datasets/upload → BullMQ → Shelby
  [ ] Provenance receipt stored in DB
  [ ] Basic marketplace listing (GET /api/datasets)

Week 3 — Provenance + Access
  [ ] ProvenanceTree component (visual history)
  [ ] IntegrityBadge (live Merkle check)
  [ ] Pay-per-access session flow
  [ ] Dataset streaming endpoint

Week 4 — Polish + Demo
  [ ] Publisher dashboard with analytics
  [ ] Versioning (upload new version, keep history)
  [ ] End-to-end test: upload → verify → stream → access
  [ ] Demo video / writeup for Shelby competition
```
