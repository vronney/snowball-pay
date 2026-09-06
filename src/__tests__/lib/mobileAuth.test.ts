import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

const DOMAIN = 'tenant.example.auth0.com';
const AUDIENCE = 'https://api.getsnowballpay.com';

let privateKey: CryptoKey;
let publicJwk: Record<string, unknown>;

async function mint(
  claims: Record<string, unknown>,
  opts: { issuer?: string; audience?: string; expired?: boolean } = {},
) {
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.issuer ?? `https://${DOMAIN}/`)
    .setAudience(opts.audience ?? AUDIENCE)
    .setIssuedAt(opts.expired ? Math.floor(Date.now() / 1000) - 7200 : undefined)
    .setExpirationTime(opts.expired ? Math.floor(Date.now() / 1000) - 3600 : '1h');
  return jwt.sign(privateKey);
}

const fetchMock = vi.fn();

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('AUTH0_DOMAIN', DOMAIN);
  vi.stubEnv('AUTH0_MOBILE_AUDIENCE', AUDIENCE);
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.endsWith('/.well-known/jwks.json')) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.endsWith('/userinfo')) {
      return new Response(
        JSON.stringify({ sub: 'auth0|u1', email: 'u1@example.com', email_verified: true, name: 'U One' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('bearerToken', () => {
  it('extracts a bearer token and ignores other schemes', async () => {
    const { bearerToken } = await import('@/lib/mobileAuth');
    const req = (value: string | null) => ({ headers: { get: () => value } });
    expect(bearerToken(req('Bearer abc.def.ghi'))).toBe('abc.def.ghi');
    expect(bearerToken(req('bearer abc'))).toBe('abc');
    expect(bearerToken(req('Basic abc'))).toBeNull();
    expect(bearerToken(req(null))).toBeNull();
  });
});

describe('verifyMobileToken', () => {
  it('accepts a token signed by the tenant for the mobile audience', async () => {
    const { verifyMobileToken } = await import('@/lib/mobileAuth');
    const token = await mint({ sub: 'auth0|u1' });
    expect(await verifyMobileToken(token)).toEqual({
      sub: 'auth0|u1',
      email: undefined,
      email_verified: undefined,
      name: undefined,
    });
  });

  it('reads the namespaced email claim when present', async () => {
    const { verifyMobileToken } = await import('@/lib/mobileAuth');
    const token = await mint({
      sub: 'auth0|u1',
      'https://getsnowballpay.com/email': 'claim@example.com',
      'https://getsnowballpay.com/email_verified': true,
    });
    expect(await verifyMobileToken(token)).toMatchObject({
      sub: 'auth0|u1',
      email: 'claim@example.com',
      email_verified: true,
    });
  });

  it('rejects wrong audience, wrong issuer, expiry, and garbage', async () => {
    const { verifyMobileToken } = await import('@/lib/mobileAuth');
    expect(await verifyMobileToken(await mint({ sub: 'x' }, { audience: 'other' }))).toBeNull();
    expect(
      await verifyMobileToken(await mint({ sub: 'x' }, { issuer: 'https://evil.example/' })),
    ).toBeNull();
    expect(await verifyMobileToken(await mint({ sub: 'x' }, { expired: true }))).toBeNull();
    expect(await verifyMobileToken('not.a.jwt')).toBeNull();
  });

  it('fails closed when the audience is not configured', async () => {
    vi.stubEnv('AUTH0_MOBILE_AUDIENCE', '');
    const { verifyMobileToken } = await import('@/lib/mobileAuth');
    expect(await verifyMobileToken(await mint({ sub: 'x' }))).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('resolveMobileIdentity', () => {
  it('falls back to /userinfo for the email and caches it per subject', async () => {
    const { resolveMobileIdentity } = await import('@/lib/mobileAuth');
    const token = await mint({ sub: 'auth0|u1' });

    const first = await resolveMobileIdentity(token);
    expect(first).toEqual({
      sub: 'auth0|u1',
      email: 'u1@example.com',
      email_verified: true,
      name: 'U One',
    });

    await resolveMobileIdentity(token);
    const userinfoCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/userinfo'));
    expect(userinfoCalls).toHaveLength(1);
  });

  it('rejects a /userinfo response for a different subject', async () => {
    const { resolveMobileIdentity } = await import('@/lib/mobileAuth');
    const token = await mint({ sub: 'auth0|someone-else' });
    expect(await resolveMobileIdentity(token)).toBeNull();
  });

  it('skips /userinfo when the token already carries an email', async () => {
    const { resolveMobileIdentity } = await import('@/lib/mobileAuth');
    const token = await mint({ sub: 'auth0|u1', 'https://getsnowballpay.com/email': 'c@example.com' });
    expect((await resolveMobileIdentity(token))?.email).toBe('c@example.com');
    expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith('/userinfo'))).toBe(false);
  });
});
