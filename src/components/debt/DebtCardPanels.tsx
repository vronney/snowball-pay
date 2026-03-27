'use client';

import { X, Check } from 'lucide-react';

interface PaymentPanelProps {
  minimumPayment: number;
  paymentAmount: string;
  onAmountChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
}

export function DebtCardPaymentPanel({
  minimumPayment,
  paymentAmount,
  onAmountChange,
  onSubmit,
  onClose,
  isPending,
}: PaymentPanelProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg p-3 flex flex-wrap items-end gap-2"
      style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)' }}
    >
      <div className="flex flex-col gap-1 flex-1" style={{ minWidth: '140px' }}>
        <label className="text-xs" style={{ color: '#64748b' }}>Payment amount ($)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder={String(minimumPayment)}
          value={paymentAmount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="input-field"
          autoFocus
          required
        />
      </div>
      <div className="flex gap-2 items-end pb-0.5">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#059669' }}
        >
          <Check size={13} />
          {isPending ? 'Saving…' : 'Record'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 bg-transparent border-0 opacity-40 hover:opacity-100 transition"
        >
          <X size={14} />
        </button>
      </div>
    </form>
  );
}

interface BalancePanelProps {
  newBalance: string;
  onBalanceChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
}

export function DebtCardBalancePanel({
  newBalance,
  onBalanceChange,
  onSubmit,
  onClose,
  isPending,
}: BalancePanelProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg p-3 flex flex-wrap items-end gap-2"
      style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.18)' }}
    >
      <div className="flex flex-col gap-1 flex-1" style={{ minWidth: '140px' }}>
        <label className="text-xs" style={{ color: '#64748b' }}>Current balance ($)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={newBalance}
          onChange={(e) => onBalanceChange(e.target.value)}
          className="input-field"
          autoFocus
          required
        />
      </div>
      <div className="flex gap-2 items-end pb-0.5">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
        >
          <Check size={13} />
          {isPending ? 'Saving…' : 'Update'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 bg-transparent border-0 opacity-40 hover:opacity-100 transition"
        >
          <X size={14} />
        </button>
      </div>
    </form>
  );
}
