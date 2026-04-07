'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

const KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// Matches dollar amounts like "$1,234.56", "$500", "1234.56"
const DOLLAR_RE = /\$[\d,]+(\.\d+)?|\b\d{1,3}(,\d{3})+(\.\d+)?\b/g;

/**
 * Strip financial figures from string property values before they leave the
 * browser. Runs on every event PostHog would send.
 */
function sanitiseProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string') {
      safe[key] = value.replace(DOLLAR_RE, '[redacted]');
    } else if (typeof value === 'number' && key !== '$screen_width' && key !== '$screen_height') {
      // Drop raw numeric values that could be financial amounts.
      // Keep PostHog's own internal numeric props (screen dimensions etc.)
      safe[key] = '[redacted]';
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

let initialised = false;

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Initialise once
  useEffect(() => {
    if (!KEY || initialised || typeof window === 'undefined') return;
    posthog.init(KEY, {
      api_host:                 HOST,
      capture_pageview:         false, // fired manually below
      capture_pageleave:        true,
      person_profiles:          'identified_only',
      // ── Privacy: disable session/screen recording entirely ──────────────
      disable_session_recording: true,
      // ── Privacy: mask all text + attributes if recording is ever re-enabled
      mask_all_text:              true,
      mask_all_element_attributes: true,
      // ── Privacy: strip financial figures from all event properties ───────
      before_send: (event) => {
        if (!event) return null;
        if (event.properties) {
          event.properties = sanitiseProperties(
            event.properties as Record<string, unknown>,
          );
        }
        return event;
      },
    });
    initialised = true;
  }, []);

  // Fire pageview on every route change
  useEffect(() => {
    if (!KEY || typeof window === 'undefined') return;
    const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    posthog.capture('$pageview', { $current_url: window.location.origin + url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
