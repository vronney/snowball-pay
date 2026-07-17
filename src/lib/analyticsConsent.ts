export const ANALYTICS_CONSENT_KEY = "sp_analytics_consent_v1";
export const ANALYTICS_CONSENT_EVENT = "sp:analytics-consent-changed";

export type AnalyticsConsent = "granted" | "denied";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Return the visitor's explicit analytics choice, or null before they choose. */
export function getAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const value = getStorage()?.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === "granted";
}

/** Persist a choice and notify mounted analytics providers in this tab. */
export function setAnalyticsConsent(choice: AnalyticsConsent): void {
  try {
    getStorage()?.setItem(ANALYTICS_CONSENT_KEY, choice);
  } catch {
    // A storage failure leaves analytics disabled by default.
  }

  if (typeof document !== "undefined") {
    const secure =
      typeof window !== "undefined" && window.location?.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie =
      ANALYTICS_CONSENT_KEY +
      "=" +
      choice +
      "; Max-Age=31536000; Path=/; SameSite=Lax" +
      secure;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  }
}
