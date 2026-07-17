'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { getSafeRouteContext } from '@/lib/analyticsPrivacy';
import { disableAnalytics, initialiseAnalytics } from '@/lib/analytics';
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analyticsConsent';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  // undefined = consent not yet read from storage; null = visitor made no choice
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined);
  const lastPageviewKey = useRef<string | null>(null);

  useEffect(() => {
    const syncConsent = () => setConsent(getAnalyticsConsent());
    syncConsent();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncConsent);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    if (consent === undefined) return;
    if (consent === 'denied') {
      disableAnalytics();
      return;
    }
    // null (no choice) initialises the cookieless anonymous client;
    // 'granted' initialises or upgrades to the full client.
    if (!initialiseAnalytics()) return;
    // Key on the full route so a consent upgrade on the same page does not
    // re-fire the pageview already captured anonymously.
    const pageKey = `${pathname}?${searchParams}`;
    if (lastPageviewKey.current === pageKey) return;
    lastPageviewKey.current = pageKey;
    posthog.capture('$pageview', {
      $current_url: `${window.location.origin}${pathname}`,
      $pathname: pathname,
      ...getSafeRouteContext(searchParams),
    });
  }, [consent, pathname, searchParams]);

  return <>{children}</>;
}
