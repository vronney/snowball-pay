// Every new account includes full Pro access for its first days — no card
// required. The window is derived from User.createdAt, so it needs no schema
// change and no backfill; accounts older than the window are simply past it.
export const SIGNUP_TRIAL_DAYS = 7;

// How long after the free week ends the dashboard keeps actively prompting
// (banner + one-time modal). Past this, only contextual feature gates upsell.
export const POST_TRIAL_PROMPT_DAYS = 7;

// Accounts created before this date predate the free-week feature. They never
// saw its promise, so they get no window — and, critically, never see a false
// "your free week of Pro has ended" prompt for a week they didn't have. Keep
// this at (or just before) the date the feature ships; bump it if the deploy
// slips well past it.
export const SIGNUP_TRIAL_LAUNCH = new Date('2026-08-14T00:00:00Z');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the account's free Pro window ends (createdAt + SIGNUP_TRIAL_DAYS),
 * or null for accounts that predate the feature.
 */
export function signupTrialEndsAt(createdAt: Date): Date | null {
  if (createdAt.getTime() < SIGNUP_TRIAL_LAUNCH.getTime()) return null;
  return new Date(createdAt.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS);
}

export function isSignupTrialActive(createdAt: Date, now: Date = new Date()): boolean {
  const endsAt = signupTrialEndsAt(createdAt);
  return endsAt !== null && now.getTime() < endsAt.getTime();
}

/**
 * True while a just-ended free week should still actively prompt the upgrade
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
 * Whole days of the free week still ahead (0 when past or ineligible).
 * Checkout uses this to align a mid-week subscription: Stripe billing starts
 * when the free week ends, so subscribing early never forfeits promised days.
 */
export function signupTrialDaysRemaining(createdAt: Date, now: number = Date.now()): number {
  const endsAt = signupTrialEndsAt(createdAt);
  if (endsAt === null) return 0;
  return Math.max(0, Math.ceil((endsAt.getTime() - now) / DAY_MS));
}
