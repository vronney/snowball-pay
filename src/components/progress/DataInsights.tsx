"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Gauge, PieChart as PieChartIcon, SlidersHorizontal, TrendingUp } from "lucide-react";
import { type BalanceSnapshot, type Debt, type Expense, type Income } from "@/types";
import {
  type PayoffMethod,
  type PayoffResult,
} from "@/lib/snowball";
import { formatCurrency, formatCurrencyWhole, getCategoryColor } from "@/lib/utils";
import {
  buildCashFlowCoach,
  buildCashFlowStages,
  type CashFlowStage,
  type CoachTakeawayData,
  type CoachTone,
  type PlanMetrics,
} from "@/components/progress/dataInsightsModel";
import {
  calculatePlanMetrics,
  calculateResultForAcceleration as calculatePayoffResultForAcceleration,
} from "@/lib/payoffPlan";
import { isActiveDebt } from "@/lib/monthlyFocusDebt";
import { computeActualBalanceTotals } from "@/lib/hooks/useActualBalanceMap";

interface DataInsightsProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  snapshots: BalanceSnapshot[];
}

interface DebtMixSlice {
  name: string;
  value: number;
  count: number;
  avgApr: number;
  fill: string;
}

interface VariancePoint {
  month: string;
  actual: number;
  projected: number;
  variance: number;
}

interface InterestPrincipalPoint {
  month: string;
  interest: number;
  principal: number;
}

interface PayoffLeverPoint {
  label: string;
  extra: number;
  acceleration: number;
  months: number;
  monthsSaved: number;
  interest: number;
  interestSaved: number;
  debtFreeDate: string;
  bufferAfter: number;
  needsMonthlyRoom: number;
}

const CARD_STYLE = {
  background: "#ffffff",
  border: "1px solid rgba(15,23,42,0.08)",
  boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
};

const COACH_TONE: Record<CoachTone, { bg: string; border: string; color: string; label: string }> = {
  neutral: {
    bg: "#f8fafc",
    border: "rgba(15,23,42,0.10)",
    color: "#334155",
    label: "Read",
  },
  good: {
    bg: "rgba(5,150,105,0.08)",
    border: "rgba(5,150,105,0.18)",
    color: "#047857",
    label: "Keep",
  },
  warn: {
    bg: "rgba(217,119,6,0.09)",
    border: "rgba(217,119,6,0.20)",
    color: "#a16207",
    label: "Watch",
  },
  danger: {
    bg: "rgba(220,38,38,0.08)",
    border: "rgba(220,38,38,0.18)",
    color: "#b91c1c",
    label: "Act",
  },
};

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
  if (Math.abs(value) >= 100) return `$${Math.round(value)}`;
  if (value === 0) return '$0';
  return `$${Math.round(value)}`;
}

function shortMonthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function buildDebtMix(debts: Debt[]): DebtMixSlice[] {
  const byCategory = new Map<string, { value: number; aprTotal: number; count: number }>();

  for (const debt of debts.filter(isActiveDebt)) {
    const current = byCategory.get(debt.category) ?? {
      value: 0,
      aprTotal: 0,
      count: 0,
    };
    current.value += debt.balance;
    current.aprTotal += debt.interestRate;
    current.count += 1;
    byCategory.set(debt.category, current);
  }

  return Array.from(byCategory.entries())
    .map(([name, item]) => ({
      name,
      value: item.value,
      count: item.count,
      avgApr: item.count > 0 ? item.aprTotal / item.count : 0,
      fill: getCategoryColor(name),
    }))
    .sort((a, b) => b.value - a.value);
}

function buildVarianceData(
  snapshots: BalanceSnapshot[],
  plan: PayoffResult | null,
): VariancePoint[] {
  if (!plan) return [];
  const projectionByMonth = new Map(
    plan.monthlyBalances.map((balance) => [balance.date, balance.totalBalance]),
  );

  // computeActualBalanceTotals carry-forward-fills debts with no snapshot in a
  // given month. A raw per-month sum here silently dropped every unlogged debt
  // (e.g. only Plaid-synced debts get a current-month snapshot), making the
  // "actual" total a fraction of reality and the variance wildly positive.
  return computeActualBalanceTotals(snapshots)
    .map((point) => {
      const projected = projectionByMonth.get(point.label);
      if (projected == null) return null;
      return {
        month: shortMonthLabelFromKey(point.ym),
        actual: point.total,
        projected,
        variance: projected - point.total,
      };
    })
    .filter((point): point is VariancePoint => point != null);
}

function sortSimDebts(debts: Debt[], method: PayoffMethod) {
  const sorted = debts.map((debt) => ({
    balance: debt.balance,
    monthlyRate: debt.interestRate / 100 / 12,
    minimumPayment: debt.minimumPayment,
    priorityOrder: debt.priorityOrder,
  }));

  if (method === "avalanche") {
    sorted.sort((a, b) => b.monthlyRate - a.monthlyRate);
  } else if (method === "custom") {
    sorted.sort((a, b) => {
      const aPriority = a.priorityOrder ?? Number.MAX_SAFE_INTEGER;
      const bPriority = b.priorityOrder ?? Number.MAX_SAFE_INTEGER;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.balance - b.balance;
    });
  } else {
    sorted.sort((a, b) => a.balance - b.balance);
  }

  return sorted;
}

function buildInterestPrincipalData(
  debts: Debt[],
  metrics: PlanMetrics | null,
): InterestPrincipalPoint[] {
  if (!metrics || debts.length === 0) return [];
  const simDebts = sortSimDebts(debts, metrics.method);
  let snowballExtra = metrics.effectiveAcceleration;
  const rows: InterestPrincipalPoint[] = [];
  const maxMonths = Math.min(metrics.result.months, 18);

  for (let month = 1; month <= maxMonths; month += 1) {
    let interest = 0;
    let principal = 0;
    let extraThisMonth = snowballExtra;
    const targetIndex = simDebts.findIndex((debt) => debt.balance > 0.01);
    if (targetIndex < 0) break;

    simDebts.forEach((debt, index) => {
      if (debt.balance <= 0.01) return;

      const monthlyInterest = debt.balance * debt.monthlyRate;
      interest += monthlyInterest;
      debt.balance += monthlyInterest;

      let payment = debt.minimumPayment;
      if (index === targetIndex) {
        payment += extraThisMonth;
        extraThisMonth = 0;
      }

      payment = Math.min(payment, debt.balance);
      principal += Math.max(0, payment - monthlyInterest);
      debt.balance -= payment;

      if (debt.balance <= 0.01) {
        debt.balance = 0;
        snowballExtra += debt.minimumPayment;
      }
    });

    rows.push({
      month: `M${month}`,
      interest: Math.round(interest),
      principal: Math.round(principal),
    });
  }

  return rows;
}

function calculateResultForAcceleration(
  debts: Debt[],
  income: Income,
  metrics: PlanMetrics,
  acceleration: number,
) {
  return calculatePayoffResultForAcceleration(debts, income, metrics, acceleration);
}

function buildPayoffLeverData(
  debts: Debt[],
  income: Income | null | undefined,
  metrics: PlanMetrics | null,
): PayoffLeverPoint[] {
  if (!income || !metrics || debts.length === 0) return [];

  const currentBuffer = Math.max(
    0,
    metrics.availableCashFlow - metrics.effectiveAcceleration,
  );

  return [0, 25, 50, 100, 200].map((extra) => {
    const acceleration = Math.max(0, metrics.effectiveAcceleration + extra);
    const result =
      extra === 0
        ? metrics.result
        : calculateResultForAcceleration(debts, income, metrics, acceleration);
    const monthsSaved = Math.max(0, metrics.result.months - result.months);
    const interestSaved = Math.max(
      0,
      metrics.result.totalInterestPaid - result.totalInterestPaid,
    );

    return {
      label: extra === 0 ? "Current" : `+$${extra}`,
      extra,
      acceleration,
      months: result.months,
      monthsSaved,
      interest: result.totalInterestPaid,
      interestSaved,
      debtFreeDate: result.debtFreeDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      bufferAfter: metrics.availableCashFlow - acceleration,
      needsMonthlyRoom: Math.max(0, extra - currentBuffer),
    };
  });
}

function buildDebtMixCoach(debts: Debt[], mix: DebtMixSlice[]): CoachTakeawayData {
  const activeDebts = debts.filter(isActiveDebt);
  if (activeDebts.length === 0 || mix.length === 0) {
    return {
      tone: debts.length > 0 ? "good" : "neutral",
      title: debts.length > 0 ? "No active debt pressure remains" : "Add debts to see concentration risk",
      evidence: debts.length > 0
        ? "Every tracked account is at a paid-off balance."
        : "Debt mix needs balances, categories, and APRs before it can show pressure.",
      action: debts.length > 0
        ? "Keep the account list for the payoff record and update only new balances."
        : "Add each account balance and rate before choosing payoff order.",
    };
  }

  const total = activeDebts.reduce((sum, debt) => sum + debt.balance, 0);
  const largestDebt = [...activeDebts].sort((a, b) => b.balance - a.balance)[0];
  const highestAprDebt = [...activeDebts].sort((a, b) => b.interestRate - a.interestRate)[0];
  const largestShare = total > 0 ? (largestDebt.balance / total) * 100 : 0;

  if (highestAprDebt.interestRate >= 18) {
    return {
      tone: "warn",
      title: `${highestAprDebt.name} is the expensive pressure point`,
      evidence: `${highestAprDebt.interestRate.toFixed(1)}% APR on ${formatCurrency(highestAprDebt.balance)} creates the strongest interest drag.`,
      action: "Use avalanche when interest savings matter more than the fastest account payoff.",
    };
  }

  if (largestShare >= 45) {
    return {
      tone: "neutral",
      title: "One balance drives most of the plan",
      evidence: `${largestDebt.name} is ${largestShare.toFixed(1)}% of current debt.`,
      action: "Pressure-test whether this account should be the focus debt.",
    };
  }

  return {
    tone: "good",
    title: "Debt pressure is spread across accounts",
    evidence: `No single account is above ${largestShare.toFixed(1)}% of total debt.`,
    action: "Let the chosen payoff method set the order instead of reacting to balance size.",
  };
}

function buildVarianceCoach(data: VariancePoint[]): CoachTakeawayData {
  const latest = data.at(-1);
  // Same 2+ month gate as the chart below — a verdict banner above an
  // "insufficient data" chart is a contradiction, and one month of overlap is
  // too thin to call ahead/behind.
  if (!latest || data.length < 2) {
    return {
      tone: "neutral",
      title: "Actual tracking starts with one balance update",
      evidence: "There is not enough matching snapshot history to compare actual balances to the plan.",
      action: "Record balances after each statement closes.",
    };
  }

  if (latest.variance >= 50) {
    return {
      tone: "good",
      title: "Actual balances are beating the plan",
      evidence: `${latest.month} is ${formatCurrency(latest.variance)} ahead of the projected balance.`,
      action: "Keep the current payment pace unless your cash buffer gets tight.",
    };
  }

  if (latest.variance <= -50) {
    return {
      tone: "danger",
      title: "The plan needs a course correction",
      evidence: `${latest.month} is ${formatCurrency(Math.abs(latest.variance))} behind the projected balance.`,
      action: "Update balances, then adjust the forecast or add a catch-up payment only if the buffer allows.",
    };
  }

  return {
    tone: "good",
    title: "Actual balances are close to plan",
    evidence: `${latest.month} is within ${formatCurrency(Math.abs(latest.variance))} of the projected line.`,
    action: "Keep tracking monthly so small drift does not become a surprise.",
  };
}

function buildPaymentMixCoach(data: InterestPrincipalPoint[]): CoachTakeawayData {
  const first = data[0];
  const latest = data.at(-1);
  if (!first || !latest) {
    return {
      tone: "neutral",
      title: "Add a plan to see payment quality",
      evidence: "The chart needs a calculated payoff schedule before it can split interest from principal.",
      action: "Add debts and income, then generate the payoff plan.",
    };
  }

  const latestTotal = latest.interest + latest.principal;
  const latestPrincipalPct = latestTotal > 0 ? (latest.principal / latestTotal) * 100 : 0;
  const firstTotal = first.interest + first.principal;
  const firstPrincipalPct = firstTotal > 0 ? (first.principal / firstTotal) * 100 : 0;

  if (latestPrincipalPct < 60) {
    return {
      tone: "warn",
      title: "Interest is still taking a large share",
      evidence: `By ${latest.month}, only ${latestPrincipalPct.toFixed(1)}% of planned payment hits principal.`,
      action: "Aim extra payments at the highest APR account first when the cash buffer is healthy.",
    };
  }

  return {
    tone: "good",
    title: "More of each payment is hitting principal",
    evidence: `Principal share moves from ${firstPrincipalPct.toFixed(1)}% to ${latestPrincipalPct.toFixed(1)}% across the visible plan.`,
    action: "Keep the snowball rolling as each paid-off minimum frees cash.",
  };
}

function buildPayoffLeverCoach(data: PayoffLeverPoint[]): CoachTakeawayData {
  const firstUseful = data.find((point) => point.extra > 0 && point.monthsSaved > 0);

  if (data.length === 0) {
    return {
      tone: "neutral",
      title: "Add a plan to test payoff levers",
      evidence: "This chart needs debts, income, and minimum payments before it can compare monthly moves.",
      action: "Build the payoff plan first, then use this to decide whether extra income or expense cuts are worth pursuing.",
    };
  }

  if (!firstUseful) {
    return {
      tone: "neutral",
      title: "Small moves do not shift the date yet",
      evidence: "The tested monthly boosts do not change the projected debt-free month from the current plan.",
      action: "Protect minimums and cash buffer first, then test a larger recurring move when it is realistic.",
    };
  }

  const needsRoom = firstUseful.needsMonthlyRoom > 0;
  return {
    tone: needsRoom ? "warn" : "good",
    title: `${firstUseful.label}/mo is the first useful lever`,
    evidence: `${firstUseful.label}/mo saves ${firstUseful.monthsSaved} month${firstUseful.monthsSaved === 1 ? "" : "s"} and ${formatCurrencyWhole(firstUseful.interestSaved)} in projected interest.`,
    action: needsRoom
      ? `Find ${formatCurrency(firstUseful.needsMonthlyRoom)}/mo through income or cuts before raising acceleration.`
      : "This fits inside current cash flow; use it only while the buffer stays healthy.",
  };
}

function EmptyVisualization({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex h-56 flex-col items-center justify-center rounded-xl p-4 text-center"
      style={{
        background: "#f8fafc",
        border: "1px dashed rgba(15,23,42,0.14)",
      }}
    >
      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
        {title}
      </p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed" style={{ color: "#64748b" }}>
        {body}
      </p>
    </div>
  );
}

function CoachTakeaway({ takeaway }: { takeaway: CoachTakeawayData }) {
  const tone = COACH_TONE[takeaway.tone];
  return (
    <div
      className="mb-4 rounded-xl p-3"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: "#ffffff", color: tone.color, border: `1px solid ${tone.border}` }}
        >
          Coach {tone.label}
        </span>
        <p className="text-xs font-semibold" style={{ color: "#0f172a" }}>
          {takeaway.title}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
          <span className="font-semibold" style={{ color: tone.color }}>Evidence: </span>
          {takeaway.evidence}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
          <span className="font-semibold" style={{ color: tone.color }}>Action: </span>
          {takeaway.action}
        </p>
      </div>
    </div>
  );
}

function CashFlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CashFlowStage }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={CARD_STYLE}>
      <p className="font-semibold" style={{ color: "#0f172a" }}>
        {item.label}
      </p>
      <p style={{ color: item.amount >= 0 ? "#059669" : "#dc2626" }}>
        {item.amount >= 0 ? "+" : ""}
        {formatCurrency(item.amount)}
      </p>
      <p style={{ color: "#64748b" }}>{item.helper}</p>
    </div>
  );
}

function DebtMixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DebtMixSlice }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={CARD_STYLE}>
      <p className="font-semibold" style={{ color: "#0f172a" }}>
        {item.name}
      </p>
      <p style={{ color: "#64748b" }}>{formatCurrency(item.value)}</p>
      <p style={{ color: "#64748b" }}>
        {item.count} account{item.count === 1 ? "" : "s"} - {item.avgApr.toFixed(1)}% avg APR
      </p>
    </div>
  );
}

function VarianceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: VariancePoint }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  const ahead = item.variance >= 0;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={CARD_STYLE}>
      <p className="font-semibold" style={{ color: "#0f172a" }}>
        {item.month}
      </p>
      <p style={{ color: ahead ? "#059669" : "#dc2626" }}>
        {ahead ? "Ahead" : "Behind"} by {formatCurrency(Math.abs(item.variance))}
      </p>
      <p style={{ color: "#64748b" }}>
        Actual {formatCurrency(item.actual)} vs plan {formatCurrency(item.projected)}
      </p>
    </div>
  );
}

function PaymentMixTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload: InterestPrincipalPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, item) => sum + (item.value ?? 0), 0);
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={CARD_STYLE}>
      <p className="font-semibold" style={{ color: "#0f172a" }}>
        {label}
      </p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: "#64748b" }}>
          {item.name}: {formatCurrency(item.value ?? 0)}
        </p>
      ))}
      <p className="font-semibold" style={{ color: "#0f172a" }}>
        Total payment: {formatCurrency(total)}
      </p>
    </div>
  );
}

function PayoffLeverTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PayoffLeverPoint }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={CARD_STYLE}>
      <p className="font-semibold" style={{ color: "#0f172a" }}>
        {item.label === "Current" ? "Current plan" : `${item.label}/mo move`}
      </p>
      <p style={{ color: "#64748b" }}>
        Debt-free: {item.debtFreeDate} ({item.months}m)
      </p>
      <p style={{ color: item.monthsSaved > 0 ? "#059669" : "#64748b" }}>
        Months saved: {item.monthsSaved}
      </p>
      <p style={{ color: item.interestSaved > 0 ? "#059669" : "#64748b" }}>
        Interest avoided: {formatCurrencyWhole(item.interestSaved)}
      </p>
      {item.extra > 0 && (
        <p style={{ color: item.needsMonthlyRoom > 0 ? "#b45309" : "#059669" }}>
          {item.needsMonthlyRoom > 0
            ? `${formatCurrency(item.needsMonthlyRoom)}/mo new room needed`
            : `${formatCurrency(Math.max(0, item.bufferAfter))}/mo buffer remains`}
        </p>
      )}
    </div>
  );
}

function InsightCard({
  icon,
  title,
  subtitle,
  coach,
  className = "",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  coach: CoachTakeawayData;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={CARD_STYLE}>
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>
            {title}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
            {subtitle}
          </p>
        </div>
      </div>
      <CoachTakeaway takeaway={coach} />
      {children}
    </div>
  );
}

function PayoffLeverCard({
  debts,
  income,
  metrics,
}: {
  debts: Debt[];
  income: Income | null | undefined;
  metrics: PlanMetrics | null;
}) {
  const data = buildPayoffLeverData(debts, income, metrics);
  const coach = buildPayoffLeverCoach(data);

  return (
    <InsightCard
      icon={<SlidersHorizontal size={17} />}
      title="Which monthly move changes the payoff date?"
      subtitle="Compares the current pace with small recurring boosts so extra income or expense cuts have a clear payoff."
      coach={coach}
      className="xl:col-span-2"
    >
      {data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="months"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="interest"
                  orientation="right"
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={62}
                />
                <Tooltip content={<PayoffLeverTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "#64748b", fontSize: 11 }}>{value}</span>
                  )}
                />
                <Bar
                  yAxisId="months"
                  dataKey="monthsSaved"
                  name="Months saved"
                  radius={[6, 6, 0, 0]}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={entry.extra === 0 ? "#cbd5e1" : "#2563eb"}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="interest"
                  type="monotone"
                  dataKey="interestSaved"
                  name="Interest avoided"
                  stroke="#059669"
                  strokeWidth={2.4}
                  dot={{ r: 3, fill: "#059669", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#059669", strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data.filter((point) => point.extra > 0).map((point) => (
              <div
                key={point.label}
                className="rounded-xl p-3"
                style={{ background: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>
                    {point.label}/mo
                  </span>
                  <span className="text-xs font-semibold" style={{ color: point.monthsSaved > 0 ? "#059669" : "#64748b" }}>
                    {point.monthsSaved}m faster
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#64748b" }}>
                  {formatCurrency(point.interestSaved)} projected interest avoided
                </p>
                <p className="text-xs" style={{ color: point.needsMonthlyRoom > 0 ? "#b45309" : "#059669" }}>
                  {point.needsMonthlyRoom > 0
                    ? `${formatCurrency(point.needsMonthlyRoom)}/mo new room needed`
                    : "Fits inside current cash flow"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyVisualization
          title="Plan data needed"
          body="Add debts and income to compare the payoff impact of small monthly income or expense changes."
        />
      )}
    </InsightCard>
  );
}

function CashFlowWaterfallCard({
  income,
  metrics,
}: {
  income: Income | null | undefined;
  metrics: PlanMetrics | null;
}) {
  const data = income && metrics ? buildCashFlowStages(income, metrics) : [];
  const low = Math.min(0, ...data.map((item) => item.range[0]));
  const high = Math.max(1, ...data.map((item) => item.range[1]));
  const coach = buildCashFlowCoach(income, metrics, data);

  return (
    <InsightCard
      icon={<Gauge size={17} />}
      title="Can this payoff plan fit the month?"
      subtitle="Shows whether bills, minimums, and extra payoff still leave a workable cash buffer."
      coach={coach}
    >
      {income && metrics ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 18, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="4 4" />
              <XAxis
                type="number"
                domain={[low, high]}
                tickFormatter={formatCompactCurrency}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={92}
                tick={{ fill: "#334155", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CashFlowTooltip />} />
              <Bar dataKey="range" radius={[7, 7, 7, 7]}>
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyVisualization
          title="Budget data needed"
          body="Add take-home income and essential expenses to see how much debt payoff the month can safely support."
        />
      )}
    </InsightCard>
  );
}

function DebtMixCard({ debts }: { debts: Debt[] }) {
  const activeDebts = debts.filter(isActiveDebt);
  const mix = buildDebtMix(debts);
  const total = activeDebts.reduce((sum, debt) => sum + debt.balance, 0);
  const topDebts = [...activeDebts].sort((a, b) => b.balance - a.balance).slice(0, 4);
  const coach = buildDebtMixCoach(debts, mix);

  return (
    <InsightCard
      icon={<PieChartIcon size={17} />}
      title="Which debts create the most pressure?"
      subtitle="Shows balance share and APR drag so the next focus debt is easier to choose."
      coach={coach}
    >
      {mix.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  {mix.map((slice) => (
                    <Cell key={slice.name} fill={slice.fill} />
                  ))}
                </Pie>
                <Tooltip content={<DebtMixTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "#64748b", fontSize: 11 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {topDebts.map((debt) => {
              const pct = total > 0 ? (debt.balance / total) * 100 : 0;
              return (
                <div key={debt.id} className="rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid rgba(15,23,42,0.08)" }}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-semibold" style={{ color: "#0f172a" }}>
                      {debt.name}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>
                      {formatCurrency(debt.balance)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "#e2e8f0" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: getCategoryColor(debt.category),
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
                    {pct.toFixed(1)}% of debt - {debt.interestRate.toFixed(1)}% APR
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyVisualization
          title="No debt mix yet"
          body="Add debts to see your balance concentration by type and account."
        />
      )}
    </InsightCard>
  );
}

function VarianceCard({
  snapshots,
  metrics,
}: {
  snapshots: BalanceSnapshot[];
  metrics: PlanMetrics | null;
}) {
  const data = buildVarianceData(snapshots, metrics?.result ?? null);
  const coach = buildVarianceCoach(data);

  return (
    <InsightCard
      icon={<BarChart3 size={17} />}
      title="Are you ahead or behind the plan?"
      subtitle="Compares real balances against the plan so you know when to adjust."
      coach={coach}
    >
      {data.length >= 2 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={62}
              />
              <Tooltip content={<VarianceTooltip />} />
              <Bar dataKey="variance" radius={[6, 6, 6, 6]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={entry.variance >= 0 ? "#059669" : "#dc2626"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyVisualization
          title="Log 2+ months to see variance"
          body="Log your actual balance each month — after two months the chart shows whether you're ahead or behind your plan."
        />
      )}
    </InsightCard>
  );
}

function InterestPrincipalCard({
  debts,
  metrics,
}: {
  debts: Debt[];
  metrics: PlanMetrics | null;
}) {
  const data = buildInterestPrincipalData(debts, metrics);
  const coach = buildPaymentMixCoach(data);

  return (
    <InsightCard
      icon={<TrendingUp size={17} />}
      title="How much of each payment hits principal?"
      subtitle="Shows when interest is eating the payment and when momentum is improving."
      coach={coach}
    >
      {data.length >= 2 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatCompactCurrency}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={62}
              />
              <Tooltip content={<PaymentMixTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "#64748b", fontSize: 11 }}>{value}</span>
                )}
              />
              <Bar
                dataKey="principal"
                name="Principal"
                stackId="payment"
                fill="#2563eb"
                radius={[0, 0, 5, 5]}
              />
              <Bar
                dataKey="interest"
                name="Interest"
                stackId="payment"
                fill="#d97706"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyVisualization
          title="Plan data needed"
          body="Add income and debts to see how future payments split between interest and principal."
        />
      )}
    </InsightCard>
  );
}

export default function DataInsights({
  debts,
  income,
  expenses,
  snapshots,
}: DataInsightsProps) {
  const metrics = useMemo(
    () => calculatePlanMetrics(debts, income, expenses),
    [debts, income, expenses],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2563eb" }}>
            Debt-free progress coach
          </p>
          <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>
            See what moves you closer to debt-free
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
            Each chart explains the signal, why it matters, and the next safe
            action for this month.
          </p>
        </div>
        {metrics && (
          <div
            className="rounded-xl px-3 py-2 text-xs"
            style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}
          >
            Current pace: {formatCurrency(metrics.effectiveAcceleration)}/mo extra
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PayoffLeverCard debts={debts} income={income} metrics={metrics} />
        <CashFlowWaterfallCard income={income} metrics={metrics} />
        <DebtMixCard debts={debts} />
        <VarianceCard snapshots={snapshots} metrics={metrics} />
        <InterestPrincipalCard debts={debts} metrics={metrics} />
      </div>
    </section>
  );
}
