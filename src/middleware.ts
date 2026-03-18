import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

export async function middleware(request: NextRequest) {
  const authResponse = await auth0.middleware(request);
  const { pathname, search } = request.nextUrl;

  const requiresDashboardAuth = pathname.startsWith('/dashboard');
  const requiresApiAuth = pathname.startsWith('/api');

  if (!requiresDashboardAuth && !requiresApiAuth) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (session) {
    return authResponse;
  }

  if (requiresApiAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
