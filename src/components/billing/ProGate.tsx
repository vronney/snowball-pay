"use client";

import { Lock, Zap } from "lucide-react";
import { upgradeEvents } from "@/lib/upgradeEvents";

interface ProGateProps {
  feature: string;
  children: React.ReactNode;
  isPro: boolean;
  /** Optional truthful stake line, e.g. real interest dollars the plan protects. */
  stakes?: string;
}

/**
 * Wraps content that should only be fully visible to Pro users.
 * Free users see a blurred preview with an upgrade prompt.
 * Always renders children so no layout shift on upgrade.
 */
export default function ProGate({ feature, children, isPro, stakes }: ProGateProps) {
  if (isPro) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      {/* Blurred preview */}
      <div style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none", opacity: 0.6 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "12px",
        }}
      >
        <div style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.1)",
          borderRadius: "16px",
          padding: "20px 28px",
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(15,23,42,0.1)",
          maxWidth: "260px",
        }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "50%",
            background: "#eff6ff", display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 10px",
          }}>
            <Lock size={16} color="#2563eb" />
          </div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
            Pro feature
          </p>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px", lineHeight: 1.4 }}>
            {stakes ?? `${feature} is available on the Pro plan.`}
          </p>
          <button
            onClick={() => upgradeEvents.dispatch(feature)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "7px 14px", borderRadius: "8px",
              background: "#2563eb", color: "#fff",
              border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            <Zap size={12} />
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}
