'use client';

import { useState } from 'react';
import { Debt } from '@/types';
import { Trash2, History, X, Check } from 'lucide-react';
import { formatCurrency, formatPercent, getCategoryColor, getOrdinalDay, calculateUtilization } from '@/lib/utils';
import { useAddSnapshot } from '@/lib/hooks';

interface DebtCardProps {
  debt: Debt;
  onDelete: () => void;
}

export default function DebtCard({ debt, onDelete }: DebtCardProps) {
  const util = debt.creditLimit > 0 ? calculateUtilization(debt.balance, debt.creditLimit) : null;
  const categoryColor = getCategoryColor(debt.category);

  const [showLog, setShowLog] = useState(false);
  const [logBalance, setLogBalance] = useState(String(debt.balance));
  const [logMonth, setLogMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const addSnapshot = useAddSnapshot(debt.id);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [year, month] = logMonth.split('-').map(Number);
    const recordedAt = new Date(year, month - 1, 1).toISOString();
    await addSnapshot.mutateAsync({ balance: parseFloat(logBalance), recordedAt });
    setShowLog(false);
  };

  return (
    <div
      className="rounded-xl p-4 card-enter flex flex-col gap-3"
      style={{ background: 'rgba(26,35,50,1)' }}
    >
      <div className="flex items-start justify-between gap-4">
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
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowLog((v) => !v)}
            title="Log current balance"
            className="p-2 rounded-lg hover:bg-white/5 cursor-pointer bg-transparent border-0 text-txt opacity-40 hover:opacity-100 transition"
            aria-label="Log balance snapshot"
          >
            <History size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-white/5 cursor-pointer bg-transparent border-0 text-txt opacity-40 hover:opacity-100 transition"
            aria-label="Delete debt"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {showLog && (
        <form
          onSubmit={(e) => void handleLogSubmit(e)}
          className="rounded-lg p-3 flex flex-wrap items-end gap-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-50">Statement Balance ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={logBalance}
              onChange={(e) => setLogBalance(e.target.value)}
              className="input-field w-36"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs opacity-50">Month</label>
            <input
              type="month"
              value={logMonth}
              onChange={(e) => setLogMonth(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <button
            type="submit"
            disabled={addSnapshot.isPending}
            className="p-2 rounded-lg transition disabled:opacity-40"
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#93c5fd' }}
            title="Save snapshot"
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            onClick={() => setShowLog(false)}
            className="p-2 rounded-lg hover:bg-white/5 bg-transparent border-0 text-txt opacity-40 hover:opacity-100 transition"
            title="Cancel"
          >
            <X size={15} />
          </button>
        </form>
      )}
    </div>
  );
}

