"use client";

import { Component, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Sparkles, RefreshCw, BookOpen } from "lucide-react";

// ── Error Boundary ────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
}

class JourneyErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.centeredState}>
          <Sparkles
            size={28}
            style={{ color: "#94a3b8", marginBottom: "12px" }}
          />
          <p style={styles.stateTitle}>
            Couldn&apos;t load your journey. Try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={styles.retryBtn}
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoryResponse {
  headline?: string;
  body?: string;
  stats?: {
    paymentCount: number;
    totalPaid: number;
    uniqueMonths: number;
    paidOff: number;
  };
  empty?: boolean;
  error?: string;
}

function formatTotalPaid(value: number): string {
  return value >= 1000
    ? `$${(value / 1000).toFixed(1)}k`
    : `$${Math.round(value).toLocaleString()}`;
}

function renderStoryBody(body: string) {
  const markdownSegments = body.split(/(\*\*[^*]+\*\*)/g);
  return markdownSegments.map((segment, i) => {
    const isMarkdownBold = /^\*\*[^*]+\*\*$/.test(segment);
    if (isMarkdownBold) {
      return (
        <strong key={`md-${i}`} style={styles.bodyStrong}>
          {segment.slice(2, -2)}
        </strong>
      );
    }

    const emotionalAnchor =
      /(\$\d[\d,]*(?:\.\d+)?(?:k)?|\d+(?:\.\d+)?%|\d+\s+(?:payments?|months?)|\bfirst\s+month\b)/gi;
    const parts = segment.split(emotionalAnchor);
    return parts.map((part, j) => {
      if (!part) return null;
      if (emotionalAnchor.test(part)) {
        emotionalAnchor.lastIndex = 0;
        return (
          <strong key={`anchor-${i}-${j}`} style={styles.bodyStrong}>
            {part}
          </strong>
        );
      }
      emotionalAnchor.lastIndex = 0;
      return <span key={`txt-${i}-${j}`}>{part}</span>;
    });
  });
}
// ── Inner component ───────────────────────────────────────────────────────────

function JourneyInner() {
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<StoryResponse>({
      queryKey: ["debtStory"],
      queryFn: async () => {
        const { data } = await axios.get<StoryResponse>("/api/ai/debt-story");
        return data;
      },
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 min — don't re-fetch on every tab switch
    });

  // Error state
  if (isError) {
    return (
      <div style={styles.centeredState}>
        <Sparkles
          size={28}
          style={{ color: "#94a3b8", marginBottom: "12px" }}
        />
        <p style={styles.stateTitle}>
          Couldn&apos;t load your journey. Try again.
        </p>
        <button
          onClick={() => refetch()}
          style={styles.retryBtn}
          disabled={isFetching}
        >
          <RefreshCw
            size={13}
            style={
              isFetching ? { animation: "spin 1s linear infinite" } : undefined
            }
          />
          {isFetching ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  // Loading shimmer
  if (isLoading) {
    return (
      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              ...styles.shimmer,
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              ...styles.shimmer,
              width: "55%",
              height: "18px",
              borderRadius: "6px",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              ...styles.shimmer,
              width: "100%",
              height: "14px",
              borderRadius: "5px",
            }}
          />
          <div
            style={{
              ...styles.shimmer,
              width: "88%",
              height: "14px",
              borderRadius: "5px",
            }}
          />
          <div
            style={{
              ...styles.shimmer,
              width: "72%",
              height: "14px",
              borderRadius: "5px",
            }}
          />
        </div>
      </div>
    );
  }

  // Empty state — no payments logged yet
  if (!data || data.empty) {
    return (
      <div style={styles.centeredState}>
        <BookOpen
          size={32}
          style={{ color: "#94a3b8", marginBottom: "14px" }}
        />
        <p style={styles.stateTitle}>
          Log your first payment to start your journey
        </p>
        <p style={styles.stateBody}>
          Your debt story will appear here once you record your first payment.
        </p>
      </div>
    );
  }

  // Rate limited — show graceful message
  if (data.error === "rate_limited") {
    return (
      <div style={styles.centeredState}>
        <Sparkles
          size={28}
          style={{ color: "#94a3b8", marginBottom: "12px" }}
        />
        <p style={styles.stateTitle}>Your story is resting</p>
        <p style={styles.stateBody}>
          You can refresh your journey up to 3 times per day. Check back later.
        </p>
      </div>
    );
  }

  const { headline, body, stats } = data;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "680px",
      }}
    >
      <div style={styles.storyShell}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <div style={styles.iconBox}>
            <Sparkles size={15} style={{ color: "#8b5cf6" }} />
          </div>
          <h2 style={styles.headline}>{headline ?? "Your Debt Journey"}</h2>
        </div>
        <p style={styles.body}>{renderStoryBody(body ?? "")}</p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={styles.refreshBtn}
          title="Generate another perspective (up to 3 times per day)"
        >
          <RefreshCw
            size={12}
            style={
              isFetching ? { animation: "spin 1s linear infinite" } : undefined
            }
          />
          {isFetching ? "Rewriting…" : "Give me another perspective"}
        </button>

        {stats && (
          <div style={styles.storyMetricsWrap}>
            <div style={styles.statsRow}>
              <StatPill
                label="Payments logged"
                value={String(stats.paymentCount)}
              />
              <StatPill
                label="Total paid"
                value={formatTotalPaid(stats.totalPaid)}
              />
              <StatPill
                label="Active months"
                value={String(stats.uniqueMonths)}
              />
              {stats.paidOff > 0 && (
                <StatPill
                  label="Paid off"
                  value={`${stats.paidOff} debt${stats.paidOff !== 1 ? "s" : ""}`}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statPill}>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

// ── Exported tab ──────────────────────────────────────────────────────────────

export default function JourneyTab() {
  return (
    <JourneyErrorBoundary>
      <JourneyInner />
    </JourneyErrorBoundary>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  storyShell: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px 22px",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
    border: "1px solid rgba(15,23,42,0.07)",
  } as React.CSSProperties,

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px 22px",
    border: "1px solid rgba(15,23,42,0.07)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  } as React.CSSProperties,

  iconBox: {
    width: "32px",
    height: "32px",
    borderRadius: "10px",
    background: "#8b5cf618",
    border: "1px solid #8b5cf630",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as React.CSSProperties,

  headline: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  } as React.CSSProperties,

  body: {
    fontSize: "14px",
    lineHeight: 1.65,
    color: "#475569",
    margin: "0 0 14px",
  } as React.CSSProperties,

  bodyStrong: {
    color: "#0f172a",
    fontWeight: 700,
  } as React.CSSProperties,

  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#64748b",
    background: "rgba(100,116,139,0.07)",
    border: "1px solid rgba(100,116,139,0.15)",
    borderRadius: "7px",
    padding: "5px 10px",
    cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,

  storyMetricsWrap: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(15,23,42,0.08)",
  } as React.CSSProperties,

  statsRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,

  statPill: {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.07)",
    borderRadius: "12px",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "3px",
    minWidth: "100px",
  } as React.CSSProperties,

  statValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1,
  } as React.CSSProperties,

  statLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: 500,
  } as React.CSSProperties,

  centeredState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    textAlign: "center" as const,
    maxWidth: "380px",
    margin: "0 auto",
  } as React.CSSProperties,

  stateTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#475569",
    margin: "0 0 8px",
  } as React.CSSProperties,

  stateBody: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: 0,
    lineHeight: 1.5,
  } as React.CSSProperties,

  retryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    marginTop: "14px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#2563eb",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
    padding: "7px 14px",
    cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,

  shimmer: {
    background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s ease-in-out infinite",
  } as React.CSSProperties,
} as const;
