'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { type Debt } from '@/types';
import { formatCurrency, getCategoryColor } from '@/lib/utils';

interface SelectedDayPanelProps {
  selectedDay: number;
  selectedDebts: Debt[];
  viewMonth: number;
  monthName: string;
  paidMap: Map<string, { id: string; amount: number }>;
  onMarkPaid: (debt: Debt) => void;
  onUnmark: (debt: Debt) => void;
}

export default function SelectedDayPanel({
  selectedDay,
  selectedDebts,
  viewMonth: _viewMonth,
  monthName,
  paidMap,
  onMarkPaid,
  onUnmark,
}: SelectedDayPanelProps) {
  return (
    <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', margin: '0 0 10px', letterSpacing: '0.04em' }}>
        {monthName} {selectedDay} — {selectedDebts.length} payment{selectedDebts.length > 1 ? 's' : ''}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {selectedDebts.map((debt) => {
          const paid = paidMap.has(debt.id);
          return (
            <div
              key={debt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '9px',
                background: paid ? 'rgba(34,197,94,0.06)' : '#ffffff',
                border: paid ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(15,23,42,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: getCategoryColor(debt.category), flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: paid ? '#059669' : '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {debt.name}
                  </p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                    {formatCurrency(debt.minimumPayment)} minimum
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); paid ? onUnmark(debt) : onMarkPaid(debt); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: paid ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(37,99,235,0.2)',
                  background: paid ? 'rgba(34,197,94,0.08)' : 'rgba(37,99,235,0.06)',
                  color: paid ? '#059669' : '#2563eb',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {paid ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                {paid ? 'Paid' : 'Mark paid'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
