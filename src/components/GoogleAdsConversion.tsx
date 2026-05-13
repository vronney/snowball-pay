'use client';

import { useEffect } from 'react';

export function GoogleAdsConversion() {
  useEffect(() => {
    // Ensure gtag is defined before calling it
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'conversion', {
        send_to: 'AW-18159208162/2rOYCKS8lqwcEOKN_tJD',
        value: 1.0,
        currency: 'USD',
      });
    }
  }, []);

  return null;
}
