'use client';

import { useMemo } from 'react';
import { Debt, Income, Expense } from '@/types';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
  type PayoffResult,
} from '@/lib/snowball';
import { useAllSnapshots } from '@/lib/hooks';
import { Inbox } from 'lucide-react';
import PlannerIntelligence from '@/components/payoff/PlannerIntelligence';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface IntelligenceTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
}

export default function IntelligenceTab({ debts, income, expenses, isLoading }: IntelligenceTabProps) {
  const { data: snapshotsData } = useAllSnapshots();

  const actualBalanceMap = useMemo(() => {
    const snapshots = snapshotsData?.snapshots ?? [];
    if (snapshots.length === 0) return new Map<string, number>();

    const byDebt = new Map<string, { ym: string; balance: number }[]>();
    for (const s of snapshots) {
      const ym = s.recordedAt.slice(0, 7);
      if (!byDebt.has(s.debtId)) byDebt.set(s.debtId, []);
      byDebt.get(s.debtId)!.push({ ym, balance: s.balance });
    }
    for (const arr of byDebt.values()) arr.sort((a, b) => a.ym.localeCompare(b.ym));

    const allYMs = [...new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)))].sort();
    const map = new Map<string, number>();
    for (const ym of allYMs) {
      const [year, month] = ym.split('-').map(Number);
      const label = `${MONTHS[month - 1]} ${year}`;
      let total = 0;
      for (const arr of byDebt.values()) {
        if (arr[0].ym > ym) continue;
        let bal = arr[0].balance;
        for (const { ym: sym, balance } of arr) {
          if (sym <= ym) bal = balance;
          else break;
        }
        total += bal;
      }
      map.set(label, total);
    }
    return map;
  }, [snapshotsData?.snapshots]);

  const planData = useMemo(() => {
    if (!income || debts.length === 0) return null;

    const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const totalEssential = income.essentialExpenses + recurringTotal;
    const availableCashFlow = Math.max(0, income.monthlyTakeHome - totalEssential - totalMinPayments + income.extraPayment);
    const effectiveAcceleration = income.accelerationAmount != null
      ? Math.min(income.accelerationAmount, availableCashFlow)
      : availableCashFlow;
    const adjustedExtra = effectiveAcceleration - (income.monthlyTakeHome - totalEssential - totalMinPayments);
    const payoffMethod = (income.payoffMethod as PayoffMethod) || 'snowball';

    const planResult: PayoffResult = payoffMethod === 'avalanche'
      ? calculateDebtAvalanche(debts, income.monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra)
      : payoffMethod === 'custom'
      ? calculateDebtCustom(debts, income.monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra)
      : calculateDebtSnowball(debts, income.monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra);

    const minimumsOnlyResult = calculateDebtSnowball(debts, totalMinPayments, 0, 0, 0);
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
      payoffMethod,
      availableCashFlow,
      effectiveAcceleration,
      totalEssential,
      totalMinPayments,
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
      <div className="text-center py-16 opacity-40">
        <Inbox size={48} className="mx-auto mb-3" />
        <p className="text-sm">Add your debts and budget info to unlock Planner Intelligence.</p>
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
