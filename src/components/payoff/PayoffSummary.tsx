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
  const isComplete = planResult.payoffSchedule.length === 0 && planResult.months === 0;
  const coachTone = isComplete
    ? '#047857'
    : availableCashFlow === 0
      ? '#92400e'
      : '#047857';
  const coachBg =
    !isComplete && availableCashFlow === 0 ? 'rgba(245,158,11,0.12)' : 'rgba(5,150,105,0.08)';
  const coachBorder =
    !isComplete && availableCashFlow === 0 ? 'rgba(245,158,11,0.28)' : 'rgba(5,150,105,0.18)';
  const coachTitle =
    isComplete
      ? 'All active debts are paid off'
      : availableCashFlow === 0
      ? 'Pause speed until monthly room opens up'
      : `${strategyName} gives this plan a clear next move`;
  const coachEvidence =
    isComplete
      ? 'No active balance remains in the payoff schedule.'
      : interestSavedVsMinimums > 0
      ? `${formatCurrency(interestSavedVsMinimums)} projected interest saved vs minimums only.`
      : 'This is your current payoff baseline against minimum payments.';
  const coachAction =
    isComplete
      ? 'Keep paid-off accounts recorded and update the plan only if a new balance appears.'
      : availableCashFlow === 0
      ? 'Keep minimums current where possible and revisit expenses before increasing payoff speed.'
      : `Put the planned ${formatCurrency(monthlyPayment)} toward the current payoff order.`;
  const displayMonthlyPayment = isComplete ? 0 : monthlyPayment;

  return (
    <div className="rounded-2xl p-5 snowball-glow" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'rgba(15, 23, 42, 0.06) 0px 1px 4px' }}>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <Zap size={18} style={{ color: '#3b82f6' }} />
        {strategyName} Payoff Plan
      </h2>
      <div
        className="mb-4 rounded-xl p-3"
        style={{ background: coachBg, border: `1px solid ${coachBorder}` }}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: coachTone, border: `1px solid ${coachBorder}` }}
          >
            Coach read
          </span>
          <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>
            {coachTitle}
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
            <span className="font-semibold" style={{ color: coachTone }}>Evidence: </span>
            {coachEvidence}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
            <span className="font-semibold" style={{ color: coachTone }}>Action: </span>
            {coachAction}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <div className="text-xs mb-1" style={{ color: '#64748b' }}>Debt-Free In</div>
          <div className="mono font-bold text-lg" style={{ color: '#3b82f6' }}>
            {isComplete ? 'Complete' : planResult.months >= 360 ? '30+ years' : timeStr}
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
          <div className="mono font-bold text-lg">{formatCurrency(displayMonthlyPayment)}</div>
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
          Note: No cash flow is available after expenses and minimums. Keep the plan current, then adjust expenses or income before accelerating payoff.
        </div>
      )}
    </div>
  );
}
