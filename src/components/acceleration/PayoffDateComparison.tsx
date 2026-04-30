"use client";

import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function fmtDate(iso: string) {
  // Force UTC so "Oct 1 UTC" doesn't render as "Sep" in US timezones
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface PayoffDateComparisonProps {
  baselineDebtFreeDate: string;
  currentDebtFreeDate: string | null | undefined;
  monthsSaved: number;
  interestSaved?: number;
}

export default function PayoffDateComparison({
  baselineDebtFreeDate,
  currentDebtFreeDate,
  monthsSaved,
  interestSaved,
}: PayoffDateComparisonProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          marginBottom: "8px",
        }}
      >
        <Target size={12} style={{ color: "#94a3b8" }} />
        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
          Payoff Progress
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Baseline box */}
        <div
          style={{
            flex: "1 1 110px",
            background: "#f8fafc",
            border: "1px solid rgba(15,23,42,0.07)",
            borderRadius: "8px",
            padding: "8px 12px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "#94a3b8",
              fontWeight: 600,
              letterSpacing: "0.06em",
              marginBottom: "2px",
            }}
          >
            WITHOUT EXTRA
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>
            {fmtDate(baselineDebtFreeDate)}
          </div>
        </div>

        {/* Arrow icon */}
        <div style={{ flexShrink: 0 }}>
          {monthsSaved > 0 ? (
            <TrendingUp size={16} style={{ color: "#10b981" }} />
          ) : monthsSaved < 0 ? (
            <TrendingDown size={16} style={{ color: "#ef4444" }} />
          ) : (
            <Minus size={16} style={{ color: "#94a3b8" }} />
          )}
        </div>

        {/* Current box */}
        <div
          style={{
            flex: "1 1 110px",
            background:
              monthsSaved > 0
                ? "rgba(16,185,129,0.06)"
                : monthsSaved < 0
                  ? "rgba(239,68,68,0.06)"
                  : "#f8fafc",
            border: `1px solid ${monthsSaved > 0 ? "rgba(16,185,129,0.2)" : monthsSaved < 0 ? "rgba(239,68,68,0.2)" : "rgba(15,23,42,0.07)"}`,
            borderRadius: "8px",
            padding: "8px 12px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              color: "#94a3b8",
              fontWeight: 600,
              letterSpacing: "0.06em",
              marginBottom: "2px",
            }}
          >
            WITH EXTRA
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color:
                monthsSaved > 0
                  ? "#059669"
                  : monthsSaved < 0
                    ? "#dc2626"
                    : "#0f172a",
            }}
          >
            {currentDebtFreeDate ? fmtDate(currentDebtFreeDate) : "—"}
          </div>
        </div>
      </div>

      {monthsSaved !== 0 && (
        <div
          style={{
            marginTop: "6px",
            fontSize: "12px",
            fontWeight: 600,
            color: monthsSaved > 0 ? "#059669" : "#dc2626",
          }}
        >
          {monthsSaved > 0
            ? `${monthsSaved} months ahead of minimum-only pace`
            : `${Math.abs(monthsSaved)} months behind minimum-only pace`}
        </div>
      )}

      {interestSaved !== undefined && interestSaved > 0 && (
        <div
          style={{
            marginTop: "6px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#059669",
          }}
        >
          ✦ {formatCurrency(interestSaved)} in interest saved
        </div>
      )}
    </div>
  );
}
