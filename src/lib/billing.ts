// Every new account includes full Pro access for its first days — no card
// required. The window is derived from User.createdAt, so it needs no schema
// change and no backfill; accounts older than the window are simply past it.
export const SIGNUP_TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** When the account's free Pro window ends (createdAt + SIGNUP_TRIAL_DAYS). */
export function signupTrialEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SIGNUP_TRIAL_DAYS * DAY_MS);
}

export function isSignupTrialActive(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() < signupTrialEndsAt(createdAt).getTime();
}
