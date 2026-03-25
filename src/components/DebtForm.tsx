import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Debt } from '@/types';

interface DebtFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  initialData?: Partial<Debt>;
  submitLabel?: string;
}

export default function DebtForm({ onSubmit, onCancel, isLoading, initialData, submitLabel }: DebtFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '',
    category: initialData?.category ?? '',
    balance: initialData?.balance != null ? String(initialData.balance) : '',
    interestRate: initialData?.interestRate != null ? String(initialData.interestRate) : '',
    minimumPayment: initialData?.minimumPayment != null ? String(initialData.minimumPayment) : '',
    creditLimit: initialData?.creditLimit ? String(initialData.creditLimit) : '',
    dueDate: initialData?.dueDate != null ? String(initialData.dueDate) : '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.category || !formData.balance || !formData.interestRate || !formData.minimumPayment) {
      setError('Please fill in all required fields.');
      return;
    }

    onSubmit({
      name: formData.name,
      category: formData.category,
      balance: parseFloat(formData.balance),
      interestRate: parseFloat(formData.interestRate),
      minimumPayment: parseFloat(formData.minimumPayment),
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
      dueDate: formData.dueDate ? parseInt(formData.dueDate) : undefined,
    });

    if (!initialData) {
      setFormData({ name: '', category: '', balance: '', interestRate: '', minimumPayment: '', creditLimit: '', dueDate: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label htmlFor="debt-name" className="text-xs opacity-60 mb-1 block">
          Debt Name
        </label>
        <input
          id="debt-name"
          type="text"
          placeholder="e.g. Chase Visa"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="debt-category" className="text-xs opacity-60 mb-1 block">
          Category
        </label>
        <select
          id="debt-category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="input-field"
          required
        >
          <option value="" className='bg-slate-400/10 text-black/80'>Select type…</option>
          <option value="Credit Card" className=' bg-slate-400/10 text-black/80'>Credit Card</option>
          <option value="Student Loan" className=' bg-slate-400/10 text-black/80'>Student Loan</option>
          <option value="Auto Loan" className=' bg-slate-400/10 text-black/80'>Auto Loan</option>
          <option value="Mortgage" className=' bg-slate-400/10 text-black/80'>Mortgage</option>
          <option value="Personal Loan" className=' bg-slate-400/10 text-black/80'>Personal Loan</option>
          <option value="Medical Debt" className=' bg-slate-400/10 text-black/80'>Medical Debt</option>
          <option value="Other" className=' bg-slate-400/10 text-black/80'>Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="debt-balance" className="text-xs opacity-60 mb-1 block">
          Current Balance ($)
        </label>
        <input
          id="debt-balance"
          type="number"
          step="0.01"
          min="0"
          placeholder="5000"
          value={formData.balance}
          onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="debt-rate" className="text-xs opacity-60 mb-1 block">
          Interest Rate (%)
        </label>
        <input
          id="debt-rate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="19.99"
          value={formData.interestRate}
          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="debt-min" className="text-xs opacity-60 mb-1 block">
          Minimum Payment ($)
        </label>
        <input
          id="debt-min"
          type="number"
          step="0.01"
          min="0"
          placeholder="150"
          value={formData.minimumPayment}
          onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
          className="input-field"
          required
        />
      </div>

      <div>
        <label htmlFor="debt-limit" className="text-xs opacity-60 mb-1 block">
          Credit Limit (if applicable)
        </label>
        <input
          id="debt-limit"
          type="number"
          step="0.01"
          min="0"
          placeholder="10000"
          value={formData.creditLimit}
          onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="debt-due" className="text-xs opacity-60 mb-1 block">
          Due Date (day of month)
        </label>
        <input
          id="debt-due"
          type="number"
          min="1"
          max="31"
          placeholder="15"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          className="input-field"
        />
      </div>

      <div className="sm:col-span-2 flex items-end gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary flex-1 whitespace-nowrap"
          style={{ background: isLoading ? '#64748b' : '#3b82f6' }}
        >
          {submitLabel ? <Check size={16} /> : <Plus size={16} />}
          {isLoading ? 'Saving…' : (submitLabel ?? 'Add Debt')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg py-2.5 text-sm font-semibold cursor-pointer transition whitespace-nowrap"
          style={{ border: '1px solid rgba(15,23,42,0.1)', background: '#f8fafc', color: '#64748b' }}
        >
          Cancel
        </button>
      </div>

      {error && <div className="col-span-full text-red-400 text-xs mt-2">{error}</div>}
    </form>
  );
}
