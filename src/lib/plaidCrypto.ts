import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Symmetric encryption for Plaid access tokens at rest.
 *
 * A Plaid access_token grants ongoing read access to a user's linked bank
 * accounts, so it must never sit in the database as plaintext. We wrap it in
 * AES-256-GCM (authenticated encryption — tampering is detected on decrypt)
 * keyed off PLAID_TOKEN_ENCRYPTION_KEY.
 *
 * Stored format:  enc:v1:<base64 iv>:<base64 authTag>:<base64 ciphertext>
 * The version tag lets us rotate the scheme later without ambiguity.
 */
const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

/** Resolve the 32-byte key from a 64-char hex env var. Throws if misconfigured. */
function key(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('PLAID_TOKEN_ENCRYPTION_KEY env var is not set');
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== 32) {
    throw new Error(
      'PLAID_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)'
    );
  }
  return buf;
}

/** Encrypt a Plaid access token for storage. */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit nonce, recommended for GCM
  const cipher = createCipheriv(ALGO, key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv, tag, ciphertext].map((b) => b.toString('base64')).join(':')
  );
}

/**
 * Decrypt a stored Plaid access token.
 *
 * Rows written before encryption was introduced are plaintext (no PREFIX) —
 * we return them as-is so existing links keep working. They become encrypted
 * the next time they're written (re-link / refresh upsert).
 */
export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':');
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
