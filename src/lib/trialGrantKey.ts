/**
 * Server-only lookup key for TrialGrant rows.
 *
 * The tombstone deliberately survives account deletion (that's its whole
 * job — see prisma/schema.prisma), so it must not retain the address itself:
 * the privacy policy promises deletion of identifying data. An HMAC of the
 * normalized email is non-reversible without the server secret, still lets
 * the same mailbox map to the same grant, and contains nothing but the hash
 * and a date.
 *
 * TRIAL_GRANT_SECRET should be a long random hex string (see .env.example).
 * Without it we fall back to an unkeyed digest — still no plaintext at rest,
 * but set the secret in production. Changing the secret orphans existing
 * grants (every lookup misses), which fails open to a fresh window — don't
 * rotate it casually.
 */
import { createHash, createHmac } from 'crypto';
import { normalizeTrialEmail } from '@/lib/billing';

export function trialGrantKey(email: string): string {
  const normalized = normalizeTrialEmail(email);
  const secret = process.env.TRIAL_GRANT_SECRET;
  if (secret) {
    return createHmac('sha256', secret).update(normalized).digest('hex');
  }
  return createHash('sha256').update(normalized).digest('hex');
}
