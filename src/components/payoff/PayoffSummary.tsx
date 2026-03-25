'use client';

import { type PayoffResult } from '@/lib/snowball';
import { formatCurrency } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface PayoffSummaryProps {
  planResult: PayoffResult;
  strategyName: string;
  timeStr: string;
  monthlyPayment: number;
  interestSavedVsMinimums: number;
  availableCashFlow: number;
}

export default function PayoffSummary({
  planResult,
  strategyName,
  timeStr,
  monthlyPayment,
  interestSavedVsMinimums,
  availableCashFlow,
}: PayoffSummaryProps) {
  return (
    <div className="rounded-2xl p-5 snowball-glow" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'rgba(15, 23, 42, 0.06) 0px 1px 4px' }}>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <Zap size={18} style={{ color: '#3b82f6' }} />
        {strategyName} Payoff Plan
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>Debt-Free In</div>
          <div className="mono font-bold text-lg" style={{ color: '#3b82f6' }}>
            {planResult.months >= 360 ? '30+ years' : timeStr}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>Total Interest Paid</div>
          <div className="mono font-bold text-lg" style={{ color: '#ef4444' }}>
            {formatCurrency(planResult.totalInterestPaid)}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>Total Amount Paid</div>
          <div className="mono font-bold text-lg">{formatCurrency(planResult.totalAmountPaid)}</div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>Monthly {strategyName}</div>
          <div className="mono font-bold text-lg">{formatCurrency(monthlyPayment)}</div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>Interest Saved vs Minimums</div>
          <div className="mono font-bold text-lg" style={{ color: '#22c55e' }}>
            {formatCurrency(interestSavedVsMinimums)}
          </div>
        </div>
      </div>
      {availableCashFlow === 0 && (
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', color: '#92400e' }}>
          Note: No cash flow available after expenses. Reduce recurring costs or increase income to accelerate payoff.
        </div>
      )}
    </div>
  );
}
