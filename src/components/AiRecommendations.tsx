"use client";

import { useState } from "react";
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  Target,
  Banknote,
  ArrowRight,
  RefreshCcw,
  AlertTriangle,
  ChevronDown,
  X,
  ClipboardCopy,
} from "lucide-react";
import {
  useCachedRecommendations,
  useGenerateRecommendations,
  useSubscription,
  buildRecommendationHash,
  type AiRecommendation,
  type AiRecommendationType,
  type ActionPayload,
  type RecommendationPayload,
} from "@/lib/hooks";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { Debt, Income, Expense } from "@/types";

interface Props {
  debts: Debt[];
  income: Income;
  expenses: Expense[];
  availableCashFlow: number;
  planMonths: number;
  totalInterestPaid: number;
  onAccelerationChange?: (amount: number) => void;
}

const TYPE_META: Record<
  AiRecommendationType,
  { label: string; icon: typeof Sparkles; color: string }
> = {
  payoff_advice: { label: "Payoff Advice", icon: Sparkles, color: "#8b5cf6" },
  spending_insight: {
    label: "Spending Insight",
    icon: TrendingUp,
    color: "#2563eb",
  },
  month_change: { label: "What Changed", icon: RefreshCcw, color: "#0891b2" },
  behavior_nudge: { label: "Behavior Nudge", icon: Target, color: "#f59e0b" },
  debt_risk_alert: {
    label: "Debt Risk Alert",
    icon: AlertTriangle,
    color: "#dc2626",
  },
  negotiation_suggestion: {
    label: "Negotiation Tip",
    icon: Banknote,
    color: "#10b981",
  },
  strategy: { label: "Strategy", icon: Sparkles, color: "#8b5cf6" },
  cashflow: { label: "Cash Flow", icon: TrendingUp, color: "#3b82f6" },
  priority: { label: "Priority", icon: Target, color: "#f59e0b" },
  savings: { label: "Savings", icon: Banknote, color: "#10b981" },
};

const IMPACT_COLOR: Record<AiRecommendation["impact"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "20px",
        background: "#f8fafc",
        border: "1px solid rgba(15,23,42,0.08)",
        animation: "pulse 1.8s ease-in-out infinite",
      }}
    >
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "rgba(15,23,42,0.08)",
          }}
        />
        <div
          style={{
            width: "80px",
            height: "14px",
            borderRadius: "4px",
            background: "rgba(15,23,42,0.08)",
            alignSelf: "center",
          }}
        />
        <div
          style={{
            width: "44px",
            height: "14px",
            borderRadius: "4px",
            background: "rgba(15,23,42,0.05)",
            alignSelf: "center",
            marginLeft: "auto",
          }}
        />
      </div>
      <div
        style={{
          height: "16px",
          borderRadius: "4px",
          background: "rgba(15,23,42,0.10)",
          marginBottom: "8px",
          width: "70%",
        }}
      />
      <div
        style={{
          height: "12px",
          borderRadius: "4px",
          background: "rgba(15,23,42,0.06)",
          marginBottom: "5px",
        }}
      />
      <div
        style={{
          height: "12px",
          borderRadius: "4px",
          background: "rgba(15,23,42,0.06)",
          width: "85%",
        }}
      />
    </div>
  );
}

function RecommendationCard({
  rec,
  index,
  onDismiss,
  onApply,
}: {
  rec: AiRecommendation;
  index: number;
  onDismiss?: () => void;
  onApply?: () => void;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const meta = TYPE_META[rec.type] ?? TYPE_META.payoff_advice;
  const Icon = meta.icon;

  return (
    <div
      style={{
        borderRadius: "14px",
        padding: "18px 20px",
        background: "#f8fafc",
        border: "1px solid rgba(15,23,42,0.08)",
        borderLeft: `2px solid ${meta.color}55`,
        animation: `fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s both`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: `${meta.color}14`,
            border: `1px solid ${meta.color}28`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={13} style={{ color: meta.color }} />
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: meta.color,
            textTransform: "uppercase",
          }}
        >
          {meta.label}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: IMPACT_COLOR[rec.impact],
            background: `${IMPACT_COLOR[rec.impact]}12`,
            padding: "2px 7px",
            borderRadius: "4px",
          }}
        >
          {rec.impact}
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            title="Dismiss"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <p
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#0f172a",
          margin: "0 0 8px",
          lineHeight: 1.35,
        }}
      >
        {rec.title}
      </p>
      <p
        style={{
          fontSize: "13px",
          lineHeight: 1.65,
          color: "#475569",
          margin: "0 0 14px",
        }}
      >
        {rec.body}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          fontWeight: 600,
          color: meta.color,
          marginBottom:
            rec.why || rec.type === "negotiation_suggestion" ? "10px" : "0",
        }}
      >
        <ArrowRight size={11} />
        {rec.action}
      </div>

      {rec.type === "negotiation_suggestion" && (
        <button
          onClick={() => {
            void navigator.clipboard.writeText(rec.body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            marginBottom: rec.why || onApply ? "8px" : "0",
            padding: "5px 12px",
            borderRadius: "7px",
            background: copied
              ? "rgba(16,185,129,0.1)"
              : "rgba(16,185,129,0.08)",
            border: `1px solid ${copied ? "rgba(16,185,129,0.35)" : "rgba(16,185,129,0.2)"}`,
            color: "#059669",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <ClipboardCopy size={11} />
          {copied ? "Copied!" : "Copy Script"}
        </button>
      )}

      {onApply && (
        <button
          onClick={() => {
            if (applied) return;
            onApply();
            setApplied(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            marginBottom: rec.why ? "8px" : "0",
            padding: "5px 12px",
            borderRadius: "7px",
            background: applied
              ? "rgba(37,99,235,0.12)"
              : "rgba(37,99,235,0.08)",
            border: `1px solid ${applied ? "rgba(37,99,235,0.4)" : "rgba(37,99,235,0.2)"}`,
            color: applied ? "#1d4ed8" : "#2563eb",
            fontSize: "12px",
            fontWeight: 600,
            cursor: applied ? "default" : "pointer",
            transition: "all 0.2s",
          }}
        >
          <ArrowRight size={11} />
          {applied ? "Applied!" : "Apply this Tip"}
        </button>
      )}

      {rec.why && (
        <div
          style={{
            borderTop: "1px solid rgba(15,23,42,0.07)",
            paddingTop: "10px",
          }}
        >
          <button
            onClick={() => setWhyOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              color: "#94a3b8",
            }}
          >
            <ChevronDown
              size={12}
              style={{
                transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
            Why this recommendation?
          </button>
          {whyOpen && (
            <p
              style={{
                margin: "7px 0 0",
                fontSize: "12px",
                lineHeight: 1.6,
                color: "#64748b",
                paddingLeft: "16px",
                borderLeft: `2px solid ${meta.color}33`,
              }}
            >
              {rec.why}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AiRecommendations({
  debts,
  income,
  expenses,
  availableCashFlow,
  planMonths,
  totalInterestPaid,
  onAccelerationChange,
}: Props) {
  const recurringExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const payload: RecommendationPayload = {
    debts: debts.map((d) => ({
      name: d.name,
      balance: d.balance,
      interestRate: d.interestRate,
      minimumPayment: d.minimumPayment,
      category: d.category,
      creditLimit: d.creditLimit,
    })),
    expenseItems: expenses.map((e) => ({
      name: e.name,
      amount: e.amount,
      category: e.category,
    })),
    monthlyTakeHome: income.monthlyTakeHome,
    essentialExpenses: income.essentialExpenses,
    recurringExpenses,
    extraPayment: income.extraPayment,
    planMonths,
    totalInterestPaid,
    availableCashFlow,
  };

  const currentHash = buildRecommendationHash(payload);

  const { data: cache, isLoading: cacheLoading } = useCachedRecommendations();
  const { data: subscription, isLoading: subscriptionLoading } =
    useSubscription();
  const generate = useGenerateRecommendations();
  const isPro = subscription?.paidTier === "pro";
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const recommendations =
    generate.data?.recommendations ?? cache?.recommendations ?? null;
  const savedHash = generate.data?.dataHash ?? cache?.dataHash ?? null;
  const generatedAt = generate.data?.generatedAt ?? cache?.generatedAt ?? null;

  const isStale = savedHash !== null && savedHash !== currentHash;
  const hasResults = recommendations !== null && recommendations.length > 0;
  const isGenerating = generate.isPending;

  const handleGenerate = () => {
    if (!subscriptionLoading && !isPro) {
      upgradeEvents.dispatch("AI recommendations");
      return;
    }
    generate.mutate(payload);
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

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgb(255, 255, 255)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "rgba(15, 23, 42, 0.06) 0px 1px 4px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: "8px",
          marginBottom: hasResults || isGenerating ? "16px" : "0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Lightbulb size={16} style={{ color: "#8b5cf6" }} />
          <span style={{ fontSize: "15px", fontWeight: 600 }}>AI Insights</span>
          {generatedAt && !isGenerating && (
            <span
              style={{
                fontSize: "11px",
                color: "rgba(15,23,42,0.5)",
                marginLeft: "2px",
              }}
            >
              · {timeAgo(generatedAt)}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {hasResults && !isGenerating && (
            <button
              onClick={handleGenerate}
              title="Regenerate"
              style={{
                padding: "5px 8px",
                borderRadius: "8px",
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.12)",
                color: "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                transition: "all 0.2s",
              }}
            >
              <RefreshCcw size={12} />
            </button>
          )}

          {!hasResults &&
            !isGenerating &&
            !cacheLoading &&
            !generate.isError && (
              <button
                onClick={handleGenerate}
                style={{
                  padding: "7px 14px",
                  borderRadius: "9px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  border: "1px solid rgba(29,78,216,0.4)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              >
                <Sparkles size={13} />
                {!subscriptionLoading && !isPro
                  ? "Upgrade to unlock AI insights"
                  : "Get personalized monthly insights"}
              </button>
            )}
        </div>
      </div>

      {/* Stale banner */}
      {isStale && hasResults && !isGenerating && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(37,99,235,0.07)",
            border: "1px solid rgba(37,99,235,0.2)",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "#1d4ed8",
            }}
          >
            <Sparkles size={14} />
            <span>
              <strong>New data detected.</strong> Ready for your monthly
              strategy audit.
            </span>
          </div>
          <button
            onClick={handleGenerate}
            style={{
              flexShrink: 0,
              padding: "5px 12px",
              borderRadius: "7px",
              background: "rgba(37,99,235,0.12)",
              border: "1px solid rgba(37,99,235,0.28)",
              color: "#2563eb",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            Run Strategy Audit
          </button>
        </div>
      )}

      {/* Loading skeletons — cache fetch on mount */}
      {cacheLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Generating skeletons */}
      {isGenerating && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {generate.isError && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#b91c1c",
            fontSize: "13px",
          }}
        >
          Could not load recommendations. Check your connection and try again.
        </div>
      )}

      {/* Results */}
      {hasResults && !isGenerating && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {(recommendations as AiRecommendation[])
            .filter((_, i) => !dismissed.has(i))
            .map((rec, _originalIndex, _arr) => {
              // find the original index so dismiss removes the right card
              const originalIndex = (
                recommendations as AiRecommendation[]
              ).indexOf(rec);
              const actionPayload = rec.action_payload as
                | ActionPayload
                | undefined;
              const onApply =
                actionPayload?.action_type === "reallocate_funds" &&
                onAccelerationChange
                  ? () =>
                      onAccelerationChange(
                        availableCashFlow + actionPayload.source_amount,
                      )
                  : undefined;
              return (
                <RecommendationCard
                  key={originalIndex}
                  rec={rec}
                  index={originalIndex}
                  onDismiss={() =>
                    setDismissed((prev) => new Set([...prev, originalIndex]))
                  }
                  onApply={onApply}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
