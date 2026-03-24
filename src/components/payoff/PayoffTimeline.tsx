'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getCategoryColor } from '@/lib/utils';

type TimelineEntry = {
  debtName: string;
  monthPaidOff: number;
  category: string;
};

interface PayoffTimelineProps {
  data: TimelineEntry[];
}

export default function PayoffTimeline({ data }: PayoffTimelineProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
      <h2 className="font-semibold text-base mb-4">Payoff Timeline</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            <XAxis
              type="number"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
              tickFormatter={(value: number) => `${value}m`}
            />
            <YAxis
              type="category"
              dataKey="debtName"
              width={110}
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                const months = d.value as number;
                const years = Math.floor(months / 12);
                const rem = months % 12;
                const timeLabel = years > 0 ? `${years}y ${rem}m` : `${months}m`;
                const color = (d.payload as { fill?: string }).fill ?? '#f59e0b';
                return (
                  <div style={{
                    background: '#131d2e',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                      {(d.payload as { debtName?: string }).debtName}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      Paid off in{' '}
                      <span style={{ color, fontWeight: 700 }}>{timeLabel}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="monthPaidOff" radius={[0, 6, 6, 0]}>
              {data.map((entry) => (
                <Cell key={entry.debtName} fill={getCategoryColor(entry.category)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
