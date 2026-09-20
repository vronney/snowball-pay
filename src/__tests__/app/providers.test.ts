import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

// Stand-in for what useSearchParams() does to PostHogProvider while Next
// statically prerenders a route: the component suspends, and everything inside
// the nearest <Suspense> boundary is deferred to client-side rendering.
vi.mock('@/components/analytics/PostHogProvider', () => ({
  default: () => {
    throw new Promise<never>(() => {});
  },
}));
vi.mock('@/components/analytics/AnalyticsConsentBanner', () => ({
  default: () => null,
}));

import { Providers } from '@/app/providers';

describe('Providers', () => {
  it('server-renders page content even when the analytics tracker suspends', () => {
    const html = renderToString(
      createElement(
        Providers,
        null,
        createElement('h1', null, 'Free Debt Payoff Calculator'),
      ),
    );

    // Regression: /calculator, /privacy, /terms and /learn/debt-snowball-calculator
    // shipped empty HTML because {children} sat inside the tracker's Suspense.
    expect(html).toContain('Free Debt Payoff Calculator');
  });
});
