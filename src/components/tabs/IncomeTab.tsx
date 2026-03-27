'use client';

import { useState } from 'react';
import { useSaveIncome, useCreateExpense, useDeleteExpense } from '@/lib/hooks';
import { Income, Expense, Debt } from '@/types';
import { Calculator, Repeat, Plus, X, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface IncomeTabProps {
  income: Income | null | undefined;
  expenses: Expense[];
  debts: Debt[];
  isLoading: boolean;
}

export default function IncomeTab({ income, expenses, debts, isLoading }: IncomeTabProps) {
  const [formData, setFormData] = useState({
    monthlyTakeHome: income?.monthlyTakeHome != null ? String(income.monthlyTakeHome) : '',
    essentialExpenses: income?.essentialExpenses != null ? String(income.essentialExpenses) : '',
  });

  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ name: '', amount: '' });

  const saveIncome = useSaveIncome();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const takeHome = parseFloat(formData.monthlyTakeHome) || 0;
  const essential = parseFloat(formData.essentialExpenses) || 0;

  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalEssential = essential + recurringTotal;
  const availableCashFlow = Math.max(0, takeHome - totalEssential - totalMinPayments);

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveIncome.mutateAsync({ monthlyTakeHome: takeHome, essentialExpenses: essential, extraPayment: 0 });
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[280, 220].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: '16px', background: '#f1f5f9', animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  return (
    <section id="section-income">
      {/* Income Section */}
      <div className="rounded-2xl p-5 snowball-glow mb-6" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
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
              onChange={(e) => setFormData({ ...formData, monthlyTakeHome: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, essentialExpenses: e.target.value })}
              className="input-field"
            />
            <p className="text-xs opacity-40 mt-1">Rent, utilities, groceries, insurance — excluding debt payments</p>
          </div>

          {/* Budget Visualization */}
          {takeHome > 0 && (
            <div className="rounded-xl p-4 mt-2" style={{ background: 'rgba(15,23,42,0.04)' }}>
              <div className="text-xs opacity-60 mb-2">Monthly Budget Breakdown</div>
              <div className="h-4 rounded-full overflow-hidden flex" style={{ background: 'rgba(15,23,42,0.06)' }}>
                {(() => {
                  const pctExp = Math.min(100, (totalEssential / takeHome) * 100);
                  const pctMin = Math.min(100 - pctExp, (totalMinPayments / takeHome) * 100);
                  const pctLeft = Math.max(0, 100 - pctExp - pctMin);

                  return (
                    <>
                      {pctExp > 0 && <div style={{ width: `${pctExp}%`, background: '#64748b' }} />}
                      {pctMin > 0 && <div style={{ width: `${pctMin}%`, background: '#f59e0b' }} />}
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
      <div className="rounded-2xl snowball-glow" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
        <button
          type="button"
          onClick={() => setRecurringOpen(o => !o)}
          className="w-full flex items-center justify-between p-5"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span className="font-semibold text-base flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Repeat size={18} style={{ color: '#3b82f6' }} />
            Recurring Expenses
          </span>
          <ChevronDown size={16} style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: recurringOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {recurringOpen && <div className="px-5 pb-5">
        <p className="text-xs opacity-60 mb-4">Track subscriptions, utilities, and other monthly recurring costs</p>

        {/* Add Form */}
        <form onSubmit={handleAddRecurring} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(15,23,42,0.1)' }}>
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
            <div key={expense.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(15,23,42,0.04)' }}>
              <div>
                <div className="text-sm font-medium">{expense.name}</div>
                <div className="text-xs opacity-50">{formatCurrency(expense.amount)}/mo</div>
              </div>
              <button
                onClick={() => deleteExpense.mutate(expense.id)}
                className="p-1 rounded hover:bg-slate-100 cursor-pointer bg-transparent border-0 text-txt opacity-40 hover:opacity-100 transition"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {expenses.length === 0 && <div className="text-center py-6 opacity-40 text-sm">No recurring expenses added yet.</div>}

        {expenses.length > 0 && (
          <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(15,23,42,0.04)' }}>
            <div className="flex items-center justify-between">
              <span className="opacity-60">Recurring Expenses Total:</span>
              <span className="mono font-semibold" style={{ color: '#3b82f6' }}>
                {formatCurrency(recurringTotal)}
              </span>
            </div>
          </div>
        )}
        </div>}
      </div>
    </section>
  );
}
