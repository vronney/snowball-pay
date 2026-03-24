'use client';

import { useState } from 'react';
import { useDebts, useIncome, useExpenses, useBonusIncomes } from '@/lib/hooks';
import DebtTab from '@/components/tabs/DebtTab';
import IncomeTab from '@/components/tabs/IncomeTab';
import PayoffTab from '@/components/tabs/PayoffTab';
import DocumentImport from '@/components/DocumentImport';
import Header from '@/components/Header';
import TabNavigation from '@/components/TabNavigation';

type UserInfo = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

export default function DashboardClient({ user }: { user: UserInfo | null }) {
  const [activeTab, setActiveTab] = useState<'debts' | 'income' | 'plan' | 'documents'>('debts');
  const { data: debtsData, isLoading: debtsLoading } = useDebts();
  const { data: incomeData, isLoading: incomeLoading } = useIncome();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();
  const { data: bonusIncomesData, isLoading: bonusIncomesLoading } = useBonusIncomes();

  const debts = debtsData?.debts || [];
  const income = incomeData?.income;
  const expenses = expensesData?.expenses || [];
  const bonusIncomes = bonusIncomesData?.bonusIncomes || [];

  return (
    <div className="min-h-screen bg-bg text-txt">
      <Header user={user} />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-4xl mx-auto px-6 pb-12">
        <div key={activeTab} className="tab-fade-in">
          {activeTab === 'debts' && (
            <DebtTab debts={debts} isLoading={debtsLoading} />
          )}

          {activeTab === 'income' && (
            <IncomeTab
              income={income}
              expenses={expenses}
              bonusIncomes={bonusIncomes}
              debts={debts}
              isLoading={incomeLoading || expensesLoading || bonusIncomesLoading}
            />
          )}

          {activeTab === 'plan' && (
            <PayoffTab
              debts={debts}
              income={income}
              expenses={expenses}
              bonusIncomes={bonusIncomes}
              isLoading={debtsLoading || incomeLoading}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentImport />
          )}
        </div>
      </main>
    </div>
  );
}
