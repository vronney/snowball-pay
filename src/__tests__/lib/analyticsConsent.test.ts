import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
  getAnalyticsConsent,
  hasAnalyticsConsent,
  setAnalyticsConsent,
} from '@/lib/analyticsConsent';

describe('analytics consent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to disabled when no choice has been saved', () => {
    vi.stubGlobal('window', {
      localStorage: { getItem: () => null },
    });

    expect(getAnalyticsConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('persists and broadcasts an explicit choice', () => {
    const setItem = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      localStorage: { getItem: () => 'granted', setItem },
      dispatchEvent,
    });

    setAnalyticsConsent('granted');

    expect(setItem).toHaveBeenCalledWith(ANALYTICS_CONSENT_KEY, 'granted');
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: ANALYTICS_CONSENT_EVENT }),
    );
    expect(hasAnalyticsConsent()).toBe(true);
  });
});
