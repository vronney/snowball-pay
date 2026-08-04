"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, RefreshCcw, Sparkles, TrendingDown, Info } from "lucide-react";
import {
  useCachedCoachBrief,
  useGenerateCoachBrief,
  useSubscription,
  type CoachBriefVerdict,
} from "@/lib/hooks";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { formatCurrency } from "@/lib/utils";
import { Events, track } from "@/lib/analytics";

const STATUS_META: Record<
  CoachBriefVerdict["status"],
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  on_track: { label: "On track", color: "#059669", bg: "rgba(16,185,129,0.09)", icon: CheckCircle2 },
  at_risk: { label: "At risk", color: "#b45309", bg: "rgba(245,158,11,0.10)", icon: AlertTriangle },
  off_track: { label: "Off track", color: "#b91c1c", bg: "rgba(239,68,68,0.09)", icon: TrendingDown },
};

const IMPACT_COLOR: Record<"high" | "medium" | "low", string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

interface CoachBriefCardProps {
  hasDebts: boolean;
  hasIncome: boolean;
  onApplyAction?: (targetExtra: number) => void;
}

export default function CoachBriefCard({
  hasDebts,
  hasIncome,
  onApplyAction,
}: CoachBriefCardProps) {
  const { data: cache, isLoading: cacheLoading } = useCachedCoachBrief();
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const generate = useGenerateCoachBrief();
  const isPro = subscription?.proEligible === true;
  const autoTriggered = useRef(false);

  const brief = generate.data?.brief ?? cache?.brief ?? null;
  const generatedAt = generate.data?.generatedAt ?? cache?.generatedAt ?? null;
  const isGenerating = generate.isPending;
  const eligible = hasDebts && hasIncome;
  // Once the user regenerates, generate.data takes over — a freshly
  // generated brief is never stale, regardless of what the old cache said.
  const isStale = !generate.data && Boolean(cache?.stale);

  // Auto-generate once on first load when Pro, eligible, and nothing cached yet.
  useEffect(() => {
    if (autoTriggered.current) return;
    if (cacheLoading || subscriptionLoading || isGenerating) return;
    if (!eligible || !isPro) return;
    if (brief !== null || generate.isError) return;
    autoTriggered.current = true;
    generate.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheLoading, subscriptionLoading, isGenerating, eligible, isPro, brief, generate.isError]);

  if (!eligible) return null;

  const handleGenerate = () => {
    if (!subscriptionLoading && !isPro) {
      upgradeEvents.dispatch("AI Coach Brief");
      return;
    }
    generate.mutate({});
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const statusMeta = brief ? STATUS_META[brief.verdict.status] : null;
  const StatusIcon = statusMeta?.icon;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.09)",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={14} style={{ color: "#2563eb" }} />
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2563eb" }}>
            Coach brief
          </span>
          {generatedAt && !isGenerating && (
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>· {timeAgo(generatedAt)}</span>
          )}
        </div>
        {brief && !isGenerating && (
          <button
            onClick={handleGenerate}
            title="Refresh"
            style={{
              padding: "5px",
              borderRadius: "8px",
              background: "none",
              border: "1px solid rgba(15,23,42,0.10)",
              color: "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCcw size={12} />
          </button>
        )}
      </div>

      {(cacheLoading || isGenerating) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
          <div style={{ height: "16px", width: "60%", borderRadius: "4px", background: "rgba(15,23,42,0.08)" }} />
          <div style={{ height: "12px", width: "90%", borderRadius: "4px", background: "rgba(15,23,42,0.06)" }} />
          <div style={{ height: "12px", width: "75%", borderRadius: "4px", background: "rgba(15,23,42,0.06)" }} />
        </div>
      )}

      {!cacheLoading && !isGenerating && !brief && (
        <div style={{ marginTop: "10px" }}>
          <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
            {isPro || subscriptionLoading
              ? "Get a one-line read on where your plan stands and the single best move for this month."
              : "Unlock a one-line read on where your plan stands and the single best move for this month."}
          </p>
          <button
            onClick={handleGenerate}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
              background: "#2563eb",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Sparkles size={13} />
            {!subscriptionLoading && !isPro ? "Upgrade to unlock coach brief" : "Get my coach brief"}
          </button>
        </div>
      )}

      {generate.isError && !isGenerating && (() => {
        const status = (generate.error as { response?: { status?: number; data?: { retryAfter?: number } } })?.response?.status;
        const retryMins = status === 429
          ? Math.ceil(((generate.error as { response?: { data?: { retryAfter?: number } } })?.response?.data?.retryAfter ?? 600) / 60)
          : null;
        return (
          <div
            style={{
              marginTop: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: status === 429 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${status === 429 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.2)"}`,
              color: status === 429 ? "#92400e" : "#b91c1c",
              fontSize: "12px",
            }}
          >
            {status === 429
              ? `Rate limit reached. Try again in ${retryMins} minute${retryMins === 1 ? "" : "s"}.`
              : "Could not load the coach brief. Try again in a moment."}
          </div>
        );
      })()}

      {isStale && brief && !isGenerating && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "rgba(37,99,235,0.06)",
            border: "1px solid rgba(37,99,235,0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#1d4ed8" }}>
            <Info size={13} />
            <span>Your numbers have changed since this was generated.</span>
          </div>
          <button
            onClick={handleGenerate}
            style={{
              flexShrink: 0,
              padding: "4px 10px",
              borderRadius: "6px",
              background: "rgba(37,99,235,0.12)",
              border: "1px solid rgba(37,99,235,0.28)",
              color: "#2563eb",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Refresh
          </button>
        </div>
      )}

      {brief && statusMeta && StatusIcon && !isGenerating && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 700,
                color: statusMeta.color,
                background: statusMeta.bg,
                borderRadius: "999px",
                padding: "2px 8px",
              }}
            >
              <StatusIcon size={11} />
              {statusMeta.label}
            </span>
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
            {brief.verdict.headline}
          </h3>
          <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#475569", margin: "0 0 16px" }}>
            {brief.verdict.summary}
          </p>

          <div
            style={{
              borderTop: "1px solid rgba(15,23,42,0.07)",
              paddingTop: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0f172a" }}>
                Best move this month
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: IMPACT_COLOR[brief.nextAction.impact],
                  background: `${IMPACT_COLOR[brief.nextAction.impact]}12`,
                  padding: "2px 7px",
                  borderRadius: "4px",
                }}
              >
                {brief.nextAction.impact}
              </span>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>
              {brief.nextAction.title}
            </p>
            <p style={{ fontSize: "13px", lineHeight: 1.55, color: "#475569", margin: "0 0 8px" }}>
              {brief.nextAction.body}
            </p>
            {brief.nextAction.kind === "set_acceleration" &&
            brief.nextAction.targetExtra !== null ? (
              <>
                {brief.nextAction.outcome && (
                  <div
                    style={{
                      marginBottom: "10px",
                      padding: "9px 10px",
                      borderRadius: "8px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#334155",
                      fontSize: "12px",
                      lineHeight: 1.45,
                    }}
                  >
                    <span aria-hidden="true">→</span> Buffer back to{" "}
                    <span className="mono">
                      {formatCurrency(brief.nextAction.outcome.bufferAfter)}
                    </span>
                    {" · "}
                    <span className="mono">
                      {brief.nextAction.outcome.monthsSavedVsMin}
                    </span>{" "}
                    mo ahead of minimums
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    // Track only when the action actually executes — without a
                    // callback the click changes nothing and must not record
                    // a phantom "applied" event.
                    if (!onApplyAction) return;
                    onApplyAction(brief.nextAction.targetExtra!);
                    track(Events.COACH_BRIEF_ACTION_APPLIED, {
                      target_extra: brief.nextAction.targetExtra,
                      status: brief.verdict.status,
                    });
                  }}
                  className="glow-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  Set extra to{" "}
                  <span className="mono">
                    {formatCurrency(brief.nextAction.targetExtra)}
                  </span>
                </button>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600, color: "#2563eb" }}>
                {brief.nextAction.action}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
