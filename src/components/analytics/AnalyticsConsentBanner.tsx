"use client";

import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analyticsConsent";
import { applyGoogleAdsConsent } from "@/lib/googleAds";

function updateConsent(choice: AnalyticsConsent) {
  setAnalyticsConsent(choice);
  applyGoogleAdsConsent(choice);
}

export default function AnalyticsConsentBanner() {
  const [hydrated, setHydrated] = useState(false);
  const [choice, setChoice] = useState<AnalyticsConsent | null>(null);

  useEffect(() => {
    const current = getAnalyticsConsent();
    setChoice(current);
    setHydrated(true);
    if (current) applyGoogleAdsConsent(current);

    const syncChoice = () => setChoice(getAnalyticsConsent());
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncChoice);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncChoice);
  }, []);

  if (!hydrated || choice !== null) return null;

  const choose = (nextChoice: AnalyticsConsent) => {
    setChoice(nextChoice);
    updateConsent(nextChoice);
  };

  return (
    <aside
      role="dialog"
      aria-label="Analytics preferences"
      aria-live="polite"
      style={{
        position: "fixed",
        zIndex: 250,
        left: "16px",
        right: "16px",
        bottom: "16px",
        maxWidth: "720px",
        margin: "0 auto",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid rgba(15,23,42,0.14)",
        background: "#ffffff",
        boxShadow: "0 18px 48px rgba(15,23,42,0.16)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 360px" }}>
          <h2
            style={{
              color: "#0f172a",
              fontSize: "15px",
              fontWeight: 800,
              marginBottom: "6px",
            }}
          >
            Help us improve SnowballPay
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "13px",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            We measure product usage with cookieless analytics that keep
            nothing on your device and never include debt balances, income, or
            payment amounts. Allowing analytics adds cookies for return-visit
            measurement, masked session replay, and Google Ads conversion
            measurement.{" "}
            <a href="/privacy" style={{ color: "#2563eb", fontWeight: 650 }}>
              Privacy details
            </a>
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            flex: "0 0 auto",
          }}
        >
          <button
            type="button"
            onClick={() => choose("denied")}
            style={{
              minHeight: "40px",
              padding: "9px 15px",
              borderRadius: "8px",
              border: "1px solid rgba(15,23,42,0.16)",
              background: "#ffffff",
              color: "#334155",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            style={{
              minHeight: "40px",
              padding: "9px 15px",
              borderRadius: "8px",
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Allow analytics
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AnalyticsConsentSettings() {
  const [choice, setChoice] = useState<AnalyticsConsent | null>(null);

  useEffect(() => {
    const syncChoice = () => setChoice(getAnalyticsConsent());
    syncChoice();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncChoice);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncChoice);
  }, []);

  const choose = (nextChoice: AnalyticsConsent) => {
    setChoice(nextChoice);
    updateConsent(nextChoice);
  };

  return (
    <div
      style={{
        margin: "18px 0 24px",
        padding: "18px",
        borderRadius: "12px",
        border: "1px solid rgba(15,23,42,0.12)",
        background: "#f8fafc",
      }}
    >
      <p style={{ margin: "0 0 12px", color: "#334155", fontSize: "14px" }}>
        Current preference:{" "}
        <strong>
          {choice === "granted"
            ? "Optional analytics allowed"
            : choice === "denied"
              ? "Essential storage only"
              : "No choice saved"}
        </strong>
      </p>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => choose("granted")}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid #2563eb",
            background: "#2563eb",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Allow optional analytics
        </button>
        <button
          type="button"
          onClick={() => choose("denied")}
          style={{
            padding: "9px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(15,23,42,0.16)",
            background: "#ffffff",
            color: "#334155",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Use essential storage only
        </button>
      </div>
    </div>
  );
}
