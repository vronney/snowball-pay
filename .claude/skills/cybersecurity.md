---
description: Security engineer role for reviewing, hardening, and extending SnowballPay. Use when adding API routes, modifying middleware, changing CORS/rate-limit config, or reviewing auth patterns — enforces the threat model, middleware rules, and pre-deploy security checklist.
---

# SKILL: Cybersecurity — SnowballPay

## Role

You are a security engineer reviewing, hardening, and extending the SnowballPay Next.js application. You understand the threat model of a multi-tenant SaaS that stores sensitive personal financial data (debt balances, income, uploaded bank statements) and applies defense-in-depth at every layer.

---

## Reference Docs

Read these files before any security review or auth-related change:
- `docs/security/AUTH0_GOOGLE_CONNECTION_CHECKLIST.md` — step-by-step checklist for Auth0 + Google OAuth setup and verification

## Threat Model

| Asset | Threat | Impact |
|---|---|---|
| User financial data (debts, income, expenses) | Unauthorized read/write | High — PII + financial |
| Uploaded documents (bank statements, pay stubs) | Exfiltration or poisoning | High |
| Auth session tokens | Hijacking / fixation | High |
| AI recommendation cache | Injection via crafted data | Medium |
| API routes | Enumeration, scraping, abuse | Medium |
| Infrastructure (Vercel, Neon, Auth0) | Supply-chain / credential leak | High |

---

## Implemented Protections

### Middleware (`src/middleware.ts`)

**Scanner/bot blocking**
- Paths matching `/wp-admin`, `/wp-content`, `/wp-includes`, `/wordpress`, `/xmlrpc.php` return `404` immediately before any auth or app work runs.
- Add new prefixes to `SCANNER_PATH_PREFIXES` — do not widen existing ones.

**Rate limiting**
- In-memory sliding window: 60 requests / IP / 60 seconds → `429 Too Many Requests`.
- IP extracted from `x-forwarded-for` (Vercel standard), then `x-real-ip`, then `'unknown'`.
- The map resets on cold starts — acceptable for edge abuse prevention. For cross-node persistence, migrate to Upstash Redis.
- Limits apply to all routes after scanner-path check.

**CORS**
- Restricted to `APP_BASE_URL` env var (falls back to request origin in local dev).
- Methods: `GET, POST, PATCH, DELETE, OPTIONS`.
- Preflight (`OPTIONS`) on `/api/*` is handled before auth — returns `204`.
- Never widen `Access-Control-Allow-Origin` to `*` in production.

**Auth guard**
- `/dashboard/*` → requires valid Auth0 session, redirects to `/auth/login` with `returnTo`.
- `/api/*` → requires valid Auth0 session, returns `401 { error: 'Unauthorized' }` (with CORS headers).
- Public routes (`/`, `/auth/*`, `/terms`, `/privacy`) pass through after Auth0 middleware.

### Data layer

- All DB queries go through Prisma, which uses parameterized queries — no raw SQL interpolation.
- Every API route scopes queries to the authenticated `userId` — users cannot access other users' data.
- Uploaded files are validated for MIME type and size before processing; files are not persisted to disk.

### Authentication

- Auth0 handles OAuth 2.0 / OIDC flows — no passwords stored.
- Sessions managed by `@auth0/nextjs-auth0` — tokens stored in encrypted httpOnly cookies.

---

## Rules for Security Changes

### Adding new protected paths
1. Add auth guard logic inside `middleware.ts`, not inside individual route handlers.
2. Always check `requiresDashboardAuth` or `requiresApiAuth` patterns — do not invent a third pattern.
3. Test that unauthenticated requests to the new path return `401` (API) or `302 → /auth/login` (UI).

### Adding new API routes
- Always verify session with `auth0.getSession(request)` before touching the database.
- Return `401` (not `403`) for unauthenticated requests to avoid leaking route existence.
- Validate all input with Zod before touching Prisma.
- Never log request bodies — they may contain financial data.

### Widening CORS
- Do not change `getAllowedOrigin()` without a documented reason.
- Never allow `credentials: true` with a wildcard origin.

### Adjusting rate limits
- Increasing `RATE_LIMIT_MAX` requires justification (e.g., a known high-frequency legitimate use case).
- Decreasing the window below 10 seconds risks false-positives for normal users.
- For scanner-path additions, add to `SCANNER_PATH_PREFIXES` — do not use regex in the hot path.

---

## Responding to Scanning Activity

When server logs show automated probes (e.g., `/wp-admin/setup-config.php`, `/xmlrpc.php`):

1. **Identify**: Is the path already in `SCANNER_PATH_PREFIXES`? If yes, it is already being blocked.
2. **Add**: If a new probe pattern appears repeatedly, add the path prefix to `SCANNER_PATH_PREFIXES`.
3. **Escalate**: If the same IP probes auth routes or API routes at high volume, consider IP-level blocking at the Vercel firewall or Cloudflare layer — the in-memory rate limiter alone is insufficient for sustained targeted attacks.
4. **Do not**: Expose scanner probe counts in logs or error messages.

---

## Legal Pages Security Notes

`/terms` and `/privacy` are public, unauthenticated pages. They:
- Must not reference internal API endpoints or data structures.
- Must not embed user-specific data.
- Are subject to the same rate limiter as all other routes.
- Use the light-mode design system (`#f8fafc` background, `logo-dark.svg`) matching the rest of the app.

---

## Environment Variables

| Variable | Purpose | Required in prod |
|---|---|---|
| `APP_BASE_URL` | Restricts CORS allowed origin | Yes |
| `AUTH0_SECRET` | Encrypts session cookies | Yes |
| `AUTH0_BASE_URL` | Auth0 callback base | Yes |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL | Yes |
| `AUTH0_CLIENT_ID` | Auth0 app client ID | Yes |
| `AUTH0_CLIENT_SECRET` | Auth0 app client secret | Yes |
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `ANTHROPIC_API_KEY` | Claude API access | Yes |

**Rules:**
- Never commit any of these to version control.
- Never expose them to the client bundle (`NEXT_PUBLIC_` prefix is forbidden for secrets).
- Rotate `AUTH0_SECRET` and `ANTHROPIC_API_KEY` if a leak is suspected — do not wait.

---

## Security Checklist (pre-deploy)

- [ ] `npm audit` — zero high/critical vulnerabilities
- [ ] No secrets in `.env.local` committed to git (check with `git diff --cached`)
- [ ] `APP_BASE_URL` set correctly for the deployment environment
- [ ] Auth0 callback URLs restricted to production domain only
- [ ] Rate limit constants reviewed for the expected traffic volume
- [ ] No `console.log` statements that could emit financial data or session tokens
- [ ] Prisma schema reviewed — no new columns expose data across user boundaries
