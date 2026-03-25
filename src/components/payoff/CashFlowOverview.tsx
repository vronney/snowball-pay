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
    <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
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
        {availableCashFlow > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs opacity-60">Apply to Acceleration</span>
              <div className="flex items-center gap-2">
                {saveIsPending && (
                  <span style={{ fontSize: '10px', color: '#64748b' }}>saving…</span>
                )}
                {saveIsSuccess && !saveIsPending && (
                  <span style={{ fontSize: '10px', color: '#22c55e' }}>saved</span>
                )}
                <span className="mono text-sm font-bold" style={{ color: effectiveAcceleration > 0 ? '#3b82f6' : 'rgba(255,255,255,0.4)' }}>
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
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <div className="flex justify-between mt-1" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              <span>$0</span>
              <span>{formatCurrency(availableCashFlow)} max</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
