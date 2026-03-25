'use client';

import { type Debt } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { RefreshCcw, ChevronDown } from 'lucide-react';

interface CustomPriorityEditorProps {
  debts: Debt[];
  priorityEditorDebts: Debt[];
  priorityOpen: boolean;
  hasAnyCustomPriority: boolean;
  isPending: boolean;
  onToggle: () => void;
  onPriorityChange: (debtId: string, value: string) => void;
  onResetPriorities: () => void;
}

export default function CustomPriorityEditor({
  debts,
  priorityEditorDebts,
  priorityOpen,
  hasAnyCustomPriority,
  isPending,
  onToggle,
  onPriorityChange,
  onResetPriorities,
}: CustomPriorityEditorProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <div
        className="flex items-center justify-between gap-3 cursor-pointer"
        style={{ marginBottom: priorityOpen ? '16px' : '0' }}
        onClick={onToggle}
      >
        <h2 className="font-semibold text-base">Custom Priority Order</h2>
        <ChevronDown
          size={15}
          style={{
            color: '#2563eb',
            flexShrink: 0,
            transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            transform: priorityOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            background: 'rgba(59,130,246,0.12)',
            borderRadius: '5px',
            padding: '2px',
            boxSizing: 'content-box',
          }}
        />
      </div>

      {priorityOpen && (
        <>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onResetPriorities(); }}
              disabled={!hasAnyCustomPriority || isPending}
              className="rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-40"
              style={{
                background: 'rgba(15,23,42,0.04)',
                border: '1px solid rgba(15,23,42,0.1)',
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <RefreshCcw size={13} />
                Reset Priorities
              </span>
            </button>
          </div>

          <div className="space-y-3">
            {priorityEditorDebts.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: '#f8fafc' }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{debt.name}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{formatCurrency(debt.balance)} balance</div>
                </div>
                <select
                  value={debt.priorityOrder ?? ''}
                  onChange={(e) => onPriorityChange(debt.id, e.target.value)}
                  disabled={isPending}
                  className="input-field max-w-[140px]"
                >
                  <option value="">No priority</option>
                  {debts.map((_, idx) => (
                    <option key={`${debt.id}-priority-${idx + 1}`} value={idx + 1}>
                      Priority {idx + 1}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
