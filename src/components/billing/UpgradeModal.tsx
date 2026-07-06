"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, Check, Zap } from "lucide-react";
import { getErrorMessage, useStartCheckout } from "@/lib/hooks";
import { PLANS } from "@/lib/stripe";
import { PRO_TRIAL_DAYS } from "@/lib/billing";
import { track, Events } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";

interface UpgradeModalProps {
  feature?: string;
  /** Projected interest reclaimed vs minimums-only — real plan data for loss framing. */
  interestAtStake?: number;
  onClose: () => void;
}

const proBenefits = [
  "Unlimited debts and custom priority order",
  "Intelligence tab — forecast, strategy lab, method comparison",
  "Clear charts comparing your plan vs. paying minimums only",
  "What-if scenarios: see how extra payments change your timeline",
  "Payment calendar with cash-flow guardrails",
  "Exportable payoff plan",
];

type Billing = "monthly" | "annual";

export default function UpgradeModal({ feature, interestAtStake = 0, onClose }: UpgradeModalProps) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const checkout = useStartCheckout();
  const checkoutError = checkout.isError
    ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.")
    : null;

  const monthlyPrice = PLANS.pro.price;
  const annualPrice = PLANS.pro.annualPrice;
  const annualMonthly = Math.round((annualPrice / 12) * 100) / 100;
  const annualSavings = Math.round(monthlyPrice * 12 - annualPrice);

  useEffect(() => {
    track(Events.UPGRADE_MODAL_VIEWED, {
      feature: feature ?? "general",
      source: "dashboard_upgrade_modal",
    });
  }, [feature]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCheckout = () => {
    track(Events.CHECKOUT_STARTED, {
      source: "upgrade_modal",
      feature: feature ?? "general",
      billing,
    });
    checkout.mutate(billing);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#ffffff", borderRadius: "20px",
        padding: "32px", maxWidth: "440px", width: "100%",
        boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
        position: "relative",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            color: "#94a3b8", padding: "4px",
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: "48px", height: "48px", borderRadius: "12px",
          background: "#eff6ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "20px",
        }}>
          <Sparkles size={22} color="#2563eb" />
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
          Upgrade to Pro
        </h2>
        <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px", lineHeight: 1.55 }}>
          {feature ? `${feature} is a Pro feature. ` : ""}
          {interestAtStake > 0
            ? `Your plan is on track to reclaim ${formatCurrency(interestAtStake)} in interest vs paying minimums. Pro keeps that follow-through with monthly coach notes, what-if scenarios, and unlimited debts.`
            : "Upgrade to unlock unlimited debts, monthly coach notes, what-if scenarios, and full payoff history."}
        </p>

        {/* Billing toggle */}
        <div style={{
          display: "flex", gap: "6px", marginBottom: "20px",
          background: "#f1f5f9", borderRadius: "10px", padding: "4px",
        }}>
          {(["monthly", "annual"] as Billing[]).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: "7px",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
                background: billing === b ? "#ffffff" : "transparent",
                color: billing === b ? "#0f172a" : "#64748b",
                boxShadow: billing === b ? "0 1px 4px rgba(15,23,42,0.1)" : "none",
              }}
            >
              {b === "monthly" ? "Monthly" : (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                  Annual
                  <span style={{
                    fontSize: "10px", fontWeight: 700, color: "#fff",
                    background: "#2563eb", borderRadius: "4px", padding: "1px 5px",
                  }}>
                    Save ${annualSavings}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Features */}
        <div style={{
          background: "#f8fafc", borderRadius: "12px",
          padding: "14px 16px", marginBottom: "20px",
          display: "flex", flexDirection: "column", gap: "9px",
        }}>
          {proBenefits.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div style={{
                width: "17px", height: "17px", borderRadius: "50%",
                background: "rgba(37,99,235,0.1)", flexShrink: 0, marginTop: "1px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check size={10} color="#2563eb" strokeWidth={3} />
              </div>
              <span style={{ fontSize: "13px", color: "#334155", lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Price display */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "16px" }}>
          {billing === "monthly" ? (
            <>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#0f172a" }}>${monthlyPrice}</span>
              <span style={{ fontSize: "14px", color: "#64748b" }}>/month after {PRO_TRIAL_DAYS}-day trial</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: "30px", fontWeight: 800, color: "#0f172a" }}>${annualMonthly}</span>
              <span style={{ fontSize: "14px", color: "#64748b" }}>/month · billed ${annualPrice}/year</span>
            </>
          )}
        </div>

        <button
          onClick={handleCheckout}
          disabled={checkout.isPending}
          style={{
            width: "100%", padding: "13px",
            background: "#2563eb",
            border: "none", borderRadius: "12px", cursor: "pointer",
            fontSize: "15px", fontWeight: 700, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            opacity: checkout.isPending ? 0.7 : 1,
            fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
        >
          <Zap size={16} />
          {checkout.isPending
            ? "Redirecting…"
            : billing === "annual"
              ? `Start ${PRO_TRIAL_DAYS}-day trial · $${annualPrice}/yr`
              : `Start ${PRO_TRIAL_DAYS}-day free trial`}
        </button>

        {checkoutError && (
          <p role="alert" style={{
            margin: "10px 0 0", fontSize: "12px", color: "#b91c1c",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "8px", padding: "8px 10px",
          }}>
            {checkoutError}
          </p>
        )}

        <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "12px" }}>
          Cancel anytime.{billing === "monthly" ? " No charge during trial." : ""}
        </p>
      </div>
    </div>
  );
}
