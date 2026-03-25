'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

export type ChartEntry = {
  date: string;
  totalBalance: number | undefined;
  minimumsBalance: number | undefined;
  actualBalance: number | undefined;
};

interface BalanceOverTimeChartProps {
  data: ChartEntry[];
  effectiveAcceleration: number;
  showMinimumsLine: boolean;
  hasRealSnapshots: boolean;
}

export default function BalanceOverTimeChart({
  data,
  effectiveAcceleration,
  showMinimumsLine,
  hasRealSnapshots,
}: BalanceOverTimeChartProps) {
  const hasAnyActual = true; // always render — starts at current debt, extends as payments are logged

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
      <div className="mb-4">
        <h2 className="font-semibold text-base mb-1">Balance Over Time</h2>
        <p className="text-xs opacity-50">
          Shows your total debt balance across all debts over time.{' '}
          {hasRealSnapshots
            ? "Green dashed = what you actually owe each month (recorded when you log a payment). Blue = your plan. Below the blue line means you're ahead of schedule."
            : 'Green dashed starts at your current balance. Log a payment on any debt card to see how your actual progress tracks against the plan.'}
        </p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 18, left: 10, bottom: 10 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip
              formatter={(value: number, name: string, props: { payload?: { totalBalance?: number } }) => {
                if (name === 'actualBalance') {
                  const projected = props.payload?.totalBalance;
                  const diff = projected != null ? projected - value : null;
                  const diffLabel = diff != null
                    ? diff > 0 ? ` (${formatCurrency(diff)} ahead of plan)` : diff < 0 ? ` (${formatCurrency(Math.abs(diff))} behind plan)` : ' (on track)'
                    : '';
                  return [`${formatCurrency(value)}${diffLabel}`, 'Actual Balance'];
                }
                if (name === 'totalBalance') return [formatCurrency(value), `Plan (+${formatCurrency(effectiveAcceleration)}/mo extra)`];
                if (name === 'minimumsBalance') return [formatCurrency(value), 'Minimums Only'];
                return [formatCurrency(value), name];
              }}
              labelFormatter={(label) => `Month: ${String(label)}`}
              contentStyle={{
                background: '#131d2e',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: 'rgba(255,255,255,0.9)',
              }}
            />
            {(hasAnyActual || showMinimumsLine) && (
              <Legend
                formatter={(value) => (
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                    {value === 'totalBalance'
                      ? `With Extra (+${formatCurrency(effectiveAcceleration)}/mo)`
                      : value === 'minimumsBalance'
                      ? 'Minimums Only'
                      : 'Actual'}
                  </span>
                )}
              />
            )}
            <ReferenceLine y={0} stroke="rgba(34,197,94,0.6)" strokeDasharray="6 4" />
            <Line
              type="monotone"
              dataKey="totalBalance"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#93c5fd' }}
              connectNulls={false}
            />
            {showMinimumsLine && (
              <Line
                type="monotone"
                dataKey="minimumsBalance"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: '#fbbf24' }}
                connectNulls={false}
              />
            )}
            {hasAnyActual && (
              <Line
                type="monotone"
                dataKey="actualBalance"
                stroke="#22c55e"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#4ade80' }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {hasRealSnapshots && (() => {
        const lastActual = [...data].reverse().find((d) => d.actualBalance != null);
        const lastProjected = lastActual?.totalBalance;
        const diff = lastProjected != null && lastActual?.actualBalance != null
          ? lastProjected - lastActual.actualBalance
          : null;
        if (diff == null || !lastActual) return null;
        const ahead = diff > 0;
        const onTrack = Math.abs(diff) < 50;
        return (
          <div className="mt-3 pt-3 flex items-center gap-2 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="opacity-40">Latest recorded vs plan:</span>
            <span className="font-semibold" style={{ color: onTrack ? '#a3e635' : ahead ? '#34d399' : '#f87171' }}>
              {onTrack ? 'On track' : ahead ? `${formatCurrency(diff)} ahead of plan` : `${formatCurrency(Math.abs(diff))} behind plan`}
            </span>
            <span className="opacity-30">({lastActual.date})</span>
          </div>
        );
      })()}
    </div>
  );
}
