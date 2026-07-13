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

    expect(gtag).toHaveBeenNthCalledWith(1, 'set', 'user_data', {
      email: 'person@example.com',
    });
    expect(gtag).toHaveBeenNthCalledWith(
      2,
      'event',
      'conversion',
      expect.objectContaining({
        currency: 'USD',
        event_label: 'Start Plan',
        page_path: '/onboarding',
        send_to: 'AW-18159208162/QQHKCLLJ_sQcEOKN_tJD',
        transaction_id: 'onboarding-123',
        value: 1,
      }),
    );
  });

  it('queues the conversion when the Google tag is not ready yet', () => {
    vi.stubGlobal('window', { location: { pathname: '/onboarding' } });

    reportSignupConversion(null, 'onboarding-123');

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
  });
});
