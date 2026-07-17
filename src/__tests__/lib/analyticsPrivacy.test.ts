import { describe, expect, it } from 'vitest';
import {
  getSafeRouteContext,
  sanitiseAnalyticsProperties,
} from '@/lib/analyticsPrivacy';

describe('analytics privacy', () => {
  it('redacts financial values while preserving safe numeric dimensions', () => {
    expect(
      sanitiseAnalyticsProperties({
        balance: 14_200,
        debt_count: 3,
        months: 18,
        total: 14_200,
        contact: 'person@example.com',
        utm_content: 'Person@Example.com',
        nested: { minimum_payment: '285', method: 'snowball' },
      }),
    ).toEqual({
      balance: '[redacted]',
      debt_count: 3,
      months: 18,
      total: '[redacted]',
      contact: '[redacted]',
      utm_content: '[redacted]',
      nested: { minimum_payment: '[redacted]', method: 'snowball' },
    });
  });

  it('removes URL query strings and fragments from captured URLs', () => {
    expect(
      sanitiseAnalyticsProperties({
        $current_url: 'https://getsnowballpay.com/onboarding?income=5200#step-2',
        $session_entry_url: 'https://getsnowballpay.com/calculator?balance=9000',
        $set_once: {
          $initial_current_url: 'https://getsnowballpay.com/?utm_source=google&income=5200',
          $initial_referrer: 'https://google.com/search?q=debt',
        },
      }),
    ).toEqual({
      $current_url: 'https://getsnowballpay.com/onboarding',
      $session_entry_url: 'https://getsnowballpay.com/calculator',
      $set_once: {
        $initial_current_url: 'https://getsnowballpay.com/',
        $initial_referrer: 'https://google.com/search',
      },
    });
  });

  it('allowlists non-sensitive route attribution parameters', () => {
    const params = new URLSearchParams(
      'source=calculator&checkout=pro&upgrade=success&utm_source=Google&utm_medium=Paid%20Search&utm_campaign=Which_Debt_Next&utm_content=person%40example.com&income=5200&debtName=Visa',
    );

    expect(getSafeRouteContext(params)).toEqual({
      route_source: 'calculator',
      route_checkout: 'pro',
      route_upgrade: 'success',
      utm_source: 'google',
      utm_medium: 'paid_search',
      utm_campaign: 'which_debt_next',
    });
  });
});
