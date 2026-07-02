import {
  Target,
  TrendingUp,
  CalendarClock,
  Shield,
  ListChecks,
  BadgeCheck,
  Wrench,
  Gauge,
  LayoutGrid,
  PiggyBank,
} from "lucide-react";
import { type Debt } from "@/types";
import { type PayoffMethod, type PayoffResult } from "@/lib/snowball";
import { formatCurrency, formatMonths } from "@/lib/utils";
import {
  type SmartCalendar,
  type MilestoneData,
  type RefinanceCandidate,
} from "@/lib/hooks/usePlannerComputed";

const toTimeLabel = formatMonths;

function methodLabel(method: PayoffMethod) {
  if (method === "avalanche") return "Avalanche";
  if (method === "custom") return "Custom";
  return "Snowball";
}

const CARD_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(15,23,42,0.08)",
  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
};
const INNER_STYLE = {
  background: "#f8fafc",
  border: "1px solid rgba(15,23,42,0.08)",
};

function CoachStrip({
  tone,
  title,
  evidence,
  action,
  source,
  generatedAt,
  onRefresh,
  isRefreshing,
}: {
  tone: "good" | "warn" | "danger" | "neutral";
  title: string;
  evidence: string;
  action: string;
  source?: "ai" | "local";
  generatedAt?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const palette =
    tone === "good"
      ? {
          bg: "rgba(5,150,105,0.08)",
          border: "rgba(5,150,105,0.18)",
          color: "#047857",
          label: "Keep",
        }
      : tone === "warn"
        ? {
            bg: "rgba(217,119,6,0.10)",
            border: "rgba(217,119,6,0.22)",
            color: "#a16207",
            label: "Watch",
          }
        : tone === "danger"
          ? {
              bg: "rgba(220,38,38,0.09)",
              border: "rgba(220,38,38,0.22)",
              color: "#b91c1c",
              label: "Alert",
            }
          : {
              bg: "#f8fafc",
              border: "rgba(15,23,42,0.10)",
              color: "#334155",
              label: "Read",
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
      className="rounded-xl p-3"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: palette.color, border: `1px solid ${palette.border}` }}
        >
          Coach {palette.label}
        </span>
        {source === "ai" && (
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "#2563eb", border: "1px solid rgba(37,99,235,0.24)", background: "rgba(37,99,235,0.06)" }}
          >
            AI
          </span>
        )}
        <p className="text-xs font-semibold" style={{ color: "#0f172a" }}>
          {title}
        </p>
        {source === "ai" && (generatedAt || onRefresh) && (
          <span className="ml-auto flex items-center gap-2">
            {generatedAt && !isRefreshing && (
              <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                {timeAgo(generatedAt)}
              </span>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh AI coach brief"
                className="text-[10px] font-semibold"
                style={{
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                  cursor: isRefreshing ? "default" : "pointer",
                  padding: 0,
                }}
              >
                {isRefreshing ? "Refreshing…" : "Refresh"}
              </button>
            )}
          </span>
        )}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
          <span className="font-semibold" style={{ color: palette.color }}>
            Evidence:{" "}
          </span>
          {evidence}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
          <span className="font-semibold" style={{ color: palette.color }}>
            Action:{" "}
          </span>
          {action}
        </p>
      </div>
    </div>
  );
}

interface AiCoachBrief {
  verdict: { status: "on_track" | "at_risk" | "off_track"; headline: string; summary: string };
  nextAction: { title: string; body: string; action: string; impact: "high" | "medium" | "low" };
}

interface IntelligenceOverviewCardProps {
  planResult: PayoffResult;
  minimumsOnlyResult: PayoffResult;
  effectiveAcceleration: number;
  monthlyDebtSpend: number;
  debtCoveragePct: number;
  nextDebtLabel: string;
  nextDebtMonth: number | null;
  // AI Coach Brief — same law-checked source powering the This Month card.
  // Falls back to the local heuristic below when not yet generated/loading.
  aiBrief?: AiCoachBrief | null;
  aiBriefGeneratedAt?: string | null;
  onRefreshAiBrief?: () => void;
  isRefreshingAiBrief?: boolean;
}

export function IntelligenceOverviewCard({
  planResult,
  minimumsOnlyResult,
  effectiveAcceleration,
  monthlyDebtSpend,
  debtCoveragePct,
  nextDebtLabel,
  nextDebtMonth,
  aiBrief,
  aiBriefGeneratedAt,
  onRefreshAiBrief,
  isRefreshingAiBrief,
}: IntelligenceOverviewCardProps) {
  const monthsSaved = Math.max(
    0,
    minimumsOnlyResult.months - planResult.months,
  );
  const interestSaved = Math.max(
    0,
    minimumsOnlyResult.totalInterestPaid - planResult.totalInterestPaid,
  );
  const isComplete = planResult.payoffSchedule.length === 0 && planResult.months === 0;
  const COMMAND_CENTER_STYLE = {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
  };
  // Local heuristic — only sees planResult/debtCoveragePct, no payment
  // history, snapshot variance, or Plaid sync state. Used until the richer
  // AI Coach Brief (same law-checked source as the This Month card) loads.
  const localCoach =
    isComplete
      ? {
          tone: "good" as const,
          title: "No active debt remains",
          evidence: "Every tracked account is at a paid-off balance.",
          action: "Keep the account list for the record and update the plan only if a new balance appears.",
        }
      : debtCoveragePct >= 35
      ? {
          tone: "warn" as const,
          title: "Debt payments are taking a large share of income",
          evidence: `${formatCurrency(monthlyDebtSpend)}/mo is ${debtCoveragePct.toFixed(1)}% of take-home pay.`,
          action: "Keep acceleration below the point where the cash buffer breaks.",
        }
      : monthsSaved > 0
        ? {
            tone: "good" as const,
            title: "This plan is doing measurable work",
            evidence: `${formatCurrency(effectiveAcceleration)}/mo extra saves ${monthsSaved} months and ${formatCurrency(interestSaved)} in projected interest.`,
            action: `Keep the next payment focused until ${nextDebtLabel} is cleared.`,
          }
        : {
            tone: "neutral" as const,
            title: "This is the baseline pace",
            evidence: "The current plan does not yet show a timeline gain against minimum payments.",
            action: "Use Strategy Lab to test the first extra payment amount.",
          };

  const coach = aiBrief
    ? {
        tone:
          aiBrief.verdict.status === "on_track"
            ? ("good" as const)
            : aiBrief.verdict.status === "off_track"
              ? ("danger" as const)
              : ("warn" as const),
        title: aiBrief.verdict.headline,
        evidence: aiBrief.verdict.summary,
        action: `${aiBrief.nextAction.action} — ${aiBrief.nextAction.body}`,
        source: "ai" as const,
        generatedAt: aiBriefGeneratedAt,
        onRefresh: onRefreshAiBrief,
        isRefreshing: isRefreshingAiBrief,
      }
    : { ...localCoach, source: "local" as const };

  return (
    <div
      className="rounded-2xl p-5 xl:col-span-3 h-auto md:h-full flex flex-col gap-4"
      style={COMMAND_CENTER_STYLE}
    >
      <div className="flex items-center gap-2">
        <Gauge size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">
          Payoff coach and plan metrics
        </h3>
      </div>

      <CoachStrip {...coach} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Timeline reduction
          </p>
          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
            {monthsSaved} months faster
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            vs minimums only
          </p>
        </div>

        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Interest avoided
          </p>
          <p className="text-sm font-semibold" style={{ color: "#059669" }}>
            {formatCurrency(interestSaved)}
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            projected lifetime savings
          </p>
        </div>

        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Debt payment intensity
          </p>
          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
            {formatCurrency(monthlyDebtSpend)} / mo
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            {debtCoveragePct.toFixed(1)}% of take-home
          </p>
        </div>

        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Next payoff milestone
          </p>
          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
            {nextDebtLabel}
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            {nextDebtMonth == null
              ? "No active debts"
              : `expected in ${nextDebtMonth}m`}
          </p>
        </div>
      </div>

    </div>
  );
}

interface ForecastCardProps {
  planResult: PayoffResult;
  planGap: number | null;
  confidencePct: number;
  confidenceRangeMonths: number;
}

export function ForecastCard({
  planResult,
  planGap,
  confidencePct,
  confidenceRangeMonths,
}: ForecastCardProps) {
  return (
    <div
      className="rounded-2xl p-5 xl:col-span-2 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">
          Forecast: date, confidence, and drift
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Projected debt-free date
          </p>
          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
            {planResult.debtFreeDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Confidence band: +/- {confidenceRangeMonths}m
          </p>
        </div>
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Progress vs plan
          </p>
          <p
            className="text-sm font-semibold"
            style={{
              color:
                planGap == null
                  ? "#64748b"
                  : planGap >= 0
                    ? "#059669"
                    : "#dc2626",
            }}
          >
            {planGap == null
              ? "No snapshots yet"
              : planGap >= 0
                ? `${formatCurrency(planGap)} ahead`
                : `${formatCurrency(Math.abs(planGap))} behind`}
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Confidence score: {confidencePct}%
          </p>
        </div>
      </div>
    </div>
  );
}

interface StrategyLabCardProps {
  sandboxMethod: PayoffMethod;
  sandboxExtra: number;
  availableCashFlow: number;
  scenarioResult: PayoffResult;
  bestStrategy: [PayoffMethod, PayoffResult];
  onMethodChange: (m: PayoffMethod) => void;
  onExtraChange: (v: number) => void;
}

export function StrategyLabCard({
  sandboxMethod,
  sandboxExtra,
  availableCashFlow,
  scenarioResult,
  bestStrategy,
  onMethodChange,
  onExtraChange,
}: StrategyLabCardProps) {
  return (
    <div
      className="rounded-2xl p-5 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">
          Strategy Lab: test the next dollar
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(["snowball", "avalanche", "custom"] as const).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onMethodChange(method)}
            className="rounded-lg px-2 py-2 text-xs font-semibold transition"
            style={{
              background:
                sandboxMethod === method ? "rgba(37,99,235,0.12)" : "#f8fafc",
              border:
                sandboxMethod === method
                  ? "1px solid rgba(37,99,235,0.35)"
                  : "1px solid rgba(15,23,42,0.08)",
              color: sandboxMethod === method ? "#1d4ed8" : "#334155",
            }}
          >
            {methodLabel(method)}
          </button>
        ))}
      </div>
      <label className="text-xs mb-1 block" style={{ color: "#64748b" }}>
        What-if extra payment
      </label>
      <input
        type="range"
        min={0}
        max={Math.max(availableCashFlow, 1)}
        step={25}
        value={Math.min(sandboxExtra, availableCashFlow)}
        onChange={(e) => onExtraChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#2563eb" }}
      />
      <div className="flex items-center justify-between mt-1 mb-3">
        <span className="text-xs" style={{ color: "#64748b" }}>
          Scenario extra: {formatCurrency(sandboxExtra)}
        </span>
        <span className="text-xs" style={{ color: "#64748b" }}>
          Best: {methodLabel(bestStrategy[0])} (
          {toTimeLabel(bestStrategy[1].months)})
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Debt-free in
          </p>
          <p className="text-sm font-semibold">
            {toTimeLabel(scenarioResult.months)}
          </p>
        </div>
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Total interest
          </p>
          <p className="text-sm font-semibold">
            {formatCurrency(scenarioResult.totalInterestPaid)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface MethodMatrixCardProps {
  strategyMatrix: {
    method: PayoffMethod;
    months: number;
    totalInterestPaid: number;
    active: boolean;
  }[];
}

export function MethodMatrixCard({ strategyMatrix }: MethodMatrixCardProps) {
  const recommendedMethod = strategyMatrix[0]?.method;

  return (
    <div
      className="rounded-2xl p-5 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">
          Method comparison: which plan wins?
        </h3>
      </div>
      <div className="space-y-2 flex-1">
        {strategyMatrix.map((row) => (
          <div
            key={row.method}
            className="rounded-lg p-3 flex items-center justify-between gap-2"
            style={{
              ...INNER_STYLE,
              border:
                row.method === recommendedMethod
                  ? "1px solid rgba(16,185,129,0.45)"
                  : row.active
                    ? "1px solid rgba(37,99,235,0.32)"
                    : "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div>
              <p
                className="text-xs font-semibold flex items-center gap-2"
                style={{
                  color:
                    row.method === recommendedMethod
                      ? "#047857"
                      : row.active
                        ? "#1d4ed8"
                        : "#0f172a",
                }}
              >
                <span>
                  {methodLabel(row.method)} {row.active ? "(active)" : ""}
                </span>
                {row.method === recommendedMethod && (
                  <span
                    className="px-2 py-0.5 rounded-md"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.35)",
                      color: "#047857",
                      fontSize: "10px",
                      lineHeight: "14px",
                    }}
                  >
                    Recommended
                  </span>
                )}
              </p>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Debt-free in {toTimeLabel(row.months)}
              </p>
            </div>
            <p className="text-xs font-semibold" style={{ color: "#0f172a" }}>
              {formatCurrency(row.totalInterestPaid)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs mt-3" style={{ color: "#64748b" }}>
        Recommended means the shortest projected timeline at this extra amount.
      </p>
    </div>
  );
}

interface CashFlowMixCardProps {
  monthlyTakeHome: number;
  totalEssential: number;
  recurringTotal: number;
  totalMinPayments: number;
  effectiveAcceleration: number;
  leftoverAfterAcceleration: number;
  bufferTarget: number;
}

export function CashFlowMixCard({
  monthlyTakeHome,
  totalEssential,
  recurringTotal,
  totalMinPayments,
  effectiveAcceleration,
  leftoverAfterAcceleration,
  bufferTarget,
}: CashFlowMixCardProps) {
  const safeIncome = Math.max(monthlyTakeHome, 1);
  const essentialsPct = (totalEssential / safeIncome) * 100;
  const minPct = (totalMinPayments / safeIncome) * 100;
  const accelPct = (effectiveAcceleration / safeIncome) * 100;
  const leftoverPct = (leftoverAfterAcceleration / safeIncome) * 100;
  const guardrailStatus =
    leftoverAfterAcceleration >= bufferTarget ? "On target" : "Below target";

  return (
    <div
      className="rounded-2xl p-5 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <PiggyBank size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">
          Buffer after debt payments
        </h3>
      </div>

      <div className="rounded-lg p-3 mb-3" style={INNER_STYLE}>
        <p className="text-xs mb-2" style={{ color: "#64748b" }}>
          Monthly take-home: {formatCurrency(monthlyTakeHome)}
        </p>
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ background: "#e2e8f0" }}
        >
          <div
            className="h-full"
            style={{
              width: `${Math.min(100, essentialsPct)}%`,
              background: "#94a3b8",
              float: "left",
            }}
          />
          <div
            className="h-full"
            style={{
              width: `${Math.min(100, minPct)}%`,
              background: "#2563eb",
              float: "left",
            }}
          />
          <div
            className="h-full"
            style={{
              width: `${Math.min(100, accelPct)}%`,
              background: "#059669",
              float: "left",
            }}
          />
          <div
            className="h-full"
            style={{
              width: `${Math.min(100, leftoverPct)}%`,
              background: "#f59e0b",
              float: "left",
            }}
          />
        </div>
      </div>

      <div className="space-y-1 text-xs" style={{ color: "#64748b" }}>
        <p>
          Essentials + recurring: {formatCurrency(totalEssential)} (
          {essentialsPct.toFixed(1)}%)
        </p>
        <p>Recurring only: {formatCurrency(recurringTotal)}</p>
        <p>
          Minimum debt payments: {formatCurrency(totalMinPayments)} (
          {minPct.toFixed(1)}%)
        </p>
        <p>
          Acceleration: {formatCurrency(effectiveAcceleration)} (
          {accelPct.toFixed(1)}%)
        </p>
        <p>
          Leftover buffer: {formatCurrency(leftoverAfterAcceleration)} (
          {leftoverPct.toFixed(1)}%)
        </p>
      </div>

      <p
        className="text-xs mt-3"
        style={{
          color: guardrailStatus === "On target" ? "#059669" : "#b45309",
        }}
      >
        Guardrail target: {formatCurrency(bufferTarget)} - {guardrailStatus}
      </p>
    </div>
  );
}

export function SmartCalendarCard({
  smartCalendar,
}: {
  smartCalendar: SmartCalendar;
}) {
  return (
    <div
      className="rounded-2xl p-5 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">Payment calendar risk</h3>
      </div>
      <div
        className="rounded-lg p-3 mb-3"
        style={{
          background:
            smartCalendar.dueIn7 >= 3
              ? "rgba(239,68,68,0.1)"
              : "rgba(37,99,235,0.08)",
        }}
      >
        <p
          className="text-xs"
          style={{ color: smartCalendar.dueIn7 >= 3 ? "#b91c1c" : "#1d4ed8" }}
        >
          {smartCalendar.dueIn7 >= 3
            ? `Risk flag: ${smartCalendar.dueIn7} payments due in 7 days`
            : `${smartCalendar.dueIn14} payments due in next 14 days`}
        </p>
      </div>
      <div className="space-y-2 flex-1">
        {smartCalendar.items
          .filter((item) =>
            smartCalendar.dueIn7 >= 3 ? item.daysUntil <= 7 : item.daysUntil <= 14,
          )
          .slice(0, 4)
          .map((item) => (
          <div
            key={item.debt.id}
            className="rounded-lg p-2 flex items-center justify-between"
            style={INNER_STYLE}
          >
            <span className="text-xs" style={{ color: "#334155" }}>
              {item.debt.name}
            </span>
            <div className="flex items-center gap-1 text-xs">
              <span
                style={{
                  color:
                    item.daysUntil <= 1
                      ? "#dc2626"
                      : item.daysUntil <= 3
                        ? "#b45309"
                        : "#64748b",
                  fontWeight: item.daysUntil <= 3 ? 600 : 400,
                }}
              >
                {item.daysUntil}d
              </span>
              <span style={{ color: "#64748b" }}>-</span>
              <span style={{ color: "#64748b" }}>
                {formatCurrency(item.debt.minimumPayment)}
              </span>
            </div>
          </div>
        ))}
        {smartCalendar.dueIn14 === 0 && (
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            Add due dates on debts to activate smart calendar flags.
          </p>
        )}
      </div>
    </div>
  );
}

interface GuardrailsCardProps {
  monthlyInterestLeak: number;
  monthlyInterestAvoided: number;
  leftoverAfterAcceleration: number;
  bufferTarget: number;
}

export function GuardrailsCard({
  monthlyInterestLeak,
  monthlyInterestAvoided,
  leftoverAfterAcceleration,
  bufferTarget,
}: GuardrailsCardProps) {
  const isLow = leftoverAfterAcceleration < bufferTarget;
  const bufferPct = bufferTarget > 0
    ? Math.min(100, Math.round((leftoverAfterAcceleration / bufferTarget) * 100))
    : 100;
  const leakPct = monthlyInterestLeak + monthlyInterestAvoided > 0
    ? Math.round((monthlyInterestAvoided / (monthlyInterestLeak + monthlyInterestAvoided)) * 100)
    : 0;

  return (
    <div
      className="rounded-2xl p-5 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">Interest &amp; buffer guardrail</h3>
      </div>

      {/* Interest split bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-xs" style={{ color: "#64748b" }}>Interest this month</span>
          <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>
            {formatCurrency(monthlyInterestLeak)}
          </span>
        </div>
        <div style={{ height: "6px", borderRadius: "999px", background: "rgba(220,38,38,0.12)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${leakPct}%`,
              borderRadius: "999px",
              background: "linear-gradient(90deg, #059669, #10b981)",
              transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "#dc2626" }}>
            {formatCurrency(monthlyInterestLeak - monthlyInterestAvoided)} going to lenders
          </span>
          <span className="text-xs" style={{ color: "#059669" }}>
            {formatCurrency(monthlyInterestAvoided)} avoided
          </span>
        </div>
      </div>

      {/* Buffer meter */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs" style={{ color: "#64748b" }}>Cash buffer after acceleration</span>
          <span className="text-xs font-semibold" style={{ color: isLow ? "#b45309" : "#059669" }}>
            {formatCurrency(leftoverAfterAcceleration)}
          </span>
        </div>
        <div style={{ height: "6px", borderRadius: "999px", background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${bufferPct}%`,
              borderRadius: "999px",
              background: isLow
                ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                : "linear-gradient(90deg, #2563eb, #3b82f6)",
              transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "#94a3b8" }}>
            Target: {formatCurrency(bufferTarget)}
          </span>
          <span className="text-xs" style={{ color: isLow ? "#b45309" : "#059669" }}>
            {isLow ? "⚠ Below target" : "✓ On track"}
          </span>
        </div>
      </div>

      <div
        className="rounded-lg p-2 mt-auto"
        style={{
          background: isLow ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.08)",
          border: `1px solid ${isLow ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.15)"}`,
        }}
      >
        <p className="text-xs" style={{ color: isLow ? "#92400e" : "#065f46" }}>
          {isLow
            ? "Reduce acceleration until buffer recovers."
            : "Buffer is healthy. Keep acceleration on."}
        </p>
      </div>
    </div>
  );
}

interface PriorityQueueCardProps {
  priorityQueue: Debt[];
  effectiveAcceleration: number;
  actions: string[];
  actionChecks: Record<string, boolean>;
  onActionCheck: (action: string) => void;
}

export function PriorityQueueCard({
  priorityQueue,
  effectiveAcceleration,
  actions,
  actionChecks,
  onActionCheck,
}: PriorityQueueCardProps) {
  return (
    <div
      className="rounded-2xl p-5 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <ListChecks size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">
          Payment order and action checklist
        </h3>
      </div>
      <div className="space-y-2 mb-3 flex-1">
        {priorityQueue.length > 0 ? priorityQueue.map((debt, idx) => (
          <div
            key={debt.id}
            className="rounded-lg p-2 flex items-center justify-between"
            style={INNER_STYLE}
          >
            <span className="text-xs" style={{ color: "#334155" }}>
              {idx + 1}. {debt.name}
            </span>
            <span className="text-xs" style={{ color: "#64748b" }}>
              {formatCurrency(
                Math.min(
                  debt.balance,
                  Math.max(100, effectiveAcceleration / 2),
                ),
              )}
            </span>
          </div>
        )) : (
          <div className="rounded-lg p-3" style={INNER_STYLE}>
            <p className="text-xs font-semibold" style={{ color: "#059669" }}>
              All tracked debts are paid off.
            </p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>
              No payment order is needed until a new active balance appears.
            </p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <label
            key={action}
            className="flex items-center gap-2 text-xs"
            style={{ color: "#475569" }}
          >
            <input
              type="checkbox"
              checked={Boolean(actionChecks[action])}
              onChange={() => onActionCheck(action)}
            />
            {action}
          </label>
        ))}
      </div>
    </div>
  );
}

interface MilestonesCardProps {
  milestoneData: MilestoneData;
  refinanceCandidates: RefinanceCandidate[];
}

export function MilestonesCard({
  milestoneData,
  refinanceCandidates,
}: MilestonesCardProps) {
  return (
    <div
      className="rounded-2xl p-5 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <BadgeCheck size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">Progress &amp; refinance flags</h3>
      </div>

      {/* Progress section */}
      <div className="rounded-lg p-3 mb-3" style={INNER_STYLE}>
        <p className="text-xs font-semibold mb-1" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Paid down
        </p>
        <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
          {milestoneData.pctPaid.toFixed(1)}% of total debt
        </p>
        <p className="text-xs" style={{ color: "#64748b" }}>
          {milestoneData.streak === 0
            ? "Log a payment to start your streak"
            : `${milestoneData.streak}-month on-plan streak`}
        </p>
      </div>

      {/* Refinance candidates section */}
      {refinanceCandidates.length > 0 && (
        <p className="text-xs font-semibold mb-2" style={{ color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          High-rate debts — worth refinancing
        </p>
      )}
      <div className="space-y-2 flex-1">
        {refinanceCandidates.map(({ debt, estimatedSavings }) => (
          <div
            key={debt.id}
            className="rounded-lg p-2 flex items-center justify-between"
            style={INNER_STYLE}
          >
            <div>
              <span className="text-xs font-medium" style={{ color: "#334155" }}>
                {debt.name}
              </span>
              <span className="text-xs ml-1" style={{ color: "#94a3b8" }}>
                {debt.interestRate.toFixed(2)}% APR
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="text-xs font-semibold" style={{ color: "#059669" }}>
                ~{formatCurrency(estimatedSavings)} saved
              </span>
              <p className="text-xs" style={{ color: "#94a3b8" }}>if refinanced to ~7.5%</p>
            </div>
          </div>
        ))}
        {refinanceCandidates.length === 0 && (
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            No debts flagged for refinancing right now.
          </p>
        )}
      </div>
    </div>
  );
}

interface Insight {
  title: string;
  why: string;
  impact: string;
}

export function ExplainableInsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <div
      className="rounded-2xl p-5 xl:col-span-3 h-auto md:h-full flex flex-col"
      style={CARD_STYLE}
    >
      <div className="flex items-center gap-2 mb-3">
        <Wrench size={16} style={{ color: "#2563eb" }} />
        <h3 className="text-sm font-semibold">
          Why these moves matter
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="rounded-xl p-3"
            style={INNER_STYLE}
          >
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "#0f172a" }}
            >
              {insight.title}
            </p>
            <p className="text-xs mb-2" style={{ color: "#64748b" }}>
              {insight.why}
            </p>
            <p className="text-xs" style={{ color: "#1d4ed8" }}>
              {insight.impact}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
