import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';
import { getAllowedOrigin } from '@/lib/corsOrigin';

// Paths probed by automated scanners for CMS/admin or sensitive config files.
// Return 404 immediately so these never hit application routes.
const SCANNER_PATH_PREFIXES = [
  '/.env',
  '/.git',
  '/.hg',
  '/.svn',
  '/.ds_store',
  '/.aws',
  '/.ssh',
  '/config.php',
  '/id_rsa',
  '/phpinfo',
  '/server-status',
  '/wp-admin',
  '/wp-config.php',
  '/wp-content',
  '/wp-includes',
  '/wordpress',
  '/xmlrpc.php',
];

const SENSITIVE_SCANNER_SEGMENTS = [
  '.git',
  '.hg',
  '.svn',
  '.ds_store',
  '.aws',
  '.ssh',
  'config.php',
  'id_rsa',
  'phpinfo',
  'server-status',
  'wp-config.php',
  'xmlrpc.php',
];

const PUBLIC_API_PATHS = [
  '/api/support/contact',
  '/api/webhooks/stripe',
  '/api/plaid/webhooks',
  '/api/unsubscribe',
];

function normalizePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname).toLowerCase();
  } catch {
    return pathname.toLowerCase();
  }
}

export function isScannerPath(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  if (SCANNER_PATH_PREFIXES.some((prefix) => normalizedPathname.startsWith(prefix))) {
    return true;
  }

  return normalizedPathname
    .split('/')
    .filter(Boolean)
    .some((segment) => segment === '.env' || segment.startsWith('.env.') || SENSITIVE_SCANNER_SEGMENTS.includes(segment));
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

  // Public API routes handle their own validation/rate limiting.
  // /api/og/* generates share-card images from query params only (no user data)
  // and must load unauthenticated — email clients and social crawlers fetch it
  // with no session cookie.
  if (
    PUBLIC_API_PATHS.includes(pathname) ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/og/')
  ) {
    return addCorsHeaders(NextResponse.next(), request);
  }

  const requiresDashboardAuth =
    pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');
  const requiresApiAuth = pathname.startsWith('/api');

  // Handle CORS preflight for API routes.
  if (requiresApiAuth && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    return addCorsHeaders(preflight, request);
  }

  // Auth0 mounts /auth/* handlers, but /auth itself is not a handler.
  // Redirect the bare auth root so it does not fall through to Next's 404.
  if (pathname === '/auth' || pathname === '/auth/') {
    const loginUrl = new URL('/auth/login', request.nextUrl.origin);
    loginUrl.searchParams.set('returnTo', '/dashboard');
    return NextResponse.redirect(loginUrl);
  }

  const authResponse = await auth0.middleware(request);

  if (!requiresDashboardAuth && !requiresApiAuth) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (session) {
    return requiresApiAuth ? addCorsHeaders(authResponse, request) : authResponse;
  }

  if (requiresApiAuth) {
    const unauth = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return addCorsHeaders(unauth, request);
  }

  // Unauthenticated visitors to /onboarding: send to login with returnTo=/dashboard.
  // The dashboard then redirects to /onboarding after the session is established.
  // Using /onboarding as returnTo directly caused a redirect loop because the
  // session cookie isn't readable by the middleware on the first post-callback request.
  if (pathname.startsWith('/onboarding')) {
    const loginUrl = new URL('/auth/login', request.nextUrl.origin);
    loginUrl.searchParams.set('returnTo', '/dashboard');
    return NextResponse.redirect(loginUrl);
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
