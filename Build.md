# Build.md — Verida AI: Implementation Workflow

> How to drive this project with **OpenCode + Qwen + Codex**.
> Every section is a discrete agent task. Tasks are sequenced so each one's output is the next one's context.

---

## Agent Invocation Syntax (OpenCode)

```bash
# Architect task (Qwen)
opencode "architect: [task description]"

# Implementation task (Codex)
opencode "implement: [task description]"

# Cross-cutting task (auto-routed)
opencode "[task description]"
```

In your `AGENTS.md`, agent selection is automatic based on the prefix and file paths touched. See Plan.md §6 for the full role map.

---

## STEP 0 — Repo Bootstrap

**Agent: Codex** | One-time setup, no architectural decisions needed.

```bash
# Run these manually before opening OpenCode
mkdir verida-ai && cd verida-ai
git init
npm init -y

# Create monorepo structure
mkdir -p apps/web apps/api packages/shared
```

**OpenCode prompt:**
```
implement: Scaffold the monorepo package.json workspaces config for
apps/web (React + Vite), apps/api (Express + TypeScript), and
packages/shared (shared types). Include root-level scripts:
dev (runs both apps concurrently), build, lint, test.
Use npm workspaces. Do not install anything yet, just write the config files.
```

**Expected outputs:**
- `package.json` (root, workspaces)
- `apps/web/package.json`
- `apps/api/package.json`
- `packages/shared/package.json`
- `tsconfig.base.json`
- `.eslintrc.js`
- `.prettierrc`

---

## STEP 1 — Shared Types Package

**Agent: Qwen (Architect)** | Defines the data contracts everything else builds on.

```
architect: Define all TypeScript interfaces and types for packages/shared/src/index.ts
covering: Dataset, DatasetVersion, ProvenanceReceipt (matching Shelby's SDK receipt
shape), AccessSession, Publisher, DatasetTag enum, AccessType enum (free | pay_per_access
| subscription), UploadStatus enum, and APIResponse<T> generic wrapper.
Reference the schema in Plan.md §3.4. Export everything from a single index.ts.
```

**Expected output:**
- `packages/shared/src/types.ts`
- `packages/shared/src/index.ts`

---

## STEP 2 — Docker + Database

**Agent: Codex** | Pure boilerplate.

```
implement: Write docker-compose.yml for verida-ai with services:
  - postgres:16 (port 5432, db=verida_ai, user=verida, password=localpass)
  - redis:7-alpine (port 6379)
  - adminer (port 8080, for dev DB inspection)
Also write .env.example with all vars from Plan.md §9.
Write apps/api/.env for local dev with those values filled in.
```

**Expected outputs:**
- `docker-compose.yml`
- `.env.example`
- `apps/api/.env` (gitignored)

---

## STEP 3 — Database Schema (Drizzle ORM)

**Agent: Qwen (Architect)** | Schema is architectural, not just boilerplate.

```
architect: Write the full Drizzle ORM schema in apps/api/src/lib/db/schema.ts
using drizzle-orm/pg-core. Tables: datasets, dataset_versions, access_sessions,
publishers, provenance_chain. Match Plan.md §3.4 exactly. Use pgTable, serial,
text, integer, timestamp, jsonb, index() for frequently queried fields
(publisher_address, shelby_blob_id, tags). Export all tables and a db instance
connected via postgres.js driver using DATABASE_URL env var.
Also write apps/api/src/lib/db/migrate.ts to run drizzle migrations.
```

**Expected outputs:**
- `apps/api/src/lib/db/schema.ts`
- `apps/api/src/lib/db/index.ts`
- `apps/api/src/lib/db/migrate.ts`
- `drizzle.config.ts`

---

## STEP 4 — Shelby SDK Integration Layer

**Agent: Qwen (Architect)** | Most critical integration. Architect must own this.

```
architect: Build the Shelby integration layer in apps/api/src/lib/shelby/.
Using @shelby-protocol/sdk, implement these modules:

1. client.ts — ShelbyClient singleton, initialized from env vars, with
   connection test on startup, typed error handling for SDK errors.

2. upload.ts — uploadDataset(filePath, metadata) function that:
   - Streams file to Shelby blob storage
   - Returns { blobId, merkleRoot, receipt, expiresAt }
   - Emits progress events (for WebSocket relay to client)
   - Handles retry on transient errors (max 3 retries, exponential backoff)

3. download.ts — streamDataset(blobId, sessionId) that returns a Node.js
   Readable stream from Shelby for Express response piping.

4. verify.ts — verifyIntegrity(blobId, expectedMerkleRoot) that triggers
   on-chain Merkle root check and returns { valid: boolean, checkedAt, details }.

5. provenance.ts — readProvenance(blobId) and writeProvenanceMetadata(blobId, meta)
   for reading/writing custom provenance fields to Shelby blob metadata.

6. access.ts — createAccessSession(blobId, payerAddress) and
   validateSession(sessionId) for micropayment session management.

Use TypeScript strict mode. All functions must be async, all errors typed.
Reference the Shelby SDK docs pattern from Plan.md §8.
```

**Expected outputs:**
- `apps/api/src/lib/shelby/client.ts`
- `apps/api/src/lib/shelby/upload.ts`
- `apps/api/src/lib/shelby/download.ts`
- `apps/api/src/lib/shelby/verify.ts`
- `apps/api/src/lib/shelby/provenance.ts`
- `apps/api/src/lib/shelby/access.ts`
- `apps/api/src/lib/shelby/index.ts`

---

## STEP 5 — BullMQ Upload Job Queue

**Agent: Codex** | Standard queue pattern.

```
implement: Build the BullMQ upload job system in apps/api/src/lib/queue/.
Create:
  - queue.ts — defines UploadQueue (BullMQ Queue) with job types:
    UPLOAD_DATASET, VERIFY_INTEGRITY, GENERATE_PREVIEW
  - workers/uploadWorker.ts — processes UPLOAD_DATASET jobs:
      1. Read temp file path from job.data
      2. Call shelby.upload.uploadDataset()
      3. On success: insert dataset row to DB, emit WebSocket event
      4. On failure: update job status, clean up temp file
  - workers/verifyWorker.ts — processes VERIFY_INTEGRITY jobs:
      Calls shelby.verify.verifyIntegrity(), updates dataset.verified status

Use Redis for BullMQ connection. Import shared types from packages/shared.
```

**Expected outputs:**
- `apps/api/src/lib/queue/queue.ts`
- `apps/api/src/lib/queue/workers/uploadWorker.ts`
- `apps/api/src/lib/queue/workers/verifyWorker.ts`

---

## STEP 6 — Express API Routes

**Agent: Codex** | Implementation against already-designed contracts.

```
implement: Build all Express API routes in apps/api/src/routes/ using
the contracts from Plan.md §3.2. Use express-async-handler for error wrapping.
Use multer for file upload (temp disk storage, 10GB max).
Use zod for request validation on all POST/PUT routes.

Routes to implement:
  datasets.ts:
    POST /upload         → multer → BullMQ job → return jobId
    GET  /               → paginated list (query: tag, publisher, license, page, limit)
    GET  /:id            → full dataset + versions + provenance chain
    POST /:id/verify     → queue VERIFY_INTEGRITY job → return { jobId }
    GET  /:id/stream     → validate session → pipe Shelby stream to res

  access.ts:
    POST /datasets/:id/access   → create micropayment session
    GET  /sessions/:sessionId   → validate session status

  publishers.ts:
    GET  /publishers/:address   → publisher profile + dataset list
    PUT  /publishers/me         → update profile (auth required)

Add rate limiting middleware (express-rate-limit + Redis store):
  - Upload: 10/hour per IP
  - Stream: 100/hour per session
  - General: 200/15min per IP

Build apps/api/src/index.ts as the Express entry point with CORS,
helmet, morgan, and route mounting.
```

**Expected outputs:**
- `apps/api/src/routes/datasets.ts`
- `apps/api/src/routes/access.ts`
- `apps/api/src/routes/publishers.ts`
- `apps/api/src/middleware/rateLimit.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/index.ts`

---

## STEP 7 — WebSocket (Upload Progress)

**Agent: Codex** | Isolated feature, clear scope.

```
implement: Add WebSocket support to apps/api/src/index.ts using the 'ws' library.
Create apps/api/src/lib/ws/emitter.ts that exports:
  - emitUploadProgress(jobId, progress: { percent, bytesUploaded, stage })
  - emitUploadComplete(jobId, dataset: Dataset)
  - emitUploadError(jobId, error: string)

The WS server should accept connections at ws://localhost:4000/ws.
Clients subscribe by sending { type: 'subscribe', jobId }.
The uploadWorker should import emitter and call these during upload.
```

**Expected outputs:**
- `apps/api/src/lib/ws/emitter.ts`
- Updated `apps/api/src/index.ts`

---

## STEP 8 — Frontend: Core Layout + Design System

**Agent: Codex** | Design execution, not architecture.

```
implement: Build the React + Vite app shell in apps/web/src/.

Design direction: Dark theme. Deep navy/charcoal base (#0a0e1a).
Accent: Electric teal (#00d4c8). Data feels scientific and trustworthy.
Font pairing: "Space Mono" (monospace, for data/hash displays) +
"DM Sans" (body/UI text). Subtle grid texture background.
Minimal but data-dense. Feels like a Bloomberg terminal crossed with
a modern SaaS product.

Create:
  - src/main.tsx — App bootstrap with BrowserRouter, Navbar, Toaster (sonner),
    QueryClientProvider, AptosWalletProvider
  - src/App.tsx — Route shell and layout composition
  - src/routes/HomePage.tsx — Landing/marketplace page with hero + dataset grid
  - src/components/layout/Navbar.tsx — Logo "VERIDA", nav links, wallet connect button
  - src/components/layout/Footer.tsx — Minimal footer
  - src/components/ui/ — Install and configure shadcn/ui components needed:
    Button, Card, Badge, Dialog, Input, Select, Progress, Tabs, Tooltip
  - vite.config.ts — Vite + React build config

Use Tailwind CSS. CSS variables for colors in src/styles/globals.css.
Reference packages/shared types for all data shapes.
```

**Expected outputs:**
- `apps/web/index.html`
- `apps/web/vite.config.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/styles/globals.css`
- `apps/web/src/routes/HomePage.tsx`
- `apps/web/src/components/layout/Navbar.tsx`
- `apps/web/src/components/layout/Footer.tsx`
- `apps/web/tailwind.config.ts`

---

## STEP 9 — Frontend: Dataset Components

**Agent: Codex** | Component implementation.

```
implement: Build dataset-specific React components in
apps/web/src/components/dataset/ using the design system from Step 8.

1. DatasetCard.tsx — Grid card showing: name, publisher (truncated address),
   size (formatted), tags (colored badges), access type badge (Free/Pay/Sub),
   integrity status (green shield if verified, gray if pending).
   Hover state: slight glow in teal. Link to /dataset/:id.

2. ProvenanceTree.tsx — Visual timeline of provenance_chain events.
   Left side: vertical timeline line. Each event: icon (upload/verify/access),
   timestamp, actor address (truncated), shelby receipt hash (monospace, truncated),
   event type badge. Show "View on Aptos" link using txHash.

3. IntegrityBadge.tsx — Compact badge component: 
   - "Verified" (teal, shield icon) if merkle check passed
   - "Pending" (gray) if not yet verified  
   - "Tampered" (red, warning icon) if check failed
   Include tooltip with last check timestamp and merkle root snippet.

4. UploadWizard.tsx — Multi-step wizard (4 steps):
   Step 1: File drop zone (react-dropzone), shows file name + size
   Step 2: Metadata form (name, description, tags, license select, access type)
   Step 3: Pricing (if pay_per_access: set price, if subscription: set tiers)
   Step 4: Review + Submit → POST to /api/datasets/upload → show progress bar
   Progress bar feeds from WebSocket connection on jobId.
   On complete: redirect to /dataset/:id.

Use TanStack Query for API calls. Import shared types.
```

**Expected outputs:**
- `apps/web/src/components/dataset/DatasetCard.tsx`
- `apps/web/src/components/dataset/ProvenanceTree.tsx`
- `apps/web/src/components/dataset/IntegrityBadge.tsx`
- `apps/web/src/components/dataset/UploadWizard.tsx`

---

## STEP 10 — Frontend: Pages

**Agent: Codex** | Page assembly from components.

```
implement: Build the main pages in apps/web/src/routes/ using components from Step 9.

1. MarketplacePage.tsx — Dataset grid with:
   - Search bar (debounced, queries GET /api/datasets?q=)
   - Filter sidebar: Tags (multi-select), Access Type, License, Size range
   - Infinite scroll or pagination
   - DatasetCard grid (3 cols desktop, 2 tablet, 1 mobile)

2. DatasetDetailPage.tsx — Dataset detail page with:
   - Header: name, publisher, size, created date, IntegrityBadge
   - Tabs: Overview | Versions | Provenance | Access
   - Overview tab: description, tags, license, example rows if CSV
   - Versions tab: list of DatasetVersions (date, size, changelog, merkle root)
   - Provenance tab: <ProvenanceTree />
   - Access tab: access type info, price, "Get Access" button → create session
   - "Verify Integrity" button → POST /api/datasets/:id/verify → show result

3. UploadPage.tsx — Full-page UploadWizard wrapper

4. DashboardPage.tsx — Publisher dashboard:
   - Stats row: Total Datasets, Total Accesses, Estimated Earnings, Storage Used
   - Dataset table (own datasets) with actions: view, verify, add version
   - Recharts line chart: accesses over time (last 30 days)

5. ProfilePage.tsx — Publisher profile, bio, and dataset list

Use TanStack Query for all data fetching. Loading skeletons for all async states.
```

**Expected outputs:**
- `apps/web/src/routes/MarketplacePage.tsx`
- `apps/web/src/routes/DatasetDetailPage.tsx`
- `apps/web/src/routes/UploadPage.tsx`
- `apps/web/src/routes/DashboardPage.tsx`
- `apps/web/src/routes/ProfilePage.tsx`
- `apps/web/src/lib/api/datasets.ts` (TanStack Query hooks)
- `apps/web/src/lib/api/access.ts`
- `apps/web/src/lib/api/publishers.ts`

---

## STEP 11 — Frontend: Shelby SDK Client-Side Wrappers

**Agent: Qwen (Architect)** | Architect reviews client-side SDK usage pattern.

```
architect: Design apps/web/src/lib/shelby/client.ts for browser-side Shelby
SDK usage. Consider:
  - Should the browser ever talk to Shelby directly, or always through our API?
  - For streaming: implement a streamDataset(datasetId, sessionId) hook that
    uses the browser's ReadableStream API to consume our /api/datasets/:id/stream
    endpoint and emit progress events.
  - Write a useDatasetStream(datasetId) React hook (TanStack Query + WebSocket)
    for live streaming status tracking.
Decision: browser → our API → Shelby (not browser → Shelby directly),
for API key security.
```

**Expected outputs:**
- `apps/web/src/lib/shelby/client.ts`
- `apps/web/src/lib/hooks/useDatasetStream.ts`
- `apps/web/src/lib/hooks/useUploadProgress.ts`

---

## STEP 12 — AGENTS.md (OpenCode Configuration)

**Agent: Qwen (Architect)** | Meta-configuration for the whole project.

```
architect: Write the AGENTS.md file for this project's root that defines
the 4 agent roles (Architect/Qwen, Implementer/Codex, Tester/Codex,
Reviewer/Qwen) with:
  - Model assignments
  - Owned file path globs (strict boundaries)
  - Forbidden file path globs
  - System prompt injected per agent (include Shelby SDK patterns,
    project naming conventions, shared type import paths)
  - Handoff protocol: Architect → Implementer handoff via
    a structured comment block at top of each new file
  - Context files each agent always loads:
    Architect: Plan.md + schema.ts
    Implementer: Build.md + the specific component spec
    Tester: Test.md + the file being tested
    Reviewer: Review.md + diff of changed files
```

**Expected output:**
- `AGENTS.md`

---

## Build Order Summary

```
0  Repo Bootstrap           → Codex   → package.json, tsconfig
1  Shared Types             → Qwen    → packages/shared/
2  Docker + DB Config       → Codex   → docker-compose, .env
3  DB Schema (Drizzle)      → Qwen    → schema.ts, migrations
4  Shelby Integration Layer → Qwen    → lib/shelby/**
5  BullMQ Queue             → Codex   → lib/queue/**
6  Express Routes           → Codex   → routes/**
7  WebSocket                → Codex   → lib/ws/**
8  Frontend Shell           → Codex   → main, App, routes, layout
9  Dataset Components       → Codex   → components/dataset/**
10 Pages                    → Codex   → routes/**
11 Shelby Client-Side       → Qwen    → apps/web/src/lib/shelby/**
12 AGENTS.md                → Qwen    → AGENTS.md
```

---

## Token Budget Guidelines (OpenCode)

| Task Type | Recommended Model | Max Context to Inject |
|-----------|------------------|-----------------------|
| Architecture design | Qwen2.5-Coder-32B | Full Plan.md + schema |
| Component implementation | o4-mini | Single component spec + shared types |
| Test writing | o4-mini | Source file + Test.md §relevant section |
| Code review | Qwen2.5-Coder-32B | Diff + Review.md checklist |
| Boilerplate (docker, config) | o4-mini | Just the spec, no extra context |

**Rule:** Never inject more than 2 large files into a single agent context. Prefer targeted prompts over "here's the whole codebase, figure it out."

---

## Dependency Installation Commands

```bash
# After all files are scaffolded, install:
cd apps/api
npm install express @shelby-protocol/sdk drizzle-orm postgres \
  bullmq ioredis ws multer zod express-rate-limit express-async-handler \
  helmet morgan cors jsonwebtoken
npm install -D typescript @types/node @types/express @types/multer \
  @types/ws drizzle-kit vitest supertest

cd apps/web
npm install react react-dom react-router-dom @tanstack/react-query \
  zustand @aptos-labs/wallet-adapter-react tailwindcss recharts sonner \
  react-dropzone clsx tailwind-merge
npm install -D typescript @types/react @types/react-dom @types/node \
  vite @vitejs/plugin-react

# Global Shelby CLI (for dev scripts)
npm install -g @shelby-protocol/cli
```
