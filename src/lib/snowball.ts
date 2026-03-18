import { Debt } from '@/types';

export interface SimulatedDebt {
  name: string;
  balance: number;
  monthlyRate: number;
  minimumPayment: number;
  category: string;
  originalBalance: number;
  paidOff: boolean;
  monthPaidOff: number;
}

export interface PayoffResult {
  months: number;
  years: number;
  totalInterestPaid: number;
  totalAmountPaid: number;
  debtFreeDate: Date;
  payoffSchedule: DebtPayoffSchedule[];
  monthlyPayment: number;
}

export interface DebtPayoffSchedule {
  debtName: string;
  category: string;
  originalBalance: number;
  monthPaidOff: number;
  interestPaid: number;
  orderInPayoff: number;
}

/**
 * Calculates debt payoff plan using the snowball method
 * @param debts Array of debts to pay off
 * @param monthlyIncome Monthly take-home income
 * @param essentialExpenses Monthly essential expenses
 * @param recurringExpenses Monthly recurring expenses (subscriptions, etc)
 * @param extraPayment Extra monthly amount available for debt
 * @returns PayoffResult with detailed payoff schedule
 */
export function calculateDebtSnowball(
  debts: Debt[],
  monthlyIncome: number,
  essentialExpenses: number,
  recurringExpenses: number = 0,
  extraPayment: number = 0
): PayoffResult {
  if (debts.length === 0) {
    return {
      months: 0,
      years: 0,
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      debtFreeDate: new Date(),
      payoffSchedule: [],
      monthlyPayment: 0,
    };
  }

  // Sort debts by balance (smallest first) - snowball method
  const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);

  // Initialize simulated debts
  const simDebts: SimulatedDebt[] = sortedDebts.map((debt) => ({
    name: debt.name,
    balance: debt.balance || 0,
    monthlyRate: (debt.interestRate || 0) / 100 / 12,
    minimumPayment: debt.minimumPayment || 0,
    category: debt.category,
    originalBalance: debt.originalBalance || debt.balance || 0,
    paidOff: false,
    monthPaidOff: 0,
  }));

  // Calculate available cash flow after all minimum payments
  const totalMinimumPayments = simDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalEssential = essentialExpenses + recurringExpenses;
  const availableCashFlow = Math.max(0, monthlyIncome - totalEssential - totalMinimumPayments + extraPayment);
  const totalMonthlyPayment = totalMinimumPayments + availableCashFlow;

  let month = 0;
  let totalInterestPaid = 0;
  let snowballExtra = availableCashFlow;
  const maxMonths = 360; // 30 year cap

  // Simulation loop
  while (simDebts.some((d) => d.balance > 0.01) && month < maxMonths) {
    month++;
    let extraThisMonth = snowballExtra;

    // Find the next target (smallest balance not yet paid off)
    const targetIndex = simDebts.findIndex((d) => d.balance > 0.01);

    simDebts.forEach((debt, i) => {
      if (debt.balance <= 0.01) return;

      // Apply interest
      const interest = debt.balance * debt.monthlyRate;
      totalInterestPaid += interest;
      debt.balance += interest;

      // Calculate payment
      let payment = debt.minimumPayment;
      if (i === targetIndex) {
        payment += extraThisMonth;
        extraThisMonth = 0;
      }

      // Apply payment
      payment = Math.min(payment, debt.balance);
      debt.balance -= payment;

      // Check if paid off
      if (debt.balance <= 0.01) {
        debt.balance = 0;
        debt.paidOff = true;
        debt.monthPaidOff = month;
        // Add freed-up minimum payment to snowball
        snowballExtra += debt.minimumPayment;
      }
    });
  }

  // Create payoff schedule
  const payoffSchedule: DebtPayoffSchedule[] = simDebts.map((debt, index) => ({
    debtName: debt.name,
    category: debt.category,
    originalBalance: debt.originalBalance,
    monthPaidOff: debt.monthPaidOff || 0,
    interestPaid: debt.monthPaidOff > 0 ? calculateDebtInterest(debt) : 0,
    orderInPayoff: simDebts.filter((d) => d.monthPaidOff < debt.monthPaidOff || (d.monthPaidOff === 0 && debt.monthPaidOff > 0)).length + 1,
  }));

  // Sort by payoff order
  payoffSchedule.sort((a, b) => a.monthPaidOff - b.monthPaidOff);

  const totalAmountPaid = debts.reduce((sum, d) => sum + (d.balance || 0), 0) + totalInterestPaid;
  const years = Math.floor(month / 12);
  const months_remaining = month % 12;
  
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
  };
}

/**
 * Helper function to calculate total interest paid for a debt
 */
function calculateDebtInterest(debt: SimulatedDebt): number {
  const totalPaid = debt.originalBalance * (1 + debt.monthlyRate * debt.monthPaidOff);
  return Math.max(0, totalPaid - debt.originalBalance);
}

/**
 * Alternative calculation: Avalanche method (highest interest rate first)
 */
export function calculateDebtAvalanche(
  debts: Debt[],
  monthlyIncome: number,
  essentialExpenses: number,
  recurringExpenses: number = 0,
  extraPayment: number = 0
): PayoffResult {
  if (debts.length === 0) {
    return {
      months: 0,
      years: 0,
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      debtFreeDate: new Date(),
      payoffSchedule: [],
      monthlyPayment: 0,
    };
  }

  // Sort debts by interest rate (highest first) - avalanche method
  const sortedDebts = [...debts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));

  // Rest of the logic is the same as snowball
  // Initialize simulated debts
  const simDebts: SimulatedDebt[] = sortedDebts.map((debt) => ({
    name: debt.name,
    balance: debt.balance || 0,
    monthlyRate: (debt.interestRate || 0) / 100 / 12,
    minimumPayment: debt.minimumPayment || 0,
    category: debt.category,
    originalBalance: debt.originalBalance || debt.balance || 0,
    paidOff: false,
    monthPaidOff: 0,
  }));

  const totalMinimumPayments = simDebts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const totalEssential = essentialExpenses + recurringExpenses;
  const availableCashFlow = Math.max(0, monthlyIncome - totalEssential - totalMinimumPayments + extraPayment);
  const totalMonthlyPayment = totalMinimumPayments + availableCashFlow;

  let month = 0;
  let totalInterestPaid = 0;
  let snowballExtra = availableCashFlow;
  const maxMonths = 360;

  while (simDebts.some((d) => d.balance > 0.01) && month < maxMonths) {
    month++;
    let extraThisMonth = snowballExtra;

    const targetIndex = simDebts.findIndex((d) => d.balance > 0.01);

    simDebts.forEach((debt, i) => {
      if (debt.balance <= 0.01) return;

      const interest = debt.balance * debt.monthlyRate;
      totalInterestPaid += interest;
      debt.balance += interest;

      let payment = debt.minimumPayment;
      if (i === targetIndex) {
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
  }

  const payoffSchedule: DebtPayoffSchedule[] = simDebts.map((debt) => ({
    debtName: debt.name,
    category: debt.category,
    originalBalance: debt.originalBalance,
    monthPaidOff: debt.monthPaidOff || 0,
    interestPaid: debt.monthPaidOff > 0 ? calculateDebtInterest(debt) : 0,
    orderInPayoff: simDebts.filter((d) => d.monthPaidOff < debt.monthPaidOff || (d.monthPaidOff === 0 && debt.monthPaidOff > 0)).length + 1,
  }));

  payoffSchedule.sort((a, b) => a.monthPaidOff - b.monthPaidOff);

  const totalAmountPaid = debts.reduce((sum, d) => sum + (d.balance || 0), 0) + totalInterestPaid;
  const years = Math.floor(month / 12);
  const months_remaining = month % 12;
  
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
  };
}
