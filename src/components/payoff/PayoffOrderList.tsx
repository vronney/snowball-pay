'use client';

import { useState } from 'react';
import { type DebtPayoffSchedule } from '@/lib/snowball';
import { formatCurrency, getCategoryColor } from '@/lib/utils';
import { ListOrdered, ChevronDown } from 'lucide-react';

interface PayoffOrderListProps {
  payoffSchedule: DebtPayoffSchedule[];
  payoffOrderLabel: string;
}

export default function PayoffOrderList({ payoffSchedule, payoffOrderLabel }: PayoffOrderListProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl" style={{ background: 'rgb(255, 255, 255)', border: '1px solid rgba(15, 23, 42, 0.08)', boxShadow: 'rgba(15, 23, 42, 0.06) 0px 1px 4px' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span className="font-semibold text-base flex items-center gap-2" style={{ color: '#0f172a' }}>
          <ListOrdered size={18} style={{ color: '#3b82f6' }} />
          {payoffOrderLabel}
        </span>
        <ChevronDown size={16} style={{ color: '#94a3b8', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {open && <div className="px-5 pb-5 space-y-3">
        {payoffSchedule.map((item, i: number) => {
          const categoryColor = getCategoryColor(item.category);
          const yPO = Math.floor(item.monthPaidOff / 12);
          const mPO = item.monthPaidOff % 12;
          const poStr = item.monthPaidOff > 0 ? (yPO > 0 ? `${yPO}y ${mPO}m` : `${mPO}m`) : 'N/A';

          return (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.06)' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${categoryColor}22`, color: categoryColor }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{item.debtName}</span>
                  <span className="mono text-xs" style={{ color: '#64748b' }}>{formatCurrency(item.originalBalance)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(15,23,42,0.10)' }}>
                  <div className="h-full rounded-full progress-bar" style={{ width: '100%', background: categoryColor }} />
                </div>
                <div className="text-xs mt-1" style={{ color: '#64748b' }}>
                  Paid off in <span className="font-semibold" style={{ color: categoryColor }}>
                    {poStr}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
