'use client';

import { useState } from 'react';
import { X, Check, Trash2, Pencil } from 'lucide-react';
import { useDebtPayments, useUnmarkPaid, useUpdatePayment, type PaymentRecord } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Payment History (rendered inside the payment panel) ──────────────────────

function PaymentHistory({ debtId, minimumPayment }: { debtId: string; minimumPayment: number }) {
  const { data, isLoading } = useDebtPayments(debtId);
  const unmarkPaid = useUnmarkPaid();
  const updatePayment = useUpdatePayment();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const records = data?.records ?? [];

  const startEdit = (record: PaymentRecord) => {
    setEditingId(record.id);
    setEditAmount(String(record.amount));
  };

  const saveEdit = async (record: PaymentRecord) => {
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;
    await updatePayment.mutateAsync({ recordId: record.id, debtId, amount });
    setEditingId(null);
  };

  if (isLoading) return <p className="text-xs" style={{ color: '#94a3b8' }}>Loading history…</p>;
  if (records.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 pt-2" style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
      <span className="text-xs font-semibold" style={{ color: '#64748b' }}>Past payments</span>
      {records.map((record) => {
        const extra = Math.max(0, record.amount - minimumPayment);
        const isEditing = editingId === record.id;
        return (
          <div key={record.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: 'rgba(15,23,42,0.03)' }}>
            <span className="text-xs font-medium w-16 flex-shrink-0" style={{ color: '#64748b' }}>
              {MONTH_NAMES[record.dueMonth]} {record.dueYear}
            </span>

            {isEditing ? (
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="input-field text-xs flex-1"
                autoFocus
              />
            ) : (
              <span className="text-xs font-semibold flex-1" style={{ color: '#0f172a' }}>
                {formatCurrency(record.amount)}
                {extra > 0 && (
                  <span className="ml-1 font-normal" style={{ color: '#10b981' }}>+{formatCurrency(extra)} extra</span>
                )}
              </span>
            )}

            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => saveEdit(record)}
                  disabled={updatePayment.isPending}
                  className="p-1 rounded bg-transparent border-0 opacity-60 hover:opacity-100 transition"
                  style={{ color: '#10b981' }}
                  title="Save"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded bg-transparent border-0 opacity-40 hover:opacity-100 transition"
                  title="Cancel"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(record)}
                  className="p-1 rounded bg-transparent border-0 opacity-30 hover:opacity-80 transition"
                  title="Edit amount"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => unmarkPaid.mutate({ recordId: record.id, debtId, dueYear: record.dueYear, dueMonth: record.dueMonth })}
                  disabled={unmarkPaid.isPending}
                  className="p-1 rounded bg-transparent border-0 opacity-30 hover:opacity-80 transition"
                  style={{ color: '#ef4444' }}
                  title="Delete payment"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Payment Panel ─────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  debtId: string;
  minimumPayment: number;
  paymentAmount: string;
  onAmountChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
}

export function DebtCardPaymentPanel({
  debtId,
  minimumPayment,
  paymentAmount,
  onAmountChange,
  onSubmit,
  onClose,
  isPending,
}: PaymentPanelProps) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-3"
      style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)' }}
    >
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
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

      <PaymentHistory debtId={debtId} minimumPayment={minimumPayment} />
    </div>
  );
}

// ─── Balance Panel ─────────────────────────────────────────────────────────────

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
