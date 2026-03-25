'use client';

import { type Income } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet } from 'lucide-react';

interface CashFlowOverviewProps {
  income: Income;
  recurringTotal: number;
  totalMinPayments: number;
  availableCashFlow: number;
  effectiveAcceleration: number;
  saveIsPending: boolean;
  saveIsSuccess: boolean;
  onAccelerationChange: (amount: number) => void;
}

export default function CashFlowOverview({
  income,
  recurringTotal,
  totalMinPayments,
  availableCashFlow,
  effectiveAcceleration,
  saveIsPending,
  saveIsSuccess,
  onAccelerationChange,
}: CashFlowOverviewProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <Wallet size={18} style={{ color: '#2563eb' }} />
        Your Monthly Cash Flow
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span style={{ color: '#64748b' }}>Monthly Take-Home</span>
          <span className="mono font-semibold">{formatCurrency(income.monthlyTakeHome)}</span>
        </div>
        <div className="flex items-center justify-between" style={{ color: '#64748b' }}>
          <span className="ml-2">− Essential Expenses</span>
          <span className="mono">{formatCurrency(income.essentialExpenses)}</span>
        </div>
        <div className="flex items-center justify-between" style={{ color: '#64748b' }}>
          <span className="ml-2">− Recurring Expenses</span>
          <span className="mono">{formatCurrency(recurringTotal)}</span>
        </div>
        <div className="flex items-center justify-between" style={{ color: '#64748b' }}>
          <span className="ml-2">− Minimum Debt Payments</span>
          <span className="mono">{formatCurrency(totalMinPayments)}</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{ background: 'rgba(37,99,235,0.08)' }}>
          <span style={{ color: '#334155' }}>
            <strong>Available for Acceleration</strong>
          </span>
          <span className="mono font-bold" style={{ color: '#2563eb' }}>
            {formatCurrency(availableCashFlow)}
          </span>
        </div>
        {availableCashFlow > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: '#64748b' }}>Apply to Acceleration</span>
              <div className="flex items-center gap-2">
                {saveIsPending && (
                  <span style={{ fontSize: '10px', color: '#64748b' }}>saving…</span>
                )}
                {saveIsSuccess && !saveIsPending && (
                  <span style={{ fontSize: '10px', color: '#22c55e' }}>saved</span>
                )}
                <span className="mono text-sm font-bold" style={{ color: effectiveAcceleration > 0 ? '#2563eb' : '#94a3b8' }}>
                  {formatCurrency(effectiveAcceleration)}
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={availableCashFlow}
              step={50}
              value={effectiveAcceleration}
              onChange={(e) => onAccelerationChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <div className="flex justify-between mt-1" style={{ fontSize: '11px', color: '#94a3b8' }}>
              <span>$0</span>
              <span>{formatCurrency(availableCashFlow)} max</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
