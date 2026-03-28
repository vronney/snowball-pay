'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays } from 'lucide-react';
import { Debt } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { usePaymentRecords, useMarkPaid, useUnmarkPaid } from '@/lib/hooks';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import SelectedDayPanel from '@/components/calendar/SelectedDayPanel';
import PaymentList from '@/components/calendar/PaymentList';

interface Props {
  debts: Debt[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const today = new Date();

export default function PaymentCalendar({ debts }: Props) {
  const [open,        setOpen]        = useState(false);
  const [viewYear,    setViewYear]    = useState(today.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: paymentsData } = usePaymentRecords(viewYear, viewMonth);
  const markPaid   = useMarkPaid();
  const unmarkPaid = useUnmarkPaid();

  const paidMap = useMemo(() => {
    const map = new Map<string, { id: string; amount: number }>();
    for (const r of paymentsData?.records ?? []) {
      map.set(r.debtId, { id: r.id, amount: r.amount });
    }
    return map;
  }, [paymentsData]);

  const debtsWithDue = debts.filter((d) => d.dueDate);

  const paymentsByDay = useMemo(() => {
    const map = new Map<number, Debt[]>();
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (const debt of debtsWithDue) {
      if (!debt.dueDate) continue;
      const day = Math.min(debt.dueDate, lastDay);
      map.set(day, [...(map.get(day) ?? []), debt]);
    }
    return map;
  }, [debtsWithDue, viewYear, viewMonth]);

  const nextPayment = useMemo(() => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let nearest: { day: number; debts: Debt[] } | null = null;
    for (const [day, dayDebts] of paymentsByDay) {
      const due = new Date(viewYear, viewMonth, day);
      if (due >= todayStart) {
        if (!nearest || day < nearest.day) nearest = { day, debts: dayDebts };
      }
    }
    return nearest;
  }, [paymentsByDay, viewYear, viewMonth]);

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    if (!paymentsByDay.has(day)) return;
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  const handleMarkPaid = (debt: Debt) => {
    markPaid.mutate({ debtId: debt.id, amount: debt.minimumPayment, dueYear: viewYear, dueMonth: viewMonth });
  };
  const handleUnmark = (debt: Debt) => {
    const rec = paidMap.get(debt.id);
    if (!rec) return;
    unmarkPaid.mutate({ recordId: rec.id, debtId: debt.id, dueYear: viewYear, dueMonth: viewMonth });
  };

  const totalDue      = debtsWithDue.reduce((s, d) => s + d.minimumPayment, 0);
  const sortedEntries = [...paymentsByDay.entries()].sort(([a], [b]) => a - b);
  const selectedDebts = selectedDay != null ? (paymentsByDay.get(selectedDay) ?? []) : [];
  const monthName     = MONTH_NAMES[viewMonth];

  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: open ? '20px' : '0', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', minWidth: 0 }}
        >
          <CalendarDays size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', display: 'block', lineHeight: 1.3, whiteSpace: 'nowrap' }}>Payment Calendar</span>
            {totalDue > 0 && !open && (
              <span style={{ fontSize: '12px', color: '#475569' }}>{formatCurrency(totalDue)} minimum due monthly</span>
            )}
          </div>
          <ChevronDown
            size={15}
            style={{ color: '#2563eb', marginLeft: '4px', flexShrink: 0, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', background: 'rgba(37,99,235,0.1)', borderRadius: '5px', padding: '2px', boxSizing: 'content-box' }}
          />
        </button>

        {open && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button type="button" onClick={prevMonth} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.1)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '112px', textAlign: 'center', color: '#0f172a', whiteSpace: 'nowrap' }}>
              {monthName} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.1)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {open && (
        <>
          {/* Next payment highlight */}
          {nextPayment && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Next payment due</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {formatCurrency(nextPayment.debts.reduce((s, d) => s + d.minimumPayment, 0))}
                {' '}on {monthName.slice(0, 3)} {nextPayment.day}
              </span>
            </div>
          )}

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {DAY_INITIALS.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#334155', padding: '0 0 6px', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          <CalendarGrid
            cells={cells}
            paymentsByDay={paymentsByDay}
            paidMap={paidMap}
            nextPaymentDay={nextPayment?.day}
            selectedDay={selectedDay}
            viewYear={viewYear}
            viewMonth={viewMonth}
            today={today}
            onDayClick={handleDayClick}
          />

          {selectedDay != null && selectedDebts.length > 0 && (
            <SelectedDayPanel
              selectedDay={selectedDay}
              selectedDebts={selectedDebts}
              viewMonth={viewMonth}
              monthName={monthName}
              paidMap={paidMap}
              onMarkPaid={handleMarkPaid}
              onUnmark={handleUnmark}
            />
          )}

          {sortedEntries.length > 0 && (
            <PaymentList
              sortedEntries={sortedEntries}
              nextPaymentDay={nextPayment?.day}
              viewYear={viewYear}
              viewMonth={viewMonth}
              monthName={monthName}
              today={today}
              paidMap={paidMap}
            />
          )}

          {debtsWithDue.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0 4px', opacity: 0.3, fontSize: '13px' }}>
              Add due dates to your debts to see them on the calendar.
            </div>
          )}
        </>
      )}
    </div>
  );
}
