import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportSignupConversion } from '@/lib/googleAds';

describe('Google Ads signup conversion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports one deduplicated signup conversion after plan creation', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', {
      gtag,
      location: { pathname: '/onboarding' },
    });

    reportSignupConversion(' Person@Example.com ', 'onboarding-123');

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'conversion',
      expect.objectContaining({
        currency: 'USD',
        event_label: 'Start Plan',
        page_path: '/onboarding',
        send_to: 'AW-18159208162/QQHKCLLJ_sQcEOKN_tJD',
        transaction_id: 'onboarding-123',
        user_data: { email: 'person@example.com' },
        value: 1,
      }),
    );
  });

  it('queues the conversion without stale user data when the tag is not ready', () => {
    vi.stubGlobal('window', { location: { pathname: '/onboarding' } });

    reportSignupConversion('   ', 'onboarding-123');

    expect(window.dataLayer).toEqual([
      [
        'event',
        'conversion',
        expect.objectContaining({
          send_to: 'AW-18159208162/QQHKCLLJ_sQcEOKN_tJD',
          transaction_id: 'onboarding-123',
        }),
      ],
    ]);
    expect(window.dataLayer?.[0]?.[2]).not.toHaveProperty('user_data');
  });
});
