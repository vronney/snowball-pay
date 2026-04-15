/**
 * Sliding-window rate limiter backed by Upstash Redis.
 *
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 * Falls back to an in-memory limiter when those vars are absent (local dev /
 * CI without Redis), so every environment still gets real enforcement.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ── Upstash limiter factory ──────────────────────────────────────────────────

function makeUpstashLimiter(tokens: number, window: `${number} s` | `${number} m`) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: 'rl',
  });
}

// ── In-memory fallback (single-process only) ─────────────────────────────────

interface Window {
  count: number;
  resetAt: number;
}

const memStore = new Map<string, Window>();

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of memStore) {
      if (win.resetAt < now) memStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

function memLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = memStore.get(key);
  if (!existing || existing.resetAt < now) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const hasRedis =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

// Lazily-created Upstash limiters (one instance per preset, reused across calls).
const upstashLimiters: Record<string, Ratelimit> = {};

function getLimiter(preset: string, tokens: number, window: `${number} s` | `${number} m`): Ratelimit {
  if (!upstashLimiters[preset]) {
    upstashLimiters[preset] = makeUpstashLimiter(tokens, window);
  }
  return upstashLimiters[preset];
}

async function check(
  preset: string,
  key: string,
  tokens: number,
  window: `${number} s` | `${number} m`,
  windowMs: number,
): Promise<boolean> {
  if (hasRedis) {
    const limiter = getLimiter(preset, tokens, window);
    const { success } = await limiter.limit(key);
    return success;
  }
  return memLimit(key, tokens, windowMs);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Pre-configured limiters for each protected route. */
export const limits = {
  /** 5 AI recommendation requests per 10 minutes per user. */
  recommendations: (userId: string) =>
    check('rec', `rec:${userId}`, 5, '600 s', 10 * 60 * 1000),

  /** 10 document uploads per 10 minutes per user. */
  documentUpload: (userId: string) =>
    check('upload', `upload:${userId}`, 10, '600 s', 10 * 60 * 1000),

  /** 1 plan email per 10 minutes per user. */
  emailPlan: (userId: string) =>
    check('email-plan', `email-plan:${userId}`, 1, '600 s', 10 * 60 * 1000),
};
