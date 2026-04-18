'use client';

import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { type Debt, type Income, type Expense } from '@/types';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
} from '@/lib/snowball';
import { formatCurrency } from '@/lib/utils';

interface WhatIfCardProps {
  debts: Debt[];
  income: Income;
  expenses: Expense[];
  adjustedExtra: number;
  currentMonths: number;
  currentInterestPaid: number;
  payoffMethod: PayoffMethod;
}

function calcScenario(
  debts: Debt[],
  income: Income,
  recurringTotal: number,
  adjustedExtra: number,
  method: PayoffMethod,
) {
  if (method === 'avalanche') {
    return calculateDebtAvalanche(
      debts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      adjustedExtra,
    );
  }

  if (method === 'custom') {
    return calculateDebtCustom(
      debts,
      income.monthlyTakeHome,
      income.essentialExpenses,
      recurringTotal,
      adjustedExtra,
    );
  }

  return calculateDebtSnowball(
    debts,
    income.monthlyTakeHome,
    income.essentialExpenses,
    recurringTotal,
    adjustedExtra,
  );
}

export default function WhatIfCard({
  debts,
  income,
  expenses,
  adjustedExtra,
  currentMonths,
  currentInterestPaid,
  payoffMethod,
}: WhatIfCardProps) {
  const recurringTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const scenario50 = useMemo(
    () => calcScenario(debts, income, recurringTotal, adjustedExtra + 50, payoffMethod),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debts, income, recurringTotal, adjustedExtra, payoffMethod],
  );

  const scenario100 = useMemo(
    () => calcScenario(debts, income, recurringTotal, adjustedExtra + 100, payoffMethod),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debts, income, recurringTotal, adjustedExtra, payoffMethod],
  );

  const saved50months = currentMonths - scenario50.months;
  const saved50interest = Math.max(0, currentInterestPaid - scenario50.totalInterestPaid);
  const saved100months = currentMonths - scenario100.months;
  const saved100interest = Math.max(0, currentInterestPaid - scenario100.totalInterestPaid);

  if (saved50months <= 0 && saved100months <= 0) return null;

  const fmtMonths = (n: number) => {
    if (n <= 0) return 'no change';
    const y = Math.floor(n / 12);
    const m = n % 12;
    if (y > 0 && m > 0) return `${y}y ${m}m sooner`;
    if (y > 0) return `${y} yr${y > 1 ? 's' : ''} sooner`;
    return `${m} mo${m > 1 ? 's' : ''} sooner`;
  };

  const scenarios = [
    { label: '+$50/mo', months: saved50months, interest: saved50interest },
    { label: '+$100/mo', months: saved100months, interest: saved100interest },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
    >
      <h2 className="font-semibold text-base mb-1 flex items-center gap-2">
        <Zap size={16} style={{ color: '#f59e0b' }} />
        What If You Paid a Little More?
      </h2>
      <p className="text-xs mb-4" style={{ color: '#64748b' }}>
        See how a small boost to your monthly payment changes your payoff timeline and total interest.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {scenarios.map(({ label, months, interest }) => (
          <div
            key={label}
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.18)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#b45309', marginBottom: '10px' }}>{label} extra</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '1px' }}>Payoff</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: months > 0 ? '#059669' : '#94a3b8' }}>
                  {fmtMonths(months)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '1px' }}>Interest saved</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: interest > 0 ? '#059669' : '#94a3b8' }}>
                  {interest > 0 ? formatCurrency(Math.round(interest)) : '—'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
