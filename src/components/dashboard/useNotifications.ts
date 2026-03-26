import { useMemo } from "react";
import { AlertTriangle, CalendarClock, ShieldAlert } from "lucide-react";
import { type Debt, type Income, type Expense } from "@/types";
import { type Notification } from "./types";

const today = new Date();

interface UseNotificationsParams {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  debtsLoading: boolean;
  incomeLoading: boolean;
  paidThisMonth: Map<string, string>;
  notifyDueDates: boolean;
  notifyLowBuffer: boolean;
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
}: UseNotificationsParams) {
  const notifications = useMemo((): Notification[] => {
    const items: Notification[] = [];

    // 1. Upcoming due dates from debts that have dueDate set (skip already paid)
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

      if (daysUntil <= 3) {
        items.push({
          id: `due-urgent-${debt.id}`,
          type: "urgent",
          icon: CalendarClock,
          title: `${debt.name} due in ${daysUntil === 0 ? "today" : `${daysUntil}d`}`,
          body: `Minimum payment of $${debt.minimumPayment.toFixed(2)} due on the ${day}${day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}.`,
          tab: "debts",
          debtId: debt.id,
          debtAmount: debt.minimumPayment,
        });
      } else if (daysUntil <= 7) {
        items.push({
          id: `due-warn-${debt.id}`,
          type: "warning",
          icon: CalendarClock,
          title: `${debt.name} due in ${daysUntil}d`,
          body: `Minimum payment of $${debt.minimumPayment.toFixed(2)} coming up.`,
          tab: "debts",
          debtId: debt.id,
          debtAmount: debt.minimumPayment,
        });
      }
    }

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
        items.push({
          id: "guardrail-buffer",
          type: "warning",
          icon: ShieldAlert,
          title: "Low cash buffer",
          body: `Only $${leftover.toFixed(0)} left after acceleration — target is $${bufferTarget.toFixed(0)} (10% of take-home).`,
          tab: "plan",
        });
      }
    }

    // 3. No income set yet
    if (!income && !incomeLoading) {
      items.push({
        id: "no-income",
        type: "info",
        icon: AlertTriangle,
        title: "Set up your budget",
        body: "Add your monthly income and expenses to unlock your payoff plan.",
        tab: "income",
      });
    }

    // 4. No debts yet
    if (debts.length === 0 && !debtsLoading) {
      items.push({
        id: "no-debts",
        type: "info",
        icon: AlertTriangle,
        title: "Add your first debt",
        body: "Track your balances and build a personalised payoff schedule.",
        tab: "debts",
      });
    }

    return items;
  }, [
    debts,
    income,
    expenses,
    debtsLoading,
    incomeLoading,
    paidThisMonth,
    notifyDueDates,
    notifyLowBuffer,
  ]);

  const urgentCount = notifications.filter((n) => n.type === "urgent").length;
  const badgeCount = notifications.filter((n) => n.type !== "info").length;

  return { notifications, urgentCount, badgeCount };
}
