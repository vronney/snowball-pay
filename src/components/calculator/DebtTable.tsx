import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DebtRow } from '@/components/calculator/PublicCalculator';
import type { DebtFieldKey } from '@/lib/parseNumericInput';
import CalculatorDebtCard from './CalculatorDebtCard';

const NUMERIC_COLUMNS: Array<{ field: DebtFieldKey; placeholder: string }> = [
  { field: 'balance', placeholder: '5000' },
  { field: 'rate', placeholder: '19.99' },
  { field: 'minimum', placeholder: '100' },
];

interface DebtTableProps {
  rows: DebtRow[];
  errors?: Record<string, Partial<Record<DebtFieldKey, string>>>;
  onRowChange: (id: string, field: keyof DebtRow, value: string) => void;
  onRowBlur: (id: string, field: DebtFieldKey) => void;
  onRowRemove: (id: string) => void;
  onRowAdd: () => void;
}

export default function DebtTable({
  rows,
  errors,
  onRowChange,
  onRowBlur,
  onRowRemove,
  onRowAdd,
}: DebtTableProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <h2 className="font-semibold text-base mb-4">Your Debts</h2>

      {/* Mobile (< md): stacked cards — every field visible, no horizontal scroll */}
      <div className="md:hidden space-y-3">
        {rows.map((row, i) => (
          <CalculatorDebtCard
            key={row.id}
            row={row}
            index={i}
            errors={errors?.[row.id]}
            onFieldChange={onRowChange}
            onFieldBlur={onRowBlur}
            onRemove={onRowRemove}
          />
        ))}
      </div>

      {/* Desktop (≥ md): original table, unchanged */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <div style={{ minWidth: '380px' }}>
            <div
              className="mb-2 text-xs"
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 32px', gap: '8px', color: '#64748b' }}
            >
              <span>Name</span>
              <span>Balance ($)</span>
              <span>APR %</span>
              <span>Min/mo</span>
              <span />
            </div>

            <div className="space-y-2">
              {rows.map((row, i) => {
                const rowError = errors?.[row.id];
                return (
                  <div
                    key={row.id}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 32px', gap: '8px', alignItems: 'start' }}
                  >
                    <input
                      type="text"
                      placeholder="Credit Card"
                      value={row.name}
                      onChange={(e) => onRowChange(row.id, 'name', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="input-field text-base sm:text-[13px] sm:leading-5"
                    />
                    {NUMERIC_COLUMNS.map(({ field, placeholder }) => {
                      const error = rowError?.[field];
                      return (
                        <div key={field}>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={placeholder}
                            value={row[field]}
                            onChange={(e) => onRowChange(row.id, field, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => onRowBlur(row.id, field)}
                            aria-invalid={error ? true : undefined}
                            aria-describedby={error ? `${row.id}-${field}-desktop-error` : undefined}
                            className={cn('input-field w-full text-base sm:text-[13px] sm:leading-5', error && 'input-field-error')}
                          />
                          {error && (
                            <p
                              id={`${row.id}-${field}-desktop-error`}
                              className="text-xs mt-1"
                              style={{ color: '#ef4444' }}
                            >
                              {error}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => onRowRemove(row.id)}
                      aria-label={`Remove ${row.name.trim() || `debt ${i + 1}`}`}
                      className="cursor-pointer bg-transparent border-0 p-0 w-8 h-8 flex items-center justify-center"
                      style={{ color: '#94a3b8', lineHeight: 1, alignSelf: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onRowAdd}
        className="mt-3 flex items-center gap-1.5 text-sm cursor-pointer bg-transparent border-0 py-2 transition"
        style={{ color: '#64748b' }}
      >
        <Plus size={14} />
        Add another debt
      </button>
    </div>
  );
}
