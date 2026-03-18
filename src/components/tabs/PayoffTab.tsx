'use client';

import { useState, useEffect } from 'react';
import { useCalculatePayoffPlan } from '@/lib/hooks';
import { Debt, Income, Expense } from '@/types';
import { calculateDebtSnowball } from '@/lib/snowball';
import { Wallet, Zap, ListOrdered, Info, BarChart3, Inbox } from 'lucide-react';
import { formatCurrency, getCategoryColor, formatDate } from '@/lib/utils';

interface PayoffTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
}

export default function PayoffTab({ debts, income, expenses, isLoading }: PayoffTabProps) {
  const [payoffMethod, setPayoffMethod] = useState<'snowball' | 'avalanche'>('snowball');
  const calculatePlan = useCalculatePayoffPlan();
  const [planResult, setPlanResult] = useState<any>(null);

  useEffect(() => {
    if (debts.length > 0 && income) {
      const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
      const result = calculateDebtSnowball(
        debts,
        income.monthlyTakeHome,
        income.essentialExpenses,
        recurringTotal,
        income.extraPayment
      );
      setPlanResult(result);
    }
  }, [debts, income, expenses, payoffMethod]);

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!income || debts.length === 0) {
    return (
      <section id="section-plan" className="hidden">
        <div id="plan-empty" className="text-center py-16 opacity-40">
          <Inbox size={48} className="mx-auto mb-3" />
          <p className="text-sm">Add your debts and budget info to generate a payoff plan.</p>
        </div>
      </section>
    );
  }

  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalEssential = income.essentialExpenses + recurringTotal;
  const availableCashFlow = Math.max(0, income.monthlyTakeHome - totalEssential - totalMinPayments + income.extraPayment);
  const monthlyPayment = totalMinPayments + availableCashFlow;

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

  return (
    <section id="section-plan" className="space-y-6">
      {/* Cash Flow Overview */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(26,35,50,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Wallet size={18} style={{ color: '#3b82f6' }} />
          Your Monthly Cash Flow
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="opacity-60">Monthly Take-Home</span>
            <span className="mono font-semibold">{formatCurrency(income.monthlyTakeHome)}</span>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <span className="opacity-60 ml-2">− Essential Expenses</span>
            <span className="mono">{formatCurrency(income.essentialExpenses)}</span>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <span className="opacity-60 ml-2">− Recurring Expenses</span>
            <span className="mono">{formatCurrency(recurringTotal)}</span>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <span className="opacity-60 ml-2">− Minimum Debt Payments</span>
            <span className="mono">{formatCurrency(totalMinPayments)}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <span className="opacity-80">
              <strong>Available for Acceleration</strong>
            </span>
            <span className="mono font-bold" style={{ color: '#3b82f6' }}>
              {formatCurrency(availableCashFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* Payoff Overview */}
      <div className="rounded-2xl p-5 snowball-glow" style={{ background: 'rgba(26,35,50,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Zap size={18} style={{ color: '#3b82f6' }} />
          Snowball Payoff Plan
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-xs opacity-50 mb-1">Debt-Free In</div>
            <div className="mono font-bold text-lg" style={{ color: '#3b82f6' }}>
              {planResult.months >= 360 ? '30+ years' : timeStr}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">Total Interest Paid</div>
            <div className="mono font-bold text-lg" style={{ color: '#ef4444' }}>
              {formatCurrency(planResult.totalInterestPaid)}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">Total Amount Paid</div>
            <div className="mono font-bold text-lg">{formatCurrency(planResult.totalAmountPaid)}</div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">Monthly Snowball</div>
            <div className="mono font-bold text-lg">{formatCurrency(monthlyPayment)}</div>
          </div>
        </div>
        {availableCashFlow === 0 && (
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: '#78350f33', color: '#fbbf24' }}>
            Note: No cash flow available after expenses. Reduce recurring costs or increase income to accelerate payoff.
          </div>
        )}
      </div>

      {/* Payoff Order */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(26,35,50,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <ListOrdered size={18} style={{ color: '#3b82f6' }} />
          Payoff Order (Smallest Balance First)
        </h2>
        <div className="space-y-3">
          {planResult.payoffSchedule.map((item: any, i: number) => {
            const debt = debts.find((d) => d.name === item.debtName);
            const categoryColor = getCategoryColor(item.category);
            const yPO = Math.floor(item.monthPaidOff / 12);
            const mPO = item.monthPaidOff % 12;
            const poStr = item.monthPaidOff > 0 ? (yPO > 0 ? `${yPO}y ${mPO}m` : `${mPO}m`) : 'N/A';

            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${categoryColor}22`, color: categoryColor }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{item.debtName}</span>
                    <span className="mono text-xs opacity-60">{formatCurrency(item.originalBalance)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full progress-bar" style={{ width: '100%', background: categoryColor }} />
                  </div>
                  <div className="text-xs opacity-50 mt-1">
                    Paid off in <span className="font-semibold" style={{ color: categoryColor }}>
                      {poStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategy Explanation */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(26,35,50,1)' }}>
        <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
          <Info size={18} style={{ color: '#3b82f6' }} />
          How the Debt Snowball Works
        </h2>
        <ol className="text-sm opacity-70 space-y-2 pl-5 list-decimal">
          <li>Pay minimums on all debts except the <strong>smallest balance</strong>.</li>
          <li>Attack the smallest debt with all available cash flow above minimums.</li>
          <li>Once it&apos;s paid off, roll its minimum payment into the next smallest debt.</li>
          <li>Repeat — your monthly &quot;snowball&quot; grows bigger with each debt eliminated!</li>
        </ol>
      </div>
    </section>
  );
}
