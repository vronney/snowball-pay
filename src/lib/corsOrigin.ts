import type { NextRequest } from 'next/server';

/**
 * Returns the allowed CORS origin for the response.
 * In production, APP_BASE_URL MUST be set — we throw rather than reflect the
 * caller's origin, which would allow any site to make credentialed requests.
 */
export function getAllowedOrigin(request: NextRequest): string {
  const configured = process.env.APP_BASE_URL;

  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('APP_BASE_URL must be set in production (CORS security)');
  }

  return configured || request.nextUrl.origin;
}
