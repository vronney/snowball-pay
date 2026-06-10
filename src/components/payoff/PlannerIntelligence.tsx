"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useUserSettings, useUpdatePreferences } from "@/lib/hooks";
import { Sparkles } from "lucide-react";
import { type Debt, type Income, type Expense } from "@/types";
import { type PayoffMethod, type PayoffResult } from "@/lib/snowball";
import { calculateResultByMethod } from "@/lib/payoffPlan";
import { formatCurrency } from "@/lib/utils";
import { type ChartEntry } from "@/components/payoff/BalanceOverTimeChart";
import { usePlannerComputed } from "@/lib/hooks/usePlannerComputed";
import { isActiveDebt } from "@/lib/monthlyFocusDebt";
import {
  IntelligenceOverviewCard,
  ForecastCard,
  StrategyLabCard,
  MethodMatrixCard,
  CashFlowMixCard,
  SmartCalendarCard,
  GuardrailsCard,
  PriorityQueueCard,
  MilestonesCard,
  ExplainableInsightsCard,
} from "@/components/payoff/PlannerIntelligenceCards";

interface PlannerIntelligenceProps {
  debts: Debt[];
  income: Income;
  expenses: Expense[];
  payoffMethod: PayoffMethod;
  planResult: PayoffResult;
  minimumsOnlyResult: PayoffResult;
  availableCashFlow: number;
  effectiveAcceleration: number;
  totalEssential: number;
  totalMinPayments: number;
  balanceChartData: ChartEntry[];
  hasRealSnapshots: boolean;
}

const ACTIONS = [
  "Record latest statement balances",
  "Confirm the next focus debt",
  "Schedule this payday's extra payment",
  "Check the next 14 days of due dates",
  "Review refinance options for high APR debt",
  "Re-run the plan after income or expense changes",
];

export default function PlannerIntelligence({
  debts,
  income,
  expenses,
  payoffMethod,
  planResult,
  minimumsOnlyResult,
  availableCashFlow,
  effectiveAcceleration,
  totalEssential,
  totalMinPayments,
  balanceChartData,
  hasRealSnapshots,
}: PlannerIntelligenceProps) {
  const hasInitialActiveDebts = debts.some(isActiveDebt);
  const [sandboxMethod, setSandboxMethod] =
    useState<PayoffMethod>(payoffMethod);
  const [sandboxExtra, setSandboxExtra] = useState<number>(
    hasInitialActiveDebts ? Math.min(effectiveAcceleration, availableCashFlow) : 0,
  );
  const [actionChecks, setActionChecks] = useState<Record<string, boolean>>({});
  const activeDebts = useMemo(() => debts.filter(isActiveDebt), [debts]);
  const hasActiveDebts = activeDebts.length > 0;

  const recurringTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const runScenario = (
    method: PayoffMethod,
    monthlyTakeHome: number,
    essentials: number,
    extraAccel: number,
  ) => {
    // `essentials` arrives bundled with recurring expenses (totalEssential);
    // the calculators take them separately, so un-bundle before dispatching.
    const adjustedExtra =
      extraAccel - (monthlyTakeHome - essentials - totalMinPayments);
    return calculateResultByMethod(
      activeDebts,
      { monthlyTakeHome, essentialExpenses: essentials - recurringTotal },
      recurringTotal,
      adjustedExtra,
      method,
    );
  };

  const strategyResults = useMemo(
    () => ({
      snowball: runScenario(
        "snowball",
        income.monthlyTakeHome,
        totalEssential,
        sandboxExtra,
      ),
      avalanche: runScenario(
        "avalanche",
        income.monthlyTakeHome,
        totalEssential,
        sandboxExtra,
      ),
      custom: runScenario(
        "custom",
        income.monthlyTakeHome,
        totalEssential,
        sandboxExtra,
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sandboxExtra,
      activeDebts,
      income.monthlyTakeHome,
      totalEssential,
      recurringTotal,
      totalMinPayments,
    ],
  );

  const scenarioResult = strategyResults[sandboxMethod];
  const bestStrategy = (
    Object.entries(strategyResults) as [PayoffMethod, PayoffResult][]
  ).sort((a, b) => a[1].months - b[1].months)[0];
  const strategyMatrix = (
    Object.entries(strategyResults) as [PayoffMethod, PayoffResult][]
  )
    .map(([method, result]) => ({
      method,
      months: result.months,
      totalInterestPaid: result.totalInterestPaid,
      active: method === sandboxMethod,
    }))
    .sort((a, b) => a.months - b.months);

  const computed = usePlannerComputed(
    activeDebts,
    income,
    sandboxMethod,
    scenarioResult,
    minimumsOnlyResult,
    availableCashFlow,
    sandboxExtra,
    balanceChartData,
    hasRealSnapshots,
  );

  const monthlyDebtSpend = totalMinPayments + sandboxExtra;
  const debtCoveragePct =
    income.monthlyTakeHome > 0
      ? (monthlyDebtSpend / income.monthlyTakeHome) * 100
      : 0;
  const nextMilestone = useMemo(() => {
    const upcoming = [...scenarioResult.payoffSchedule]
      .filter((s) => s.monthPaidOff > 0)
      .sort((a, b) => a.monthPaidOff - b.monthPaidOff)[0];
    if (!upcoming)
      return { label: "All debts completed", month: null as number | null };
    return { label: upcoming.debtName, month: upcoming.monthPaidOff };
  }, [scenarioResult.payoffSchedule]);

  const explainableInsights = useMemo(() => {
    const { priorityQueue, leftoverAfterAcceleration, bufferTarget } = computed;
    const insights = [] as { title: string; why: string; impact: string }[];
    if (priorityQueue[0]) {
      const focusDebt = priorityQueue[0];
      const focusSchedule = scenarioResult.payoffSchedule.find(
        (s) => s.debtName === focusDebt.name,
      );
      const focusMonths = focusSchedule?.monthPaidOff ?? scenarioResult.months;
      insights.push({
        title: `Focus ${focusDebt.name} next`,
        why:
          sandboxMethod === "avalanche"
            ? "It has the highest APR, so each payment removes the most expensive interest first."
            : sandboxMethod === "custom"
              ? "It is currently top in your custom priority queue."
              : "It is your smallest balance, which frees up its minimum soonest to roll into the next debt.",
        impact: `Pays off in ${focusMonths}m - frees ${formatCurrency(focusDebt.minimumPayment)}/mo to roll forward`,
      });
    } else {
      insights.push({
        title: "No active focus debt",
        why: "Every tracked debt is at a paid-off balance.",
        impact: "Keep the paid-off accounts recorded and update the plan only if a new balance appears.",
      });
    }
    const interestAvoided = Math.max(
      0,
      minimumsOnlyResult.totalInterestPaid - scenarioResult.totalInterestPaid,
    );
    insights.push({
      title: "Paying above minimums shortens your timeline",
      why: `You are paying ${formatCurrency(sandboxExtra)}/mo above minimums, which reduces principal faster.`,
      impact: `${formatCurrency(interestAvoided)} in interest avoided vs paying minimums only`,
    });
    insights.push({
      title:
        leftoverAfterAcceleration < bufferTarget
          ? "Guardrail warning: low cash buffer"
          : "Cash guardrail is healthy",
      why: `After all debt payments, ${formatCurrency(leftoverAfterAcceleration)} remains vs ${formatCurrency(bufferTarget)} target (10% of income).`,
      impact:
        leftoverAfterAcceleration < bufferTarget
          ? "Consider reducing acceleration to build an emergency reserve."
          : "You can likely sustain this pace.",
    });
    return insights;
  }, [
    computed,
    sandboxMethod,
    scenarioResult.months,
    scenarioResult.payoffSchedule,
    sandboxExtra,
    minimumsOnlyResult.totalInterestPaid,
    scenarioResult.totalInterestPaid,
  ]);

  const { data: savedSettings } = useUserSettings();
  const updatePreferences = useUpdatePreferences();

  useEffect(() => {
    if (!hasActiveDebts) {
      setSandboxExtra(0);
      return;
    }
    const p = savedSettings?.preferences;
    if (!p) return;

    // Auto-reset checklist at the start of a new month so it feels fresh each cycle.
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const savedMonth = (p.actionChecks as Record<string, unknown>)?.__month as string | undefined;
    if (savedMonth && savedMonth !== currentMonth) {
      // New month — clear all checks and write the new month marker
      const reset = { __month: currentMonth } as unknown as Record<string, boolean>;
      setActionChecks(reset);
      updatePreferences.mutate({ actionChecks: reset });
    } else if (p.actionChecks) {
      setActionChecks(p.actionChecks as Record<string, boolean>);
    }

    if (p.sandboxMethod) setSandboxMethod(p.sandboxMethod as PayoffMethod);
    if (p.sandboxExtra != null) setSandboxExtra(p.sandboxExtra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveDebts, savedSettings?.preferences]);

  const handleActionCheck = (action: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const next = { ...actionChecks, [action]: !actionChecks[action], __month: currentMonth } as unknown as Record<string, boolean>;
    setActionChecks(next);
    updatePreferences.mutate({ actionChecks: next });
  };

  const handleSandboxMethod = (method: PayoffMethod) => {
    setSandboxMethod(method);
    updatePreferences.mutate({ sandboxMethod: method });
  };

  const sandboxExtraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSandboxExtra = (value: number) => {
    setSandboxExtra(value);
    if (sandboxExtraTimer.current) clearTimeout(sandboxExtraTimer.current);
    sandboxExtraTimer.current = setTimeout(
      () => updatePreferences.mutate({ sandboxExtra: value }),
      600,
    );
  };

  return (
    <section className="space-y-4">
      <div
        className="rounded-2xl p-5"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} style={{ color: "#2563eb" }} />
          <h2 className="font-semibold text-base" style={{ color: "#0f172a" }}>
            Charts and Payoff Coach
          </h2>
        </div>
        <p className="text-xs" style={{ color: "#64748b" }}>
          Keep the analytical charts, then use the coach reads to decide the
          next payment, guardrail, or balance update.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:auto-rows-fr">
        <IntelligenceOverviewCard
          planResult={scenarioResult}
          minimumsOnlyResult={minimumsOnlyResult}
          effectiveAcceleration={sandboxExtra}
          monthlyDebtSpend={monthlyDebtSpend}
          debtCoveragePct={debtCoveragePct}
          nextDebtLabel={nextMilestone.label}
          nextDebtMonth={nextMilestone.month}
        />
        <ForecastCard
          planResult={scenarioResult}
          planGap={computed.planGap}
          confidencePct={computed.confidencePct}
          confidenceRangeMonths={computed.confidenceRangeMonths}
        />
        <StrategyLabCard
          sandboxMethod={sandboxMethod}
          sandboxExtra={sandboxExtra}
          availableCashFlow={availableCashFlow}
          scenarioResult={scenarioResult}
          bestStrategy={bestStrategy}
          onMethodChange={handleSandboxMethod}
          onExtraChange={handleSandboxExtra}
        />
        <MethodMatrixCard strategyMatrix={strategyMatrix} />
        <CashFlowMixCard
          monthlyTakeHome={income.monthlyTakeHome}
          totalEssential={totalEssential}
          recurringTotal={recurringTotal}
          totalMinPayments={totalMinPayments}
          effectiveAcceleration={sandboxExtra}
          leftoverAfterAcceleration={computed.leftoverAfterAcceleration}
          bufferTarget={computed.bufferTarget}
        />
        <SmartCalendarCard smartCalendar={computed.smartCalendar} />
        <GuardrailsCard
          monthlyInterestLeak={computed.monthlyInterestLeak}
          monthlyInterestAvoided={computed.monthlyInterestAvoided}
          leftoverAfterAcceleration={computed.leftoverAfterAcceleration}
          bufferTarget={computed.bufferTarget}
        />
        <PriorityQueueCard
          priorityQueue={computed.priorityQueue}
          effectiveAcceleration={sandboxExtra}
          actions={ACTIONS}
          actionChecks={actionChecks}
          onActionCheck={handleActionCheck}
        />
        <MilestonesCard
          milestoneData={computed.milestoneData}
          refinanceCandidates={computed.refinanceCandidates}
        />
        <ExplainableInsightsCard insights={explainableInsights} />
      </div>
    </section>
  );
}
