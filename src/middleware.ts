import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

// Only the app's own origin is allowed to call the API.
// APP_BASE_URL should be set in your environment (e.g. https://yourdomain.com).
// Falls back to the request's own origin so local dev always works.
function getAllowedOrigin(request: NextRequest): string {
  return process.env.APP_BASE_URL ?? request.nextUrl.origin;
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

  const session = await auth0.getSession(request);
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

export async function proxy(request: NextRequest) {
  return middleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
