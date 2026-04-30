"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useUserSettings, useUpdatePreferences } from "@/lib/hooks";
import { Sparkles } from "lucide-react";
import { type Debt, type Income, type Expense } from "@/types";
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
  type PayoffResult,
} from "@/lib/snowball";
import { formatCurrency } from "@/lib/utils";
import { type ChartEntry } from "@/components/payoff/BalanceOverTimeChart";
import { usePlannerComputed } from "@/lib/hooks/usePlannerComputed";
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
  "Review next 14 days due dates",
  "Apply this month extra payment",
  "Check refinance opportunities",
  "Confirm strategy and shock mode",
  "Schedule weekly plan review",
  "Record latest statement balances",
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
  const [sandboxMethod, setSandboxMethod] =
    useState<PayoffMethod>(payoffMethod);
  const [sandboxExtra, setSandboxExtra] = useState<number>(
    Math.min(effectiveAcceleration, availableCashFlow),
  );
  const [actionChecks, setActionChecks] = useState<Record<string, boolean>>({});

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
    const adjustedExtra =
      extraAccel - (monthlyTakeHome - essentials - totalMinPayments);
    const essentialsOnly = essentials - recurringTotal;
    if (method === "avalanche")
      return calculateDebtAvalanche(
        debts,
        monthlyTakeHome,
        essentialsOnly,
        recurringTotal,
        adjustedExtra,
      );
    if (method === "custom")
      return calculateDebtCustom(
        debts,
        monthlyTakeHome,
        essentialsOnly,
        recurringTotal,
        adjustedExtra,
      );
    return calculateDebtSnowball(
      debts,
      monthlyTakeHome,
      essentialsOnly,
      recurringTotal,
      adjustedExtra,
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
      debts,
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
    debts,
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
    const p = savedSettings?.preferences;
    if (!p) return;
    if (p.actionChecks) setActionChecks(p.actionChecks);
    if (p.sandboxMethod) setSandboxMethod(p.sandboxMethod as PayoffMethod);
    if (p.sandboxExtra != null) setSandboxExtra(p.sandboxExtra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSettings?.preferences]);

  const handleActionCheck = (action: string) => {
    const next = { ...actionChecks, [action]: !actionChecks[action] };
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
            Planner Intelligence
          </h2>
        </div>
        <p className="text-xs" style={{ color: "#64748b" }}>
          Forecast, compare strategies, and run an execution playbook from one
          planning workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
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
