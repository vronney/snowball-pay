'use client';

import { useEffect } from 'react';

interface GoogleAdsConversionProps {
  calculatorName?: string;
  calculatorSlug?: string;
}

export function GoogleAdsConversion({
  calculatorName,
  calculatorSlug,
}: GoogleAdsConversionProps) {
  useEffect(() => {
    // Ensure gtag is defined before calling it
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'conversion', {
        send_to: 'AW-18159208162/2rOYCKS8lqwcEOKN_tJD',
        value: 1.0,
        currency: 'USD',
        event_category: 'calculator',
        event_label: calculatorName ?? calculatorSlug ?? 'calculator',
        calculator_name: calculatorName,
        calculator_slug: calculatorSlug,
        page_path: window.location.pathname,
      });
    }
  }, [calculatorName, calculatorSlug]);

  return null;
}
