'use client';

import { ReactNode, Suspense } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import PostHogProvider from '@/components/analytics/PostHogProvider';
import axios from 'axios';

// Global 401 handler — redirect to login when the session expires.
// Debounced so rapid-fire 401s don't trigger multiple redirects.
let redirecting = false;
axios.interceptors.response.use(undefined, (error) => {
  if (
    !redirecting &&
    error?.response?.status === 401 &&
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/dashboard') ||
      window.location.pathname.startsWith('/plaid'))
  ) {
    redirecting = true;
    // Keep query + hash so deep-link state (e.g. /plaid/oauth-return?oauth_state_id=…)
    // survives the round-trip through login.
    const returnTo =
      window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return Promise.reject(error);
});

function getResponseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = 'response' in error ? error.response : undefined;
  if (typeof response !== 'object' || response === null) return undefined;
  const status = 'status' in response ? response.status : undefined;
  return typeof status === 'number' ? status : undefined;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: (failureCount, error) => {
        const status = getResponseStatus(error);
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Suspense required because PostHogProvider uses useSearchParams */}
      <Suspense fallback={null}>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </Suspense>
    </QueryClientProvider>
  );
}
