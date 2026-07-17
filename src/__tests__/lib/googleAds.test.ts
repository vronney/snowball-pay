import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyGoogleAdsConsent,
  reportSignupConversion,
} from '@/lib/googleAds';

describe('Google Ads signup conversion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports one deduplicated signup conversion after plan creation', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', {
      gtag,
      location: { pathname: '/onboarding' },
      localStorage: { getItem: () => 'granted' },
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
    vi.stubGlobal('window', {
      location: { pathname: '/onboarding' },
      localStorage: { getItem: () => 'granted' },
    });

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

  it('does not report a conversion without optional analytics consent', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', {
      gtag,
      location: { pathname: '/onboarding' },
      localStorage: { getItem: () => 'denied' },
    });

    reportSignupConversion('person@example.com', 'onboarding-123');

    expect(gtag).not.toHaveBeenCalled();
  });

  it('does not inject the Google Ads script when consent is denied', () => {
    const gtag = vi.fn();
    const appendChild = vi.fn();
    vi.stubGlobal('window', { gtag });
    vi.stubGlobal('document', {
      getElementById: () => null,
      createElement: vi.fn(() => ({})),
      head: { appendChild },
    });

    applyGoogleAdsConsent('denied');

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({ ad_storage: 'denied' }),
    );
    expect(appendChild).not.toHaveBeenCalled();
  });

  it('loads and configures Google Ads after consent is granted', () => {
    const gtag = vi.fn();
    const appendChild = vi.fn();
    const script: Record<string, unknown> = {};
    vi.stubGlobal('window', { gtag });
    vi.stubGlobal('document', {
      getElementById: () => null,
      createElement: vi.fn(() => script),
      head: { appendChild },
    });

    applyGoogleAdsConsent('granted');

    expect(gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        ad_storage: 'granted',
        analytics_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'denied',
      }),
    );
    expect(gtag).toHaveBeenCalledWith('config', 'AW-18159208162');
    expect(script.src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=AW-18159208162',
    );
    expect(appendChild).toHaveBeenCalledWith(script);
  });
});
