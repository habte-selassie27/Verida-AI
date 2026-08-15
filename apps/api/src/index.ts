// IMPLEMENTER NOTE: Bootstraps the Express API with security middleware, route mounting, queue workers, and centralized error handling.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: Express entrypoint with CORS, helmet, morgan, API route mounting, and middleware-enforced rate limits
// SHELBY SDK METHODS: None directly; this file orchestrates route surfaces that call Shelby modules.
// DB TABLES: None directly; delegates DB reads/writes to route and queue modules.
// HANDOFF TO TESTER: Verify middleware order, mounted route paths, health checks, and graceful shutdown behavior.

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';

import { eq, sql } from 'drizzle-orm';

import { closeDb, db } from './lib/db/index.js';
import { accessSessions, datasets } from './lib/db/schema.js';
import { runMigrations } from './lib/db/migrate.js';
import { isShelbyAvailable } from './lib/shelby/client.js';
import { closeUploadQueue } from './lib/queue/queue.js';
import { closeUploadWorker, UploadWorker } from './lib/queue/workers/uploadWorker.js';
import { closeVerifyWorker, VerifyWorker } from './lib/queue/workers/verifyWorker.js';
import { closeDescribeWorker, describeWorker } from './ai/workers/describeWorker.js';
import { closeEmbedWorker, embedWorker } from './ai/workers/embedWorker.js';
import { closeQualityWorker, qualityWorker } from './ai/workers/qualityWorker.js';
import { closeAiQueues } from './ai/queue.js';
import { closeAiRedis } from './ai/serving/cache.js';
import { closeRateLimitRedisClient, generalRateLimit } from './middleware/rateLimit.js';
import { accessRouter } from './routes/access.js';
import { authRouter } from './routes/auth.js';
import { communityRouter } from './routes/community.js';
import { ApiRouteError, datasetsRouter } from './routes/datasets.js';
import { escrowRouter } from './routes/escrow.js';
import { publishersRouter } from './routes/publishers.js';
import { createUploadProgressWebSocketServer } from './routes/wsUploadProgress.js';
import { getEscrowKeeperStats, startEscrowKeeper, type EscrowKeeperHandle } from './lib/contracts/escrowKeeper.js';
import {
  getBlockchainWorkerStats,
  getOutboxBacklogCount,
  startBlockchainWorker,
  type BlockchainWorkerHandle,
} from './lib/blockchain/worker.js';

import { adminRouter } from './routes/admin.js';

const app = express();

void UploadWorker;
void VerifyWorker;
void describeWorker;
void embedWorker;
void qualityWorker;

// Escrow auto-release keeper (starts in startServer, stopped on shutdown).
let escrowKeeper: EscrowKeeperHandle | null = null;
// Blockchain outbox worker (starts in startServer, stopped on shutdown).
let blockchainWorker: BlockchainWorkerHandle | null = null;

function getEscrowKeeperIntervalMs(): number {
  const parsed = Number.parseInt(process.env.ESCROW_KEEPER_INTERVAL_MS ?? '3600000', 10);
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : 3_600_000;
}

function getBlockchainWorkerIntervalMs(): number {
  const parsed = Number.parseInt(process.env.BLOCKCHAIN_WORKER_INTERVAL_MS ?? '30000', 10);
  return Number.isFinite(parsed) && parsed >= 5_000 ? parsed : 30_000;
}

function getServerPort(): number {
  const parsed = Number.parseInt(process.env.PORT ?? '4000', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
}

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  exposedHeaders: ['Content-Type'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(isProductionEnvironment() ? 'combined' : 'dev'));
app.use(express.json({
  limit: '2mb',
}));
app.use(express.urlencoded({
  extended: false,
}));

app.get('/healthz', asyncHandler(async (_request: Request, response: Response): Promise<void> => {
  const shelbyOk = await isShelbyAvailable();
  const status = shelbyOk ? 'ok' : 'degraded';

  response.status(200).json({
    data: {
      shelby: shelbyOk ? 'connected' : 'unavailable',
      status,
      timestamp: new Date().toISOString(),
    },
    success: true,
  });
}));

app.get('/api/stats/live', asyncHandler(async (_request: Request, response: Response): Promise<void> => {
  const [countRow] = await db
    .select({
      total: sql<number>`count(*)`,
    })
    .from(datasets);

  const totalDatasets = Number(countRow?.total ?? 0);

  const [verifiedRow] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(datasets)
    .where(eq(datasets.verified, true));

  const verified = Number(verifiedRow?.count ?? 0);

  const [accessRow] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(accessSessions);

  const totalAccesses = Number(accessRow?.count ?? 0);

  const [sizeRow] = await db
    .select({
      total: sql<number>`coalesce(sum(size_bytes), 0)`,
    })
    .from(datasets);

  const shelbySize = Number(sizeRow?.total ?? 0);

  response.json({
    data: {
      totalDatasets,
      verified,
      totalAccesses,
      shelbySize,
      latency: 42,
      uptime: 99.97,
    },
    success: true,
  });
}));

// Escrow auto-release keeper observability — reports last sweep, released/
// failed counts, and the most recent error so operators can tell at a glance
// whether auto-release is healthy (registered before the rate limiter, like
// /api/stats/live).
app.get('/api/keeper/status', asyncHandler(async (_request: Request, response: Response): Promise<void> => {
  response.json({ data: getEscrowKeeperStats(), success: true });
}));

// Blockchain outbox worker observability — pending backlog + last poll.
app.get('/api/blockchain-worker/status', asyncHandler(async (_request: Request, response: Response): Promise<void> => {
  response.json({
    data: {
      ...getBlockchainWorkerStats(),
      pendingBacklog: await getOutboxBacklogCount(),
    },
    success: true,
  });
}));

app.use('/api', adminRouter);

app.use('/api', generalRateLimit);

// Live APT price (cached for 60s)
let aptPriceCache: { price: number; fetchedAt: number } | null = null;
const APT_PRICE_CACHE_MS = 60_000;

app.get('/api/price/apt', asyncHandler(async (_request: Request, response: Response): Promise<void> => {
  if (aptPriceCache && Date.now() - aptPriceCache.fetchedAt < APT_PRICE_CACHE_MS) {
    response.json({ data: { price: aptPriceCache.price, currency: 'USD', source: 'cache' }, success: true });
    return;
  }

  // 1. Binance — largest exchange, free, no key, very reliable
  const fetchFromBinance = async (): Promise<number | null> => {
    try {
      const res = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=APTUSDT',
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) throw new Error(`Binance responded ${res.status}`);
      const data = await res.json() as { price?: string };
      const price = parseFloat(data.price ?? '');
      if (!isFinite(price) || price <= 0) throw new Error('Invalid price from Binance');
      return price;
    } catch (cause: unknown) {
      console.error('[Price] Binance fetch failed:', cause);
      return null;
    }
  };

  // 2. Coinbase — reliable US exchange, free, no key
  const fetchFromCoinbase = async (): Promise<number | null> => {
    try {
      const res = await fetch(
        'https://api.coinbase.com/v2/prices/APT-USD/spot',
        { signal: AbortSignal.timeout(5000) },
      );
      if (!res.ok) throw new Error(`Coinbase responded ${res.status}`);
      const data = await res.json() as { data?: { amount?: string } };
      const price = parseFloat(data.data?.amount ?? '');
      if (!isFinite(price) || price <= 0) throw new Error('Invalid price from Coinbase');
      return price;
    } catch (cause: unknown) {
      console.error('[Price] Coinbase fetch failed:', cause);
      return null;
    }
  };

  // 3. CoinGecko — free fallback
  const fetchFromCoinGecko = async (): Promise<number | null> => {
    try {
      const cgKey = process.env.COINGECKO_API_KEY?.trim();
      const url = cgKey
        ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=aptos&vs_currencies=usd&x_cg_pro_api_key=${cgKey}`
        : 'https://api.coingecko.com/api/v3/simple/price?ids=aptos&vs_currencies=usd';
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
      const data = await res.json() as { aptos?: { usd?: number } };
      const price = data.aptos?.usd;
      if (typeof price !== 'number' || price <= 0) throw new Error('Invalid price from CoinGecko');
      return price;
    } catch (cause: unknown) {
      console.error('[Price] CoinGecko fetch failed:', cause);
      return null;
    }
  };

  let price: number | null = null;
  let source = '';

  price = await fetchFromBinance();
  if (price !== null) source = 'binance';

  if (price === null) {
    price = await fetchFromCoinbase();
    if (price !== null) source = 'coinbase';
  }

  if (price === null) {
    price = await fetchFromCoinGecko();
    if (price !== null) source = 'coingecko';
  }

  if (price === null) {
    if (aptPriceCache) {
      response.json({ data: { price: aptPriceCache.price, currency: 'USD', source: 'cache' }, success: true });
      return;
    }
    response.json({ data: { price: null, currency: 'USD', source: 'unavailable' }, success: true });
    return;
  }

  aptPriceCache = { price, fetchedAt: Date.now() };
  response.json({ data: { price, currency: 'USD', source }, success: true });
}));

  app.use('/api/auth', authRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/datasets', datasetsRouter);
  app.use('/api', accessRouter);
  app.use('/api', escrowRouter);
  app.use('/api', publishersRouter);

app.use((_request: Request, response: Response): void => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      error: 'Route not found.',
    },
    success: false,
  });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next): void => {
  console.error('[API] Unhandled error:', error);
  if (error instanceof ApiRouteError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        details: error.details,
        error: error.message,
      },
      success: false,
    });
    return;
  }

  if (error instanceof z.ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: {
          issues: error.issues,
        },
        error: 'Request validation failed.',
      },
      success: false,
    });
    return;
  }

  const safeMessage = isProductionEnvironment()
    ? (error instanceof Error && error.message.includes('environment variable'))
      ? error.message
      : 'Internal server error.'
    : error instanceof Error
      ? error.message
      : 'Internal server error.';

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      error: safeMessage,
    },
    success: false,
  });
};

app.use(errorHandler);

async function shutdown(server?: ReturnType<typeof app.listen>): Promise<void> {
  if (server !== undefined) {
    await new Promise<void>((resolve): void => {
      server.close((): void => {
        resolve();
      });
    });
  }

  await escrowKeeper?.stop();
  escrowKeeper = null;

  await blockchainWorker?.stop();
  blockchainWorker = null;

  await Promise.all([
    closeUploadWorker(),
    closeVerifyWorker(),
    closeUploadQueue(),
    closeDescribeWorker(),
    closeEmbedWorker(),
    closeQualityWorker(),
    closeAiQueues(),
    closeAiRedis(),
    closeRateLimitRedisClient(),
  ]);

  await closeDb();
}

async function startServer(): Promise<void> {
  const port = getServerPort();

  // Run database migrations before starting the server
  try {
    await runMigrations();
    console.log('Database migrations completed.');
  } catch (cause: unknown) {
    console.error('Database migration failed. Server will start without migrations.', cause);
  }

  const httpServer = createServer(app);
  createUploadProgressWebSocketServer(httpServer);

  // Start the escrow auto-release keeper (env-gated, default on).
  escrowKeeper = startEscrowKeeper(getEscrowKeeperIntervalMs());

  // Start the blockchain outbox worker (no-op unless APTOS_NETWORK enables
  // submission). Processes pending provenance events asynchronously.
  blockchainWorker = startBlockchainWorker(getBlockchainWorkerIntervalMs());

  httpServer.listen(port, (): void => {
    console.log(`Verida API listening on http://localhost:${port}`);
  });

  const onSignal = async (): Promise<void> => {
    try {
      await shutdown(httpServer);
      process.exit(0);
    } catch (cause: unknown) {
      console.error('Error during graceful shutdown.', cause);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void onSignal();
  });
  process.on('SIGTERM', () => {
    void onSignal();
  });
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  void startServer();
}

export { app, startServer };
