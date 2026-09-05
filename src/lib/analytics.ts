/**
 * Analytics helper — wraps PostHog with graceful no-ops when the key is absent.
 * Import `track` anywhere client-side to fire events.
 * The shared client is initialised lazily before the first SDK call.
 *
 * Consent model (see AnalyticsConsentBanner):
 * - No choice yet → cookieless "anonymous" mode: in-memory persistence only,
 *   nothing stored on the device, session replay off. Keeps funnels and
 *   dead-click data alive without persistent identifiers.
 * - "granted" → full mode: persistent client, session replay per the PostHog
 *   project's replay settings (fully masked), identify() allowed.
 * - "denied" → nothing is captured at all.
 */
import posthog from 'posthog-js';
import type { AnalyticsEvent } from '@/lib/analyticsEvents';
import { sanitiseAnalyticsProperties } from '@/lib/analyticsPrivacy';
import { getAnalyticsConsent, hasAnalyticsConsent } from '@/lib/analyticsConsent';
export { Events } from '@/lib/analyticsEvents';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// Only the production site emits analytics. Localhost dev servers and Vercel
// preview deployments inherit the production PostHog key through env vars,
// and their events pollute funnel reports as phantom users (2026-08-16: QA
// checkout testing read as a trial-funnel prospect in the weekly review).
// Set NEXT_PUBLIC_ANALYTICS_ALLOW_DEV=true to test events deliberately.
const PRODUCTION_HOSTNAMES = new Set(['getsnowballpay.com', 'www.getsnowballpay.com']);

function isInternalHost(): boolean {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ALLOW_DEV === 'true') return false;
  return !PRODUCTION_HOSTNAMES.has(window.location.hostname);
}

type AnalyticsMode = 'anonymous' | 'full';
let mode: AnalyticsMode | null = null;
let optedOut = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function modeConfig(target: AnalyticsMode) {
  return {
    persistence: target === 'full' ? ('localStorage+cookie' as const) : ('memory' as const),
    disable_session_recording: target === 'anonymous',
  };
}

/**
 * Initialise the shared browser client before any SDK call.
 * Returns false when capture is not allowed (no key, SSR, or consent denied).
 */
export function initialiseAnalytics(): boolean {
  if (!KEY || !isBrowser() || isInternalHost()) return false;
  const consent = getAnalyticsConsent();
  if (consent === 'denied') return false;
  const target: AnalyticsMode = consent === 'granted' ? 'full' : 'anonymous';

  if (mode === null) {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      save_campaign_params: true,
      save_referrer: true,
      person_profiles: 'identified_only',
      // Session replay stays consent-gated via the mode config; recordings
      // start per the PostHog project's replay settings and are fully masked.
      mask_all_text: true,
      mask_all_element_attributes: true,
      ...modeConfig(target),
      before_send: (event) => {
        if (!event) return null;
        if (event.properties) {
          event.properties = sanitiseAnalyticsProperties(
            event.properties as Record<string, unknown>,
          );
        }
        return event;
      },
    });
    mode = target;
    // A previous visit may have persisted an opt-out; consent is granted now.
    if (target === 'full' && posthog.has_opted_out_capturing?.()) {
      posthog.opt_in_capturing({ captureEventName: null });
    }
    return true;
  }

  if (mode !== target) {
    // Consent changed mid-session (banner accepted): switch the live client
    // in place. set_config carries the in-memory state across, so the
    // session and distinct id continue seamlessly.
    posthog.set_config(modeConfig(target));
    mode = target;
  }
  if (optedOut) {
    // captureEventName: null suppresses the default `$opt_in` event, which
    // would otherwise fire on every re-entry and double event volume.
    posthog.opt_in_capturing({ captureEventName: null });
    optedOut = false;
  }
  return true;
}

/** Fire a known client-side analytics event after ensuring the SDK is ready. */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  try {
    if (!initialiseAnalytics()) return;
    posthog.capture(event, props);
  } catch {
    // Never let analytics break the app
  }
}

/**
 * Identify an authenticated user. Call after login.
 * Requires full consent — anonymous mode never attaches a persistent identity.
 */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  try {
    if (!hasAnalyticsConsent() || !initialiseAnalytics()) return;
    posthog.identify(userId, traits);
  } catch {
    // silent
  }
}

/**
 * Stop all analytics immediately after a visitor chooses essential-only.
 * Order matters: posthog-js `reset()` clears its stored consent state, so an
 * opt-out issued before it was silently undone and autocapture, dead clicks,
 * and page-leave events kept flowing under a fresh anonymous id (found in
 * production on 2026-09-05). Reset the identity first, then opt out last so
 * the opt-out is the state that survives.
 */
export function disableAnalytics(): void {
  try {
    if (!isBrowser() || mode === null) return;
    posthog.reset();
    posthog.opt_out_capturing();
    optedOut = true;
  } catch {
    // silent
  }
}

/** Reset identity on logout. */
export function resetIdentity(): void {
  try {
    if (!isBrowser() || mode === null) return;
    posthog.reset();
  } catch {
    // silent
  }
}
