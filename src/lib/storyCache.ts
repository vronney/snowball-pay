/**
 * Debt-story cache (Upstash Redis).
 *
 * The Journey tab regenerates its AI story on every cache-miss, and each
 * generation consumes one of the user's `debtStory` rate-limit tokens. Without a
 * cache, ordinary repeat-viewing (or a page reload) burns the daily budget and
 * users hit a 429. This cache lets the route serve a previously generated story
 * WITHOUT calling Claude or consuming a token — including fallback stories, so a
 * transient AI outage can't drain the budget across reloads (see FALLBACK_TTL).
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

const TTL_SECONDS = 24 * 60 * 60; // successful story: 24h backstop; dataHash drives real invalidation

// Fallback stories (AI timeout/error) get a short TTL: long enough that a burst
// of reloads during an AI blip is served from cache instead of each one draining
// a rate-limit token, but short enough to refresh to the real AI story soon
// after Claude recovers.
export const FALLBACK_TTL_SECONDS = 10 * 60;

// Cap how long a cache write may block the response. The fallback path writes
// after the AI abort budget is already spent, so an uncapped slow Upstash `set`
// could push the request past the route's maxDuration and turn graceful
// degradation into a hard timeout. A write that outruns this still completes in
// the background — we just stop awaiting it.
const WRITE_TIMEOUT_MS = 500;

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
    // A nullish version means the entry predates versioning (written by the
    // original cache release) — its payload shape IS version 1, so treat it as
    // such rather than forcing a miss. Otherwise every legacy entry would miss
    // for a full TTL after this ships, and a rate-limited user could 429 on
    // reload despite having a still-valid cached story. A real shape change
    // still invalidates both legacy and v1 entries by bumping CACHE_VERSION.
    if (cached && (cached.version ?? 1) === CACHE_VERSION && cached.dataHash === dataHash) {
      return cached.payload;
    }
    return null;
  } catch {
    return null; // cache errors must never break the request
  }
}

/**
 * Stores a story under the user's key with its fingerprint. Pass
 * `FALLBACK_TTL_SECONDS` for fallback stories so they expire quickly; omit for a
 * successful AI story (default 24h).
 */
export async function setCachedStory(
  userId: string,
  dataHash: string,
  payload: unknown,
  ttlSeconds: number = TTL_SECONDS,
): Promise<void> {
  const redis = makeRedis();
  if (!redis) return;

  // Errors are swallowed on the write itself so a late rejection (after the race
  // below has already resolved via timeout) can't surface as an unhandled
  // rejection. A failed write just means the next view regenerates.
  const write = Promise.resolve(
    redis.set(cacheKey(userId), { version: CACHE_VERSION, dataHash, payload } satisfies CachedStory, { ex: ttlSeconds }),
  ).catch(() => {});

  // Bound the blocking time (see WRITE_TIMEOUT_MS): stop awaiting a slow write so
  // it can never push the response past the route's platform deadline.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => { timer = setTimeout(resolve, WRITE_TIMEOUT_MS); });
  try {
    await Promise.race([write, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
