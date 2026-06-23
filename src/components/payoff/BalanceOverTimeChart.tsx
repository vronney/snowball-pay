'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatMonths } from '@/lib/utils';

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

type ChartValueKey =
  | 'totalBalance'
  | 'minimumsBalance'
  | 'actualBalance'
  | 'avalancheBalance';

const PLAN_COLOR = '#2563eb';
const ACTUAL_COLOR = '#059669';
const MINIMUMS_COLOR = '#d97706';
const COMPARISON_COLOR = '#0891b2';

const lineMeta: Record<
  ChartValueKey,
  { color: string; label: string; description: string }
> = {
  totalBalance: {
    color: PLAN_COLOR,
    label: 'Selected plan',
    description: 'Projected balance if you follow the current strategy.',
  },
  actualBalance: {
    color: ACTUAL_COLOR,
    label: 'Actual balance',
    description: 'Recorded balance snapshots from payments or updates.',
  },
  minimumsBalance: {
    color: MINIMUMS_COLOR,
    label: 'Minimums only',
    description: 'What happens if you stop at required payments.',
  },
  avalancheBalance: {
    color: COMPARISON_COLOR,
    label: 'Comparison',
    description: 'The alternate strategy plotted against the selected plan.',
  },
};

function getValue(entry: ChartEntry | undefined, key: ChartValueKey) {
  const value = entry?.[key];
  return typeof value === 'number' ? value : null;
}

function findFirstValue(data: ChartEntry[], key: ChartValueKey) {
  return data.find((point) => getValue(point, key) != null)?.[key] ?? 0;
}

function findPayoffPoint(data: ChartEntry[], key: ChartValueKey) {
  return (
    data.find((point) => {
      const value = getValue(point, key);
      return value != null && value <= 1;
    }) ?? data.filter((point) => getValue(point, key) != null).at(-1)
  );
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return formatCurrency(value);
}

function timeLabel(months: number | undefined) {
  if (months == null) return 'Not available';
  return formatMonths(months);
}

function comparisonText(diff: number | null) {
  if (diff == null) return 'No recorded balance yet';
  if (Math.abs(diff) < 50) return 'On track';
  return diff > 0
    ? `${formatCurrency(diff)} ahead`
    : `${formatCurrency(Math.abs(diff))} behind`;
}

function ChartCoach({
  title,
  evidence,
  action,
  tone,
}: {
  title: string;
  evidence: string;
  action: string;
  tone: 'neutral' | 'good' | 'warn';
}) {
  const style =
    tone === 'good'
      ? {
          background: 'rgba(5,150,105,0.08)',
          border: 'rgba(5,150,105,0.18)',
          color: '#047857',
          label: 'Keep',
        }
      : tone === 'warn'
        ? {
            background: 'rgba(220,38,38,0.08)',
            border: 'rgba(220,38,38,0.18)',
            color: '#b91c1c',
            label: 'Adjust',
          }
        : {
            background: '#f8fafc',
            border: 'rgba(15,23,42,0.10)',
            color: '#334155',
            label: 'Read',
          };

  return (
    <div
      className="mb-4 rounded-xl p-3"
      style={{
        background: style.background,
        border: `1px solid ${style.border}`,
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: style.color, border: `1px solid ${style.border}` }}
        >
          Coach {style.label}
        </span>
        <p className="text-xs font-semibold" style={{ color: '#0f172a' }}>
          {title}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
          <span className="font-semibold" style={{ color: style.color }}>
            Evidence:{' '}
          </span>
          {evidence}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
          <span className="font-semibold" style={{ color: style.color }}>
            Action:{' '}
          </span>
          {action}
        </p>
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone = '#0f172a',
  helper,
}: {
  label: string;
  value: string;
  tone?: string;
  helper?: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: '#f8fafc',
        border: '1px solid rgba(15,23,42,0.08)',
        minHeight: 82,
      }}
    >
      <p className="text-xs mb-1" style={{ color: '#64748b' }}>
        {label}
      </p>
      <p className="text-sm font-semibold" style={{ color: tone }}>
        {value}
      </p>
      {helper && (
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
          {helper}
        </p>
      )}
    </div>
  );
}

function LegendPill({
  color,
  label,
  description,
}: {
  color: string;
  label: string;
  description: string;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.08)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
        />
        <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>
          {label}
        </span>
      </div>
      <p className="text-xs mt-1" style={{ color: '#64748b' }}>
        {description}
      </p>
    </div>
  );
}

interface TooltipPayload {
  payload?: ChartEntry;
}

function DebtChartTooltip({
  active,
  payload,
  label,
  effectiveAcceleration,
  totalPlanMonths,
  strategyLabel,
  comparisonLabel,
  hasRealSnapshots,
  showMinimumsLine,
  showAvalancheLine,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  effectiveAcceleration: number;
  totalPlanMonths?: number;
  strategyLabel: string;
  comparisonLabel: string;
  hasRealSnapshots: boolean;
  showMinimumsLine: boolean;
  showAvalancheLine: boolean;
}) {
  const entry = payload?.[0]?.payload;
  if (!active || !entry) return null;

  const projected = getValue(entry, 'totalBalance');
  const actual = getValue(entry, 'actualBalance');
  const diff = projected != null && actual != null ? projected - actual : null;
  const remaining = totalPlanMonths != null ? Math.max(0, totalPlanMonths - entry.month) : null;
  const pct =
    totalPlanMonths && totalPlanMonths > 0
      ? Math.min(100, Math.round((entry.month / totalPlanMonths) * 100))
      : null;
  const rows: {
    key: ChartValueKey;
    label: string;
    value: number | null;
    color: string;
  }[] = [];

  rows.push({
    key: 'totalBalance',
    label: `${strategyLabel} plan`,
    value: projected,
    color: PLAN_COLOR,
  });

  rows.push({
    key: 'actualBalance',
    label: hasRealSnapshots ? 'Actual recorded' : 'Actual starting point',
    value: actual,
    color: ACTUAL_COLOR,
  });

  if (showMinimumsLine) {
    rows.push({
      key: 'minimumsBalance',
      label: 'Minimums only',
      value: getValue(entry, 'minimumsBalance'),
      color: MINIMUMS_COLOR,
    });
  }

  if (showAvalancheLine) {
    rows.push({
      key: 'avalancheBalance',
      label: comparisonLabel,
      value: getValue(entry, 'avalancheBalance'),
      color: COMPARISON_COLOR,
    });
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.12)',
        boxShadow: '0 12px 30px rgba(15,23,42,0.12)',
        minWidth: 230,
      }}
    >
      <p className="text-xs font-semibold mb-1" style={{ color: '#0f172a' }}>
        {label}
      </p>
      <p className="text-xs mb-2" style={{ color: '#64748b' }}>
        Month {entry.month}
        {pct != null ? ` - ${pct}% through plan` : ''}
        {remaining != null ? ` - ${remaining}m left` : ''}
      </p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: row.color }}
              />
              {row.label}
            </span>
            <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>
              {formatCurrency(row.value as number)}
            </span>
          </div>
        ))}
      </div>
      {diff != null && hasRealSnapshots && (
        <div
          className="mt-2 pt-2 text-xs font-semibold"
          style={{
            borderTop: '1px solid rgba(15,23,42,0.08)',
            color: Math.abs(diff) < 50 ? '#65a30d' : diff > 0 ? '#059669' : '#dc2626',
          }}
        >
          {comparisonText(diff)} vs plan
        </div>
      )}
      {effectiveAcceleration > 0 && (
        <p className="text-xs mt-2" style={{ color: '#64748b' }}>
          Extra payoff pace: {formatCurrency(effectiveAcceleration)}/mo
        </p>
      )}
    </div>
  );
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
  const calculations = useMemo(() => {
    const startingBalance = findFirstValue(data, 'totalBalance');
    const planFinish = findPayoffPoint(data, 'totalBalance');
    const minimumsFinish = findPayoffPoint(data, 'minimumsBalance');
    const comparisonFinish = findPayoffPoint(data, 'avalancheBalance');

    // Find latest month where BOTH actual AND projected balances exist
    // (don't compare actual from a month beyond where the plan has projections)
    let latestActual: ChartEntry | undefined;
    if (hasRealSnapshots) {
      for (let i = data.length - 1; i >= 0; i--) {
        const actualVal = getValue(data[i], 'actualBalance');
        const projectedVal = getValue(data[i], 'totalBalance');
        // Only count it if both values exist (actual balance AND projected balance for that month)
        if (actualVal != null && projectedVal != null) {
          latestActual = data[i];
          break;
        }
      }
    }

    const latestActualValue = getValue(latestActual, 'actualBalance');
    const latestProjectedValue = getValue(latestActual, 'totalBalance');
    const latestDiff =
      latestActualValue != null && latestProjectedValue != null
        ? latestProjectedValue - latestActualValue
        : null;

    const hasActualSeries = data.some((point) => getValue(point, 'actualBalance') != null);
    const projectedPaydown =
      startingBalance > 0 && planFinish?.totalBalance != null
        ? Math.max(0, startingBalance - planFinish.totalBalance)
        : 0;

    const selectedPayoffMonth = planFinish?.month ?? totalPlanMonths;
    const minimumsPayoffMonth = minimumsFinish?.month;
    const monthsSaved =
      selectedPayoffMonth != null && minimumsPayoffMonth != null
        ? Math.max(0, minimumsPayoffMonth - selectedPayoffMonth)
        : 0;

    return {
      startingBalance,
      planFinish,
      minimumsFinish,
      comparisonFinish,
      latestActual,
      latestDiff,
      hasActualSeries,
      projectedPaydown,
      selectedPayoffMonth,
      minimumsPayoffMonth,
      monthsSaved,
    };
  }, [data, hasRealSnapshots, totalPlanMonths]);

  const {
    startingBalance,
    planFinish,
    minimumsFinish,
    comparisonFinish,
    latestActual,
    latestDiff,
    hasActualSeries,
    projectedPaydown,
    selectedPayoffMonth,
    minimumsPayoffMonth,
    monthsSaved,
  } = calculations;
  const coach = useMemo(() => {
    return latestDiff != null && latestDiff < -50
      ? {
          tone: 'warn' as const,
          title: 'Actual balances are behind the plan line',
          evidence: `${latestActual?.date ?? 'Latest update'} is ${formatCurrency(Math.abs(latestDiff))} above the projected balance.`,
          action: effectiveAcceleration > 0
            ? `Your minimums are being paid — the gap is from the extra ${formatCurrency(effectiveAcceleration)}/mo acceleration not yet being applied to the focus debt.`
            : 'Set an acceleration amount in your budget and direct it to your focus debt above the minimum payment each month.',
        }
      : latestDiff != null && latestDiff > 50
        ? {
            tone: 'good' as const,
            title: 'Actual balances are beating the plan line',
            evidence: `${latestActual?.date ?? 'Latest update'} is ${formatCurrency(latestDiff)} below the projected balance.`,
            action: 'Keep this pace unless the cash buffer gets tight.',
          }
        : monthsSaved > 0
          ? {
              tone: 'good' as const,
              title: `${strategyLabel} is buying back ${monthsSaved} months`,
              evidence: `The selected plan reaches zero in ${timeLabel(selectedPayoffMonth)} vs ${timeLabel(minimumsPayoffMonth)} with minimums only.`,
              action: `Keep ${formatCurrency(effectiveAcceleration)}/mo pointed at the focus debt.`,
            }
          : {
              tone: 'neutral' as const,
              title: 'This chart is your payoff baseline',
              evidence: hasRealSnapshots
                ? 'Actual balances are close enough to the plan line to treat the forecast as current.'
                : 'No recorded balance history exists yet, so the chart is still a projection.',
              action: hasRealSnapshots
                ? 'Keep recording statement balances monthly.'
                : 'Record the next statement balance to turn this into actual tracking.',
            };
  }, [latestDiff, latestActual, monthsSaved, selectedPayoffMonth, minimumsPayoffMonth, strategyLabel, effectiveAcceleration, hasRealSnapshots]);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      }}
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-base mb-1">
            Payoff chart and coach read
          </h2>
          <p className="text-xs max-w-3xl" style={{ color: '#64748b' }}>
            Compares your selected plan against minimum payments, the alternate
            strategy, and any recorded actual balances. Lower actual balances
            than the plan line mean you are ahead.
          </p>
        </div>
        <div
          className="rounded-xl px-3 py-2 text-xs font-semibold"
          style={{
            background:
              latestDiff == null
                ? '#f8fafc'
                : Math.abs(latestDiff) < 50
                  ? 'rgba(101,163,13,0.10)'
                  : latestDiff > 0
                    ? 'rgba(5,150,105,0.10)'
                    : 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(15,23,42,0.08)',
            color:
              latestDiff == null
                ? '#64748b'
                : Math.abs(latestDiff) < 50
                  ? '#65a30d'
                  : latestDiff > 0
                    ? '#059669'
                    : '#dc2626',
          }}
        >
          {comparisonText(latestDiff)}
        </div>
      </div>

      <ChartCoach {...coach} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricPill
          label="Starting balance"
          value={formatCurrency(startingBalance)}
          helper="All active debts combined"
        />
        <MetricPill
          label={`${strategyLabel} payoff`}
          value={planFinish ? timeLabel(planFinish.month) : timeLabel(totalPlanMonths)}
          tone={PLAN_COLOR}
          helper={planFinish?.date ?? 'Projected timeline'}
        />
        <MetricPill
          label="Plan paydown"
          value={formatCurrency(projectedPaydown)}
          tone={ACTUAL_COLOR}
          helper={`${formatCurrency(effectiveAcceleration)}/mo acceleration`}
        />
        <MetricPill
          label={showAvalancheLine ? comparisonLabel : 'Minimums only'}
          value={
            showAvalancheLine
              ? timeLabel(comparisonFinish?.month)
              : timeLabel(minimumsFinish?.month)
          }
          tone={showAvalancheLine ? COMPARISON_COLOR : MINIMUMS_COLOR}
          helper="Scenario benchmark"
        />
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="payoffPlanFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PLAN_COLOR} stopOpacity={0.16} />
                <stop offset="70%" stopColor={PLAN_COLOR} stopOpacity={0.04} />
                <stop offset="100%" stopColor={PLAN_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(15,23,42,0.07)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(15,23,42,0.12)' }}
              minTickGap={34}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={70}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(37,99,235,0.18)', strokeWidth: 1 }}
              content={
                <DebtChartTooltip
                  effectiveAcceleration={effectiveAcceleration}
                  totalPlanMonths={totalPlanMonths}
                  strategyLabel={strategyLabel}
                  comparisonLabel={comparisonLabel}
                  hasRealSnapshots={hasRealSnapshots}
                  showMinimumsLine={showMinimumsLine}
                  showAvalancheLine={showAvalancheLine}
                />
              }
            />
            <ReferenceLine y={0} stroke="rgba(15,23,42,0.18)" strokeDasharray="6 4" />
            <Area
              type="monotone"
              dataKey="totalBalance"
              fill="url(#payoffPlanFill)"
              stroke="none"
              connectNulls={false}
              isAnimationActive={false}
            />
            {showMinimumsLine && (
              <Line
                type="monotone"
                dataKey="minimumsBalance"
                stroke={MINIMUMS_COLOR}
                strokeWidth={1.8}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: MINIMUMS_COLOR, strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
            {showAvalancheLine && (
              <Line
                type="monotone"
                dataKey="avalancheBalance"
                stroke={COMPARISON_COLOR}
                strokeWidth={2}
                strokeDasharray="7 3"
                dot={false}
                activeDot={{ r: 5, fill: COMPARISON_COLOR, strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="totalBalance"
              stroke={PLAN_COLOR}
              strokeWidth={2.8}
              dot={false}
              activeDot={{ r: 5, fill: PLAN_COLOR, strokeWidth: 0 }}
              connectNulls={false}
            />
            {hasActualSeries && (
              <Line
                type="monotone"
                dataKey="actualBalance"
                stroke={ACTUAL_COLOR}
                strokeWidth={2.6}
                strokeDasharray={hasRealSnapshots ? undefined : '4 4'}
                dot={{ r: hasRealSnapshots ? 4 : 3, fill: ACTUAL_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: ACTUAL_COLOR, strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-2 mt-4 md:grid-cols-2 xl:grid-cols-4">
        <LegendPill
          color={lineMeta.totalBalance.color}
          label={`${strategyLabel} plan`}
          description={lineMeta.totalBalance.description}
        />
        {hasActualSeries && (
          <LegendPill
            color={lineMeta.actualBalance.color}
            label={hasRealSnapshots ? 'Actual balances' : 'Actual starting point'}
            description={
              hasRealSnapshots
                ? lineMeta.actualBalance.description
                : 'Log payments or update balances to add more real points.'
            }
          />
        )}
        {showMinimumsLine && (
          <LegendPill
            color={lineMeta.minimumsBalance.color}
            label="Minimums only"
            description={lineMeta.minimumsBalance.description}
          />
        )}
        {showAvalancheLine && (
          <LegendPill
            color={lineMeta.avalancheBalance.color}
            label={comparisonLabel}
            description={lineMeta.avalancheBalance.description}
          />
        )}
      </div>

      {hasRealSnapshots && latestActual && (
        <div
          className="mt-3 pt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
          style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}
        >
          <span style={{ color: '#64748b' }}>Latest recorded vs plan:</span>
          <span
            className="font-semibold"
            style={{
              color:
                latestDiff == null || Math.abs(latestDiff) < 50
                  ? '#65a30d'
                  : latestDiff > 0
                    ? '#059669'
                    : '#dc2626',
            }}
          >
            {comparisonText(latestDiff)}
          </span>
          <span style={{ color: '#94a3b8' }}>({latestActual.date})</span>
        </div>
      )}
    </div>
  );
}
