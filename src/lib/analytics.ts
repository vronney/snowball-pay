/**
 * Analytics helper — wraps PostHog with graceful no-ops when the key is absent.
 * Import `track` anywhere client-side to fire events.
 * The PostHogProvider (providers.tsx) initialises the SDK once on mount.
 */

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, props?: Record<string, unknown>) => void;
      identify: (id: string, props?: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}

/** Fire a client-side analytics event. No-ops if PostHog is not initialised. */
export function track(event: string, props?: Record<string, unknown>): void {
  try {
    window?.posthog?.capture(event, props);
  } catch {
    // Never let analytics break the app
  }
}

/** Identify an authenticated user. Call after login. */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  try {
    window?.posthog?.identify(userId, traits);
  } catch {
    // silent
  }
}

/** Reset identity on logout. */
export function resetIdentity(): void {
  try {
    window?.posthog?.reset();
  } catch {
    // silent
  }
}

// ── Typed event constants ────────────────────────────────────────────────────
// Use these instead of raw strings to avoid typos across the codebase.

export const Events = {
  SIGNUP_STARTED:    'signup_started',
  SIGNUP_COMPLETED:  'signup_completed',
  DEBT_ADDED:        'debt_added',
  INCOME_SAVED:      'income_saved',
  PLAN_GENERATED:    'plan_generated',
  RETURN_SESSION:    'return_session',
  CALCULATOR_USED:   'calculator_used',
  PLAN_SAVED_EMAIL:  'plan_saved_email_captured',
  SHARE_CARD_OPENED: 'share_card_opened',
  SHARE_CARD_DOWNLOADED: 'share_card_downloaded',
  REFERRAL_LINK_COPIED: 'referral_link_copied',
  CELEBRATION_FIRED:        'celebration_fired',
  CELEBRATION_FALLBACK:     'celebration_fallback',
  CELEBRATION_RATE_LIMITED: 'celebration_rate_limited',
} as const;
