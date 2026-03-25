'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, CheckCircle2, Circle } from 'lucide-react';
import { Debt } from '@/types';
import { formatCurrency, getCategoryColor } from '@/lib/utils';
import { usePaymentRecords, useMarkPaid, useUnmarkPaid } from '@/lib/hooks';

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
  const [open,       setOpen]       = useState(false);
  const [viewYear,   setViewYear]   = useState(today.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: paymentsData } = usePaymentRecords(viewYear, viewMonth);
  const markPaid   = useMarkPaid();
  const unmarkPaid = useUnmarkPaid();

  // Map debtId → PaymentRecord for this month
  const paidMap = useMemo(() => {
    const map = new Map<string, { id: string; amount: number }>();
    for (const r of paymentsData?.records ?? []) {
      map.set(r.debtId, { id: r.id, amount: r.amount });
    }
    return map;
  }, [paymentsData]);

  const debtsWithDue = debts.filter((d) => d.dueDate);

  // Map day-of-month → debts due on that day in the viewed month
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

  // First upcoming payment from today (within viewed month)
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

  // Build the cell grid
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isPast = (d: number) =>
    new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Returns true if ALL debts on this day are paid
  const isDayFullyPaid = (day: number) => {
    const dayDebts = paymentsByDay.get(day);
    if (!dayDebts?.length) return false;
    return dayDebts.every((d) => paidMap.has(d.id));
  };

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
    unmarkPaid.mutate({ recordId: rec.id, dueYear: viewYear, dueMonth: viewMonth });
  };

  const totalDue = debtsWithDue.reduce((s, d) => s + d.minimumPayment, 0);
  const sortedEntries = [...paymentsByDay.entries()].sort(([a], [b]) => a - b);
  const selectedDebts = selectedDay != null ? (paymentsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>

      {/* ── Header ── */}
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
              <span style={{ fontSize: '12px', color: '#475569' }}>
                {formatCurrency(totalDue)} minimum due monthly
              </span>
            )}
          </div>
          <ChevronDown
            size={15}
            style={{ color: '#2563eb', marginLeft: '4px', flexShrink: 0, transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', background: 'rgba(37,99,235,0.1)', borderRadius: '5px', padding: '2px', boxSizing: 'content-box' }}
          />
        </button>

        {/* Month nav — only shown when open */}
        {open && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.1)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '112px', textAlign: 'center', color: '#0f172a', whiteSpace: 'nowrap' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(15,23,42,0.04)', border: '1px solid rgba(15,23,42,0.1)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>}
      </div>

      {open && <>

      {/* ── Next payment highlight ── */}
      {nextPayment && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', marginBottom: '18px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Next payment due</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb', fontVariantNumeric: 'tabular-nums', textAlign: 'right', whiteSpace: 'nowrap' }}>
            {formatCurrency(nextPayment.debts.reduce((s, d) => s + d.minimumPayment, 0))}
            {' '}on {MONTH_NAMES[viewMonth].slice(0, 3)} {nextPayment.day}
          </span>
        </div>
      )}

      {/* ── Day-of-week headers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
        {DAY_INITIALS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#334155', padding: '0 0 6px', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} style={{ aspectRatio: '1' }} />;

          const dayDebts   = paymentsByDay.get(day);
          const isNext     = nextPayment?.day === day;
          const todayCell  = isToday(day);
          const past       = isPast(day);
          const isSelected = selectedDay === day;
          const fullyPaid  = isDayFullyPaid(day);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
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

              {/* Paid checkmark or payment dots */}
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

      {/* ── Selected day detail panel ── */}
      {selectedDay != null && selectedDebts.length > 0 && (
        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', margin: '0 0 10px', letterSpacing: '0.04em' }}>
            {MONTH_NAMES[viewMonth]} {selectedDay} — {selectedDebts.length} payment{selectedDebts.length > 1 ? 's' : ''}
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
                    onClick={(e) => { e.stopPropagation(); paid ? handleUnmark(debt) : handleMarkPaid(debt); }}
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
      )}

      {/* ── Payment list for this month ── */}
      {sortedEntries.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', margin: '0 0 10px' }}>
            {MONTH_NAMES[viewMonth]} payments
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sortedEntries.map(([day, dayDebts]) => {
              const isNext     = nextPayment?.day === day;
              const past       = isPast(day);
              const total      = dayDebts.reduce((s, d) => s + d.minimumPayment, 0);
              const allPaid    = dayDebts.every((d) => paidMap.has(d.id));

              return (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: allPaid
                      ? 'rgba(34,197,94,0.05)'
                      : isNext ? 'rgba(59,130,246,0.07)' : 'rgba(15,23,42,0.03)',
                    border: allPaid
                      ? '1px solid rgba(34,197,94,0.15)'
                      : isNext ? '1px solid rgba(59,130,246,0.16)' : '1px solid transparent',
                    opacity: past && !allPaid ? 0.4 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {/* Day badge */}
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: allPaid ? 'rgba(34,197,94,0.12)' : isNext ? 'rgba(59,130,246,0.15)' : 'rgba(15,23,42,0.04)', border: `1px solid ${allPaid ? 'rgba(34,197,94,0.25)' : isNext ? 'rgba(59,130,246,0.25)' : 'rgba(15,23,42,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {allPaid
                      ? <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                      : <span style={{ fontSize: '12px', fontWeight: 700, color: isNext ? '#2563eb' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>{day}</span>
                    }
                  </div>

                  {/* Debt rows */}
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

                  {/* Total + NEXT badge */}
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
      )}

      {/* Empty state */}
      {debtsWithDue.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0 4px', opacity: 0.3, fontSize: '13px' }}>
          Add due dates to your debts to see them on the calendar.
        </div>
      )}

      </>}
    </div>
  );
}
