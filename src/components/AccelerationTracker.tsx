"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Zap,
} from "lucide-react";
import { useAccelerationStats } from "@/lib/hooks";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

type Level = "excellent" | "good" | "warning" | "poor";

const LEVEL_COLORS: Record<Level, { bg: string; borderLeft: string; border: string; text: string }> = {
  excellent: {
    bg: "rgba(16,185,129,0.06)",
    borderLeft: "#10b981",
    border: "rgba(16,185,129,0.15)",
    text: "#065f46",
  },
  good: {
    bg: "rgba(37,99,235,0.05)",
    borderLeft: "#2563eb",
    border: "rgba(37,99,235,0.15)",
    text: "#1e3a8a",
  },
  warning: {
    bg: "rgba(245,158,11,0.06)",
    borderLeft: "#f59e0b",
    border: "rgba(245,158,11,0.2)",
    text: "#92400e",
  },
  poor: {
    bg: "rgba(239,68,68,0.06)",
    borderLeft: "#ef4444",
    border: "rgba(239,68,68,0.15)",
    text: "#7f1d1d",
  },
};

function getFeedback(
  score: number,
  streak: number,
  monthsSaved: number,
): { level: Level; message: string } {
  if (score >= 0.8 || (streak >= 3 && monthsSaved > 6)) {
    return {
      level: "excellent",
      message:
        "You're crushing it! Every extra dollar is slicing months off your debt-free date. Keep the momentum going — you're ahead of schedule!",
    };
  }
  if (score >= 0.6 || (streak >= 2 && monthsSaved > 0)) {
    return {
      level: "good",
      message:
        "Solid progress! You're consistently adding extra payments and building a streak. Stay the course and you'll hit debt-free ahead of plan.",
    };
  }
  if (score >= 0.35) {
    return {
      level: "warning",
      message:
        "Some months on track, some not. Consistency is the real multiplier — even a small regular extra payment compounds over time.",
    };
  }
  return {
    level: "poor",
    message:
      "You're falling behind your acceleration goal. Getting back on track — even with a smaller amount — breaks the cycle and restarts the streak.",
  };
}

export default function AccelerationTracker() {
  const { data, isLoading } = useAccelerationStats();
  const [collapsed, setCollapsed] = useState(true);

  // Hide the widget entirely when there is no data to show
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
      {/* ── Header (always visible, toggles body) ─────────────────────── */}
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

        {/* Streak badge */}
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

        {/* Months-saved badge */}
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

      {/* ── Expanded body ─────────────────────────────────────────────── */}
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
              {/* ── Section 1: 3-month pills + progress bar ─────────── */}
              <div>
                {/* Month pills */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginBottom: "12px",
                  }}
                >
                  {data.monthlyData.map(({ year, month, actualExtra, onTrack }) => {
                    const isCurrent =
                      now.getFullYear() === year && now.getMonth() === month;
                    const hasActivity = actualExtra > 0;
                    const dotColor = hasActivity
                      ? onTrack
                        ? "#10b981"
                        : "#f59e0b"
                      : "#e2e8f0";
                    return (
                      <div
                        key={`${year}-${month}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          background: "#f8fafc",
                          border: "1px solid rgba(15,23,42,0.07)",
                          borderRadius: "7px",
                          padding: "5px 9px",
                          fontSize: "12px",
                          color: "#64748b",
                          fontWeight: 500,
                        }}
                      >
                        <div
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: dotColor,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "#64748b" }}>
                          {MONTH_NAMES[month]}
                          {isCurrent && (
                            <span style={{ color: "#cbd5e1", fontSize: "10px" }}>
                              *
                            </span>
                          )}
                        </span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>
                          {fmt$(actualExtra)}
                        </span>
                      </div>
                    );
                  })}
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#cbd5e1",
                      alignSelf: "center",
                    }}
                  >
                    * partial month
                  </span>
                </div>

                {/* Label row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    3-Month Extra Payments
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {fmt$(data.totalActualExtra)}{" "}
                    <span
                      style={{ color: "#94a3b8", fontWeight: 400 }}
                    >
                      / {fmt$(data.totalPlanned)}
                    </span>
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: "6px",
                    background: "#f1f5f9",
                    borderRadius: "9999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: barColor,
                      borderRadius: "9999px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: pctColor,
                    }}
                  >
                    {Math.round(pct)}% of 3-month goal
                  </span>
                </div>
              </div>

              {/* ── Divider ─────────────────────────────────────────── */}
              <div
                style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
              />

              {/* ── Section 2: Payoff date comparison ────────────────── */}
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
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 600,
                    }}
                  >
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
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      {fmtDate(data.baselineDebtFreeDate)}
                    </div>
                  </div>

                  {/* Arrow icon */}
                  <div style={{ flexShrink: 0 }}>
                    {data.monthsSaved > 0 ? (
                      <TrendingUp size={16} style={{ color: "#10b981" }} />
                    ) : data.monthsSaved < 0 ? (
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
                        data.monthsSaved > 0
                          ? "rgba(16,185,129,0.06)"
                          : data.monthsSaved < 0
                            ? "rgba(239,68,68,0.06)"
                            : "#f8fafc",
                      border: `1px solid ${
                        data.monthsSaved > 0
                          ? "rgba(16,185,129,0.2)"
                          : data.monthsSaved < 0
                            ? "rgba(239,68,68,0.2)"
                            : "rgba(15,23,42,0.07)"
                      }`,
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
                          data.monthsSaved > 0
                            ? "#059669"
                            : data.monthsSaved < 0
                              ? "#dc2626"
                              : "#0f172a",
                      }}
                    >
                      {data.currentDebtFreeDate
                        ? fmtDate(data.currentDebtFreeDate)
                        : "—"}
                    </div>
                  </div>
                </div>

                {data.monthsSaved !== 0 && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: data.monthsSaved > 0 ? "#059669" : "#dc2626",
                    }}
                  >
                    {data.monthsSaved > 0
                      ? `${data.monthsSaved} months ahead of minimum-only pace`
                      : `${Math.abs(data.monthsSaved)} months behind minimum-only pace`}
                  </div>
                )}
              </div>

              {/* ── Divider ─────────────────────────────────────────── */}
              <div
                style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
              />

              {/* ── Section 3: Streak + feedback ─────────────────────── */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                {/* Streak counter */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background:
                      data.streak >= 2
                        ? "rgba(239,68,68,0.06)"
                        : "#f8fafc",
                    border: `1px solid ${
                      data.streak >= 2
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(15,23,42,0.07)"
                    }`,
                    borderRadius: "8px",
                    padding: "10px 14px",
                    flexShrink: 0,
                  }}
                >
                  <Flame
                    size={18}
                    style={{
                      color: data.streak >= 1 ? "#dc2626" : "#cbd5e1",
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: data.streak >= 1 ? "#dc2626" : "#94a3b8",
                        lineHeight: 1,
                      }}
                    >
                      {data.streak}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#64748b",
                        fontWeight: 500,
                        marginTop: "1px",
                      }}
                    >
                      month streak
                    </div>
                  </div>
                </div>

                {/* Feedback message */}
                {feedback && (
                  <div
                    style={{
                      flex: "1 1 180px",
                      background: LEVEL_COLORS[feedback.level].bg,
                      border: `1px solid ${LEVEL_COLORS[feedback.level].border}`,
                      borderLeft: `3px solid ${LEVEL_COLORS[feedback.level].borderLeft}`,
                      borderRadius: "8px",
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: LEVEL_COLORS[feedback.level].text,
                        lineHeight: 1.55,
                      }}
                    >
                      {feedback.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
