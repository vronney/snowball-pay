'use client';

import type { AnalyticsConsent } from '@/lib/analyticsConsent';
import { hasAnalyticsConsent } from '@/lib/analyticsConsent';

const GOOGLE_ADS_ID = 'AW-18159208162';
const GOOGLE_ADS_SIGNUP_CONVERSION_SEND_TO =
  'AW-18159208162/QQHKCLLJ_sQcEOKN_tJD';
const GOOGLE_ADS_SCRIPT_ID = 'sp-google-ads-script';
let googleAdsConfigured = false;

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

/**
 * Apply the visitor's choice before loading Google Ads. Denied consent never
 * injects the network script; granted consent loads and configures it once.
 */
export function applyGoogleAdsConsent(choice: AnalyticsConsent): void {
  if (typeof window === 'undefined') return;
  const gtag = getGoogleTag();
  const granted = choice === 'granted' ? 'granted' : 'denied';

  gtag('consent', 'update', {
    ad_storage: granted,
    analytics_storage: granted,
    ad_user_data: granted,
    ad_personalization: 'denied',
  });

  if (choice !== 'granted' || googleAdsConfigured) return;
  googleAdsConfigured = true;
  gtag('js', new Date());
  gtag('config', GOOGLE_ADS_ID);

  if (typeof document === 'undefined') return;
  if (document.getElementById(GOOGLE_ADS_SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = GOOGLE_ADS_SCRIPT_ID;
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GOOGLE_ADS_ID;
  document.head.appendChild(script);
}

/** Report the single primary Google Ads conversion after plan creation. */
export function reportSignupConversion(
  email?: string | null,
  transactionId?: string | null,
): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
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
