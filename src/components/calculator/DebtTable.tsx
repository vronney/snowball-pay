'use client';

import { Plus, X } from 'lucide-react';
import type { DebtRow } from './PublicCalculator';

interface DebtTableProps {
  rows: DebtRow[];
  onRowChange: (id: string, field: keyof DebtRow, value: string) => void;
  onRowRemove: (id: string) => void;
  onRowAdd: () => void;
}

export default function DebtTable({ rows, onRowChange, onRowRemove, onRowAdd }: DebtTableProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
      <h2 className="font-semibold text-base mb-4">Your Debts</h2>

      <div
        className="mb-2 text-xs"
        style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 20px', gap: '8px', color: 'rgba(255,255,255,0.35)' }}
      >
        <span>Name</span>
        <span>Balance ($)</span>
        <span>APR %</span>
        <span>Min/mo</span>
        <span />
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 20px', gap: '8px', alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder="Credit Card"
              value={row.name}
              onChange={(e) => onRowChange(row.id, 'name', e.target.value)}
              className="input-field"
              style={{ fontSize: '13px' }}
            />
            <input
              type="number"
              placeholder="5000"
              value={row.balance}
              onChange={(e) => onRowChange(row.id, 'balance', e.target.value)}
              className="input-field"
              style={{ fontSize: '13px' }}
            />
            <input
              type="number"
              placeholder="19.99"
              value={row.rate}
              onChange={(e) => onRowChange(row.id, 'rate', e.target.value)}
              className="input-field"
              style={{ fontSize: '13px' }}
            />
            <input
              type="number"
              placeholder="100"
              value={row.minimum}
              onChange={(e) => onRowChange(row.id, 'minimum', e.target.value)}
              className="input-field"
              style={{ fontSize: '13px' }}
            />
            <button
              onClick={() => onRowRemove(row.id)}
              className="cursor-pointer bg-transparent border-0 p-0"
              style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onRowAdd}
        className="mt-3 flex items-center gap-1.5 text-sm cursor-pointer bg-transparent border-0 p-0 transition"
        style={{ color: 'rgba(255,255,255,0.45)' }}
      >
        <Plus size={14} />
        Add another debt
      </button>
    </div>
  );
}
