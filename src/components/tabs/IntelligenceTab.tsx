"use client";

import { useMemo } from "react";
import { type Debt, type Income, type Expense } from "@/types";
import { type PayoffMethod } from "@/lib/snowball";
import {
  calculateMinimumsOnlyResult,
  calculatePlanMetrics,
} from "@/lib/payoffPlan";
import { useAllSnapshots } from "@/lib/hooks";
import { useActualBalanceMap } from "@/lib/hooks/useActualBalanceMap";
import PlannerIntelligence from "@/components/payoff/PlannerIntelligence";
import IntelligenceUpgradeTeaser from "@/components/billing/IntelligenceUpgradeTeaser";
import { AprNegotiationCard } from "@/components/AprNegotiationCard";
import { useSubscription } from "@/lib/hooks";
import { type ChartEntry } from "@/components/payoff/BalanceOverTimeChart";

interface IntelligenceTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  pendingExtra?: number | null;
  onConsumePendingExtra?: () => void;
}

export default function IntelligenceTab({
  debts,
  income,
  expenses,
  isLoading,
  pendingExtra,
  onConsumePendingExtra,
}: IntelligenceTabProps) {
  const { data: subData, isLoading: subLoading, refetch: refetchSubscription } = useSubscription();
  const isPro = subData?.proEligible === true;
  const { data: snapshotsData } = useAllSnapshots();

  const payoffMethod =
    ((income?.payoffMethod as PayoffMethod) || "snowball") as PayoffMethod;

  const planMetrics = useMemo(() => {
    if (!income || debts.length === 0) return null;
    return calculatePlanMetrics(debts, income, expenses);
  }, [debts, income, expenses]);

  const planResult = planMetrics?.result ?? null;
  const minimumsOnlyResult = useMemo(
    () => (debts.length > 0 ? calculateMinimumsOnlyResult(debts) : null),
    [debts],
  );

  // Build balance chart data (same logic as PayoffTab)
  const actualBalanceMap = useActualBalanceMap(snapshotsData?.snapshots ?? []);

  const balanceChartData: ChartEntry[] = useMemo(() => {
    if (!planResult) return [];
    const projectedMap = new Map(
      planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]),
    );
    const minimumsMap = new Map(
      (minimumsOnlyResult?.monthlyBalances ?? []).map((mb) => [
        mb.date,
        mb.totalBalance,
      ]),
    );
    const base =
      (minimumsOnlyResult?.months ?? 0) >= planResult.months
        ? minimumsOnlyResult!.monthlyBalances
        : planResult.monthlyBalances;
    const currentTotalDebt = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
    const hasSnapshots = actualBalanceMap.size > 0;
    return base.map((mb, index) => ({
      date: mb.date,
      month: mb.month,
      totalBalance: projectedMap.get(mb.date),
      minimumsBalance: minimumsMap.get(mb.date),
      avalancheBalance: undefined,
      // Month 0 anchored to current total debt when snapshots exist; otherwise
      // leave undefined so planGap stays null (no "$NaN behind" display).
      actualBalance:
        index === 0 && hasSnapshots
          ? (actualBalanceMap.get(mb.date) ?? currentTotalDebt)
          : actualBalanceMap.get(mb.date),
    }));
  }, [planResult, minimumsOnlyResult, actualBalanceMap, debts]);

  const hasRealSnapshots = actualBalanceMap.size > 0;


  if (isLoading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", opacity: 0.4 }}>
        <p style={{ fontSize: "14px" }}>Loading intelligence...</p>
      </div>
    );
  }

  if (!income || debts.length === 0 || !planResult || !minimumsOnlyResult) {
    return (
      <div style={{ padding: "48px", textAlign: "center", opacity: 0.4 }}>
        <p style={{ fontSize: "14px" }}>
          Add your debts and income to unlock intelligence insights.
        </p>
      </div>
    );
  }

  const {
    totalMinPayments,
    availableCashFlow,
    effectiveAcceleration,
    totalEssential,
  } = planMetrics!;

  const interestReclaimed = Math.max(
    0,
    minimumsOnlyResult.totalInterestPaid - planResult.totalInterestPaid,
  );

  return (
    <section id="section-intelligence" className="space-y-6">
      {isPro ? (
        // Pro path — unchanged from the previous ProGate passthrough.
        <>
          <PlannerIntelligence
            debts={debts}
            income={income}
            expenses={expenses}
            payoffMethod={payoffMethod}
            planResult={planResult}
            minimumsOnlyResult={minimumsOnlyResult}
            availableCashFlow={availableCashFlow}
            effectiveAcceleration={effectiveAcceleration}
            totalEssential={totalEssential}
            totalMinPayments={totalMinPayments}
            balanceChartData={balanceChartData}
            hasRealSnapshots={hasRealSnapshots}
            pendingExtra={pendingExtra}
            onConsumePendingExtra={onConsumePendingExtra}
          />
          <AprNegotiationCard />
        </>
      ) : subLoading ? (
        // Subscription not resolved yet — don't flash upsell content to a user
        // who may turn out to be Pro.
        <div style={{ padding: "48px", textAlign: "center", opacity: 0.4 }}>
          <p style={{ fontSize: "14px" }}>Loading intelligence...</p>
        </div>
      ) : subData?.proEligible === false ? (
        // Confirmed Free — show the real-numbers teaser.
        <IntelligenceUpgradeTeaser debts={debts} interestReclaimed={interestReclaimed} />
      ) : (
        // Subscription couldn't be confirmed (query errored). Do NOT assume Free
        // — that would show a Pro user the upgrade wall. Offer a retry instead.
        <div style={{ padding: "48px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "12px" }}>
            We couldn&apos;t confirm your plan just now.
          </p>
          <button
            type="button"
            onClick={() => refetchSubscription()}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
