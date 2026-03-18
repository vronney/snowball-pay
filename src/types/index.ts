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
