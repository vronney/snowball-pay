'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CalendarClock } from 'lucide-react';
import { Debt } from '@/types';
import { useMarkPaid } from '@/lib/hooks';

interface Props {
  debts: Debt[];
}

interface Toast {
  id: string;
  debtId: string;
  debtName: string;
  debtAmount: number;
  daysUntil: number;
}

const today = new Date();
const DISMISS_DURATION = 8000;

export default function ToastNotifications({ debts }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const shown = useRef<Set<string>>(new Set());
  const markPaid = useMarkPaid();

  useEffect(() => {
    const debtsWithDue = debts.filter((d) => d.dueDate != null);
    const newToasts: Toast[] = [];

    for (const debt of debtsWithDue) {
      const day = debt.dueDate as number;
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const clampedDay = Math.min(day, lastDay);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), clampedDay);
      const nextDue = thisMonth >= today
        ? thisMonth
        : new Date(today.getFullYear(), today.getMonth() + 1, clampedDay);
      const daysUntil = Math.ceil((nextDue.getTime() - today.getTime()) / 86400000);

      if (daysUntil <= 3 && !shown.current.has(debt.id)) {
        shown.current.add(debt.id);
        newToasts.push({ id: debt.id, debtId: debt.id, debtName: debt.name, debtAmount: debt.minimumPayment, daysUntil });
      }
    }

    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts]);
    }
  // Run once on mount and when debts change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debts]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleMarkPaid = (toast: Toast) => {
    markPaid.mutate({ debtId: toast.debtId, amount: toast.debtAmount, dueYear: today.getFullYear(), dueMonth: today.getMonth() });
    dismiss(toast.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '340px',
      width: '100%',
    }}>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismiss(toast.id)}
          onMarkPaid={() => handleMarkPaid(toast)}
          duration={DISMISS_DURATION}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss, onMarkPaid, duration }: {
  toast: Toast;
  onDismiss: () => void;
  onMarkPaid: () => void;
  duration: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  const isToday = toast.daysUntil === 0;
  const urgencyColor = isToday ? '#ef4444' : toast.daysUntil <= 1 ? '#f97316' : '#f59e0b';

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${isToday ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
      borderLeft: `3px solid ${urgencyColor}`,
      borderRadius: '12px',
      padding: '12px 14px',
      boxShadow: '0 4px 20px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      animation: 'toast-in 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <CalendarClock size={15} style={{ color: urgencyColor, flexShrink: 0, marginTop: '1px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.3 }}>
            {toast.debtName} due {isToday ? 'today' : `in ${toast.daysUntil}d`}
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            ${toast.debtAmount.toFixed(2)} minimum payment
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, display: 'flex' }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
      <button
        type="button"
        onClick={onMarkPaid}
        style={{
          alignSelf: 'flex-start',
          padding: '4px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(34,197,94,0.3)',
          background: 'rgba(34,197,94,0.08)',
          color: '#059669',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Mark paid
      </button>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
