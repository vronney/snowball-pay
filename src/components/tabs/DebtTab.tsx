'use client';

import { useState } from 'react';
import { useCreateDebt, useDeleteDebt } from '@/lib/hooks';
import { Debt } from '@/types';
import { PlusCircle, Trash2, Inbox } from 'lucide-react';
import { formatCurrency, formatPercent, getCategoryColor, getOrdinalDay } from '@/lib/utils';
import DebtCard from '@/components/DebtCard';
import DebtForm from '@/components/DebtForm';

interface DebtTabProps {
  debts: Debt[];
  isLoading: boolean;
}

export default function DebtTab({ debts, isLoading }: DebtTabProps) {
  const [showForm, setShowForm] = useState(false);
  const createDebt = useCreateDebt();
  const deleteDebt = useDeleteDebt();

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const avgRate = debts.length > 0 ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length : 0;

  const creditCardDebts = debts.filter((d) => d.creditLimit > 0);
  const totalCCBalance = creditCardDebts.reduce((sum, d) => sum + d.balance, 0);
  const totalCCLimit = creditCardDebts.reduce((sum, d) => sum + d.creditLimit, 0);
  const ccUtilization = totalCCLimit > 0 ? (totalCCBalance / totalCCLimit) * 100 : 0;

  const handleSubmit = async (formData: any) => {
    try {
      await createDebt.mutateAsync(formData);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating debt:', error);
    }
  };

  const summaryCards = [
    {
      label: 'Total Debt',
      value: formatCurrency(totalDebt),
      icon: 'dollar-sign',
      color: '#ef4444',
    },
    {
      label: 'Monthly Minimums',
      value: formatCurrency(totalMin),
      icon: 'calendar',
      color: '#f59e0b',
    },
    {
      label: 'Avg Interest Rate',
      value: formatPercent(avgRate),
      icon: 'percent',
      color: '#8b5cf6',
    },
    {
      label: 'CC Utilization',
      value: formatPercent(ccUtilization),
      icon: 'credit-card',
      color: ccUtilization > 30 ? '#ef4444' : '#10b981',
    },
  ];

  if (isLoading) {
    return <div className="text-center py-12">Loading debts...</div>;
  }

  return (
    <section id="section-debts">
      {/* Summary Cards */}
      {debts.length > 0 && (
        <div id="debt-summary" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {summaryCards.map((card, idx) => (
            <div
              key={idx}
              className="rounded-xl p-3 animate-slideUp"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: card.color }}
                />
                <span className="text-xs opacity-50">{card.label}</span>
              </div>
              <span className="mono font-bold text-base">{card.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Debt Form */}
      {showForm ? (
        <div className="rounded-2xl p-5 mb-6 snowball-glow" style={{ background: 'rgba(26,35,50,1)' }}>
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <PlusCircle size={18} style={{ color: '#3b82f6' }} />
            <span>Add New Debt</span>
          </h2>
          <DebtForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isLoading={createDebt.isPending}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl p-5 mb-6 snowball-glow font-semibold flex items-center justify-center gap-2 hover:opacity-80 transition"
          style={{
            background: 'rgba(26,35,50,1)',
            color: '#3b82f6',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <PlusCircle size={18} />
          Add New Debt
        </button>
      )}

      {/* Debt List */}
      <div id="debt-list" className="space-y-3">
        {debts.map((debt) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            onDelete={() => deleteDebt.mutate(debt.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {debts.length === 0 && !showForm && (
        <div id="empty-debts" className="text-center py-12 opacity-40">
          <Inbox size={48} className="mx-auto mb-3" />
          <p className="text-sm">No debts added yet. Add your first debt above to get started.</p>
        </div>
      )}
    </section>
  );
}
