'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

const KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialised = false;

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Initialise once
  useEffect(() => {
    if (!KEY || initialised || typeof window === 'undefined') return;
    posthog.init(KEY, {
      api_host:          HOST,
      capture_pageview:  false, // we fire manually below so we get the right URL
      capture_pageleave: true,
      person_profiles:   'identified_only',
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
