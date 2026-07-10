# Verida AI

A decentralized **AI dataset marketplace** built on **Aptos**. Verida AI lets publishers upload datasets, anchor their provenance on-chain, and offer them for training/sale — while buyers discover and access datasets through wallet-based authentication. Authentication uses **Sign-In with Aptos (SIWA / AIP-62)**, verified against the Aptos testnet.

> Stack: React 19 + Vite + TypeScript (frontend) · Express 5 + TypeScript + Drizzle ORM (backend) · PostgreSQL + Redis · Aptos wallet (Petra) · Shelby Protocol for decentralized storage.

---

## ✨ Features

- **Wallet-based auth (SIWA / AIP-62)** — sign in with Petra (or any Aptos wallet adapter). The backend verifies the Ed25519 signature and the on-chain authentication key, then issues a JWT. No passwords.
- **Dataset publishing** — upload datasets with name, description, tags, license, access type (free / paid), and price. Files are stored on **Shelby Protocol** with an immutable provenance chain.
- **Dataset marketplace** — browse, search, and inspect dataset detail pages; view publisher profiles.
- **Publisher profiles** — per-wallet publisher pages showing owned datasets and metadata.
- **Access control** — paid/free access requests gated by authenticated wallet ownership.
- **Real-time upload progress** — WebSocket channel reports upload status to the UI.
- **Rate limiting** — API-wide and per-route throttling backed by Redis.
- **Production-ready tooling** — Docker, Docker Compose, Drizzle migrations, ESLint, and a Render deploy config.

---

## 🧱 Architecture

```
verida-ai/
├── apps/
│   ├── web/                 # Frontend: React 19 + Vite + TS
│   │   └── src/
│   │       ├── pages/       # Home, Upload, Dashboard, DatasetDetail, PublisherProfile, Settings, ...
│   │       ├── context/     # AuthContext, WalletContext (Aptos signing)
│   │       ├── api/         # Typed API client
│   │       └── components/  # UI components
│   └── api/                 # Backend: Express 5 + TS
│       └── src/
│           ├── routes/      # auth, datasets, access, publishers, wsUploadProgress
│           ├── middleware/   # requireAuth (JWT), rate limiting
│           ├── lib/db/      # Drizzle schema + client
│           └── index.ts     # App bootstrap
├── packages/
│   └── shared/              # Shared TS types (DatasetTag, AccessType, etc.)
├── docker-compose.yml       # Postgres + Redis + API
├── Dockerfile
├── drizzle.config.ts
├── render.yaml             # Render deploy
└── vercel.json             # Vercel (frontend) deploy
```

### API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/auth/nonce` | Request a login challenge nonce |
| `POST` | `/api/auth/verify` | Verify wallet signature, issue JWT |
| `POST` | `/api/datasets` | Upload / create a dataset |
| `GET`  | `/api/datasets` | List datasets |
| `GET`  | `/api/datasets/:id` | Dataset detail |
| `POST` | `/api/access` | Request access to a dataset |
| `GET`  | `/api/access` | List access grants |
| `GET`  | `/api/publishers/:address` | Publisher profile |
| `PUT`  | `/api/publishers/:address` | Update publisher profile |

---

## 🚀 Getting started

### Prerequisites

- **Node.js** (see `.node-version`) — v20+ recommended
- **PostgreSQL** (local or hosted)
- **Redis** (local or hosted)
- A **Petra** wallet browser extension for login
- A **Shelby** API key (`SHELBY_API_KEY`)

### 1. Install dependencies

```bash
npm install
```

This is a npm workspaces monorepo, so a single install provisions `apps/web`, `apps/api`, and `packages/shared`.

### 2. Configure environment

Copy the example env and fill in your values:

```bash
cp .env.example .env
```

| Variable | Purpose |
| -------- | ------- |
| `SHELBY_API_KEY` | API key for Shelby Protocol storage |
| `SHELBY_RPC_URL` | Shelby RPC endpoint |
| `SHELBY_NETWORK` | Shelby network name |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `APTOS_NODE_URL` | Aptos fullnode (default: testnet) |
| `VITE_API_URL` | Frontend → backend URL (default `http://localhost:4000`) |
| `JWT_SECRET` | Secret used to sign auth JWTs |

### 3. Set up the database

```bash
npm run db:push        # apply Drizzle schema to your DATABASE_URL
```

### 4. Run Redis & Postgres (optional, via Docker)

```bash
docker-compose up -d
```

### 5. Start the dev servers

Run both frontend and backend concurrently:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

Or run them individually:

```bash
npm run dev --workspace @verida/web   # Vite dev server
npm run dev --workspace @verida/api   # tsx watch with live reload
```

---

## 🧪 Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Run web + api in dev mode |
| `npm run build` | Build shared → api → web |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run all workspace tests |
| `npm run db:push` | Push Drizzle schema to the database |
| `npm run db:generate` | Generate a Drizzle migration |

---

## 🔐 Authentication flow (SIWA / AIP-62)

1. Frontend calls `POST /api/auth/nonce` with the connected wallet address → backend returns a challenge message containing a single-use nonce.
2. The wallet signs the AIP-62 wrapped message (`APTOS\nmessage: …\nnonce: …`) via the Aptos wallet adapter.
3. Frontend sends `{ address, message, signature }` to `POST /api/auth/verify`.
4. Backend:
   - validates the nonce (expiry, single-use, address match),
   - confirms the public key derives the on-chain **authentication key** (`sha3_256(pubkey ‖ 0x00)`),
   - cryptographically verifies the Ed25519 signature,
   - issues a JWT on success.

The signature wire format is `"0x" + 64-hex(pubKey) + 128-hex(signature)`.

---

## 🐳 Docker

```bash
docker compose up --build
```

---

## 📄 License

See repository for license details.
