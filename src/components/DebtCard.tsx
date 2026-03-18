import { Debt } from '@/types';
import { Trash2 } from 'lucide-react';
import { formatCurrency, formatPercent, getCategoryColor, getOrdinalDay, calculateUtilization } from '@/lib/utils';

interface DebtCardProps {
  debt: Debt;
  onDelete: () => void;
}

export default function DebtCard({ debt, onDelete }: DebtCardProps) {
  const util = debt.creditLimit > 0 ? calculateUtilization(debt.balance, debt.creditLimit) : null;
  const categoryColor = getCategoryColor(debt.category);

  return (
    <div
      className="rounded-xl p-4 card-enter flex items-start justify-between gap-4"
      style={{ background: 'rgba(26,35,50,1)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: categoryColor }} />
          <span className="font-semibold text-sm truncate">{debt.name || 'Unnamed'}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full opacity-60"
            style={{ background: `${categoryColor}22`, color: categoryColor }}
          >
            {debt.category}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs opacity-60">
          <span className="mono">{formatCurrency(debt.balance)}</span>
          <span>{formatPercent(debt.interestRate)} APR</span>
          <span>Min: {formatCurrency(debt.minimumPayment)}</span>
          {debt.dueDate ? <span>Due: {getOrdinalDay(debt.dueDate)}</span> : ''}
          {util !== null ? <span>Util: {util.toFixed(0)}%</span> : ''}
        </div>
        {debt.creditLimit > 0 && (
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full progress-bar"
              style={{
                width: `${Math.min(100, util || 0)}%`,
                background: categoryColor,
              }}
            />
          </div>
        )}
      </div>
      <button
        onClick={onDelete}
        className="flex-shrink-0 p-2 rounded-lg hover:bg-white/5 cursor-pointer bg-transparent border-0 text-txt opacity-40 hover:opacity-100 transition"
        aria-label="Delete debt"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
