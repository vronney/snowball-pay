import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';
import { getAllowedOrigin } from '@/lib/corsOrigin';

// Paths probed by automated WordPress/CMS scanners — return 404 immediately.
const SCANNER_PATH_PREFIXES = [
  '/wp-admin',
  '/wp-content',
  '/wp-includes',
  '/wordpress',
  '/xmlrpc.php',
];

function isScannerPath(pathname: string): boolean {
  return SCANNER_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Simple in-memory rate limiter: max 60 requests per IP per 60-second window.
// Edge runtime resets this map per isolate restart, which is acceptable for
// basic abuse prevention (not a substitute for a CDN-level WAF).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}


function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const allowedOrigin = getAllowedOrigin(request);
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Block scanner probes before doing any other work.
  if (isScannerPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Rate-limit by IP — applies to all routes.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  if (isRateLimited(ip)) {
    return new NextResponse(null, { status: 429 });
  }

  // Stripe webhooks are verified by signature — skip session auth entirely.
  if (pathname === '/api/webhooks/stripe') {
    return addCorsHeaders(NextResponse.next(), request);
  }

  const requiresDashboardAuth = pathname.startsWith('/dashboard');
  const requiresApiAuth = pathname.startsWith('/api');

  // Handle CORS preflight for API routes.
  if (requiresApiAuth && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    return addCorsHeaders(preflight, request);
  }

  const authResponse = await auth0.middleware(request);

  if (!requiresDashboardAuth && !requiresApiAuth) {
    return authResponse;
  }

  const session = await auth0.getSession(authResponse);
  if (session) {
    return requiresApiAuth ? addCorsHeaders(authResponse, request) : authResponse;
  }

  if (requiresApiAuth) {
    const unauth = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return addCorsHeaders(unauth, request);
  }

  const loginUrl = new URL('/auth/login', request.nextUrl.origin);
  loginUrl.searchParams.set('returnTo', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
