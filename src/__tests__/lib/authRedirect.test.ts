import { describe, it, expect } from 'vitest';
import { shouldRedirectOn401, RELOGIN_LOOP_WINDOW_MS } from '@/lib/authRedirect';

const NOW = 1_800_000_000_000;

describe('shouldRedirectOn401', () => {
  it('redirects to login on a first 401 on a protected page (expired session)', () => {
    expect(
      shouldRedirectOn401({ pathname: '/dashboard', lastReloginAt: null, now: NOW }),
    ).toBe(true);
    expect(
      shouldRedirectOn401({ pathname: '/plaid/oauth-return', lastReloginAt: null, now: NOW }),
    ).toBe(true);
  });

  it('breaks the loop: no second redirect right after a re-login round-trip', () => {
    // Regression: a valid session whose API calls 401 (email conflict) would
    // otherwise loop login → dashboard → 401 → login until the rate limiter
    // 429s the Auth0 callback itself.
    expect(
      shouldRedirectOn401({
        pathname: '/dashboard',
        lastReloginAt: NOW - 10_000,
        now: NOW,
      }),
    ).toBe(false);
  });

  it('allows a redirect again once the loop window has passed', () => {
    expect(
      shouldRedirectOn401({
        pathname: '/dashboard',
        lastReloginAt: NOW - RELOGIN_LOOP_WINDOW_MS - 1,
        now: NOW,
      }),
    ).toBe(true);
  });

  it('never redirects from unprotected pages', () => {
    expect(
      shouldRedirectOn401({ pathname: '/calculator', lastReloginAt: null, now: NOW }),
    ).toBe(false);
    expect(
      shouldRedirectOn401({ pathname: '/', lastReloginAt: null, now: NOW }),
    ).toBe(false);
  });
});
