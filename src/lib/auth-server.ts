import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { auth0 } from '@/lib/auth0';
import { prisma } from '@/lib/prisma';
import { captureServerEvent } from '@/lib/analytics-server';
import { Events } from '@/lib/analyticsEvents';
import { ANALYTICS_CONSENT_KEY } from '@/lib/analyticsConsent';
import { trialGrantKey } from '@/lib/trialGrantKey';

/**
 * Marks a brand-new user row for the account_created capture. The upsert
 * can't report create-vs-find, so recency of createdAt stands in for it;
 * the $insert_id below makes the event exactly-once even if two concurrent
 * first requests both land inside this window.
 */
const NEW_ACCOUNT_WINDOW_MS = 10_000;

/**
 * Fires the account_created funnel event for a just-provisioned user.
 * Splits the Auth0 drop (signup_started → account_created) from the
 * onboarding drop (account_created → signup_completed), which fires only
 * at wizard completion. Consent-gated like every other event; best-effort.
 */
async function captureAccountCreated(userId: string): Promise<void> {
  let consent: 'granted' | 'denied' = 'denied';
  try {
    // cookies() throws outside a request scope (e.g. build-time prerender);
    // treat that as no consent rather than failing provisioning.
    consent =
      cookies().get(ANALYTICS_CONSENT_KEY)?.value === 'granted'
        ? 'granted'
        : 'denied';
  } catch {
    return;
  }
  await captureServerEvent({
    consent,
    distinctId: userId,
    event: Events.ACCOUNT_CREATED,
    insertId: `account_created:${userId}`,
    properties: { source: 'provisioning' },
  });
}

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

/**
 * Find-or-create the local user row for an Auth0 identity. Never throws.
 *
 * Historically this only ran inside verifyAuth (first authenticated API
 * call), so an Auth0 signup who bounced before generating a plan never got a
 * DB row at all — invisible to admin counts and the lifecycle-email crons.
 * Authenticated server pages (onboarding, dashboard) call this too, so every
 * signup is provisioned on first page load.
 */
export async function ensureUserProvisioned(sessionUser: {
  sub: string;
  email?: unknown;
  name?: unknown;
  email_verified?: unknown;
}): Promise<{ id: string; email: string | null; isNew: boolean } | null> {
  const email =
    typeof sessionUser.email === 'string' ? sessionUser.email.trim() : '';
  const name = typeof sessionUser.name === 'string' ? sessionUser.name : null;

  // User.email is required + unique — never create a row with a blank email
  // (the first blank-email profile would squat the '' value and every later
  // one would collide into the relink fallback below).
  if (!email) return null;

  try {
    const user = await prisma.user.upsert({
      where: { auth0Id: sessionUser.sub },
      update: {},
      create: { auth0Id: sessionUser.sub, email, name },
      select: { id: true, email: true, createdAt: true },
    });
    const isNew = Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS;
    if (isNew) {
      await captureAccountCreated(user.id);
      // Durable free-trial marker, keyed by an email digest with NO relation
      // to User so it survives account deletion — deleting and re-provisioning
      // cannot restart the signup Pro window. update:{} keeps the ORIGINAL
      // grantedAt if this identity was ever provisioned before. The deletion
      // route writes the same marker for accounts that predate this code, so
      // pre-existing users are covered at the moment it matters.
      try {
        const emailHash = trialGrantKey(user.email);
        await prisma.trialGrant.upsert({
          where: { emailHash },
          update: {},
          create: { emailHash, grantedAt: user.createdAt },
        });
      } catch {
        // Never fail provisioning over the marker (e.g. table not pushed yet);
        // gates fall back to createdAt until it exists.
      }
    }
    return { id: user.id, email: user.email, isNew };
  } catch (error) {
    // Same email under a different auth0Id (e.g. the user switched between
    // Google and email/password). Relink ONLY on the email unique-constraint
    // violation, and ONLY when Auth0 attests the email is verified — an
    // unverified signup with someone else's address must never take over
    // their account.
    const isUniqueViolation =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002';
    if (!isUniqueViolation || sessionUser.email_verified !== true) {
      return null;
    }
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { auth0Id: sessionUser.sub },
        });
        // Relinked, not created — a login-method switch is not a new account.
        return { id: user.id, email: user.email, isNew: false };
      }
    } catch {
      // fall through to null
    }
    return null;
  }
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const session = await auth0.getSession(request);

    if (!session || !session.user?.sub) {
      return { valid: false, user: null };
    }

    // Find or create the user row so FK constraints on Debt/Income/etc are
    // satisfied. Returns the cuid User.id, not the Auth0 sub.
    const user = await ensureUserProvisioned(session.user);

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
