'use client';

import { useState } from 'react';
import { Debt } from '@/types';
import { Trash2, Pencil, X, Check, DollarSign, RefreshCw } from 'lucide-react';
import { formatCurrency, formatPercent, getCategoryColor, getOrdinalDay, calculateUtilization } from '@/lib/utils';
import { useAddBulkSnapshots, useUpdateDebt } from '@/lib/hooks';
import DebtForm from '@/components/DebtForm';

interface DebtCardProps {
  debt: Debt;
  allDebts: Debt[];
  onDelete: () => void;
  firstSnapshotBalance?: number | null;
}

type Panel = 'payment' | 'balance' | 'edit' | null;

export default function DebtCard({ debt, allDebts, onDelete, firstSnapshotBalance }: DebtCardProps) {
  const util = debt.creditLimit > 0 ? calculateUtilization(debt.balance, debt.creditLimit) : null;
  const categoryColor = getCategoryColor(debt.category);
  const isHighInterest = debt.interestRate >= 20;
  const isMedInterest = debt.interestRate >= 15 && debt.interestRate < 20;
  const borderOpacity = isHighInterest ? 'cc' : isMedInterest ? '88' : '44';

  const [panel, setPanel] = useState<Panel>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newBalance, setNewBalance] = useState(String(debt.balance));

  const addBulkSnapshots = useAddBulkSnapshots();
  const updateDebt = useUpdateDebt();

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const snapshotAllDebts = (updatedDebtBalance: number) => {
    const now = new Date();
    const recordedAt = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const entries = allDebts.map((d) => ({
      debtId: d.id,
      balance: d.id === debt.id ? updatedDebtBalance : d.balance,
      recordedAt,
    }));
    return addBulkSnapshots.mutateAsync(entries);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    const newBalance = Math.max(0, debt.balance - amount);
    await updateDebt.mutateAsync({ id: debt.id, updates: { balance: newBalance } });
    await snapshotAllDebts(newBalance);
    setPaymentAmount('');
    setPanel(null);
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newBalance);
    if (isNaN(val) || val < 0) return;
    await updateDebt.mutateAsync({ id: debt.id, updates: { balance: val } });
    await snapshotAllDebts(val);
    setPanel(null);
  };

  const handleEditSubmit = async (formData: any) => {
    await updateDebt.mutateAsync({ id: debt.id, updates: formData });
    setPanel(null);
  };

  return (
    <div
      className="rounded-xl p-4 card-enter flex flex-col gap-3"
      style={{
        background: 'rgba(19,29,46,1)',
        borderLeft: `3px solid ${categoryColor}${borderOpacity}`,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: isHighInterest ? `0 0 0 1px ${categoryColor}18, 0 2px 12px rgba(0,0,0,0.2)` : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: categoryColor }} />
            <span className="font-semibold text-sm truncate">{debt.name || 'Unnamed'}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0"
              style={{ background: `${categoryColor}20`, color: categoryColor, border: `1px solid ${categoryColor}35` }}
            >
              {debt.category}
            </span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="mono font-bold text-lg leading-none" style={{ color: '#e1e8f0' }}>
              {formatCurrency(debt.balance)}
            </span>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: isHighInterest ? 'rgba(239,68,68,0.12)' : isMedInterest ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)',
                color: isHighInterest ? '#f87171' : isMedInterest ? '#fbbf24' : 'rgba(255,255,255,0.4)',
              }}
            >
              {formatPercent(debt.interestRate)} APR
            </span>
            <span className="text-xs opacity-40">Min {formatCurrency(debt.minimumPayment)}</span>
            {debt.dueDate ? <span className="text-xs opacity-40">Due {getOrdinalDay(debt.dueDate)}</span> : null}
          </div>

          {/* Paid-off progress bar — uses earliest snapshot or original balance at entry */}
          {(() => {
            const startBalance = debt.originalBalance || firstSnapshotBalance;
            if (!startBalance || startBalance <= 0) return null;
            const pct = Math.min(100, Math.max(0, ((startBalance - debt.balance) / startBalance) * 100));
            return (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs opacity-35">Paid off</span>
                  <span className="text-xs font-semibold" style={{ color: '#34d399' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div
                    className="h-full rounded-full progress-bar"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)' }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Credit utilization bar */}
          {debt.creditLimit > 0 && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs opacity-35">Credit utilization</span>
                <span className="text-xs font-semibold" style={{ color: (util ?? 0) > 30 ? '#f87171' : '#34d399' }}>
                  {util?.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-full rounded-full progress-bar"
                  style={{
                    width: `${Math.min(100, util || 0)}%`,
                    background: (util ?? 0) > 30 ? '#ef4444' : categoryColor,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => togglePanel('payment')}
            title="Log payment"
            className="p-2 rounded-lg hover:bg-white/8 cursor-pointer bg-transparent border-0 transition"
            aria-label="Log payment"
            style={{ color: panel === 'payment' ? '#34d399' : undefined, opacity: panel === 'payment' ? 1 : 0.4 }}
          >
            <DollarSign size={15} />
          </button>
          <button
            onClick={() => togglePanel('balance')}
            title="Update balance"
            className="p-2 rounded-lg hover:bg-white/8 cursor-pointer bg-transparent border-0 transition"
            aria-label="Update balance"
            style={{ color: panel === 'balance' ? '#fbbf24' : undefined, opacity: panel === 'balance' ? 1 : 0.4 }}
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => togglePanel('edit')}
            title="Edit debt"
            className="p-2 rounded-lg hover:bg-white/8 cursor-pointer bg-transparent border-0 transition"
            aria-label="Edit debt"
            style={{ color: panel === 'edit' ? '#93c5fd' : undefined, opacity: panel === 'edit' ? 1 : 0.4 }}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-500/10 cursor-pointer bg-transparent border-0 opacity-30 hover:opacity-80 transition"
            aria-label="Delete debt"
            style={{ color: '#f87171' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Log Payment panel */}
      {panel === 'payment' && (
        <form
          onSubmit={(e) => void handlePaymentSubmit(e)}
          className="rounded-lg p-3 flex flex-wrap items-end gap-2"
          style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)' }}
        >
          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: '140px' }}>
            <label className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Payment amount ($)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={String(debt.minimumPayment)}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="input-field"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-2 items-end pb-0.5">
            <button
              type="submit"
              disabled={updateDebt.isPending || addBulkSnapshots.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}
            >
              <Check size={13} />
              {updateDebt.isPending ? 'Saving…' : 'Record'}
            </button>
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="p-2 rounded-lg hover:bg-white/5 bg-transparent border-0 opacity-40 hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Update Balance panel */}
      {panel === 'balance' && (
        <form
          onSubmit={(e) => void handleBalanceSubmit(e)}
          className="rounded-lg p-3 flex flex-wrap items-end gap-2"
          style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.18)' }}
        >
          <div className="flex flex-col gap-1 flex-1" style={{ minWidth: '140px' }}>
            <label className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Current balance ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="input-field"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-2 items-end pb-0.5">
            <button
              type="submit"
              disabled={updateDebt.isPending || addBulkSnapshots.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
            >
              <Check size={13} />
              {updateDebt.isPending ? 'Saving…' : 'Update'}
            </button>
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="p-2 rounded-lg hover:bg-white/5 bg-transparent border-0 opacity-40 hover:opacity-100 transition"
            >
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Edit panel */}
      {panel === 'edit' && (
        <div
          className="rounded-lg p-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <DebtForm
            initialData={debt}
            submitLabel="Save Changes"
            onSubmit={(data) => void handleEditSubmit(data)}
            onCancel={() => setPanel(null)}
            isLoading={updateDebt.isPending}
          />
        </div>
      )}
    </div>
  );
}
