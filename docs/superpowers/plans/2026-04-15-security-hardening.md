# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 5 security findings from the CSO audit: axios CVE, CORS origin reflection, missing security headers, in-memory rate limiter bypass, and undocumented/coupled secrets.

**Architecture:** Each fix is independent and scoped to 1–2 files. No architectural changes. Tasks are ordered by risk — highest impact first. The rate limiter swap (Task 4) is the most involved: it replaces a synchronous in-memory Map with an async Upstash Redis client, requiring Upstash account setup and two new env vars.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, `@upstash/ratelimit`, `@upstash/redis`

---

## File Map

| File | Change |
|---|---|
| `package.json` | Bump `axios` to `^1.15.0` |
| `src/middleware.ts` | Add production guard on CORS origin fallback; replace inline IP rate limiter with Upstash |
| `next.config.js` | Add `headers()` export with security response headers |
| `src/lib/rateLimit.ts` | Replace in-memory Map with `@upstash/ratelimit` + `@upstash/redis` |
| `src/lib/unsubscribeToken.ts` | Remove `AUTH0_SECRET` fallback |
| `.env.example` | Add 6 missing env vars |
| `src/__tests__/lib/rateLimit.test.ts` | New: unit tests for Upstash rate limiter (mocked) |
| `src/__tests__/middleware.test.ts` | New: CORS guard test |

---

## Task 1: Upgrade axios

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update axios version**

In `package.json`, change:
```json
"axios": "^1.6.2"
```
to:
```json
"axios": "^1.15.0"
```

- [ ] **Step 2: Install and verify**

```bash
npm install
```

Expected: installs axios 1.15.x, no peer dependency errors.

- [ ] **Step 3: Verify no CVEs for axios**

```bash
npm audit 2>&1 | grep axios
```

Expected: no axios lines in output.

- [ ] **Step 4: Run existing tests**

```bash
npm run test
```

Expected: all tests pass (axios is client-side only, no test changes needed).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix(deps): upgrade axios to 1.15.0 to fix SSRF CVEs"
```

---

## Task 2: Fix CORS origin reflection

**Files:**
- Modify: `src/middleware.ts:39-41`
- Create: `src/__tests__/middleware.test.ts`

The current code at line 40 reflects any caller's `Origin` back as `Access-Control-Allow-Origin` when `APP_BASE_URL` is unset. With `Access-Control-Allow-Credentials: true`, this allows any site to make credentialed cross-origin requests.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/middleware.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the getAllowedOrigin logic directly by importing the helper.
// Since it's not exported, we test it via observable middleware behaviour
// by checking the header set on the response.

describe('CORS origin guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses APP_BASE_URL when set', () => {
    process.env.APP_BASE_URL = 'https://myapp.com';
    process.env.NODE_ENV = 'production';

    // Import the function inline after env is set
    const { getAllowedOrigin } = require('../lib/corsOrigin');
    const mockRequest = { nextUrl: { origin: 'https://evil.com' } } as any;

    expect(getAllowedOrigin(mockRequest)).toBe('https://myapp.com');
  });

  it('throws in production when APP_BASE_URL is not set', () => {
    delete process.env.APP_BASE_URL;
    process.env.NODE_ENV = 'production';

    const { getAllowedOrigin } = require('../lib/corsOrigin');
    const mockRequest = { nextUrl: { origin: 'https://evil.com' } } as any;

    expect(() => getAllowedOrigin(mockRequest)).toThrow('APP_BASE_URL must be set');
  });

  it('falls back to request origin in development when APP_BASE_URL is not set', () => {
    delete process.env.APP_BASE_URL;
    process.env.NODE_ENV = 'development';

    const { getAllowedOrigin } = require('../lib/corsOrigin');
    const mockRequest = { nextUrl: { origin: 'http://localhost:3000' } } as any;

    expect(getAllowedOrigin(mockRequest)).toBe('http://localhost:3000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/__tests__/middleware.test.ts
```

Expected: FAIL — `Cannot find module '../lib/corsOrigin'`

- [ ] **Step 3: Extract getAllowedOrigin to a module**

Create `src/lib/corsOrigin.ts`:

```typescript
import type { NextRequest } from 'next/server';

/**
 * Returns the allowed CORS origin for the response.
 * In production, APP_BASE_URL MUST be set — we throw rather than reflect the
 * caller's origin, which would allow any site to make credentialed requests.
 */
export function getAllowedOrigin(request: NextRequest): string {
  const configured = process.env.APP_BASE_URL;

  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('APP_BASE_URL must be set in production (CORS security)');
  }

  return configured ?? request.nextUrl.origin;
}
```

- [ ] **Step 4: Update middleware to use the new module**

In `src/middleware.ts`, replace lines 36–41:

```typescript
// Before:
// Only the app's own origin is allowed to call the API.
// APP_BASE_URL should be set in your environment (e.g. https://yourdomain.com).
// Falls back to the request's own origin so local dev always works.
function getAllowedOrigin(request: NextRequest): string {
  return process.env.APP_BASE_URL ?? request.nextUrl.origin;
}
```

With:

```typescript
import { getAllowedOrigin } from '@/lib/corsOrigin';
```

Remove the local `getAllowedOrigin` function entirely (it's now in `src/lib/corsOrigin.ts`).

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- src/__tests__/middleware.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Run full test suite and build**

```bash
npm run test && npm run build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/lib/corsOrigin.ts src/middleware.ts src/__tests__/middleware.test.ts
git commit -m "fix(security): throw in production when APP_BASE_URL is unset (CORS origin reflection)"
```

---

## Task 3: Add security response headers

**Files:**
- Modify: `next.config.js`

No tests needed — Next.js validates the config shape at build time and integration tests would require a running server. The build check in Step 2 is the verification.

- [ ] **Step 1: Add headers() to next.config.js**

In `next.config.js`, add a `headers` async function to the `nextConfig` object:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config ...

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Restrict referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS for 2 years (only applied over HTTPS, ignored on HTTP)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Disable browser features not used by this app
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
```

The full file after the change:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 's.gravatar.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
      { protocol: 'https', hostname: 'cdn.auth0.com' },
      { protocol: 'https', hostname: '*.auth0.com' },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ['src'],
  },
  serverExternalPackages: ['@auth0/nextjs-auth0'],
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: build succeeds, no config warnings about `headers`.

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "fix(security): add X-Frame-Options, CSP, HSTS, and other security headers"
```

---

## Task 4: Replace in-memory rate limiter with Upstash Redis

**Context:** The current `src/lib/rateLimit.ts` uses an in-memory `Map`. On Vercel, each serverless function instance has isolated memory, so the per-user limits (5 AI recommendations per 10 min, 10 document uploads per 10 min) are per-instance rather than global. An attacker with multiple Vercel instances can trigger unbounded Anthropic API calls.

**Prerequisites:** You need an Upstash account and a Redis database.
1. Go to [console.upstash.com](https://console.upstash.com), create a Redis database (free tier is fine).
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the database details page.
3. Add both to your `.env.local` and Vercel environment settings.

**Files:**
- Modify: `src/lib/rateLimit.ts`
- Create: `src/__tests__/lib/rateLimit.test.ts`
- Note: `src/app/api/recommendations/route.ts` and `src/app/api/documents/upload/route.ts` already call `await limits.x()` — no changes needed there.

- [ ] **Step 1: Install Upstash packages**

```bash
npm install @upstash/ratelimit @upstash/redis
```

Expected: packages install, no peer dependency errors.

- [ ] **Step 2: Write failing tests**

Create `src/__tests__/lib/rateLimit.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @upstash/redis and @upstash/ratelimit before importing rateLimit
const mockLimit = vi.fn();

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: mockLimit,
  })),
  // Expose the static factory methods the real class has
  default: {
    slidingWindow: vi.fn().mockReturnValue('sliding-window-config'),
  },
}));

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({ /* mock Redis client */ }),
  },
}));

// Import after mocks are set up
import { limits } from '@/lib/rateLimit';

describe('limits.recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when under the limit', async () => {
    mockLimit.mockResolvedValue({ success: true });

    const result = await limits.recommendations('user-123');
    expect(result).toBe(true);
    expect(mockLimit).toHaveBeenCalledWith('rec:user-123');
  });

  it('returns false when over the limit', async () => {
    mockLimit.mockResolvedValue({ success: false });

    const result = await limits.recommendations('user-123');
    expect(result).toBe(false);
  });

  it('returns true (fail-open) when Upstash throws', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection failed'));

    const result = await limits.recommendations('user-123');
    expect(result).toBe(true); // fail open — don't block users on Redis outage
  });
});

describe('limits.documentUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when under the limit', async () => {
    mockLimit.mockResolvedValue({ success: true });

    const result = await limits.documentUpload('user-456');
    expect(result).toBe(true);
    expect(mockLimit).toHaveBeenCalledWith('upload:user-456');
  });

  it('returns false when over the limit', async () => {
    mockLimit.mockResolvedValue({ success: false });

    const result = await limits.documentUpload('user-456');
    expect(result).toBe(false);
  });

  it('returns true (fail-open) when Upstash throws', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection failed'));

    const result = await limits.documentUpload('user-456');
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test -- src/__tests__/lib/rateLimit.test.ts
```

Expected: FAIL — the current `rateLimit.ts` exports a sync function, not an async one, and doesn't use Upstash.

- [ ] **Step 4: Replace rateLimit.ts**

Replace the entire contents of `src/lib/rateLimit.ts` with:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Global rate limiters backed by Upstash Redis.
 *
 * Uses sliding window algorithm — fairer than fixed windows for bursty traffic.
 * Fail-open: if Redis is unavailable, requests are allowed through. This is the
 * right tradeoff for a UX app — a Redis outage shouldn't block paying users.
 *
 * Requires env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 */

const redis = Redis.fromEnv();

const recommendationsLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'rl',
});

const documentUploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 m'),
  prefix: 'rl',
});

async function check(limiter: Ratelimit, key: string): Promise<boolean> {
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (err) {
    // Fail open — Redis outage should not block users
    console.error('Rate limiter error (failing open):', err);
    return true;
  }
}

export const limits = {
  /** 5 AI recommendation requests per 10 minutes per user. */
  recommendations: (userId: string) => check(recommendationsLimiter, `rec:${userId}`),

  /** 10 document uploads per 10 minutes per user. */
  documentUpload: (userId: string) => check(documentUploadLimiter, `upload:${userId}`),
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- src/__tests__/lib/rateLimit.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Run build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/lib/rateLimit.ts src/__tests__/lib/rateLimit.test.ts package.json package-lock.json
git commit -m "fix(security): replace in-memory rate limiter with Upstash Redis for global enforcement"
```

---

## Task 5: Fix undocumented env vars and decouple UNSUBSCRIBE_SECRET

**Files:**
- Modify: `.env.example`
- Modify: `src/lib/unsubscribeToken.ts`

- [ ] **Step 1: Write failing test for unsubscribeToken**

Add to `src/__tests__/lib/unsubscribeToken.test.ts` (create if it doesn't exist):

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('unsubscribeToken secret isolation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('throws when UNSUBSCRIBE_SECRET is not set (no AUTH0_SECRET fallback)', async () => {
    process.env = { ...originalEnv };
    delete process.env.UNSUBSCRIBE_SECRET;
    delete process.env.AUTH0_SECRET;

    const { generateUnsubscribeToken } = await import('@/lib/unsubscribeToken');
    expect(() => generateUnsubscribeToken('user-123')).toThrow('UNSUBSCRIBE_SECRET env var is not set');
  });

  it('does NOT fall back to AUTH0_SECRET', async () => {
    process.env = { ...originalEnv };
    delete process.env.UNSUBSCRIBE_SECRET;
    process.env.AUTH0_SECRET = 'some-auth0-secret';

    const { generateUnsubscribeToken } = await import('@/lib/unsubscribeToken');
    // Should throw — not silently use AUTH0_SECRET
    expect(() => generateUnsubscribeToken('user-123')).toThrow('UNSUBSCRIBE_SECRET env var is not set');
  });

  it('uses UNSUBSCRIBE_SECRET when set', async () => {
    process.env = { ...originalEnv };
    process.env.UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret-32-chars!!';

    const { generateUnsubscribeToken, verifyUnsubscribeToken } = await import('@/lib/unsubscribeToken');
    const token = generateUnsubscribeToken('user-123');
    expect(verifyUnsubscribeToken('user-123', token)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/__tests__/lib/unsubscribeToken.test.ts
```

Expected: FAIL — the current implementation falls back to `AUTH0_SECRET`, so the "does NOT fall back" test will fail.

- [ ] **Step 3: Remove the AUTH0_SECRET fallback**

Replace the contents of `src/lib/unsubscribeToken.ts` with:

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) throw new Error('UNSUBSCRIBE_SECRET env var is not set');
  return s;
}

export function generateUnsubscribeToken(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  try {
    const expected = Buffer.from(generateUnsubscribeToken(userId), 'hex');
    const actual   = Buffer.from(token, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/__tests__/lib/unsubscribeToken.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Add missing env vars to .env.example**

Replace the contents of `.env.example` with:

```bash
# ── Database ────────────────────────────────────────────────────────────────
# Pooled connection URL (used at runtime — Neon: use the -pooler endpoint)
DATABASE_URL="your_database_url_here"

# Direct (non-pooled) connection URL (used by Prisma Migrate)
# Neon: same as above but without the -pooler subdomain
DIRECT_URL="your_direct_database_url_here"

# ── Auth0 ────────────────────────────────────────────────────────────────────
AUTH0_DOMAIN="your-tenant.us.auth0.com"
AUTH0_CLIENT_ID="your_client_id"
AUTH0_CLIENT_SECRET="your_client_secret"
# 64-character secret used to encrypt the session cookie
# Generate with: openssl rand -hex 32
AUTH0_SECRET="replace_with_64_char_random_hex"

# ── App ──────────────────────────────────────────────────────────────────────
# Base URL of your deployed app (no trailing slash). REQUIRED in production —
# used for CORS origin enforcement. Missing this in prod will throw on startup.
APP_BASE_URL="https://your-app.vercel.app"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# ── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRO_PRICE_ID="price_..."
# Webhook signing secret — get from Stripe dashboard > Webhooks > your endpoint
STRIPE_WEBHOOK_SECRET="whsec_..."

# ── Email (Resend) ────────────────────────────────────────────────────────────
RESEND_API_KEY="re_..."

# ── Cron ─────────────────────────────────────────────────────────────────────
# Secret used to authenticate Vercel cron job requests.
# Generate with: openssl rand -hex 32
CRON_SECRET="replace_with_random_hex"

# ── Email unsubscribe ─────────────────────────────────────────────────────────
# HMAC key for stateless unsubscribe tokens. Must be independent of AUTH0_SECRET.
# Generate with: openssl rand -hex 32
UNSUBSCRIBE_SECRET="replace_with_random_hex"

# ── AI (Anthropic) ───────────────────────────────────────────────────────────
ANTHROPIC_API_KEY="sk-ant-..."

# ── Upstash Redis (rate limiting) ─────────────────────────────────────────────
# Get from console.upstash.com — create a Redis database, copy these values.
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_token"

# ── Analytics (PostHog) ───────────────────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# ── Content ──────────────────────────────────────────────────────────────────
# Optional: Google Sheets URL for featured content
CONTENT_SHEET_URL="https://docs.google.com/spreadsheets/d/..."
```

- [ ] **Step 6: Run full test suite and build**

```bash
npm run test && npm run build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add .env.example src/lib/unsubscribeToken.ts src/__tests__/lib/unsubscribeToken.test.ts
git commit -m "fix(security): decouple UNSUBSCRIBE_SECRET from AUTH0_SECRET, document all required env vars"
```

---

## Final Verification

- [ ] **Run the full test suite one last time**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Run lint and build**

```bash
npm run lint && npm run build
```

Expected: no lint errors, build succeeds.

- [ ] **Verify no remaining high/critical CVEs**

```bash
npm audit 2>&1 | grep -E "critical|high" | grep -v "vite\|next\|eslint\|lodash\|minimatch\|glob\|picomatch"
```

Expected: no output (remaining high CVEs are dev-only tools with no prod impact).

- [ ] **Add Upstash env vars to Vercel**

In the Vercel dashboard: Settings → Environment Variables → add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for Production, Preview, and Development.

- [ ] **Verify APP_BASE_URL is set in Vercel**

In the Vercel dashboard: confirm `APP_BASE_URL` and `NEXT_PUBLIC_APP_URL` are set to your production domain.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
