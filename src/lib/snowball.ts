import { Debt } from '@/types';

export type PayoffMethod = 'snowball' | 'avalanche' | 'custom';

interface SimulatedDebt {
  id: string;
  name: string;
  balance: number;
  monthlyRate: number;
  minimumPayment: number;
  category: string;
  originalBalance: number;
  priorityOrder?: number;
  paidOff: boolean;
  monthPaidOff: number;
  interestPaid: number;
}

export interface DebtPayoffSchedule {
  debtId: string;
  debtName: string;
  category: string;
  originalBalance: number;
  monthPaidOff: number;
  interestPaid: number;
  orderInPayoff: number;
}

export interface MonthlyBalance {
  month: number;
  date: string;
  totalBalance: number;
}

export interface PayoffResult {
  months: number;
  years: number;
  totalInterestPaid: number;
  totalAmountPaid: number;
  debtFreeDate: Date;
  payoffSchedule: DebtPayoffSchedule[];
  monthlyPayment: number;
  monthlyBalances: MonthlyBalance[];
}

const MAX_MONTHS = 360;

function getSorter(method: PayoffMethod) {
  if (method === 'avalanche') {
    return (a: Debt, b: Debt) => (b.interestRate || 0) - (a.interestRate || 0);
  }

  if (method === 'custom') {
    return (a: Debt, b: Debt) => {
      const aPriority = a.priorityOrder ?? Number.MAX_SAFE_INTEGER;
      const bPriority = b.priorityOrder ?? Number.MAX_SAFE_INTEGER;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return (a.balance || 0) - (b.balance || 0);
    };
  }

  return (a: Debt, b: Debt) => (a.balance || 0) - (b.balance || 0);
}

function calculatePayoffByMethod(
  debts: Debt[],
  monthlyIncome: number,
  essentialExpenses: number,
  recurringExpenses = 0,
  extraPayment = 0,
  method: PayoffMethod = 'snowball'
): PayoffResult {
  function offsetDate(offsetMonths: number): string {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  if (debts.length === 0) {
    return {
      months: 0,
      years: 0,
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      debtFreeDate: new Date(),
      payoffSchedule: [],
      monthlyPayment: 0,
      monthlyBalances: [],
    };
  }

  const sortedDebts = [...debts].sort(getSorter(method));
  const simDebts: SimulatedDebt[] = sortedDebts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: debt.balance || 0,
    monthlyRate: (debt.interestRate || 0) / 100 / 12,
    minimumPayment: debt.minimumPayment || 0,
    category: debt.category,
    originalBalance: debt.originalBalance || debt.balance || 0,
    priorityOrder: debt.priorityOrder ?? undefined,
    paidOff: false,
    monthPaidOff: 0,
    interestPaid: 0,
  }));

  const totalMinimumPayments = simDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const totalEssential = essentialExpenses + recurringExpenses;
  const availableCashFlow = Math.max(0, monthlyIncome - totalEssential - totalMinimumPayments + extraPayment);
  const totalMonthlyPayment = totalMinimumPayments + availableCashFlow;

  let month = 0;
  let totalInterestPaid = 0;
  let snowballExtra = availableCashFlow;

  const startBalance = simDebts.reduce((sum, d) => sum + d.balance, 0);
  const monthlyBalances: MonthlyBalance[] = [
    { month: 0, date: offsetDate(0), totalBalance: startBalance },
  ];

  while (simDebts.some((debt) => debt.balance > 0.01) && month < MAX_MONTHS) {
    month += 1;
    let extraThisMonth = snowballExtra;
    const targetIndex = simDebts.findIndex((debt) => debt.balance > 0.01);

    simDebts.forEach((debt, index) => {
      if (debt.balance <= 0.01) {
        return;
      }

      const interest = debt.balance * debt.monthlyRate;
      debt.interestPaid += interest;
      totalInterestPaid += interest;
      debt.balance += interest;

      let payment = debt.minimumPayment;
      if (index === targetIndex) {
        payment += extraThisMonth;
        extraThisMonth = 0;
      }

      payment = Math.min(payment, debt.balance);
      debt.balance -= payment;

      if (debt.balance <= 0.01) {
        debt.balance = 0;
        debt.paidOff = true;
        debt.monthPaidOff = month;
        snowballExtra += debt.minimumPayment;
      }
    });

    const remaining = simDebts.reduce((sum, d) => sum + d.balance, 0);
    monthlyBalances.push({ month, date: offsetDate(month), totalBalance: remaining });
  }

  const scheduleByPayoff = [...simDebts].sort((a, b) => {
    const aMonth = a.monthPaidOff > 0 ? a.monthPaidOff : Number.MAX_SAFE_INTEGER;
    const bMonth = b.monthPaidOff > 0 ? b.monthPaidOff : Number.MAX_SAFE_INTEGER;
    return aMonth - bMonth;
  });

  const payoffSchedule: DebtPayoffSchedule[] = scheduleByPayoff.map((debt, index) => ({
    debtId: debt.id,
    debtName: debt.name,
    category: debt.category,
    originalBalance: debt.originalBalance,
    monthPaidOff: debt.monthPaidOff,
    interestPaid: debt.interestPaid,
    orderInPayoff: index + 1,
  }));

  const totalAmountPaid = debts.reduce((sum, debt) => sum + (debt.balance || 0), 0) + totalInterestPaid;
  const years = Math.floor(month / 12);
  const debtFreeDate = new Date();
  debtFreeDate.setMonth(debtFreeDate.getMonth() + month);

  return {
    months: month,
    years,
    totalInterestPaid,
    totalAmountPaid,
    debtFreeDate,
    payoffSchedule,
    monthlyPayment: totalMonthlyPayment,
    monthlyBalances,
  };
}

/**
 * Calculates debt payoff plan using the snowball method.
 */
export function calculateDebtSnowball(
  debts: Debt[],
  monthlyIncome: number,
  essentialExpenses: number,
  recurringExpenses = 0,
  extraPayment = 0
): PayoffResult {
  return calculatePayoffByMethod(debts, monthlyIncome, essentialExpenses, recurringExpenses, extraPayment, 'snowball');
}

/**
 * Calculates debt payoff plan using the avalanche method.
 */
export function calculateDebtAvalanche(
  debts: Debt[],
  monthlyIncome: number,
  essentialExpenses: number,
  recurringExpenses = 0,
  extraPayment = 0
): PayoffResult {
  return calculatePayoffByMethod(debts, monthlyIncome, essentialExpenses, recurringExpenses, extraPayment, 'avalanche');
}

/**
 * Calculates debt payoff plan using a custom debt priority order.
 */
export function calculateDebtCustom(
  debts: Debt[],
  monthlyIncome: number,
  essentialExpenses: number,
  recurringExpenses = 0,
  extraPayment = 0
): PayoffResult {
  return calculatePayoffByMethod(debts, monthlyIncome, essentialExpenses, recurringExpenses, extraPayment, 'custom');
}
