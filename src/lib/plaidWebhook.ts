import { createHash, timingSafeEqual } from 'crypto';
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from 'jose';
import { plaidClient, logPlaidError } from '@/lib/plaid';

/**
 * Verify the authenticity of a Plaid webhook.
 *
 * Plaid signs each webhook with an ES256 JWT in the `Plaid-Verification` header.
 * The JWT's `kid` identifies the public key (fetched from Plaid and cached), and
 * its `request_body_sha256` claim must equal the SHA-256 of the raw request body
 * — this binds the signature to the exact payload, so a valid header can't be
 * replayed against a tampered body. We also reject JWTs older than 5 minutes.
 *
 * Returns true only when the signature, freshness, and body hash all check out.
 */

// Plaid verification keys are stable per kid; cache to avoid a network round
// trip on every webhook. Keys rotate rarely, keyed by kid so rotation is safe.
const keyCache = new Map<string, JWK>();

// Negative cache: the route is public, so forged JWT headers with random kids
// would otherwise trigger an outbound Plaid API call per request (an
// amplification vector that could exhaust Plaid rate limits and block
// verification of real webhooks). Remember failed kid lookups for 5 minutes.
const FAILED_KID_TTL_MS = 5 * 60 * 1000;
const failedKidCache = new Map<string, number>();

async function getVerificationKey(kid: string): Promise<JWK | null> {
  const cached = keyCache.get(kid);
  if (cached) return cached;
  const failedAt = failedKidCache.get(kid);
  if (failedAt !== undefined && Date.now() - failedAt < FAILED_KID_TTL_MS) {
    return null;
  }
  try {
    const res = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
    const jwk = res.data.key as unknown as JWK;
    keyCache.set(kid, jwk);
    failedKidCache.delete(kid);
    return jwk;
  } catch (err) {
    logPlaidError('[plaid webhook] failed to fetch verification key', err);
    // Bound the cache so a flood of unique forged kids can't grow it forever.
    if (failedKidCache.size >= 1000) failedKidCache.clear();
    failedKidCache.set(kid, Date.now());
    return null;
  }
}

export async function verifyPlaidWebhook(
  rawBody: string,
  verificationHeader: string | null
): Promise<boolean> {
  if (!verificationHeader) return false;

  let kid: string | undefined;
  let alg: string | undefined;
  try {
    ({ kid, alg } = decodeProtectedHeader(verificationHeader));
  } catch {
    return false;
  }
  // Plaid only ever signs with ES256; reject anything else (incl. "none").
  if (alg !== 'ES256' || !kid) return false;

  const jwk = await getVerificationKey(kid);
  if (!jwk) return false;

  let payload: { request_body_sha256?: unknown };
  try {
    const key = await importJWK(jwk, 'ES256');
    ({ payload } = await jwtVerify(verificationHeader, key, {
      algorithms: ['ES256'],
      maxTokenAge: '5 min', // reject stale tokens (replay protection)
    }));
  } catch {
    return false;
  }

  const claimed = payload.request_body_sha256;
  if (typeof claimed !== 'string') return false;

  const actual = createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(claimed, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
