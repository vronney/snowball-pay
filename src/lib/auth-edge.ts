/**
 * Edge-runtime JWT verifier for Auth0 sessions.
 *
 * Uses jose + @panva/hkdf to decrypt the __session cookie without importing
 * Prisma or the full @auth0/nextjs-auth0 server SDK — both of which require
 * Node.js APIs unavailable in the Next.js Edge runtime.
 *
 * Key derivation mirrors @auth0/nextjs-auth0 v4 (cookies.ts):
 *   hkdf('sha256', AUTH0_SECRET, '', 'JWE CEK', 32)  →  A256GCM decrypt
 *
 * Returns the Auth0 `sub` (not the internal Prisma User.id). Use this
 * as the rate-limit key on Edge routes; it's a stable, per-user identifier.
 */

import { hkdf } from '@panva/hkdf';
import { jwtDecrypt } from 'jose';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = '__session';
const HKDF_DIGEST   = 'sha256';
const HKDF_INFO     = 'JWE CEK';
const HKDF_BYTES    = 32;

export type EdgeAuthResult =
  | { valid: true;  sub: string }
  | { valid: false };

/**
 * Verifies the Auth0 session cookie in an Edge-compatible way.
 * Returns the Auth0 sub on success; { valid: false } on any failure.
 */
export async function verifyAuthEdge(request: NextRequest): Promise<EdgeAuthResult> {
  try {
    const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
    if (!cookieValue) return { valid: false };

    const secret = process.env.AUTH0_SECRET;
    if (!secret) return { valid: false };

    const encKey = await hkdf(HKDF_DIGEST, secret, '', HKDF_INFO, HKDF_BYTES);
    const { payload } = await jwtDecrypt(cookieValue, encKey, { clockTolerance: 15 });

    // Auth0 v4 session payload: { user: { sub, email, ... }, ... }
    const sub = (payload as { user?: { sub?: string }; sub?: string }).user?.sub
      ?? (payload.sub as string | undefined);

    if (!sub) return { valid: false };
    return { valid: true, sub };
  } catch {
    return { valid: false };
  }
}
