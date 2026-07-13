'use client';

const GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO =
  'AW-18159208162/QQHKCLLJ_sQcEOKN_tJD';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Report the single primary Google Ads conversion after plan creation. */
export function reportSignupConversion(
  email?: string | null,
  transactionId?: string | null,
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  if (email) {
    window.gtag('set', 'user_data', {
      email: email.trim().toLowerCase(),
    });
  }

  window.gtag('event', 'conversion', {
    send_to: GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO,
    value: 1,
    currency: 'USD',
    ...(transactionId ? { transaction_id: transactionId } : {}),
    event_category: 'signup',
    event_label: 'Start Plan',
    page_path: window.location.pathname,
  });
}
