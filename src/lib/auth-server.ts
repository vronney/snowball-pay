import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';

type AuthSuccess = {
  valid: true;
  user: {
    id: string;
    email?: string;
  };
};

type AuthFailure = {
  valid: false;
  user: null;
};

type AuthResult = AuthSuccess | AuthFailure;

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const session = await auth0.getSession(request);

    if (!session || !session.user?.sub) {
      return { valid: false, user: null };
    }

    // Find or create the user row so FK constraints on Debt/Income/etc are satisfied.
    // Returns the cuid User.id, not the Auth0 sub.
    const email = typeof session.user.email === 'string' ? session.user.email : '';
    const name = typeof session.user.name === 'string' ? session.user.name : null;

    let user: { id: string; email: string | null } | null = null;

    try {
      user = await prisma.user.upsert({
        where: { auth0Id: session.user.sub },
        update: {},
        create: { auth0Id: session.user.sub, email, name },
        select: { id: true, email: true },
      });
    } catch {
      // Upsert failed — most likely a unique constraint on email (same email,
      // different auth0Id). Find the existing row by email and link the new sub.
      if (email) {
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { auth0Id: session.user.sub },
          });
        }
      }
    }

    if (!user) return { valid: false, user: null };

    return {
      valid: true,
      user: { id: user.id, email: user.email ?? undefined },
    };
  } catch {
    return { valid: false, user: null };
  }
}

export function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

export function forbidden(message = 'Not available for your account yet.') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

export function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

export function serverError(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}

export function tooManyRequests(
  message = 'Too many requests. Please wait and try again.',
  retryAfterSeconds = 600,
) {
  return NextResponse.json(
    { error: message, retryAfter: retryAfterSeconds },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

/** CUID format: starts with 'c', 25 alphanumeric chars total. */
const CUID_RE = /^c[a-z0-9]{24}$/;

/**
 * Returns true when the value looks like a valid Prisma CUID.
 * Use this to reject obviously malformed IDs before hitting the database.
 */
export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && CUID_RE.test(id);
}
