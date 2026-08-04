"use client";

import { useEffect } from "react";
import { reportSignupConversion } from "@/lib/googleAds";

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
 * who finish the wizard. Consent-gated inside reportSignupConversion.
 */
export function SignupConversionReporter({
  email,
  transactionId,
}: SignupConversionReporterProps) {
  useEffect(() => {
    try {
      reportSignupConversion(email, transactionId);
    } catch {
      // Analytics-only failure — never disturb the page.
    }
  }, [email, transactionId]);

  return null;
}
