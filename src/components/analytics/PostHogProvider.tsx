'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { getSafeRouteContext } from '@/lib/analyticsPrivacy';
import { initialiseAnalytics } from '@/lib/analytics';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Initialise once
  useEffect(() => {
    initialiseAnalytics();
  }, []);

  // Fire pageview on every route change
  useEffect(() => {
    if (!initialiseAnalytics()) return;
    posthog.capture('$pageview', {
      $current_url: `${window.location.origin}${pathname}`,
      $pathname: pathname,
      ...getSafeRouteContext(searchParams),
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
