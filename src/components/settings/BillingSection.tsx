'use client';

import { useState } from 'react';
import { Sparkles, ExternalLink, Zap } from 'lucide-react';
import ManageBillingModal from '@/components/billing/ManageBillingModal';
import { useSubscription } from '@/lib/hooks';

interface BillingSectionProps {
  onUpgradeClick: () => void;
}

export function BillingSection({ onUpgradeClick }: BillingSectionProps) {
  const { data: sub } = useSubscription();
  const [showBilling, setShowBilling] = useState(false);

  const isPro = sub?.paidTier === "pro";

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
    borderRadius: '12px',
    padding: "24px",
  };

  const sectionTitle = (label: string, icon: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
      {icon}
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
        {label}
      </h2>
    </div>
  );

  return (
    <div
      style={{
        ...cardStyle,
        background: isPro ? '#f8fafc' : '#ffffff',
        border: isPro
          ? "1px solid rgba(37,99,235,0.15)"
          : "1px solid rgba(15,23,42,0.08)",
      }}
    >
      {sectionTitle(
        "Plan",
        <Sparkles size={16} style={{ color: '#64748b' }} />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
              {isPro ? "Pro" : "Free"}
            </span>
            {isPro && sub?.isCanceling && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#ef4444",
                  background: "rgba(239,68,68,0.08)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                Canceling
              </span>
            )}
            {!isPro && sub?.signupTrialActive && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#0f766e",
                  background: "rgba(15,118,110,0.1)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                Free Pro trial
              </span>
            )}
            {isPro && !sub?.isCanceling && sub?.subscriptionStatus === "trialing" && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#d97706",
                  background: "rgba(217,119,6,0.1)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                Trial
              </span>
            )}
            {isPro && !sub?.isCanceling && sub?.subscriptionStatus !== "trialing" && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: '#0f766e',
                  background: 'rgba(15,118,110,0.1)',
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                Active
              </span>
            )}
          </div>
          {isPro ? (
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {sub?.isCanceling ? (
                <>
                  Pro access ends{" "}
                  {sub.subscriptionEndsAt
                    ? new Date(sub.subscriptionEndsAt).toLocaleDateString()
                    : ""}
                  . You can resubscribe anytime.
                </>
              ) : (
                <>
                  You have access to all Pro features.
                  {sub?.subscriptionEndsAt && sub.subscriptionStatus === "trialing" && (
                    <>
                      {" "}
                      {typeof sub.monthlyPrice === "number"
                        ? `$${sub.monthlyPrice.toFixed(2)}/mo`
                        : "Pro monthly"}{" "}
                      - Free trial ends{" "}
                      {new Date(sub.subscriptionEndsAt).toLocaleDateString()}.
                    </>
                  )}
                  {sub?.subscriptionEndsAt && sub.subscriptionStatus !== "trialing" && (
                    <>
                      {" "}
                      {typeof sub.monthlyPrice === "number"
                        ? `$${sub.monthlyPrice.toFixed(2)}/mo`
                        : "Pro monthly"}{" "}
                      - Renews on{" "}
                      {new Date(sub.subscriptionEndsAt).toLocaleDateString()}.
                    </>
                  )}
                </>
              )}
            </p>
          ) : (
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {sub?.signupTrialActive && sub.signupTrialEndsAt ? (
                <>
                  Full Pro access is free until{" "}
                  {new Date(sub.signupTrialEndsAt).toLocaleDateString()}. Upgrade to keep Payoff
                  Coach reviews, unlimited debts, and custom priority order after that.
                </>
              ) : (
                <>
                  Upgrade to unlock Payoff Coach reviews, unlimited debts, custom priority order,
                  and deeper payoff charts.
                </>
              )}
            </p>
          )}
        </div>

        {isPro ? (
          <button
            type="button"
            onClick={() => setShowBilling(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: '8px',
              border: "1px solid rgba(37,99,235,0.2)",
              background: "rgba(37,99,235,0.06)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              color: "#2563eb",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            <ExternalLink size={13} />
            Manage billing
          </button>
        ) : (
          <button
            type="button"
            onClick={onUpgradeClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: '8px',
              border: "none",
              background: '#2563eb',
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              color: "#ffffff",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            <Zap size={13} />
            Upgrade to Pro
          </button>
        )}
      </div>
      <ManageBillingModal isOpen={showBilling} onClose={() => setShowBilling(false)} />
    </div>
  );
}
