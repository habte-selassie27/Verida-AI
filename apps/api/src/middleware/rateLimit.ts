// IMPLEMENTER NOTE: Provides Redis-backed rate limit middleware for global, upload, and stream API policies.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: Middleware-enforced limits for upload (10/hour/IP), stream (100/hour/session), and general API (200/15min/IP)
// SHELBY SDK METHODS: None directly; this middleware guards API ingress before Shelby operations run.
// DB TABLES: None directly; rate limiting is stored in Redis.
// HANDOFF TO TESTER: Verify each limiter threshold, Redis key partitioning, and 429 response payload shape.

import type { Request, Response, NextFunction } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

const SESSION_HEADER_NAME = 'x-session-id';

function getRedisUrl(): string | null {
  const redisUrl = process.env.REDIS_URL?.trim() ?? '';
  return redisUrl.length > 0 ? redisUrl : null;
}

function defaultIpKeyGenerator(request: Request): string {
  const requestIp = typeof request.ip === 'string' ? request.ip : '';
  return ipKeyGenerator(requestIp);
}

function sessionScopedKeyGenerator(request: Request): string {
  const rawHeader = request.header(SESSION_HEADER_NAME);
  const sessionId = typeof rawHeader === 'string' ? rawHeader.trim() : '';

  if (sessionId.length > 0) {
    return `session:${sessionId}`;
  }

  return `ip:${defaultIpKeyGenerator(request)}`;
}

// ── Lazy Redis-backed rate limiters ────────────────────────────────────
// Only initialize Redis when the first request arrives. If Redis is
// unavailable, fall back to a pass-through middleware so the app still
// works (without rate limiting) instead of crashing at import time.

let redisAvailable: boolean | null = null; // null = not checked yet
let generalRateLimitFn: ((req: Request, res: Response, next: NextFunction) => void) | null = null;
let uploadRateLimitFn: ((req: Request, res: Response, next: NextFunction) => void) | null = null;
let streamRateLimitFn: ((req: Request, res: Response, next: NextFunction) => void) | null = null;
let redisClient: import('ioredis').default | null = null;

function passThrough(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

async function tryInitRedis(): Promise<boolean> {
  if (redisAvailable !== null) return redisAvailable;

  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    console.warn('[RateLimit] REDIS_URL not set — rate limiting disabled.');
    redisAvailable = false;
    return false;
  }

  try {
    const { default: IORedis } = await import('ioredis');
    const { RedisStore } = await import('rate-limit-redis');
    const { rateLimit } = await import('express-rate-limit');

    const client = new IORedis(redisUrl, {
      enableReadyCheck: false,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });

    redisClient = client;
    redisAvailable = true;

    function createLimiter(config: {
      limit: number;
      message: string;
      prefix: string;
      windowMs: number;
      keyGenerator?: (request: Request) => string;
    }) {
      return rateLimit({
        handler: (_request: Request, response: Response): void => {
          response.status(429).json({
            error: { code: 'RATE_LIMITED', error: config.message },
            success: false,
          });
        },
        keyGenerator: config.keyGenerator ?? defaultIpKeyGenerator,
        legacyHeaders: false,
        limit: config.limit,
        standardHeaders: 'draft-8',
        store: new RedisStore({
          prefix: config.prefix,
          sendCommand: (...args: string[]) => {
            const command = args[0] ?? 'PING';
            return client.call(command, ...args.slice(1)) as Promise<import('rate-limit-redis').RedisReply>;
          },
        }),
        windowMs: config.windowMs,
      });
    }

    generalRateLimitFn = createLimiter({
      limit: 200,
      message: 'Too many API requests from this IP. Please retry in a few minutes.',
      prefix: 'verida:rate-limit:general:',
      windowMs: 15 * 60 * 1000,
    });

    uploadRateLimitFn = createLimiter({
      limit: 10,
      message: 'Upload rate limit exceeded for this IP. Please retry in one hour.',
      prefix: 'verida:rate-limit:upload:',
      windowMs: 60 * 60 * 1000,
    });

    streamRateLimitFn = createLimiter({
      keyGenerator: sessionScopedKeyGenerator,
      limit: 100,
      message: 'Stream rate limit exceeded for this session. Please retry later.',
      prefix: 'verida:rate-limit:stream:',
      windowMs: 60 * 60 * 1000,
    });

    console.log('[RateLimit] Redis connected — rate limiting enabled.');
    return true;
  } catch (err) {
    console.warn('[RateLimit] Redis unavailable — rate limiting disabled:', err instanceof Error ? err.message : err);
    redisAvailable = false;
    return false;
  }
}

// Middleware wrappers that lazily initialize Redis on first request
export function generalRateLimit(req: Request, res: Response, next: NextFunction): void {
  void tryInitRedis().then((ok) => {
    if (ok && generalRateLimitFn) {
      generalRateLimitFn(req, res, next);
    } else {
      passThrough(req, res, next);
    }
  });
}

export function uploadRateLimit(req: Request, res: Response, next: NextFunction): void {
  void tryInitRedis().then((ok) => {
    if (ok && uploadRateLimitFn) {
      uploadRateLimitFn(req, res, next);
    } else {
      passThrough(req, res, next);
    }
  });
}

export function streamRateLimit(req: Request, res: Response, next: NextFunction): void {
  void tryInitRedis().then((ok) => {
    if (ok && streamRateLimitFn) {
      streamRateLimitFn(req, res, next);
    } else {
      passThrough(req, res, next);
    }
  });
}

export async function closeRateLimitRedisClient(): Promise<void> {
  if (!redisClient || redisClient.status === 'end') {
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  }
}
