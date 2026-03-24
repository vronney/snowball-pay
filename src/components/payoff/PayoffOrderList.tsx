'use client';

import { type DebtPayoffSchedule } from '@/lib/snowball';
import { formatCurrency, getCategoryColor } from '@/lib/utils';
import { ListOrdered } from 'lucide-react';

interface PayoffOrderListProps {
  payoffSchedule: DebtPayoffSchedule[];
  payoffOrderLabel: string;
}

export default function PayoffOrderList({ payoffSchedule, payoffOrderLabel }: PayoffOrderListProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
      <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
        <ListOrdered size={18} style={{ color: '#3b82f6' }} />
        {payoffOrderLabel}
      </h2>
      <div className="space-y-3">
        {payoffSchedule.map((item, i: number) => {
          const categoryColor = getCategoryColor(item.category);
          const yPO = Math.floor(item.monthPaidOff / 12);
          const mPO = item.monthPaidOff % 12;
          const poStr = item.monthPaidOff > 0 ? (yPO > 0 ? `${yPO}y ${mPO}m` : `${mPO}m`) : 'N/A';

          return (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${categoryColor}22`, color: categoryColor }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{item.debtName}</span>
                  <span className="mono text-xs opacity-60">{formatCurrency(item.originalBalance)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full progress-bar" style={{ width: '100%', background: categoryColor }} />
                </div>
                <div className="text-xs opacity-50 mt-1">
                  Paid off in <span className="font-semibold" style={{ color: categoryColor }}>
                    {poStr}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
