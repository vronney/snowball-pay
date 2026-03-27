'use client';

import { CheckCircle2 } from 'lucide-react';
import { type Debt } from '@/types';
import { formatCurrency, getCategoryColor } from '@/lib/utils';

interface PaymentListProps {
  sortedEntries: [number, Debt[]][];
  nextPaymentDay: number | undefined;
  viewYear: number;
  viewMonth: number;
  monthName: string;
  today: Date;
  paidMap: Map<string, { id: string; amount: number }>;
}

export default function PaymentList({
  sortedEntries,
  nextPaymentDay,
  viewYear,
  viewMonth,
  monthName,
  today,
  paidMap,
}: PaymentListProps) {
  const isPast = (d: number) =>
    new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', margin: '0 0 10px' }}>
        {monthName} payments
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sortedEntries.map(([day, dayDebts]) => {
          const isNext  = nextPaymentDay === day;
          const past    = isPast(day);
          const total   = dayDebts.reduce((s, d) => s + d.minimumPayment, 0);
          const allPaid = dayDebts.every((d) => paidMap.has(d.id));

          return (
            <div
              key={day}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                background: allPaid ? 'rgba(34,197,94,0.05)' : isNext ? 'rgba(59,130,246,0.07)' : 'rgba(15,23,42,0.03)',
                border: allPaid ? '1px solid rgba(34,197,94,0.15)' : isNext ? '1px solid rgba(59,130,246,0.16)' : '1px solid transparent',
                opacity: past && !allPaid ? 0.4 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: allPaid ? 'rgba(34,197,94,0.12)' : isNext ? 'rgba(59,130,246,0.15)' : 'rgba(15,23,42,0.04)', border: `1px solid ${allPaid ? 'rgba(34,197,94,0.25)' : isNext ? 'rgba(59,130,246,0.25)' : 'rgba(15,23,42,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {allPaid
                  ? <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                  : <span style={{ fontSize: '12px', fontWeight: 700, color: isNext ? '#2563eb' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>{day}</span>
                }
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayDebts.map((d) => {
                  const paid = paidMap.has(d.id);
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: paid ? '#22c55e' : getCategoryColor(d.category), flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: paid ? '#059669' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: paid ? 'line-through' : 'none' }}>
                          {d.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: paid ? '#94a3b8' : '#334155', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: '8px' }}>
                        {formatCurrency(d.minimumPayment)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                {dayDebts.length > 1 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    = {formatCurrency(total)}
                  </span>
                )}
                {isNext && !allPaid && (
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: '#2563eb', background: 'rgba(37,99,235,0.1)', padding: '2px 7px', borderRadius: '4px' }}>
                    NEXT
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
