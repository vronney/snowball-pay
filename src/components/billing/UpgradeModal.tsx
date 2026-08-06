"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, X, Zap } from "lucide-react";
import { getErrorMessage, useStartCheckout } from "@/lib/hooks";
import { PLANS } from "@/lib/stripe";
import { PRO_TRIAL_DAYS } from "@/lib/billing";
import { track, Events } from "@/lib/analytics";
import { formatCurrency, formatCurrencyWhole } from "@/lib/utils";
import { getUpgradeMessage, UPGRADE_MESSAGE_VERSION } from "@/lib/upgradeMessaging";

interface UpgradeModalProps {
  feature?: string;
  /** Projected interest avoided vs minimum-only payments, calculated from the current plan. */
  interestAtStake?: number;
  onClose: () => void;
}

type DismissReason = "close_button" | "backdrop" | "escape" | "continue_free";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function UpgradeModal({ feature, interestAtStake = 0, onClose }: UpgradeModalProps) {
  const checkout = useStartCheckout();
  const message = useMemo(() => getUpgradeMessage(feature), [feature]);
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dismissedRef = useRef(false);

  const checkoutError = checkout.isError
    ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.")
    : null;
  const monthlyPrice = PLANS.pro.price;

  const handleClose = useCallback((reason: DismissReason) => {
    if (checkout.isPending || dismissedRef.current) return;
    dismissedRef.current = true;
    track(Events.UPGRADE_MODAL_DISMISSED, {
      feature: feature ?? "general",
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      reason,
      source: "dashboard_upgrade_modal",
    });
    onClose();
  }, [checkout.isPending, feature, message.id, onClose]);

  useEffect(() => {
    track(Events.UPGRADE_MODAL_VIEWED, {
      feature: feature ?? "general",
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      source: "dashboard_upgrade_modal",
    });
  }, [feature, message.id]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose("escape");
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  function handleCheckout() {
    track(Events.CHECKOUT_STARTED, {
      source: "upgrade_modal",
      feature: feature ?? "general",
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      billing: "monthly",
    });
    checkout.mutate();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,23,42,0.52)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose("backdrop");
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        aria-describedby="upgrade-modal-description"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "28px",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => handleClose("close_button")}
          disabled={checkout.isPending}
          aria-label="Close upgrade dialog"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: checkout.isPending ? "not-allowed" : "pointer",
            color: "#64748b",
            padding: "6px",
            display: "flex",
          }}
        >
          <X size={18} />
        </button>

        <span className="eyebrow" style={{
          display: "inline-flex",
          borderRadius: "6px",
          background: "#f1f5f9",
          color: "#475569",
          padding: "4px 8px",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          marginBottom: "12px",
        }}>
          SnowballPay Pro
        </span>

        <h2
          id="upgrade-modal-title"
          ref={headingRef}
          tabIndex={-1}
          style={{
            fontSize: "23px",
            lineHeight: 1.2,
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 32px 8px 0",
            outline: "none",
          }}
        >
          {message.headline}
        </h2>
        <p
          id="upgrade-modal-description"
          style={{ fontSize: "14px", color: "#64748b", margin: "0 0 18px", lineHeight: 1.6 }}
        >
          {message.description}
        </p>

        {interestAtStake > 0 && (
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            color: "#334155",
            fontSize: "13px",
            lineHeight: 1.5,
            padding: "12px 14px",
            marginBottom: "18px",
          }}>
            Your current plan is projected to avoid <strong className="mono">{formatCurrencyWhole(interestAtStake)}</strong>{" "}
            in interest compared with minimum-only payments. Pro helps you monitor and adjust that plan.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {message.benefits.map((benefit) => (
            <div key={benefit} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <Check size={17} color="#15803d" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span style={{ fontSize: "13px", color: "#334155", lineHeight: 1.45 }}>{benefit}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginBottom: "14px", flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: "29px", fontWeight: 800, color: "#0f172a" }}>
            ${monthlyPrice}
          </span>
          <span style={{ fontSize: "13px", color: "#64748b" }}>
            /month after a {PRO_TRIAL_DAYS}-day trial
          </span>
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={checkout.isPending}
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "#2563eb",
            border: "none",
            borderRadius: "8px",
            cursor: checkout.isPending ? "wait" : "pointer",
            fontSize: "14px",
            fontWeight: 800,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            opacity: checkout.isPending ? 0.7 : 1,
            fontFamily: "inherit",
          }}
        >
          <Zap size={16} />
          {checkout.isPending ? "Redirecting…" : message.monthlyCta}
        </button>

        <button
          type="button"
          onClick={() => handleClose("continue_free")}
          disabled={checkout.isPending}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginTop: "4px",
            background: "transparent",
            border: "none",
            borderRadius: "8px",
            color: "#475569",
            cursor: checkout.isPending ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "inherit",
          }}
        >
          Continue with Free
        </button>

        {checkoutError && (
          <p role="alert" style={{
            margin: "8px 0 0",
            fontSize: "12px",
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "8px 10px",
          }}>
            {checkoutError}
          </p>
        )}

        <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", margin: "8px 0 0" }}>
          Cancel anytime. No charge during the trial.
        </p>
      </section>
    </div>,
    document.body,
  );
}
