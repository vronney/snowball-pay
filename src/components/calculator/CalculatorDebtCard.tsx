import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DebtRow } from '@/components/calculator/PublicCalculator';
import type { DebtFieldKey } from '@/lib/parseNumericInput';

interface CalculatorDebtCardProps {
  row: DebtRow;
  index: number;
  errors?: Partial<Record<DebtFieldKey, string>>;
  onFieldChange: (id: string, field: keyof DebtRow, value: string) => void;
  onFieldBlur: (id: string, field: DebtFieldKey) => void;
  onRemove: (id: string) => void;
}

/**
 * Mobile rendering of a single debt (< md). The desktop table clips APR and
 * Min payment off-screen on a 375px phone, so below md we stack every field —
 * each with a visible label — into a card with zero horizontal scroll.
 *
 * Same data and handlers as the desktop table; only the layout differs.
 */
export default function CalculatorDebtCard({
  row,
  index,
  errors,
  onFieldChange,
  onFieldBlur,
  onRemove,
}: CalculatorDebtCardProps) {
  const labelClass = 'text-xs mb-1 block';
  const labelStyle = { color: '#64748b' } as const;

  const renderNumericField = (
    field: DebtFieldKey,
    label: string,
    placeholder: string,
  ) => {
    const id = `${row.id}-${field}`;
    const error = errors?.[field];
    return (
      <div>
        <label htmlFor={id} className={labelClass} style={labelStyle}>
          {label}
        </label>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={row[field]}
          onChange={(e) => onFieldChange(row.id, field, e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => onFieldBlur(row.id, field)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn('input-field text-base', error && 'input-field-error')}
        />
        {error && (
          <p
            id={`${id}-error`}
            className="text-xs mt-1"
            style={{ color: '#ef4444' }}
          >
            {error}
          </p>
        )}
      </div>
    );
  };

  const nameId = `${row.id}-name`;

  return (
    <div
      className="rounded-xl p-4"
      style={{ border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff' }}
    >
      {/* Name + remove */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor={nameId} className={labelClass} style={labelStyle}>
            Debt name
          </label>
          <input
            id={nameId}
            type="text"
            placeholder="Credit Card"
            value={row.name}
            onChange={(e) => onFieldChange(row.id, 'name', e.target.value)}
            onFocus={(e) => e.target.select()}
            className="input-field text-base"
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          aria-label={`Remove ${row.name.trim() || `debt ${index + 1}`}`}
          className="flex-shrink-0 cursor-pointer bg-transparent border-0 p-0 w-10 h-10 flex items-center justify-center"
          style={{ color: '#94a3b8', lineHeight: 1 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Balance + APR */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        {renderNumericField('balance', 'Balance ($)', '5000')}
        {renderNumericField('rate', 'APR %', '19.99')}
      </div>

      {/* Min payment — always visible */}
      <div className="mt-3">
        {renderNumericField('minimum', 'Min payment ($/mo)', '100')}
      </div>
    </div>
  );
}
