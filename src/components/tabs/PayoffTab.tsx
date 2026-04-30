"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Debt, Income, Expense } from "@/types";
import { type Tab } from "@/components/dashboard/types";
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
  type PayoffResult,
} from "@/lib/snowball";
import { useUpdateDebt, useAllSnapshots, useSaveIncome } from "@/lib/hooks";
import { useActualBalanceMap } from "@/lib/hooks/useActualBalanceMap";
import { ChevronRight, CalendarCheck } from "lucide-react";
import { track, Events } from "@/lib/analytics";
import ShareDebtFreeCard from "@/components/dashboard/ShareDebtFreeCard";
import AiRecommendations from "@/components/AiRecommendations";
import StrategySelector from "@/components/payoff/StrategySelector";
import CustomPriorityEditor from "@/components/payoff/CustomPriorityEditor";
import CashFlowOverview from "@/components/payoff/CashFlowOverview";
import PayoffSummary from "@/components/payoff/PayoffSummary";
import BalanceOverTimeChart from "@/components/payoff/BalanceOverTimeChart";
import PayoffTimeline from "@/components/payoff/PayoffTimeline";
import PayoffOrderList from "@/components/payoff/PayoffOrderList";
import FocusDebtExplainer from "@/components/payoff/FocusDebtExplainer";
import StrategyExplanation from "@/components/payoff/StrategyExplanation";
import ReferralPrompt from "@/components/payoff/ReferralPrompt";
import WhatIfCard from "@/components/payoff/WhatIfCard";

interface PayoffTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}

export default function PayoffTab({
  debts,
  income,
  expenses,
  isLoading,
  onNavigate,
}: PayoffTabProps) {
  // Lazy initializers read from income when it's already cached (e.g. returning
  // to this tab). This prevents the auto-save effect from firing with stale
  // initial-state values on remount and overwriting what was just loaded.
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [payoffMethod, setPayoffMethod] = useState<PayoffMethod>(
    () => (income?.payoffMethod as PayoffMethod) || "snowball",
  );
  const [accelerationAmount, setAccelerationAmount] = useState<number | null>(
    () => income?.accelerationAmount ?? null,
  );
  const updateDebt = useUpdateDebt();
  const saveIncome = useSaveIncome();
  // Tracks what was last loaded from DB — prevents the initial sync from
  // triggering an unnecessary save.  Seeded on mount with the same values as
  // the lazy state initializers so the guard is pre-populated when income is
  // already in the React Query cache (e.g. returning to this tab).
  const lastLoadedRef = useRef<{ method: PayoffMethod; accel: number | null }>({
    method: (income?.payoffMethod as PayoffMethod) || "snowball",
    accel: income?.accelerationAmount ?? null,
  });
  const { data: snapshotsData } = useAllSnapshots();

  // Fire plan_generated once per session when a valid plan first appears.
  const planTrackedRef = useRef(false);

  // Sync payoff preferences from DB when income record first loads.
  useEffect(() => {
    if (!income) return;
    const method = (income.payoffMethod as PayoffMethod) || "snowball";
    const accel = income.accelerationAmount ?? null;
    lastLoadedRef.current = { method, accel };
    setPayoffMethod(method);
    setAccelerationAmount(accel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income?.id]);

  // Auto-save whenever the user changes method or slider amount — debounced 600 ms.
  // Uses income from the effect closure so values are always current; the guard
  // against lastLoadedRef ensures we never save back values we just loaded.
  useEffect(() => {
    if (!income) return;
    const last = lastLoadedRef.current;
    if (last.method === payoffMethod && last.accel === accelerationAmount)
      return;
    const tid = setTimeout(() => {
      lastLoadedRef.current = {
        method: payoffMethod,
        accel: accelerationAmount,
      };
      saveIncome.mutate({
        monthlyTakeHome: income.monthlyTakeHome,
        essentialExpenses: income.essentialExpenses,
        extraPayment: income.extraPayment,
        payoffMethod,
        accelerationAmount,
      });
    }, 600);
    return () => clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoffMethod, accelerationAmount, income]);

  const actualBalanceMap = useActualBalanceMap(snapshotsData?.snapshots ?? []);

  const planResult = useMemo<PayoffResult | null>(() => {
    if (!debts.length || !income) return null;
    const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const totalEss = income.essentialExpenses + recurringTotal;
    const maxAcceleration = Math.max(
      0,
      income.monthlyTakeHome - totalEss - totalMin + (income.extraPayment ?? 0),
    );
    const targetAcceleration =
      accelerationAmount !== null
        ? Math.min(accelerationAmount, maxAcceleration)
        : maxAcceleration;
    const adjustedExtra =
      targetAcceleration - (income.monthlyTakeHome - totalEss - totalMin);
    return payoffMethod === "avalanche"
      ? calculateDebtAvalanche(
          debts,
          income.monthlyTakeHome,
          income.essentialExpenses,
          recurringTotal,
          adjustedExtra,
        )
      : payoffMethod === "custom"
        ? calculateDebtCustom(
            debts,
            income.monthlyTakeHome,
            income.essentialExpenses,
            recurringTotal,
            adjustedExtra,
          )
        : calculateDebtSnowball(
            debts,
            income.monthlyTakeHome,
            income.essentialExpenses,
            recurringTotal,
            adjustedExtra,
          );
  }, [debts, income, expenses, payoffMethod, accelerationAmount]);

  // Track plan_generated once per session when planResult first resolves.
  useEffect(() => {
    if (!planResult || planTrackedRef.current) return;
    planTrackedRef.current = true;
    track(Events.PLAN_GENERATED, {
      method: payoffMethod,
      debt_count: debts.length,
      months: planResult.months,
    });
  }, [planResult, payoffMethod, debts.length]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[180, 120, 260].map((h, i) => (
          <div
            key={i}
            style={{
              height: h,
              borderRadius: "16px",
              background: "#f1f5f9",
              animation: "pulse 1.8s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (!income || debts.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <CalendarCheck
          size={36}
          style={{ color: "#2563eb", margin: "0 auto 12px" }}
        />
        <p
          className="font-semibold text-base mb-2"
          style={{ color: "#0f172a" }}
        >
          Your payoff plan is waiting
        </p>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>
          Add at least one debt and your income to generate a month-by-month
          payoff schedule with an exact debt-free date.
        </p>
        <button
          onClick={() => onNavigate("debts")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Add My First Debt <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalEssential = income.essentialExpenses + recurringTotal;
  const availableCashFlow = Math.max(
    0,
    income.monthlyTakeHome -
      totalEssential -
      totalMinPayments +
      income.extraPayment,
  );
  const effectiveAcceleration =
    accelerationAmount !== null
      ? Math.min(accelerationAmount, availableCashFlow)
      : availableCashFlow;
  const monthlyPayment = totalMinPayments + effectiveAcceleration;
  // Extra payment relative to natural surplus — passed to WhatIfCard for +$50/+$100 scenarios
  const adjustedExtra =
    effectiveAcceleration -
    (income.monthlyTakeHome - totalEssential - totalMinPayments);

  if (!planResult) {
    return (
      <div className="text-center py-12 opacity-40">
        <p className="text-sm">Unable to calculate payoff plan</p>
      </div>
    );
  }

  const years = Math.floor(planResult.months / 12);
  const months = planResult.months % 12;
  const timeStr = years > 0 ? `${years}y ${months}m` : `${months}m`;
  const minimumsOnlyResult = calculateDebtSnowball(
    debts,
    totalMinPayments,
    0,
    0,
    0,
  );
  const interestSavedVsMinimums = Math.max(
    0,
    minimumsOnlyResult.totalInterestPaid - planResult.totalInterestPaid,
  );
  const showMinimumsLine = effectiveAcceleration > 0;
  const projectedBalanceMap = new Map(
    planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]),
  );
  const minimumsBalanceMap = new Map(
    minimumsOnlyResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]),
  );

  // Compute the comparison strategy result for the overlay line.
  // When the user is on snowball, show avalanche as the comparison (and vice versa).
  // Custom uses avalanche as comparison since it has no natural counterpart.
  const comparisonResult =
    payoffMethod === "avalanche"
      ? calculateDebtSnowball(
          debts,
          income.monthlyTakeHome,
          income.essentialExpenses,
          recurringTotal,
          adjustedExtra,
        )
      : calculateDebtAvalanche(
          debts,
          income.monthlyTakeHome,
          income.essentialExpenses,
          recurringTotal,
          adjustedExtra,
        );
  const avalancheBalanceMap = new Map(
    comparisonResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]),
  );
  const showAvalancheLine = payoffMethod !== "custom";

  const baseBalances =
    minimumsOnlyResult.months >= planResult.months
      ? minimumsOnlyResult.monthlyBalances
      : comparisonResult.months >= planResult.months
        ? comparisonResult.monthlyBalances
        : planResult.monthlyBalances;
  const priorityEditorDebts = [...debts].sort((a, b) => {
    const aPriority = a.priorityOrder ?? Number.MAX_SAFE_INTEGER;
    const bPriority = b.priorityOrder ?? Number.MAX_SAFE_INTEGER;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.balance - b.balance;
  });
  const hasAnyCustomPriority = debts.some((debt) => debt.priorityOrder != null);
  const currentTotalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const hasRealSnapshots = actualBalanceMap.size > 0;
  const balanceChartData = baseBalances.map((mb, index) => ({
    date: mb.date,
    month: mb.month,
    totalBalance: projectedBalanceMap.get(mb.date),
    minimumsBalance: minimumsBalanceMap.get(mb.date),
    avalancheBalance: avalancheBalanceMap.get(mb.date),
    // Month 0 is always anchored to current total debt so all three lines share
    // the same starting point. Subsequent months use recorded snapshot data.
    actualBalance:
      index === 0
        ? (actualBalanceMap.get(mb.date) ?? currentTotalDebt)
        : actualBalanceMap.get(mb.date),
  }));
  const timelineData = [...planResult.payoffSchedule]
    .sort((a, b) => a.monthPaidOff - b.monthPaidOff)
    .map((item) => ({
      debtName: item.debtName,
      monthPaidOff: item.monthPaidOff,
      category: item.category,
    }));
  const strategyName =
    payoffMethod === "snowball"
      ? "Snowball"
      : payoffMethod === "avalanche"
        ? "Avalanche"
        : "Custom";
  const payoffOrderLabel =
    payoffMethod === "snowball"
      ? "Payoff Order (Smallest Balance First)"
      : payoffMethod === "avalanche"
        ? "Payoff Order (Highest APR First)"
        : "Payoff Order (Custom Priority)";

  const handlePriorityChange = async (debtId: string, nextValue: string) => {
    const parsedPriority = nextValue === "" ? null : parseInt(nextValue, 10);
    await updateDebt.mutateAsync({
      id: debtId,
      updates: { priorityOrder: parsedPriority },
    });
  };

  const handleResetPriorities = async () => {
    const debtsWithPriority = debts.filter(
      (debt) => debt.priorityOrder != null,
    );
    await Promise.all(
      debtsWithPriority.map((debt) =>
        updateDebt.mutateAsync({
          id: debt.id,
          updates: { priorityOrder: null },
        }),
      ),
    );
  };

  return (
    <section id="section-plan" className="space-y-6">
      <StrategySelector
        payoffMethod={payoffMethod}
        onMethodChange={setPayoffMethod}
      />

      {payoffMethod === "custom" && (
        <CustomPriorityEditor
          debts={debts}
          priorityEditorDebts={priorityEditorDebts}
          priorityOpen={priorityOpen}
          hasAnyCustomPriority={hasAnyCustomPriority}
          isPending={updateDebt.isPending}
          onToggle={() => setPriorityOpen((v) => !v)}
          onPriorityChange={(debtId, value) =>
            void handlePriorityChange(debtId, value)
          }
          onResetPriorities={() => void handleResetPriorities()}
        />
      )}

      <CashFlowOverview
        income={income}
        recurringTotal={recurringTotal}
        totalMinPayments={totalMinPayments}
        availableCashFlow={availableCashFlow}
        effectiveAcceleration={effectiveAcceleration}
        saveIsPending={saveIncome.isPending}
        saveIsSuccess={saveIncome.isSuccess}
        onAccelerationChange={setAccelerationAmount}
      />

      <WhatIfCard
        debts={debts}
        income={income}
        expenses={expenses}
        adjustedExtra={adjustedExtra}
        currentMonths={planResult.months}
        currentInterestPaid={planResult.totalInterestPaid}
        payoffMethod={payoffMethod}
        effectiveAcceleration={effectiveAcceleration}
        availableCashFlow={availableCashFlow}
        onAccelerationChange={setAccelerationAmount}
      />

      <PayoffSummary
        planResult={planResult}
        strategyName={strategyName}
        timeStr={timeStr}
        monthlyPayment={monthlyPayment}
        interestSavedVsMinimums={interestSavedVsMinimums}
        availableCashFlow={availableCashFlow}
      />

      <BalanceOverTimeChart
        data={balanceChartData}
        effectiveAcceleration={effectiveAcceleration}
        showMinimumsLine={showMinimumsLine}
        hasRealSnapshots={hasRealSnapshots}
        showAvalancheLine={showAvalancheLine}
        totalPlanMonths={planResult.months}
        strategyLabel={strategyName}
        comparisonLabel={
          payoffMethod === "avalanche" ? "Snowball" : "Avalanche"
        }
      />

      <PayoffTimeline data={timelineData} />

      <FocusDebtExplainer
        payoffSchedule={planResult.payoffSchedule}
        debts={debts}
        payoffMethod={payoffMethod}
        onLogPayment={() => onNavigate("debts")}
      />

      <PayoffOrderList
        payoffSchedule={planResult.payoffSchedule}
        payoffOrderLabel={payoffOrderLabel}
      />

      <AiRecommendations
        debts={debts}
        income={income}
        expenses={expenses}
        availableCashFlow={effectiveAcceleration}
        planMonths={planResult.months}
        totalInterestPaid={planResult.totalInterestPaid}
        onAccelerationChange={setAccelerationAmount}
      />

      <StrategyExplanation payoffMethod={payoffMethod} />

      <ReferralPrompt />

      {/* Share card trigger */}
      <div style={{ textAlign: "center", paddingBottom: "8px" }}>
        <button
          onClick={() => {
            track(Events.SHARE_CARD_OPENED);
            setShareCardOpen(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 22px",
            borderRadius: "10px",
            cursor: "pointer",
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.2)",
            color: "#2563eb",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          🎯 Share my debt-free date
        </button>
      </div>

      {shareCardOpen && (
        <ShareDebtFreeCard
          debtFreeDate={planResult.debtFreeDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
          interestSaved={Math.round(interestSavedVsMinimums)}
          totalDebt={currentTotalDebt}
          monthsRemaining={planResult.months}
          onClose={() => setShareCardOpen(false)}
        />
      )}
    </section>
  );
}
