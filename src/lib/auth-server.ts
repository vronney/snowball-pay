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
    const user = await prisma.user.upsert({
      where: { auth0Id: session.user.sub },
      update: {},
      create: {
        auth0Id: session.user.sub,
        email: typeof session.user.email === 'string' ? session.user.email : '',
        name: typeof session.user.name === 'string' ? session.user.name : null,
      },
      select: { id: true, email: true },
    });

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email ?? undefined,
      },
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

/** CUID format: starts with 'c', 25 alphanumeric chars total. */
const CUID_RE = /^c[a-z0-9]{24}$/;

/**
 * Returns true when the value looks like a valid Prisma CUID.
 * Use this to reject obviously malformed IDs before hitting the database.
 */
export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && CUID_RE.test(id);
}
