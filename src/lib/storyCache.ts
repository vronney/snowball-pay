/**
 * Debt-story cache (Upstash Redis).
 *
 * The Journey tab regenerates its AI story on every cache-miss, and each
 * generation consumes one of the user's 3/24h `debtStory` rate-limit tokens.
 * Without a cache, ordinary repeat-viewing (or a page reload) burns the daily
 * budget and users hit a 429. This cache lets the route serve a previously
 * generated story WITHOUT calling Claude or consuming a token.
 *
 * Invalidation is data-driven, not time-driven: the cached entry carries a
 * `dataHash` fingerprint of the underlying financial figures (mirrors
 * AiRecommendationCache / CoachBriefCache). A cache hit only counts when the
 * caller's current hash matches — so a new payment, balance change, or payoff
 * naturally forces a regeneration on the next view. The TTL is only a backstop.
 *
 * Falls back to a no-op when Redis is not configured (local dev / CI), so the
 * route degrades to its pre-cache behaviour rather than erroring.
 */

import { Redis } from '@upstash/redis';

const TTL_SECONDS = 24 * 60 * 60; // 24h backstop; dataHash drives real invalidation

// Bump when the shape of the cached story payload changes. dataHash only tracks
// the user's *financial* inputs, not the *response shape* — so without this, a
// deploy that renames/adds/removes a field could serve an old-shaped entry
// (valid for up to TTL_SECONDS under an unchanged hash). A version mismatch is
// treated as a miss, so stale-shaped entries are silently regenerated.
const CACHE_VERSION = 1;

interface CachedStory {
  version: number;
  dataHash: string;
  payload: unknown; // the story response: { headline, body, stats }
}

function makeRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function cacheKey(userId: string): string {
  return `story:cache:${userId}`;
}

/**
 * Returns the cached story payload when one exists AND its fingerprint matches
 * `dataHash`; otherwise null (miss, stale, or Redis unavailable).
 */
export async function getCachedStory(userId: string, dataHash: string): Promise<unknown | null> {
  const redis = makeRedis();
  if (!redis) return null;
  try {
    const cached = await redis.get<CachedStory>(cacheKey(userId));
    if (cached && cached.version === CACHE_VERSION && cached.dataHash === dataHash) {
      return cached.payload;
    }
    return null;
  } catch {
    return null; // cache errors must never break the request
  }
}

/** Stores a freshly generated story under the user's key with its fingerprint. */
export async function setCachedStory(userId: string, dataHash: string, payload: unknown): Promise<void> {
  const redis = makeRedis();
  if (!redis) return;
  try {
    await redis.set(cacheKey(userId), { version: CACHE_VERSION, dataHash, payload } satisfies CachedStory, { ex: TTL_SECONDS });
  } catch {
    /* non-blocking: a failed cache write just means the next view regenerates */
  }
}
