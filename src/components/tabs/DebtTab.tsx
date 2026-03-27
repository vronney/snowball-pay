'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCreateDebt, useDeleteDebt, useIncome, useExpenses, useAllSnapshots } from '@/lib/hooks';
import { Debt, BalanceSnapshot } from '@/types';
import { PlusCircle, Inbox, Bell, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { calculateDebtSnowball, calculateDebtAvalanche, calculateDebtCustom } from '@/lib/snowball';
import DebtCard from '@/components/DebtCard';
import DebtForm from '@/components/DebtForm';
import PaymentCalendar from '@/components/PaymentCalendar';

interface DebtTabProps {
  debts: Debt[];
  isLoading: boolean;
  openPaymentDebtId?: string | null;
  onPaymentPanelOpened?: () => void;
}

interface UpcomingPayment {
  debt: Debt;
  daysUntilDue: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}

function getUpcomingPayments(debts: Debt[]): UpcomingPayment[] {
  const today = new Date();
  const todayDay = today.getDate();
  const results: UpcomingPayment[] = [];

  for (const debt of debts) {
    if (!debt.dueDate) continue;
    const dueDay = debt.dueDate;

    // Days until next occurrence of dueDay
    let daysUntil: number;
    if (dueDay >= todayDay) {
      daysUntil = dueDay - todayDay;
    } else {
      // Due date already passed this month — next month
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      daysUntil = daysInMonth - todayDay + dueDay;
    }

    if (daysUntil > 7) continue;

    let label: string;
    let color: string;
    let bg: string;
    let border: string;

    if (daysUntil < 0) {
      label = `Overdue by ${Math.abs(daysUntil)}d`;
      color = '#f87171'; bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.25)';
    } else if (daysUntil === 0) {
      label = 'Due today';
      color = '#fbbf24'; bg = 'rgba(245,158,11,0.08)'; border = 'rgba(245,158,11,0.25)';
    } else if (daysUntil === 1) {
      label = 'Due tomorrow';
      color = '#60a5fa'; bg = 'rgba(59,130,246,0.08)'; border = 'rgba(59,130,246,0.25)';
    } else {
      label = `Due in ${daysUntil}d`;
      color = '#818cf8'; bg = 'rgba(99,102,241,0.07)'; border = 'rgba(99,102,241,0.2)';
    }

    results.push({ debt, daysUntilDue: daysUntil, label, color, bg, border });
  }

  // Sort: overdue first, then by days ascending
  return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

function computeStreak(snapshots: BalanceSnapshot[]): number {
  if (!snapshots.length) return 0;
  const months = new Set(snapshots.map((s) => s.recordedAt.slice(0, 7)));
  const today = new Date();
  let streak = 0;
  let y = today.getFullYear();
  let m = today.getMonth() + 1;
  while (true) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!months.has(key)) break;
    streak++;
    m--;
    if (m === 0) { m = 12; y--; }
    if (streak > 120) break;
  }
  return streak;
}

export default function DebtTab({ debts, isLoading, openPaymentDebtId, onPaymentPanelOpened }: DebtTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(false);

  // When a specific debt is targeted from outside (e.g. notification click),
  // ensure the list is expanded so the card is rendered and can open its panel.
  useEffect(() => {
    if (openPaymentDebtId) setDebtsOpen(true);
  }, [openPaymentDebtId]);

  const createDebt = useCreateDebt();
  const deleteDebt = useDeleteDebt();

  const { data: incomeData } = useIncome();
  const { data: expensesData } = useExpenses();
  const { data: snapshotData } = useAllSnapshots();

  const income = incomeData?.income;
  const snapshots = useMemo(() => snapshotData?.snapshots ?? [], [snapshotData?.snapshots]);

  // Earliest snapshot balance per debt (for % paid off)
  const earliestBalanceByDebt = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...snapshots].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    for (const s of sorted) {
      if (!map.has(s.debtId)) map.set(s.debtId, s.balance);
    }
    return map;
  }, [snapshots]);

  // Payment streak
  const streak = useMemo(() => computeStreak(snapshots), [snapshots]);

  // Payoff estimate — mirrors the PayoffTab acceleration logic so both tabs show the same date
  const payoffResult = useMemo(() => {
    if (!income || debts.length === 0) return null;
    const expenses = expensesData?.expenses ?? [];
    const essential = income.essentialExpenses ?? 0;
    const recurring = expenses.reduce((s, e) => s + e.amount, 0);
    const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
    const naturalSurplus = Math.max(0, income.monthlyTakeHome - essential - recurring - totalMin);
    const maxAccel = naturalSurplus + (income.extraPayment ?? 0);
    const targetAccel = income.accelerationAmount !== null && income.accelerationAmount !== undefined
      ? Math.min(income.accelerationAmount, maxAccel)
      : maxAccel;
    const adjustedExtra = targetAccel - naturalSurplus;
    try {
      const method = income.payoffMethod ?? 'snowball';
      const calc = method === 'avalanche' ? calculateDebtAvalanche : method === 'custom' ? calculateDebtCustom : calculateDebtSnowball;
      return calc(debts, income.monthlyTakeHome, essential, recurring, adjustedExtra);
    } catch {
      return null;
    }
  }, [debts, income, expensesData?.expenses]);

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);

  const upcomingPayments = useMemo(() => getUpcomingPayments(debts), [debts]);

  const handleSubmit = async (formData: any) => {
    try {
      await createDebt.mutateAsync(formData);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating debt:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 76, borderRadius: '12px', background: '#f1f5f9', animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  return (
    <section id="section-debts">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 2xl:col-span-8 order-2 xl:order-1 space-y-4">
          {/* Debt Overview Banner */}
          {debts.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: '#f8fafc',
                border: '1px solid rgba(15,23,42,0.08)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Total Remaining</span>
                  <span className="mono font-bold" style={{ fontSize: '18px', color: '#f87171' }}>{formatCurrency(totalDebt)}</span>
                </div>
                {payoffResult && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Est. Debt-Free</span>
                    <span className="mono font-bold" style={{ fontSize: '18px', color: '#059669' }}>
                      {payoffResult.debtFreeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {payoffResult && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Interest (plan)</span>
                    <span className="mono font-bold" style={{ fontSize: '18px', color: '#2563eb' }}>{formatCurrency(payoffResult.totalInterestPaid)}</span>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Monthly Minimums</span>
                  <span className="mono font-bold" style={{ fontSize: '18px', color: '#0f172a' }}>{formatCurrency(totalMin)}</span>
                </div>
                {streak > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Payment Streak</span>
                    <span className="mono font-bold" style={{ fontSize: '18px', color: '#7c3aed' }}>{streak} mo</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
            <button
              type="button"
              onClick={() => setDebtsOpen(o => !o)}
              className="w-full flex items-center justify-between p-4"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span className="font-semibold text-sm flex items-center gap-2" style={{ color: '#0f172a' }}>
                Your debt accounts
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: '#475569', background: 'rgba(15,23,42,0.05)' }}>
                  {debts.length}
                </span>
              </span>
              <ChevronDown size={16} style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: debtsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {debtsOpen && <div className="px-4 pb-4">
              {/* Debt List */}
              <div id="debt-list" className="space-y-3">
                {debts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    allDebts={debts}
                    onDelete={() => deleteDebt.mutate(debt.id)}
                    firstSnapshotBalance={earliestBalanceByDebt.get(debt.id) ?? null}
                    openPaymentPanel={openPaymentDebtId === debt.id}
                    onPaymentPanelOpened={onPaymentPanelOpened}
                  />
                ))}
              </div>

              {/* Empty State */}
              {debts.length === 0 && !showForm && (
                <div id="empty-debts" className="text-center py-14 px-6">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-4"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}
                  >
                    <Inbox size={28} style={{ color: '#3b82f6', opacity: 0.7 }} />
                  </div>
                  <p className="font-semibold text-sm mb-1" style={{ color: '#475569' }}>No debts yet</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Add your first debt in the panel to start building your payoff plan.</p>
                </div>
              )}
            </div>}
          </div>
        </div>

        <aside className="xl:col-span-4 2xl:col-span-4 order-1 xl:order-2 xl:sticky xl:top-24 self-start space-y-4">
          {/* Add Debt Form */}
          {showForm ? (
            <div className="rounded-2xl p-5 snowball-glow" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <PlusCircle size={18} style={{ color: '#3b82f6' }} />
                <span>Add New Debt</span>
              </h2>
              <DebtForm
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
                isLoading={createDebt.isPending}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full rounded-2xl p-5 snowball-glow font-semibold flex items-center justify-center gap-2 hover:opacity-80 transition"
              style={{
                background: '#ffffff',
                color: '#2563eb',
                border: '1px solid rgba(37,99,235,0.25)',
              }}
            >
              <PlusCircle size={18} />
              Add New Debt
            </button>
          )}

          {/* Upcoming Payment Notifications */}
          {upcomingPayments.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} style={{ color: '#ef4444' }} />
                <span className="font-semibold text-xs tracking-wide uppercase" style={{ color: '#475569' }}>Upcoming payments</span>
              </div>
              <div className="space-y-2">
                {upcomingPayments.map(({ debt, label, color, bg, border }) => (
                  <div
                    key={debt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: bg,
                      border: `1px solid ${border}`,
                    }}
                  >
                    <span style={{ fontSize: '12px', color, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ fontSize: '12px', color: '#334155', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {debt.name} · {formatCurrency(debt.minimumPayment)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Calendar */}
          {debts.length > 0 && (
            <div>
              <PaymentCalendar debts={debts} />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
