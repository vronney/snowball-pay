"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analyticsConsent";
import { applyGoogleAdsConsent } from "@/lib/googleAds";

/**
 * CSS custom property, set on `<html>` while the banner is on screen, holding
 * the distance from the viewport bottom to the banner's top edge. Other
 * bottom-anchored fixed elements (the calculator's mobile result bar) read it
 * so they sit above the banner instead of underneath it.
 */
export const CONSENT_BANNER_OFFSET_VAR = "--consent-banner-offset";

function updateConsent(choice: AnalyticsConsent) {
  setAnalyticsConsent(choice);
  applyGoogleAdsConsent(choice);
}

interface ConsentBannerPanelProps {
  onChoose: (choice: AnalyticsConsent) => void;
}

const buttonBase = {
  minHeight: "40px",
  padding: "9px 15px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
} as const;

/**
 * The consent prompt itself, with no storage or hydration logic so it can be
 * rendered and asserted on without a DOM.
 *
 * Two layouts share one markup: below `sm` a compact edge-to-edge sheet with
 * one-sentence copy and full-width buttons, so it takes well under a fifth of
 * a phone screen; at `sm` and up the floating card with the full explanation.
 */
export const ConsentBannerPanel = forwardRef<HTMLElement, ConsentBannerPanelProps>(
  function ConsentBannerPanel({ onChoose }, ref) {
    return (
      <aside
        ref={ref}
        role="dialog"
        aria-label="Analytics preferences"
        aria-live="polite"
        className="fixed inset-x-0 bottom-0 z-[250] mx-auto rounded-t-xl px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] sm:inset-x-4 sm:bottom-4 sm:max-w-[720px] sm:rounded-xl sm:p-5"
        style={{
          border: "1px solid rgba(15,23,42,0.14)",
          background: "#ffffff",
          boxShadow: "0 18px 48px rgba(15,23,42,0.16)",
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <div className="sm:flex-[1_1_360px]">
            <h2
              className="text-[14px] sm:text-[15px]"
              style={{
                color: "#0f172a",
                fontWeight: 800,
                margin: "0 0 4px",
              }}
            >
              Help us improve SnowballPay
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              <span className="sm:hidden">
                Usage is measured without cookies and never includes your
                balances or payments. Allowing analytics adds cookies for
                return visits, masked session replay, and Google Ads
                measurement.
              </span>
              <span className="hidden sm:inline">
                We measure product usage with cookieless analytics that keep
                nothing on your device and never include debt balances, income,
                or payment amounts. Allowing analytics adds cookies for
                return-visit measurement, masked session replay, and Google Ads
                conversion measurement.
              </span>{" "}
              <a href="/privacy" style={{ color: "#2563eb", fontWeight: 650 }}>
                Privacy details
              </a>
            </p>
          </div>
          <div className="flex gap-2.5 sm:flex-none">
            <button
              type="button"
              onClick={() => onChoose("denied")}
              className="flex-1 sm:flex-none"
              style={{
                ...buttonBase,
                border: "1px solid rgba(15,23,42,0.16)",
                background: "#ffffff",
                color: "#334155",
              }}
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => onChoose("granted")}
              className="flex-1 sm:flex-none"
              style={{
                ...buttonBase,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#ffffff",
              }}
            >
              Allow analytics
            </button>
          </div>
        </div>
      </aside>
    );
  },
);

/**
 * Publishes the banner's on-screen height through `CONSENT_BANNER_OFFSET_VAR`
 * for as long as the banner is mounted, re-measuring when text wraps or the
 * viewport changes, and clears it on unmount.
 */
function usePublishBannerOffset(panelRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    const root = document.documentElement;
    const publish = () => {
      const top = node.getBoundingClientRect().top;
      root.style.setProperty(
        CONSENT_BANNER_OFFSET_VAR,
        `${Math.max(0, Math.round(window.innerHeight - top))}px`,
      );
    };
    publish();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    observer?.observe(node);
    window.addEventListener("resize", publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      root.style.removeProperty(CONSENT_BANNER_OFFSET_VAR);
    };
  }, [panelRef]);
}

export default function AnalyticsConsentBanner() {
  const [hydrated, setHydrated] = useState(false);
  const [choice, setChoice] = useState<AnalyticsConsent | null>(null);
  const panelRef = useRef<HTMLElement>(null);

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

  return <MountedBanner panelRef={panelRef} onChoose={choose} />;
}

/**
 * Split out so the offset hook runs only while the banner is actually in the
 * DOM: its effect measures the panel on mount and clears the offset on unmount.
 */
function MountedBanner({
  panelRef,
  onChoose,
}: {
  panelRef: React.RefObject<HTMLElement>;
  onChoose: (choice: AnalyticsConsent) => void;
}) {
  usePublishBannerOffset(panelRef);
  return <ConsentBannerPanel ref={panelRef} onChoose={onChoose} />;
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
