'use client';

import { CheckCircle2 } from 'lucide-react';
import { type Debt } from '@/types';
import { getCategoryColor } from '@/lib/utils';

interface CalendarGridProps {
  cells: (number | null)[];
  paymentsByDay: Map<number, Debt[]>;
  paidMap: Map<string, { id: string; amount: number }>;
  nextPaymentDay: number | undefined;
  selectedDay: number | null;
  viewYear: number;
  viewMonth: number;
  today: Date;
  onDayClick: (day: number) => void;
}

export default function CalendarGrid({
  cells,
  paymentsByDay,
  paidMap,
  nextPaymentDay,
  selectedDay,
  viewYear,
  viewMonth,
  today,
  onDayClick,
}: CalendarGridProps) {
  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isPast = (d: number) =>
    new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const isDayFullyPaid = (day: number) => {
    const dayDebts = paymentsByDay.get(day);
    if (!dayDebts?.length) return false;
    return dayDebts.every((d) => paidMap.has(d.id));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
      {cells.map((day, idx) => {
        if (!day) return <div key={idx} style={{ aspectRatio: '1' }} />;

        const dayDebts   = paymentsByDay.get(day);
        const isNext     = nextPaymentDay === day;
        const todayCell  = isToday(day);
        const past       = isPast(day);
        const isSelected = selectedDay === day;
        const fullyPaid  = isDayFullyPaid(day);

        return (
          <button
            key={idx}
            type="button"
            onClick={() => onDayClick(day)}
            style={{
              aspectRatio: '1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              borderRadius: '9px',
              background: isSelected
                ? 'rgba(37,99,235,0.12)'
                : fullyPaid
                ? 'rgba(34,197,94,0.08)'
                : isNext
                ? 'rgba(59,130,246,0.18)'
                : todayCell
                ? 'rgba(15,23,42,0.06)'
                : 'transparent',
              border: isSelected
                ? '1.5px solid rgba(37,99,235,0.5)'
                : fullyPaid
                ? '1px solid rgba(34,197,94,0.3)'
                : isNext
                ? '1px solid rgba(59,130,246,0.4)'
                : todayCell
                ? '1px solid rgba(15,23,42,0.15)'
                : '1px solid transparent',
              opacity: past && !isNext && !fullyPaid ? 0.35 : 1,
              transition: 'background 0.15s ease, opacity 0.15s ease',
              cursor: dayDebts ? 'pointer' : 'default',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <span style={{
              fontSize: '12px',
              fontWeight: isNext || todayCell || isSelected ? 700 : 400,
              color: isSelected ? '#2563eb' : isNext ? '#2563eb' : todayCell ? '#0f172a' : '#64748b',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {day}
            </span>
            {dayDebts && (
              fullyPaid ? (
                <CheckCircle2 size={8} style={{ color: '#22c55e' }} />
              ) : (
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '28px' }}>
                  {dayDebts.slice(0, 3).map((d, i) => (
                    <div
                      key={i}
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: paidMap.has(d.id) ? '#22c55e' : getCategoryColor(d.category),
                        flexShrink: 0,
                      }}
                    />
                  ))}
                  {dayDebts.length > 3 && (
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(15,23,42,0.25)' }} />
                  )}
                </div>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
