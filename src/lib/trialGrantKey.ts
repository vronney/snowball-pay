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

let warnedMissingSecret = false;

export function trialGrantKey(email: string): string {
  const normalized = normalizeTrialEmail(email);
  const secret = process.env.TRIAL_GRANT_SECRET;
  if (secret) {
    return createHmac('sha256', secret).update(normalized).digest('hex');
  }
  // Deliberately fall back instead of throwing: every call site treats the
  // tombstone as best-effort, so a throw here would mean NO marker is written
  // at all — failing open for the exact abuse this table prevents. The unkeyed
  // digest still keeps plaintext out of the database; its weaker property
  // (offline candidate matching of a leaked table) is why the secret must be
  // set in production — warn loudly, once, until it is.
  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      '[trialGrantKey] TRIAL_GRANT_SECRET is not set — using an unkeyed digest. ' +
        'Set it in production (see .env.example).'
    );
  }
  return createHash('sha256').update(normalized).digest('hex');
}
