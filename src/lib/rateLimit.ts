/**
 * Simple in-memory sliding-window rate limiter.
 *
 * ⚠️  This works correctly for single-process deployments (local dev, single
 * server). On Vercel/serverless each function instance has its own memory, so
 * limits are per-instance rather than global.  For true global rate limiting
 * add Upstash Redis (@upstash/ratelimit) and swap this implementation out.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Prune expired entries every 5 minutes to avoid unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (win.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Returns true when the request is allowed, false when it should be rejected.
 *
 * @param key      Unique identifier (e.g. userId + ':' + routeName)
 * @param limit    Max requests allowed within the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}

/** Pre-configured limiters for the two expensive AI routes. */
export const limits = {
  /** 5 AI recommendation requests per 10 minutes per user. */
  recommendations: (userId: string) =>
    rateLimit(`rec:${userId}`, 5, 10 * 60 * 1000),

  /** 10 document uploads per 10 minutes per user. */
  documentUpload: (userId: string) =>
    rateLimit(`upload:${userId}`, 10, 10 * 60 * 1000),
};
