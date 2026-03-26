/**
 * Rate limiter for Vercel serverless functions.
 *
 * Uses Upstash Redis when configured (distributed, works across instances).
 * Falls back to in-memory Map when Redis is not available (per-instance only).
 *
 * Environment variables:
 *   UPSTASH_REDIS_REST_URL   — Upstash Redis REST API URL
 *   UPSTASH_REDIS_REST_TOKEN — Upstash Redis REST API token
 */

// ─── Upstash Redis client (lazy init) ────────────────────────

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function redisIncr(key: string, windowMs: number): Promise<{ count: number; ttl: number } | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    // INCR + conditional EXPIRE in a pipeline
    const resp = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PTTL', key],
      ]),
    });
    const results = await resp.json() as Array<{ result: number }>;
    const count = results[0]?.result || 1;
    let ttl = results[1]?.result || -1;

    // Set expiry on first request (ttl=-1 means no expiry set)
    if (ttl < 0) {
      await fetch(`${UPSTASH_URL}/PEXPIRE/${encodeURIComponent(key)}/${windowMs}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      });
      ttl = windowMs;
    }

    return { count, ttl };
  } catch {
    return null; // Fallback to in-memory
  }
}

// ─── In-memory fallback ──────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

// ─── Public API ──────────────────────────────────────────────

/**
 * Check rate limit for a given key (usually IP address).
 * Returns { allowed: true } if under limit, or { allowed: false, retryAfter } if over.
 *
 * Tries Upstash Redis first (distributed). Falls back to in-memory Map.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; retryAfter?: number } {
  // Try async Redis in background — for sync callers, use in-memory
  // For async callers, use checkRateLimitAsync instead
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Async rate limit check — uses Upstash Redis when available.
 * Falls back to in-memory synchronous check.
 */
export async function checkRateLimitAsync(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60_000,
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  // Try Redis first
  const redis = await redisIncr(`ratelimit:${key}`, windowMs);
  if (redis) {
    if (redis.count > maxRequests) {
      const retryAfter = Math.ceil(redis.ttl / 1000);
      return { allowed: false, remaining: 0, retryAfter };
    }
    return { allowed: true, remaining: maxRequests - redis.count };
  }

  // Fallback to in-memory
  return checkRateLimit(key, maxRequests, windowMs);
}

/**
 * Extract client IP from Vercel request headers.
 */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return headers['x-real-ip'] as string || 'unknown';
}
