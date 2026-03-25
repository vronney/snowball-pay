import { formatCurrency } from '@/lib/utils';

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
  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <h2 className="font-semibold text-base mb-4">Monthly Budget</h2>
      <div className="space-y-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>
            Monthly Take-Home Pay ($)
          </label>
          <input
            type="number"
            placeholder="4500"
            value={takeHome}
            onChange={(e) => onTakeHomeChange(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>
            Essential Expenses — rent, groceries, utilities ($)
          </label>
          <input
            type="number"
            placeholder="2500"
            value={essential}
            onChange={(e) => onEssentialChange(e.target.value)}
            className="input-field"
          />
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

          <input
            type="range"
            min={0}
            max={availableForDebt || 1}
            step={10}
            value={Math.min(parseFloat(extra) || 0, availableForDebt)}
            onChange={(e) => onExtraChange(e.target.value)}
            disabled={availableForDebt <= 0}
            className="w-full"
            style={{ accentColor: '#3b82f6', cursor: availableForDebt > 0 ? 'pointer' : 'not-allowed' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#94a3b8' }}>
            <span>$0</span>
            <span
              className="font-semibold"
              style={{ color: extraNum > 0 ? '#3b82f6' : '#94a3b8' }}
            >
              {formatCurrency(extraNum)} / mo extra
            </span>
            <span>{formatCurrency(availableForDebt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
