import { useMemo } from "react";
import { AlertTriangle, CalendarClock, ShieldAlert, Trophy, TrendingDown } from "lucide-react";
import { type Debt, type Income, type Expense } from "@/types";
import { type Notification } from "./types";

const MILESTONE_THRESHOLDS = [50_000, 25_000, 10_000, 5_000, 1_000];

interface UseNotificationsParams {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  debtsLoading: boolean;
  incomeLoading: boolean;
  paidThisMonth: Map<string, string>;
  notifyDueDates: boolean;
  notifyLowBuffer: boolean;
  notifyMilestones: boolean;
  notifyBudgetChanges: boolean;
}

export function useNotifications({
  debts,
  income,
  expenses,
  debtsLoading,
  incomeLoading,
  paidThisMonth,
  notifyDueDates,
  notifyLowBuffer,
  notifyMilestones,
  notifyBudgetChanges,
}: UseNotificationsParams) {
  const notifications = useMemo((): Notification[] => {
    const today = new Date();
    const dueDateItems: Notification[] = [];
    const otherItems: Notification[] = [];

    // 1. Upcoming due dates — collect with daysUntil, sort soonest first
    const debtsWithDue = notifyDueDates
      ? debts.filter((d) => d.dueDate != null && !paidThisMonth.has(d.id))
      : [];
    for (const debt of debtsWithDue) {
      const day = debt.dueDate as number;
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
      const nextDue =
        thisMonth >= today
          ? thisMonth
          : new Date(today.getFullYear(), today.getMonth() + 1, day);
      const daysUntil = Math.ceil(
        (nextDue.getTime() - today.getTime()) / 86400000,
      );
      const ord = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";

      if (daysUntil <= 3) {
        dueDateItems.push({
          id: `due-urgent-${debt.id}`,
          type: "urgent",
          icon: CalendarClock,
          title: `${debt.name} due ${daysUntil === 0 ? "today" : `in ${daysUntil}d`}`,
          body: `Minimum payment of $${debt.minimumPayment.toFixed(2)} due on the ${day}${ord}.`,
          tab: "debts",
          debtId: debt.id,
          debtAmount: debt.minimumPayment,
          daysUntil,
        });
      } else if (daysUntil <= 7) {
        dueDateItems.push({
          id: `due-warn-${debt.id}`,
          type: "warning",
          icon: CalendarClock,
          title: `${debt.name} due in ${daysUntil}d`,
          body: `Minimum payment of $${debt.minimumPayment.toFixed(2)} coming up.`,
          tab: "debts",
          debtId: debt.id,
          debtAmount: debt.minimumPayment,
          daysUntil,
        });
      }
    }

    // Sort due-date notifications soonest first
    dueDateItems.sort((a, b) => (a.daysUntil ?? 99) - (b.daysUntil ?? 99));

    // 2. Guardrail: low cash buffer after acceleration
    if (notifyLowBuffer && income) {
      const recurringTotal = expenses.reduce((s, e) => s + e.amount, 0);
      const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
      const available = Math.max(
        0,
        income.monthlyTakeHome -
          income.essentialExpenses -
          recurringTotal -
          totalMin +
          income.extraPayment,
      );
      const accel =
        income.accelerationAmount != null
          ? Math.min(income.accelerationAmount, available)
          : available;
      const leftover = Math.max(0, available - accel);
      const bufferTarget = income.monthlyTakeHome * 0.1;
      if (leftover < bufferTarget && accel > 0) {
        otherItems.push({
          id: "guardrail-buffer",
          type: "warning",
          icon: ShieldAlert,
          title: "Low cash buffer",
          body: `Only $${leftover.toFixed(0)} left after acceleration — target is $${bufferTarget.toFixed(0)} (10% of take-home).`,
          tab: "plan",
        });
      }
    }

    // 3. Milestone celebrations
    if (notifyMilestones && debts.length > 0) {
      const totalRemaining = debts.reduce((s, d) => s + d.balance, 0);
      const paidOffDebt = debts.find((d) => d.balance <= 0);

      if (paidOffDebt) {
        otherItems.push({
          id: `milestone-paidoff-${paidOffDebt.id}`,
          type: "info",
          icon: Trophy,
          title: `${paidOffDebt.name} is paid off!`,
          body: "Congratulations — one debt down. Keep the snowball rolling.",
          tab: "plan",
        });
      } else {
        const crossed = MILESTONE_THRESHOLDS.find((t) => totalRemaining <= t);
        if (crossed) {
          otherItems.push({
            id: `milestone-under-${crossed}`,
            type: "info",
            icon: Trophy,
            title: `Under $${(crossed / 1000).toFixed(0)}k remaining!`,
            body: `Total debt is now $${Math.round(totalRemaining).toLocaleString()}. You're making real progress.`,
            tab: "plan",
          });
        }
      }
    }

    // 4. Budget change alerts — flag when expenses + minimums exceed take-home
    if (notifyBudgetChanges && income) {
      const recurringTotal = expenses.reduce((s, e) => s + e.amount, 0);
      const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
      const shortfall =
        income.essentialExpenses + recurringTotal + totalMin - income.monthlyTakeHome;
      if (shortfall > 0) {
        otherItems.push({
          id: "budget-shortfall",
          type: "urgent",
          icon: TrendingDown,
          title: "Budget shortfall detected",
          body: `Expenses and minimums exceed take-home by $${Math.round(shortfall).toLocaleString()}. Review your budget.`,
          tab: "income",
        });
      }
    }

    // 5. No income set yet
    if (!income && !incomeLoading) {
      otherItems.push({
        id: "no-income",
        type: "info",
        icon: AlertTriangle,
        title: "Set up your budget",
        body: "Add your monthly income and expenses to unlock your payoff plan.",
        tab: "income",
      });
    }

    // 6. No debts yet
    if (debts.length === 0 && !debtsLoading) {
      otherItems.push({
        id: "no-debts",
        type: "info",
        icon: AlertTriangle,
        title: "Add your first debt",
        body: "Track your balances and build a personalised payoff schedule.",
        tab: "debts",
      });
    }

    return [...dueDateItems, ...otherItems];
  }, [
    debts,
    income,
    expenses,
    debtsLoading,
    incomeLoading,
    paidThisMonth,
    notifyDueDates,
    notifyLowBuffer,
    notifyMilestones,
    notifyBudgetChanges,
  ]);

  const urgentCount = notifications.filter((n) => n.type === "urgent").length;
  const badgeCount = notifications.filter((n) => n.type !== "info").length;

  return { notifications, urgentCount, badgeCount };
}
