"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Flame, TrendingUp, Zap } from "lucide-react";
import { useAccelerationStats } from "@/lib/hooks";
import MonthProgressSection from "@/components/acceleration/MonthProgressSection";
import PayoffDateComparison from "@/components/acceleration/PayoffDateComparison";
import StreakFeedback from "@/components/acceleration/StreakFeedback";

type Level = "excellent" | "good" | "warning" | "poor";

function getFeedback(
  score: number,
  streak: number,
  monthsSaved: number,
): { level: Level; message: string } {
  if (score >= 0.8 || (streak >= 3 && monthsSaved > 6))
    return {
      level: "excellent",
      message:
        "You're crushing it! Every extra dollar is slicing months off your debt-free date. Keep the momentum going — you're ahead of schedule!",
    };
  if (score >= 0.6 || (streak >= 2 && monthsSaved > 0))
    return {
      level: "good",
      message:
        "Solid progress! You're consistently adding extra payments and building a streak. Stay the course and you'll hit debt-free ahead of plan.",
    };
  if (score >= 0.35)
    return {
      level: "warning",
      message:
        "Some months on track, some not. Consistency is the real multiplier — even a small regular extra payment compounds over time.",
    };
  return {
    level: "poor",
    message:
      "You're falling behind your acceleration goal. Getting back on track — even with a smaller amount — breaks the cycle and restarts the streak.",
  };
}

export default function AccelerationTracker() {
  const { data, isLoading } = useAccelerationStats();
  const [collapsed, setCollapsed] = useState(true);

  if (!isLoading && (!data || data.plannedMonthly === 0)) return null;

  const pct =
    data && data.totalPlanned > 0
      ? Math.min(100, (data.totalActualExtra / data.totalPlanned) * 100)
      : 0;

  const feedback = data
    ? getFeedback(data.performanceScore, data.streak, data.monthsSaved)
    : null;

  const barColor =
    pct >= 85
      ? "linear-gradient(90deg,#10b981,#34d399)"
      : pct >= 50
        ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
        : "#ef4444";

  const pctColor = pct >= 85 ? "#059669" : pct >= 50 ? "#d97706" : "#dc2626";
  const now = new Date();

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: "12px",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        marginBottom: "20px",
        overflow: "hidden",
      }}
    >
      {/* Header (always visible) */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "13px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
        aria-expanded={!collapsed}
        aria-label="Toggle Acceleration Tracker"
      >
        <Zap size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#0f172a",
            flex: 1,
            letterSpacing: "-0.01em",
          }}
        >
          Acceleration Tracker
        </span>

        {data && data.streak > 0 && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "20px",
              padding: "2px 7px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#dc2626",
              flexShrink: 0,
            }}
          >
            <Flame size={10} />
            {data.streak}mo
          </span>
        )}

        {data && data.monthsSaved > 0 && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "20px",
              padding: "2px 7px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#059669",
              flexShrink: 0,
            }}
          >
            <TrendingUp size={10} />
            {data.monthsSaved}mo saved
          </span>
        )}

        {collapsed ? (
          <ChevronDown size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
        ) : (
          <ChevronUp size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
        )}
      </button>

      {/* Expanded body */}
      {!collapsed && (
        <div
          style={{
            padding: "0 18px 18px",
            borderTop: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          {isLoading && (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              Loading tracker…
            </div>
          )}

          {data && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                paddingTop: "16px",
              }}
            >
              <MonthProgressSection
                monthlyData={data.monthlyData}
                totalActualExtra={data.totalActualExtra}
                totalPlanned={data.totalPlanned}
                pct={pct}
                barColor={barColor}
                pctColor={pctColor}
                now={now}
              />

              <div style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }} />

              <PayoffDateComparison
                baselineDebtFreeDate={data.baselineDebtFreeDate}
                currentDebtFreeDate={data.currentDebtFreeDate}
                monthsSaved={data.monthsSaved}
                interestSaved={data.interestSaved}
              />

              <div style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }} />

              <StreakFeedback streak={data.streak} feedback={feedback} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
