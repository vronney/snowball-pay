"use client";

import { useEffect } from "react";
import { reportSignupConversion } from "@/lib/googleAds";
import {
  ANALYTICS_CONSENT_EVENT,
  hasAnalyticsConsent,
} from "@/lib/analyticsConsent";

interface SignupConversionReporterProps {
  email: string | null;
  /** Stable per-account id — Google Ads dedupes conversions by transaction_id,
   *  so repeat renders (onboarding → dashboard, reloads) count once. */
  transactionId: string;
}

/**
 * Fires the Google Ads signup conversion when a brand-new account first lands
 * on an authenticated page. Moved here from onboarding completion so Google's
 * optimizer receives a signal for every created account, not only the ~60%
 * who finish the wizard.
 *
 * A fresh signup may not have answered the consent banner yet, in which case
 * the initial attempt no-ops inside reportSignupConversion — so we also listen
 * for the consent-change event and retry once consent is granted, otherwise
 * the conversion would be permanently lost (transaction_id keeps it deduped).
 */
export function SignupConversionReporter({
  email,
  transactionId,
}: SignupConversionReporterProps) {
  useEffect(() => {
    const report = () => {
      try {
        reportSignupConversion(email, transactionId);
      } catch {
        // Analytics-only failure — never disturb the page.
      }
    };

    report();

    const onConsentChange = () => {
      if (hasAnalyticsConsent()) report();
    };
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsentChange);
    return () =>
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsentChange);
  }, [email, transactionId]);

  return null;
}
