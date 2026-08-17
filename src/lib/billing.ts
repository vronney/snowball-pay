// Every new account includes full Pro access for its first days — no card
// required. The window is anchored to the account's TrialGrant (a tombstone
// keyed by email that survives account deletion), falling back to
// User.createdAt; accounts older than the window are simply past it.
export const SIGNUP_TRIAL_DAYS = 14;

// How long after the free trial ends the dashboard keeps actively prompting
// (banner + one-time modal). Past this, only contextual feature gates upsell.
export const POST_TRIAL_PROMPT_DAYS = 7;

// Accounts created before this date predate the free-trial feature. They never
// saw its promise, so they get no window — and, critically, never see a false
// "your free Pro trial has ended" prompt for a trial they didn't have. Keep
// this at (or just before) the date the feature ships; bump it if the deploy
// slips well past it.
export const SIGNUP_TRIAL_LAUNCH = new Date('2026-08-14T00:00:00Z');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Canonical key for TrialGrant rows. Lowercased so the same mailbox reached
 * via different casing (Auth0 connections differ here) maps to one grant.
 */
export function normalizeTrialEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * When a free Pro window anchored at `anchor` ends (anchor +
 * SIGNUP_TRIAL_DAYS), or null for anchors that predate the feature.
 */
export function signupTrialEndsAt(anchor: Date): Date | null {
  if (anchor.getTime() < SIGNUP_TRIAL_LAUNCH.getTime()) return null;
  return new Date(anchor.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS);
}

export function isSignupTrialActive(anchor: Date, now: Date = new Date()): boolean {
  const endsAt = signupTrialEndsAt(anchor);
  return endsAt !== null && now.getTime() < endsAt.getTime();
}

/**
 * True while a just-ended free trial should still actively prompt the upgrade
 * decision (expired banner + the one-time modal). Shared by DashboardClient
 * and TrialCountdownBanner so the two surfaces can't disagree.
 */
export function isInPostTrialPromptWindow(
  trialEndsAt: Date | string,
  now: number = Date.now()
): boolean {
  const since = now - new Date(trialEndsAt).getTime();
  return since >= 0 && since < POST_TRIAL_PROMPT_DAYS * DAY_MS;
}

/**
 * Whole days until `end` (0 when past). Checkout uses this to align a
 * mid-trial subscription: Stripe billing starts when the free window ends,
 * so subscribing early never forfeits promised days.
 */
export function wholeDaysRemaining(end: Date, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((end.getTime() - now) / DAY_MS));
}
