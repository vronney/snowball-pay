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

// ── TTL-bearing digest unsubscribe token ──────────────────────────────────────
// Format: base64url( JSON({ userId, exp }) + "." + hmac(payload) )
// exp is a Unix timestamp (seconds).

const DIGEST_TTL_DAYS = 30;

export function generateDigestUnsubscribeToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + DIGEST_TTL_DAYS * 24 * 60 * 60;
  const payload = JSON.stringify({ userId, exp });
  const sig = createHmac('sha256', secret()).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export type VerifyDigestResult =
  | { ok: true;  userId: string }
  | { ok: false; reason: 'invalid' | 'expired' };

export function verifyDigestUnsubscribeToken(token: string): VerifyDigestResult {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const dotIdx = raw.lastIndexOf('.');
    if (dotIdx === -1) return { ok: false, reason: 'invalid' };
    const payload = raw.slice(0, dotIdx);
    const sig     = raw.slice(dotIdx + 1);
    const expected = Buffer.from(
      createHmac('sha256', secret()).update(payload).digest('hex'),
      'hex',
    );
    const actual = Buffer.from(sig, 'hex');
    if (expected.length !== actual.length) return { ok: false, reason: 'invalid' };
    if (!timingSafeEqual(expected, actual))  return { ok: false, reason: 'invalid' };
    const { userId, exp } = JSON.parse(payload) as { userId: string; exp: number };
    if (Math.floor(Date.now() / 1000) > exp) return { ok: false, reason: 'expired' };
    return { ok: true, userId };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
