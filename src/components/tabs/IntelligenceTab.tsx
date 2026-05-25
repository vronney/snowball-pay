'use client';

import { useMemo } from 'react';
import { Debt, Income, Expense } from '@/types';
import { type Tab } from '@/components/dashboard/types';
import {
  calculateMinimumsOnlyResult,
  calculatePlanMetrics,
} from '@/lib/payoffPlan';
import { useAllSnapshots } from '@/lib/hooks';
import { useActualBalanceMap } from '@/lib/hooks/useActualBalanceMap';
import { ChevronRight, Lightbulb } from 'lucide-react';
import PlannerIntelligence from '@/components/payoff/PlannerIntelligence';

interface IntelligenceTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}

export default function IntelligenceTab({ debts, income, expenses, isLoading, onNavigate }: IntelligenceTabProps) {
  const { data: snapshotsData } = useAllSnapshots();
  const actualBalanceMap = useActualBalanceMap(snapshotsData?.snapshots ?? []);

  const planData = useMemo(() => {
    if (!income || debts.length === 0) return null;

    const metrics = calculatePlanMetrics(debts, income, expenses);
    if (!metrics) return null;

    const planResult = metrics.result;
    const minimumsOnlyResult = calculateMinimumsOnlyResult(debts);
    const currentTotalDebt = debts.reduce((s, d) => s + d.balance, 0);
    const projectedBalanceMap = new Map(planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
    const minimumsBalanceMap = new Map(minimumsOnlyResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
    const baseBalances = minimumsOnlyResult.months >= planResult.months
      ? minimumsOnlyResult.monthlyBalances
      : planResult.monthlyBalances;

    const balanceChartData = baseBalances.map((mb, index) => ({
      date: mb.date,
      month: mb.month,
      totalBalance: projectedBalanceMap.get(mb.date),
      minimumsBalance: minimumsBalanceMap.get(mb.date),
      avalancheBalance: undefined as number | undefined,
      actualBalance: index === 0
        ? (actualBalanceMap.get(mb.date) ?? currentTotalDebt)
        : actualBalanceMap.get(mb.date),
    }));

    return {
      planResult,
      minimumsOnlyResult,
      payoffMethod: metrics.method,
      availableCashFlow: metrics.availableCashFlow,
      effectiveAcceleration: metrics.effectiveAcceleration,
      totalEssential: metrics.totalEssential,
      totalMinPayments: metrics.totalMinPayments,
      balanceChartData,
      hasRealSnapshots: actualBalanceMap.size > 0,
    };
  }, [debts, income, expenses, actualBalanceMap]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[180, 120, 260].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: '16px', background: '#f1f5f9', animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  if (!income || debts.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}
      >
        <Lightbulb size={36} style={{ color: '#2563eb', margin: '0 auto 12px' }} />
        <p className="font-semibold text-base mb-2" style={{ color: '#0f172a' }}>
          Unlock Planner Intelligence
        </p>
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>
          Add your debts and income to get strategy comparisons, cash flow insights, and what-if scenarios tailored to your plan.
        </p>
        <button
          onClick={() => onNavigate('debts')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: '#2563eb', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Add My First Debt <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="text-center py-12 opacity-40">
        <p className="text-sm">Unable to calculate plan data.</p>
      </div>
    );
  }

  return (
    <PlannerIntelligence
      debts={debts}
      income={income}
      expenses={expenses}
      payoffMethod={planData.payoffMethod}
      planResult={planData.planResult}
      minimumsOnlyResult={planData.minimumsOnlyResult}
      availableCashFlow={planData.availableCashFlow}
      effectiveAcceleration={planData.effectiveAcceleration}
      totalEssential={planData.totalEssential}
      totalMinPayments={planData.totalMinPayments}
      balanceChartData={planData.balanceChartData}
      hasRealSnapshots={planData.hasRealSnapshots}
    />
  );
}
