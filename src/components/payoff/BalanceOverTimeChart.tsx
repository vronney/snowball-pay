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
  month: number;
  totalBalance: number | undefined;
  minimumsBalance: number | undefined;
  actualBalance: number | undefined;
  avalancheBalance: number | undefined;
};

interface BalanceOverTimeChartProps {
  data: ChartEntry[];
  effectiveAcceleration: number;
  showMinimumsLine: boolean;
  hasRealSnapshots: boolean;
  showAvalancheLine?: boolean;
  totalPlanMonths?: number;
  strategyLabel?: string;
  comparisonLabel?: string;
}

export default function BalanceOverTimeChart({
  data,
  effectiveAcceleration,
  showMinimumsLine,
  hasRealSnapshots,
  showAvalancheLine = false,
  totalPlanMonths,
  strategyLabel = 'Snowball',
  comparisonLabel = 'Avalanche',
}: BalanceOverTimeChartProps) {
  const hasAnyActual = true; // always render — starts at current debt, extends as payments are logged

  return (
    <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
      <div className="mb-4">
        <h2 className="font-semibold text-base mb-1">Balance Over Time</h2>
        <p className="text-xs" style={{ color: '#64748b' }}>
          Shows your total debt balance across all debts over time.{' '}
          {showAvalancheLine
            ? 'Blue = your selected strategy. Purple dashed = comparison strategy. See which method pays off debt faster for your situation.'
            : hasRealSnapshots
            ? "Green dashed = what you actually owe each month (recorded when you log a payment). Blue = your plan. Below the blue line means you're ahead of schedule."
            : 'Green dashed starts at your current balance. Log a payment on any debt card to see how your actual progress tracks against the plan.'}
        </p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 18, left: 10, bottom: 10 }}>
            <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(15,23,42,0.12)' }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(15,23,42,0.12)' }}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip
              formatter={(value: number, name: string, props: { payload?: { totalBalance?: number; month?: number } }) => {
                if (name === 'actualBalance') {
                  const projected = props.payload?.totalBalance;
                  const diff = projected != null ? projected - value : null;
                  const diffLabel = diff != null
                    ? diff > 0 ? ` (${formatCurrency(diff)} ahead)` : diff < 0 ? ` (${formatCurrency(Math.abs(diff))} behind)` : ' (on track)'
                    : '';
                  return [`${formatCurrency(value)}${diffLabel}`, 'Actual Balance'];
                }
                if (name === 'totalBalance') return [formatCurrency(value), `${strategyLabel} (+${formatCurrency(effectiveAcceleration)}/mo)`];
                if (name === 'minimumsBalance') return [formatCurrency(value), 'Minimums Only'];
                if (name === 'avalancheBalance') return [formatCurrency(value), comparisonLabel];
                return [formatCurrency(value), name];
              }}
              labelFormatter={(label, payload) => {
                const entry = payload?.[0]?.payload as (ChartEntry | undefined);
                const month = entry?.month ?? 0;
                const pct = totalPlanMonths ? Math.round((month / totalPlanMonths) * 100) : null;
                const remaining = totalPlanMonths != null ? totalPlanMonths - month : null;
                const parts: string[] = [`${String(label)}`];
                if (pct !== null) parts.push(`${pct}% complete`);
                if (remaining !== null && remaining > 0) parts.push(`${remaining} months left`);
                return parts.join('  ·  ');
              }}
              contentStyle={{
                background: '#ffffff',
                border: '1px solid rgba(15,23,42,0.12)',
                borderRadius: 10,
                color: '#0f172a',
                fontSize: 12,
              }}
            />
            {(hasAnyActual || showMinimumsLine || showAvalancheLine) && (
              <Legend
                formatter={(value) => (
                  <span style={{ color: '#64748b', fontSize: 11 }}>
                    {value === 'totalBalance'
                      ? `${strategyLabel} (+${formatCurrency(effectiveAcceleration)}/mo)`
                      : value === 'minimumsBalance'
                      ? 'Minimums Only'
                      : value === 'avalancheBalance'
                      ? comparisonLabel
                      : 'Actual'}
                  </span>
                )}
              />
            )}
            <ReferenceLine y={0} stroke="rgba(34,197,94,0.6)" strokeDasharray="6 4" />
            <Line
              type="monotone"
              dataKey="totalBalance"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#2563eb' }}
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
            {showAvalancheLine && (
              <Line
                type="monotone"
                dataKey="avalancheBalance"
                stroke="#7c3aed"
                strokeWidth={2}
                strokeDasharray="7 3"
                dot={false}
                activeDot={{ r: 5, fill: '#8b5cf6' }}
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
          <div className="mt-3 pt-3 flex items-center gap-2 text-xs" style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}>
            <span style={{ color: '#64748b' }}>Latest recorded vs plan:</span>
            <span className="font-semibold" style={{ color: onTrack ? '#65a30d' : ahead ? '#059669' : '#f87171' }}>
              {onTrack ? 'On track' : ahead ? `${formatCurrency(diff)} ahead of plan` : `${formatCurrency(Math.abs(diff))} behind plan`}
            </span>
            <span style={{ color: '#94a3b8' }}>({lastActual.date})</span>
          </div>
        );
      })()}
    </div>
  );
}
