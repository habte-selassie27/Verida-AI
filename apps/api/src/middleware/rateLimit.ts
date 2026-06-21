// IMPLEMENTER NOTE: Provides Redis-backed rate limit middleware for global, upload, and stream API policies.
// BUILD.md TASK: STEP 6 — Express API Routes
// ARCHITECT CONTRACT: Middleware-enforced limits for upload (10/hour/IP), stream (100/hour/session), and general API (200/15min/IP)
// SHELBY SDK METHODS: None directly; this middleware guards API ingress before Shelby operations run.
// DB TABLES: None directly; rate limiting is stored in Redis.
// HANDOFF TO TESTER: Verify each limiter threshold, Redis key partitioning, and 429 response payload shape.

import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import IORedis from 'ioredis';
import { RedisStore, type RedisReply } from 'rate-limit-redis';

interface RateLimitConfig {
  keyGenerator?: (request: Request) => string;
  limit: number;
  message: string;
  prefix: string;
  windowMs: number;
}

const SESSION_HEADER_NAME = 'x-session-id';

function getRequiredRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL?.trim() ?? '';

  if (redisUrl.length === 0) {
    throw new Error('REDIS_URL is required to configure API rate limit middleware.');
  }

  return redisUrl;
}

const redisRateLimitClient = new IORedis(getRequiredRedisUrl(), {
  enableReadyCheck: false,
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

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

function createLimiter(config: RateLimitConfig): RateLimitRequestHandler {
  return rateLimit({
    handler: (_request, response): void => {
      response.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          error: config.message,
        },
        success: false,
      });
    },
    keyGenerator: config.keyGenerator ?? defaultIpKeyGenerator,
    legacyHeaders: false,
    limit: config.limit,
    standardHeaders: 'draft-8',
    store: new RedisStore({
      prefix: config.prefix,
      sendCommand: (...args: string[]): Promise<RedisReply> => {
        const command = args[0] ?? 'PING';
        const commandArguments = args.slice(1);
        return redisRateLimitClient.call(command, ...commandArguments) as Promise<RedisReply>;
      },
    }),
    windowMs: config.windowMs,
  });
}

export const generalRateLimit = createLimiter({
  limit: 200,
  message: 'Too many API requests from this IP. Please retry in a few minutes.',
  prefix: 'verida:rate-limit:general:',
  windowMs: 15 * 60 * 1000,
});

export const uploadRateLimit = createLimiter({
  limit: 10,
  message: 'Upload rate limit exceeded for this IP. Please retry in one hour.',
  prefix: 'verida:rate-limit:upload:',
  windowMs: 60 * 60 * 1000,
});

export const streamRateLimit = createLimiter({
  keyGenerator: sessionScopedKeyGenerator,
  limit: 100,
  message: 'Stream rate limit exceeded for this session. Please retry later.',
  prefix: 'verida:rate-limit:stream:',
  windowMs: 60 * 60 * 1000,
});

export async function closeRateLimitRedisClient(): Promise<void> {
  if (redisRateLimitClient.status === 'end') {
    return;
  }

  try {
    await redisRateLimitClient.quit();
  } catch {
    redisRateLimitClient.disconnect();
  }
}
