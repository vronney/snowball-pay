import { useState } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { parseNumericInput } from '@/lib/parseNumericInput';

/** Non-empty input that doesn't parse (or is negative) gets a format hint —
 *  without it, a typo like "2,5O0" silently becomes $0 in the payoff math
 *  while the bad text stays visible in the field. */
function budgetFieldError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = parseNumericInput(trimmed);
  if (parsed === null || parsed < 0) return 'Enter an amount like 4,500';
  return null;
}

interface BudgetPanelProps {
  takeHome: string;
  essential: string;
  extra: string;
  takeHomeNum: number;
  essentialNum: number;
  totalMinPayments: number;
  availableForDebt: number;
  extraNum: number;
  onTakeHomeChange: (value: string) => void;
  onEssentialChange: (value: string) => void;
  onExtraChange: (value: string) => void;
}

export default function BudgetPanel({
  takeHome,
  essential,
  extra,
  takeHomeNum,
  essentialNum,
  totalMinPayments,
  availableForDebt,
  extraNum,
  onTakeHomeChange,
  onEssentialChange,
  onExtraChange,
}: BudgetPanelProps) {
  // Same blur-gated pattern as the debt fields: hints appear when the user
  // leaves a field, never on every keystroke.
  const [touched, setTouched] = useState<{ takeHome?: boolean; essential?: boolean }>({});
  const takeHomeError = touched.takeHome ? budgetFieldError(takeHome) : null;
  const essentialError = touched.essential ? budgetFieldError(essential) : null;

  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <h2 className="font-semibold text-base mb-4">Monthly Budget</h2>
      <div className="space-y-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>
            Monthly Take-Home Pay ($)
          </label>
          {/* text + inputMode, not type="number": iOS Safari won't select()
              number inputs, and text tolerates "$5,200"-style entry. */}
          <input
            type="text"
            inputMode="decimal"
            placeholder="4500"
            value={takeHome}
            onChange={(e) => onTakeHomeChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => setTouched((prev) => ({ ...prev, takeHome: true }))}
            aria-invalid={takeHomeError ? true : undefined}
            aria-describedby={takeHomeError ? 'budget-take-home-error' : undefined}
            className={cn('input-field text-base sm:text-sm', takeHomeError && 'input-field-error')}
          />
          {takeHomeError && (
            <p id="budget-take-home-error" className="text-xs mt-1" style={{ color: '#ef4444' }}>
              {takeHomeError}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>
            Essential Expenses — rent, groceries, utilities ($)
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="2500"
            value={essential}
            onChange={(e) => onEssentialChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => setTouched((prev) => ({ ...prev, essential: true }))}
            aria-invalid={essentialError ? true : undefined}
            aria-describedby={essentialError ? 'budget-essential-error' : undefined}
            className={cn('input-field text-base sm:text-sm', essentialError && 'input-field-error')}
          />
          {essentialError && (
            <p id="budget-essential-error" className="text-xs mt-1" style={{ color: '#ef4444' }}>
              {essentialError}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs mb-2 block" style={{ color: '#64748b' }}>
            Extra Monthly Payment Toward Debt
          </label>

          {takeHomeNum > 0 && (
            <div
              className="rounded-xl p-3 mb-3 text-xs space-y-1"
              style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}
            >
              <div className="flex justify-between" style={{ color: '#64748b' }}>
                <span>Take-home pay</span>
                <span>{formatCurrency(takeHomeNum)}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#64748b' }}>
                <span>− Essentials</span>
                <span style={{ color: '#f87171' }}>−{formatCurrency(essentialNum)}</span>
              </div>
              <div className="flex justify-between" style={{ color: '#64748b' }}>
                <span>− Minimum payments</span>
                <span style={{ color: '#f87171' }}>−{formatCurrency(totalMinPayments)}</span>
              </div>
              <div
                className="flex justify-between font-semibold pt-1"
                style={{ borderTop: '1px solid rgba(15,23,42,0.08)', color: availableForDebt > 0 ? '#34d399' : '#f87171' }}
              >
                <span>Available for extra</span>
                <span>{formatCurrency(availableForDebt)}</span>
              </div>
            </div>
          )}

          {/* Live value sits ABOVE the slider — below it, a thumb dragging the
              handle covers the number on touch screens. */}
          <div
            className="text-right text-sm font-semibold mb-1"
            style={{ color: extraNum > 0 ? '#2563eb' : '#94a3b8' }}
          >
            {formatCurrency(extraNum)} / mo extra
          </div>
          <input
            type="range"
            min={0}
            max={availableForDebt || 1}
            step={10}
            value={extraNum}
            onChange={(e) => onExtraChange(e.target.value)}
            disabled={availableForDebt <= 0}
            className="w-full"
            style={{ accentColor: '#2563eb', cursor: availableForDebt > 0 ? 'pointer' : 'not-allowed' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#94a3b8' }}>
            <span>$0</span>
            <span>{formatCurrency(availableForDebt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
