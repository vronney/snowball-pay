'use client';

import { useState, useEffect } from 'react';
import { useSaveIncome, useCreateExpense, useDeleteExpense } from '@/lib/hooks';
import { Income, Expense, Debt } from '@/types';
import { Calculator, Repeat, Plus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface IncomeTabProps {
  income: Income | null | undefined;
  expenses: Expense[];
  debts: Debt[];
  isLoading: boolean;
}

export default function IncomeTab({ income, expenses, debts, isLoading }: IncomeTabProps) {
  const [formData, setFormData] = useState({
    monthlyTakeHome: income?.monthlyTakeHome || 0,
    essentialExpenses: income?.essentialExpenses || 0,
    extraPayment: income?.extraPayment || 0,
  });

  const [recurringForm, setRecurringForm] = useState({
    name: '',
    amount: '',
  });

  const saveIncome = useSaveIncome();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalEssential = formData.essentialExpenses + recurringTotal;
  const availableCashFlow = Math.max(
    0,
    formData.monthlyTakeHome - totalEssential - totalMinPayments + formData.extraPayment
  );

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveIncome.mutateAsync(formData);
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.name || !recurringForm.amount) return;

    await createExpense.mutateAsync({
      name: recurringForm.name,
      amount: parseFloat(recurringForm.amount),
      frequency: 'monthly',
      category: 'recurring',
    });

    setRecurringForm({ name: '', amount: '' });
  };

  const handleDeleteRecurring = (id: string) => {
    deleteExpense.mutate(id);
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <section id="section-income">
      {/* Income Section */}
      <div className="rounded-2xl p-5 snowball-glow mb-6" style={{ background: 'rgba(26,35,50,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Calculator size={18} style={{ color: '#3b82f6' }} />
          Monthly Budget
        </h2>
        <form onSubmit={handleIncomeSubmit} className="space-y-4">
          <div>
            <label className="text-xs opacity-60 mb-1 block">Monthly Take-Home Income ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="4500"
              value={formData.monthlyTakeHome}
              onChange={(e) => setFormData({ ...formData, monthlyTakeHome: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs opacity-60 mb-1 block">Monthly Essential Expenses ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="2800"
              value={formData.essentialExpenses}
              onChange={(e) => setFormData({ ...formData, essentialExpenses: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
            <p className="text-xs opacity-40 mt-1">Rent, utilities, groceries, insurance — excluding debt payments</p>
          </div>

          <div>
            <label className="text-xs opacity-60 mb-1 block">Extra Monthly Amount for Debt ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="200"
              value={formData.extraPayment}
              onChange={(e) => setFormData({ ...formData, extraPayment: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
            <p className="text-xs opacity-40 mt-1">Any amount above minimums you can throw at debt each month</p>
          </div>

          {/* Budget Visualization */}
          {formData.monthlyTakeHome > 0 && (
            <div className="rounded-xl p-4 mt-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-xs opacity-60 mb-2">Monthly Budget Breakdown</div>
              <div className="h-4 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {(() => {
                  const pctExp = Math.min(100, (totalEssential / formData.monthlyTakeHome) * 100);
                  const pctMin = Math.min(100 - pctExp, (totalMinPayments / formData.monthlyTakeHome) * 100);
                  const pctExtra = Math.min(100 - pctExp - pctMin, (formData.extraPayment / formData.monthlyTakeHome) * 100);
                  const pctLeft = Math.max(0, 100 - pctExp - pctMin - pctExtra);

                  return (
                    <>
                      {pctExp > 0 && <div style={{ width: `${pctExp}%`, background: '#64748b' }} />}
                      {pctMin > 0 && <div style={{ width: `${pctMin}%`, background: '#f59e0b' }} />}
                      {pctExtra > 0 && <div style={{ width: `${pctExtra}%`, background: '#3b82f6' }} />}
                      {pctLeft > 0 && <div style={{ width: `${pctLeft}%`, background: '#10b981' }} />}
                    </>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                <span>
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#64748b' }} />
                  Essential+Recurring {formatCurrency(totalEssential)}
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#f59e0b' }} />
                  Minimums {formatCurrency(totalMinPayments)}
                </span>
                <span>
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#3b82f6' }} />
                  Extra {formatCurrency(formData.extraPayment)}
                </span>
                <span style={{ color: availableCashFlow >= 0 ? '#10b981' : '#ef4444' }}>
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ background: availableCashFlow >= 0 ? '#10b981' : '#ef4444' }}
                  />
                  Remaining {formatCurrency(availableCashFlow)}
                </span>
              </div>
            </div>
          )}

          <button type="submit" disabled={saveIncome.isPending} className="btn-primary w-full sm:w-auto px-3" style={{ background: '#3b82f6' }}>
            Save Budget
          </button>
          {saveIncome.isSuccess && <p className="text-emerald-400 text-xs">Budget saved!</p>}
          {saveIncome.isError && <p className="text-red-400 text-xs">Error saving budget</p>}
        </form>
      </div>

      {/* Recurring Expenses Section */}
      <div className="rounded-2xl p-5 snowball-glow" style={{ background: 'rgba(26,35,50,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Repeat size={18} style={{ color: '#3b82f6' }} />
          Recurring Expenses
        </h2>
        <p className="text-xs opacity-60 mb-4">Track subscriptions, utilities, and other monthly recurring costs</p>

        {/* Add Form */}
        <form onSubmit={handleAddRecurring} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 pb-4 border-b border-white/10">
          <div>
            <label className="text-xs opacity-60 mb-1 block">Expense Name</label>
            <input
              type="text"
              placeholder="e.g. Netflix"
              value={recurringForm.name}
              onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs opacity-60 mb-1 block">Monthly Cost ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="15.99"
              value={recurringForm.amount}
              onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={createExpense.isPending} className="btn-primary w-full" style={{ background: '#3b82f6' }}>
              <Plus size={16} />
              Add
            </button>
          </div>
        </form>

        {/* List */}
        <div className="space-y-2 mb-4">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <div className="text-sm font-medium">{expense.name}</div>
                <div className="text-xs opacity-50">{formatCurrency(expense.amount)}/mo</div>
              </div>
              <button
                onClick={() => handleDeleteRecurring(expense.id)}
                className="p-1 rounded hover:bg-white/5 cursor-pointer bg-transparent border-0 text-txt opacity-40 hover:opacity-100 transition"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {expenses.length === 0 && <div className="text-center py-6 opacity-40 text-sm">No recurring expenses added yet.</div>}

        {expenses.length > 0 && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-center justify-between">
              <span className="opacity-60">Recurring Expenses Total:</span>
              <span className="mono font-semibold" style={{ color: '#3b82f6' }}>
                {formatCurrency(recurringTotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
