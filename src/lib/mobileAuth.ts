import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Bearer-token auth for the native mobile app (apps/mobile).
 *
 * The web app authenticates with the Auth0 session cookie. The mobile app
 * signs in with Auth0 natively (PKCE) and presents the resulting access token
 * as `Authorization: Bearer <jwt>` on the SAME API routes — no parallel API.
 * The token is an RS256 JWT minted for the `AUTH0_MOBILE_AUDIENCE` API and is
 * verified against the tenant's JWKS. Fails closed when either env var is
 * unset so a misconfigured deploy can never accept unsigned tokens.
 *
 * Edge-safe on purpose: the middleware imports this, so it must not pull in
 * Prisma or anything Node-only.
 */

export interface MobileIdentity {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

/** Namespaced claim an Auth0 Action can add so we skip the /userinfo hop. */
const EMAIL_CLAIM = 'https://getsnowballpay.com/email';
const EMAIL_VERIFIED_CLAIM = 'https://getsnowballpay.com/email_verified';
const NAME_CLAIM = 'https://getsnowballpay.com/name';

const USERINFO_TTL_MS = 10 * 60 * 1000;
const USERINFO_TIMEOUT_MS = 5_000;
/** Per-subject cap: the map is per-isolate memory, so keep it small. */
const USERINFO_CACHE_MAX = 500;
const userinfoCache = new Map<string, { expiresAt: number; identity: MobileIdentity }>();

/** Drop expired entries, then the oldest ones, so the cache stays bounded. */
function pruneUserinfoCache(now: number): void {
  for (const [sub, entry] of userinfoCache) {
    if (entry.expiresAt <= now) userinfoCache.delete(sub);
  }
  while (userinfoCache.size >= USERINFO_CACHE_MAX) {
    const oldest = userinfoCache.keys().next().value;
    if (oldest === undefined) break;
    userinfoCache.delete(oldest);
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksDomain: string | null = null;

export function bearerToken(request: {
  headers: { get(name: string): string | null };
}): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+([A-Za-z0-9\-_.~+/]+=*)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function claimString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function identityFromPayload(payload: JWTPayload): MobileIdentity | null {
  const sub = claimString(payload.sub);
  if (!sub) return null;
  return {
    sub,
    email: claimString(payload[EMAIL_CLAIM]),
    email_verified:
      payload[EMAIL_VERIFIED_CLAIM] === true ? true : undefined,
    name: claimString(payload[NAME_CLAIM]),
  };
}

/**
 * Verifies signature, issuer, audience and expiry. Returns the identity from
 * the token's own claims (email only when the tenant adds the custom claim).
 */
export async function verifyMobileToken(token: string): Promise<MobileIdentity | null> {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_MOBILE_AUDIENCE;
  if (!domain || !audience) return null;

  if (!jwks || jwksDomain !== domain) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
    jwksDomain = domain;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${domain}/`,
      audience,
      algorithms: ['RS256'],
    });
    return identityFromPayload(payload);
  } catch {
    return null;
  }
}

/**
 * Verifies the token and guarantees an email when Auth0 has one: falls back
 * to the tenant's /userinfo endpoint (cached per subject) when the access
 * token carries no email claim. Provisioning requires an email, so a token
 * without one is unauthenticated for our purposes.
 */
export async function resolveMobileIdentity(token: string): Promise<MobileIdentity | null> {
  const identity = await verifyMobileToken(token);
  if (!identity) return null;
  if (identity.email) return identity;

  const cached = userinfoCache.get(identity.sub);
  if (cached && cached.expiresAt > Date.now()) return cached.identity;

  try {
    const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(USERINFO_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const info = (await res.json()) as Record<string, unknown>;
    if (claimString(info.sub) !== identity.sub) return null;
    const email = claimString(info.email);
    if (!email) return null;
    const resolved: MobileIdentity = {
      sub: identity.sub,
      email,
      email_verified: info.email_verified === true,
      name: claimString(info.name),
    };
    const now = Date.now();
    pruneUserinfoCache(now);
    userinfoCache.set(identity.sub, { expiresAt: now + USERINFO_TTL_MS, identity: resolved });
    return resolved;
  } catch {
    return null;
  }
}
