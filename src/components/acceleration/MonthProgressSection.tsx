'use client';

import { TrendingUp } from 'lucide-react';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

interface MonthData {
  year: number;
  month: number;
  actualExtra: number;
  onTrack: boolean;
}

interface MonthProgressSectionProps {
  monthlyData: MonthData[];
  totalActualExtra: number;
  totalPlanned: number;
  pct: number;
  barColor: string;
  pctColor: string;
  now: Date;
}

export default function MonthProgressSection({
  monthlyData,
  totalActualExtra,
  totalPlanned,
  pct,
  barColor,
  pctColor,
  now,
}: MonthProgressSectionProps) {
  const hasCurrentMonth = monthlyData.some(
    ({ year, month }) => now.getFullYear() === year && now.getMonth() === month
  );

  return (
    <div>
      {/* Month pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: hasCurrentMonth ? '4px' : '12px' }}>
        {monthlyData.map(({ year, month, actualExtra, onTrack }) => {
          const isCurrent  = now.getFullYear() === year && now.getMonth() === month;
          const hasActivity = actualExtra > 0;
          const dotColor    = hasActivity ? (onTrack ? '#10b981' : '#f59e0b') : '#e2e8f0';
          return (
            <div
              key={`${year}-${month}`}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', background: isCurrent ? '#f0f9ff' : '#f8fafc', border: `1px solid ${isCurrent ? 'rgba(37,99,235,0.12)' : 'rgba(15,23,42,0.07)'}`, borderRadius: '7px', padding: '5px 9px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}
            >
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <span style={{ color: isCurrent ? '#2563eb' : '#64748b', fontWeight: isCurrent ? 600 : 500 }}>
                {MONTH_NAMES[month]}
              </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmt$(actualExtra)}</span>
            </div>
          );
        })}
      </div>
      {hasCurrentMonth && (
        <p style={{ fontSize: '10px', color: '#cbd5e1', margin: '0 0 12px' }}>* {MONTH_NAMES[now.getMonth()]} is a partial month</p>
      )}


      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>3-Month Extra Payments</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
          {fmt$(totalActualExtra)}{' '}
          <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {fmt$(totalPlanned)}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '9999px', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: pctColor }}>
          {Math.round(pct)}% of 3-month goal
        </span>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '16px' }}>
        <TrendingUp size={12} style={{ color: '#94a3b8', visibility: 'hidden' }} />
      </div>
    </div>
  );
}
