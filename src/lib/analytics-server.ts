import type { AnalyticsEvent } from '@/lib/analyticsEvents';
import { sanitiseAnalyticsProperties } from '@/lib/analyticsPrivacy';

const CAPTURE_TIMEOUT_MS = 1_500;

interface ServerAnalyticsEvent {
  consent: 'granted' | 'denied';
  distinctId: string;
  event: AnalyticsEvent;
  insertId?: string;
  properties?: Record<string, unknown>;
}

/** Best-effort server capture; analytics must never fail a business webhook. */
export async function captureServerEvent({
  consent,
  distinctId,
  event,
  insertId,
  properties = {},
}: ServerAnalyticsEvent): Promise<void> {
  if (consent !== 'granted') return;
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;

  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com')
    .replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        event,
        properties: {
          ...sanitiseAnalyticsProperties(properties),
          distinct_id: distinctId,
          ...(insertId ? { $insert_id: insertId } : {}),
        },
      }),
    });
  } catch {
    // Best effort only. Stripe retries must depend on billing state, not analytics.
  } finally {
    clearTimeout(timeout);
  }
}
