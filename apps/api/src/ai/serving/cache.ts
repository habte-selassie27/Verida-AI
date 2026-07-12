// AI serving — Redis-backed inference cache (shared by all AI workers).
// Uses ioredis (already available via BullMQ) pointed at the same REDIS_URL.

import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';
export const aiRedis = new Redis(redisUrl);

export async function cachedInference<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await aiRedis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Cache read failure must never block inference.
  }
  const result = await compute();
  try {
    await aiRedis.setex(key, ttlSeconds, JSON.stringify(result));
  } catch {
    // Best-effort cache write.
  }
  return result;
}

export function buildCacheKey(prefix: string, input: string): string {
  // Cheap, dependency-free hash for cache keys.
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return `${prefix}:${(h >>> 0).toString(36)}`;
}

export async function closeAiRedis(): Promise<void> {
  await aiRedis.quit();
}
