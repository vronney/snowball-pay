export interface Debt {
  id: string;
  userId: string;
  name: string;
  category: 'Credit Card' | 'Student Loan' | 'Auto Loan' | 'Mortgage' | 'Personal Loan' | 'Medical Debt' | 'Other';
  balance: number;
  originalBalance: number;
  interestRate: number;
  minimumPayment: number;
  creditLimit: number;
  priorityOrder?: number | null;
  dueDate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  userId: string;
  monthlyTakeHome: number;
  essentialExpenses: number;
  extraPayment: number;
  payoffMethod?: string;
  accelerationAmount?: number | null;
  source?: string;
  frequency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoffPlan {
  id: string;
  userId: string;
  debtFreeDate: Date;
  totalInterestPaid: number;
  totalAmountPaid: number;
  monthlyPayment: number;
  payoffSteps: PayoffStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoffStep {
  id: string;
  debtId: string;
  payoffPlanId: string;
  stepNumber: number;
  startBalance: number;
  payoffMonth: number;
  interestPaid: number;
}

// One balance snapshot per debt per month — recorded from the user's statement.
// Plotted against the projected line in the Balance Over Time chart to show
// how actual payoff progress compares to the plan.
export interface BalanceSnapshot {
  id: string;
  debtId: string;
  userId: string;
  balance: number;
  recordedAt: string; // ISO string, normalized to 1st of month
  createdAt: string;
}

export interface DebtSummary {
  totalDebt: number;
  totalMonthlyMinimums: number;
  averageInterestRate: number;
  creditCardUtilization: number;
}

export interface BudgetSummary {
  income: number;
  essentialExpenses: number;
  recurringExpenses: number;
  debtMinimums: number;
  availableCashFlow: number;
}
