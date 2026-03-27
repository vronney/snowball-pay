import { type Debt, type BalanceSnapshot } from '@/types';

export interface UpcomingPayment {
  debt: Debt;
  daysUntilDue: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export function getUpcomingPayments(debts: Debt[]): UpcomingPayment[] {
  const today = new Date();
  const todayDay = today.getDate();
  const results: UpcomingPayment[] = [];

  for (const debt of debts) {
    if (!debt.dueDate) continue;
    const dueDay = debt.dueDate;

    let daysUntil: number;
    if (dueDay >= todayDay) {
      daysUntil = dueDay - todayDay;
    } else {
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

  return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export function computeStreak(snapshots: BalanceSnapshot[]): number {
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
