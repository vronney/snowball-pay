/**
 * Analytics helper — wraps PostHog with graceful no-ops when the key is absent.
 * Import `track` anywhere client-side to fire events.
 * The shared client is initialised lazily before the first SDK call.
 *
 * NOTE: this imports the `posthog-js` singleton directly rather than reading
 * `window.posthog`. Nothing in this codebase ever assigns `window.posthog`,
 * so every call in this file was previously a silent no-op — no custom event
 * (calculator_save_clicked, signup_started, plan_generated, etc.) ever
 * reached PostHog, even though $pageview worked fine (PostHogProvider calls
 * the imported `posthog` object directly, not through `window`).
 */
import posthog from 'posthog-js';
import type { AnalyticsEvent } from '@/lib/analyticsEvents';
import { sanitiseAnalyticsProperties } from '@/lib/analyticsPrivacy';
export { Events } from '@/lib/analyticsEvents';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
let initialised = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Initialise the shared browser client exactly once before any SDK call. */
export function initialiseAnalytics(): boolean {
  if (!KEY || !isBrowser()) return false;
  if (initialised) return true;

  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
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
  initialised = true;
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

/** Identify an authenticated user. Call after login. */
export function identify(userId: string, traits?: Record<string, unknown>): void {
  try {
    if (!initialiseAnalytics()) return;
    posthog.identify(userId, traits);
  } catch {
    // silent
  }
}

/** Reset identity on logout. */
export function resetIdentity(): void {
  try {
    if (!isBrowser() || !initialised) return;
    posthog.reset();
  } catch {
    // silent
  }
}
