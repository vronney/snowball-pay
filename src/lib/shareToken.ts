import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SHARE_TOKEN_SECRET ?? "dev-share-secret-change-in-prod";
const VERSION = "v1";
const SEPARATOR = ".";

/**
 * Signs a userId into a URL-safe token.
 * Format: v1.<userId>.<hmac>
 * Tokens don't expire — the plan data is not sensitive (no balances, just strategy).
 */
export function signShareToken(userId: string): string {
  const payload = `${VERSION}${SEPARATOR}${userId}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}${SEPARATOR}${sig}`;
}

/**
 * Verifies a share token and returns the userId, or null if invalid.
 */
export function verifyShareToken(token: string): string | null {
  try {
    const parts = token.split(SEPARATOR);
    if (parts.length !== 3) return null;
    const [version, userId, sig] = parts;
    if (version !== VERSION) return null;
    const expected = createHmac("sha256", SECRET)
      .update(`${version}${SEPARATOR}${userId}`)
      .digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    return userId;
  } catch {
    return null;
  }
}
