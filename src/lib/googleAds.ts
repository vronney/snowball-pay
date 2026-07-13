'use client';

const GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO =
  'AW-18159208162/QQHKCLLJ_sQcEOKN_tJD';

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

function getGoogleTag(): (...args: unknown[]) => void {
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  return window.gtag;
}

/** Report the single primary Google Ads conversion after plan creation. */
export function reportSignupConversion(
  email?: string | null,
  transactionId?: string | null,
): void {
  if (typeof window === 'undefined') return;
  const gtag = getGoogleTag();
  const normalizedEmail = email?.trim().toLowerCase();

  gtag('event', 'conversion', {
    send_to: GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO,
    value: 1,
    currency: 'USD',
    ...(normalizedEmail ? { user_data: { email: normalizedEmail } } : {}),
    ...(transactionId ? { transaction_id: transactionId } : {}),
    event_category: 'signup',
    event_label: 'Start Plan',
    page_path: window.location.pathname,
  });
}
