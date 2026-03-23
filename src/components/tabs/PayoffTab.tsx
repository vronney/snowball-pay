'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Debt, Income, Expense } from '@/types';
import { calculateDebtSnowball, calculateDebtAvalanche, calculateDebtCustom, type PayoffMethod, type PayoffResult } from '@/lib/snowball';
import { useUpdateDebt, useAllSnapshots, useSaveIncome } from '@/lib/hooks';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { Wallet, Zap, ListOrdered, Info, Inbox, RefreshCcw, ChevronDown } from 'lucide-react';
import { formatCurrency, getCategoryColor } from '@/lib/utils';
import AiRecommendations from '@/components/AiRecommendations';

interface PayoffTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
}

export default function PayoffTab({ debts, income, expenses, isLoading }: PayoffTabProps) {
  // Lazy initializers read from income when it's already cached (e.g. returning
  // to this tab). This prevents the auto-save effect from firing with stale
  // initial-state values on remount and overwriting what was just loaded.
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [payoffMethod, setPayoffMethod] = useState<PayoffMethod>(
    () => (income?.payoffMethod as PayoffMethod) || 'snowball'
  );
  const [planResult, setPlanResult] = useState<PayoffResult | null>(null);
  const [accelerationAmount, setAccelerationAmount] = useState<number | null>(
    () => income?.accelerationAmount ?? null
  );
  const updateDebt = useUpdateDebt();
  const saveIncome = useSaveIncome();
  // Tracks what was last loaded from DB — prevents the initial sync from
  // triggering an unnecessary save.  Seeded on mount with the same values as
  // the lazy state initializers so the guard is pre-populated when income is
  // already in the React Query cache (e.g. returning to this tab).
  const lastLoadedRef = useRef<{ method: PayoffMethod; accel: number | null }>({
    method: (income?.payoffMethod as PayoffMethod) || 'snowball',
    accel: income?.accelerationAmount ?? null,
  });
  const { data: snapshotsData } = useAllSnapshots();

  // Sync payoff preferences from DB when income record first loads.
  useEffect(() => {
    if (!income) return;
    const method = (income.payoffMethod as PayoffMethod) || 'snowball';
    const accel = income.accelerationAmount ?? null;
    lastLoadedRef.current = { method, accel };
    setPayoffMethod(method);
    setAccelerationAmount(accel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income?.id]);

  // Auto-save whenever the user changes method or slider amount — debounced 600 ms.
  // Uses income from the effect closure so values are always current; the guard
  // against lastLoadedRef ensures we never save back values we just loaded.
  useEffect(() => {
    if (!income) return;
    const last = lastLoadedRef.current;
    if (last.method === payoffMethod && last.accel === accelerationAmount) return;
    const tid = setTimeout(() => {
      lastLoadedRef.current = { method: payoffMethod, accel: accelerationAmount };
      saveIncome.mutate({
        monthlyTakeHome: income.monthlyTakeHome,
        essentialExpenses: income.essentialExpenses,
        extraPayment: income.extraPayment,
        payoffMethod,
        accelerationAmount,
      });
    }, 600);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoffMethod, accelerationAmount, income]);

  // Build a map of "Mon YYYY" → summed actual balance across all debts for that month.
  // Used to overlay the Actual line on the Balance Over Time chart.
  const actualBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const s of snapshotsData?.snapshots ?? []) {
      const d = new Date(s.recordedAt);
      const label = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      map.set(label, (map.get(label) ?? 0) + s.balance);
    }
    return map;
  }, [snapshotsData?.snapshots]);

  useEffect(() => {
    if (debts.length > 0 && income) {
      const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalMin = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
      const totalEss = income.essentialExpenses + recurringTotal;
      const maxAcceleration = Math.max(0, income.monthlyTakeHome - totalEss - totalMin);
      const targetAcceleration = accelerationAmount !== null
        ? Math.min(accelerationAmount, maxAcceleration)
        : maxAcceleration;
      const adjustedExtra = targetAcceleration - (income.monthlyTakeHome - totalEss - totalMin);
      const result = payoffMethod === 'avalanche'
        ? calculateDebtAvalanche(debts, income.monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra)
        : payoffMethod === 'custom'
        ? calculateDebtCustom(debts, income.monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra)
        : calculateDebtSnowball(debts, income.monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra);
      setPlanResult(result);
    }
  }, [debts, income, expenses, payoffMethod, accelerationAmount]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[180, 120, 260].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: '16px', background: 'rgba(19,29,46,1)', animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  if (!income || debts.length === 0) {
    return (
      <section id="section-plan" className="hidden">
        <div id="plan-empty" className="text-center py-16 opacity-40">
          <Inbox size={48} className="mx-auto mb-3" />
          <p className="text-sm">Add your debts and budget info to generate a payoff plan.</p>
        </div>
      </section>
    );
  }

  const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  const recurringTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalEssential = income.essentialExpenses + recurringTotal;
  const availableCashFlow = Math.max(0, income.monthlyTakeHome - totalEssential - totalMinPayments + income.extraPayment);
  const effectiveAcceleration = accelerationAmount !== null
    ? Math.min(accelerationAmount, availableCashFlow)
    : availableCashFlow;
  const monthlyPayment = totalMinPayments + effectiveAcceleration;

  if (!planResult) {
    return (
      <div className="text-center py-12 opacity-40">
        <p className="text-sm">Unable to calculate payoff plan</p>
      </div>
    );
  }

  const years = Math.floor(planResult.months / 12);
  const months = planResult.months % 12;
  const timeStr = years > 0 ? `${years}y ${months}m` : `${months}m`;
  const minimumsOnlyResult = calculateDebtSnowball(debts, totalMinPayments, 0, 0, 0);
  const interestSavedVsMinimums = Math.max(0, minimumsOnlyResult.totalInterestPaid - planResult.totalInterestPaid);
  const showMinimumsLine = effectiveAcceleration > 0;
  const projectedBalanceMap = new Map(planResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
  const minimumsBalanceMap = new Map(minimumsOnlyResult.monthlyBalances.map((mb) => [mb.date, mb.totalBalance]));
  const baseBalances = minimumsOnlyResult.months >= planResult.months
    ? minimumsOnlyResult.monthlyBalances
    : planResult.monthlyBalances;
  const priorityEditorDebts = [...debts].sort((a, b) => {
    const aPriority = a.priorityOrder ?? Number.MAX_SAFE_INTEGER;
    const bPriority = b.priorityOrder ?? Number.MAX_SAFE_INTEGER;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return a.balance - b.balance;
  });
  const hasAnyCustomPriority = debts.some((debt) => debt.priorityOrder != null);
  const balanceChartData = baseBalances.map((mb) => ({
    date: mb.date,
    totalBalance: projectedBalanceMap.get(mb.date),
    minimumsBalance: minimumsBalanceMap.get(mb.date),
    actualBalance: actualBalanceMap.get(mb.date),
  }));
  const hasAnyActual = actualBalanceMap.size > 0;

  const timelineData = planResult.payoffSchedule.map((item) => ({
    debtName: item.debtName,
    monthPaidOff: item.monthPaidOff,
    category: item.category,
  }));
  const strategyName = payoffMethod === 'snowball' ? 'Snowball' : payoffMethod === 'avalanche' ? 'Avalanche' : 'Custom';
  const payoffOrderLabel = payoffMethod === 'snowball'
    ? 'Payoff Order (Smallest Balance First)'
    : payoffMethod === 'avalanche'
    ? 'Payoff Order (Highest APR First)'
    : 'Payoff Order (Custom Priority)';

  const handlePriorityChange = async (debtId: string, nextValue: string) => {
    const parsedPriority = nextValue === '' ? null : parseInt(nextValue, 10);
    await updateDebt.mutateAsync({
      id: debtId,
      updates: { priorityOrder: parsedPriority },
    });
  };

  const handleResetPriorities = async () => {
    const debtsWithPriority = debts.filter((debt) => debt.priorityOrder != null);
    await Promise.all(
      debtsWithPriority.map((debt) =>
        updateDebt.mutateAsync({
          id: debt.id,
          updates: { priorityOrder: null },
        })
      )
    );
  };

  return (
    <section id="section-plan" className="space-y-6">
      <div className="rounded-2xl p-3" style={{ background: 'rgba(19,29,46,1)' }}>
        <div className="text-xs opacity-60 mb-2">Payoff Strategy</div>
        <div className="grid grid-cols-3 gap-2">
          {(['snowball', 'avalanche', 'custom'] as const).map((method) => {
            const selected = payoffMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setPayoffMethod(method)}
                className="rounded-lg px-3 py-2 text-xs font-semibold transition"
                style={{
                  background: selected ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.03)',
                  border: selected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                  color: selected ? '#93c5fd' : 'rgba(255,255,255,0.8)',
                }}
              >
                {method === 'snowball' ? 'Snowball' : method === 'avalanche' ? 'Avalanche' : 'Custom'}
              </button>
            );
          })}
        </div>
      </div>

      {payoffMethod === 'custom' && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
          <div
            className="flex items-center justify-between gap-3 cursor-pointer"
            style={{ marginBottom: priorityOpen ? '16px' : '0' }}
            onClick={() => setPriorityOpen((v) => !v)}
          >
            <h2 className="font-semibold text-base">Custom Priority Order</h2>
            <ChevronDown
              size={15}
              style={{
                color: '#60a5fa',
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
                  onClick={(e) => { e.stopPropagation(); void handleResetPriorities(); }}
                  disabled={!hasAnyCustomPriority || updateDebt.isPending}
                  className="rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
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
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{debt.name}</div>
                      <div className="text-xs opacity-55">{formatCurrency(debt.balance)} balance</div>
                    </div>
                    <select
                      value={debt.priorityOrder ?? ''}
                      onChange={(e) => void handlePriorityChange(debt.id, e.target.value)}
                      disabled={updateDebt.isPending}
                      className="input-field max-w-[140px]"
                    >
                      <option value="" className='bg-slate-400/80 text-black/80'>No priority</option>
                      {debts.map((_, idx) => (
                        <option key={`${debt.id}-priority-${idx + 1}`} value={idx + 1} className='bg-slate-400/80 text-black/80'>
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
      )}

      {/* Cash Flow Overview */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Wallet size={18} style={{ color: '#3b82f6' }} />
          Your Monthly Cash Flow
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="opacity-60">Monthly Take-Home</span>
            <span className="mono font-semibold">{formatCurrency(income.monthlyTakeHome)}</span>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <span className="opacity-60 ml-2">− Essential Expenses</span>
            <span className="mono">{formatCurrency(income.essentialExpenses)}</span>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <span className="opacity-60 ml-2">− Recurring Expenses</span>
            <span className="mono">{formatCurrency(recurringTotal)}</span>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <span className="opacity-60 ml-2">− Minimum Debt Payments</span>
            <span className="mono">{formatCurrency(totalMinPayments)}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg mt-2" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <span className="opacity-80">
              <strong>Available for Acceleration</strong>
            </span>
            <span className="mono font-bold" style={{ color: '#3b82f6' }}>
              {formatCurrency(availableCashFlow)}
            </span>
          </div>
          {availableCashFlow > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs opacity-60">Apply to Acceleration</span>
                <div className="flex items-center gap-2">
                  {saveIncome.isPending && (
                    <span style={{ fontSize: '10px', color: '#64748b' }}>saving…</span>
                  )}
                  {saveIncome.isSuccess && !saveIncome.isPending && (
                    <span style={{ fontSize: '10px', color: '#22c55e' }}>saved</span>
                  )}
                  <span className="mono text-sm font-bold" style={{ color: effectiveAcceleration > 0 ? '#3b82f6' : 'rgba(255,255,255,0.4)' }}>
                    {formatCurrency(effectiveAcceleration)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={availableCashFlow}
                step={50}
                value={effectiveAcceleration}
                onChange={(e) => setAccelerationAmount(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <div className="flex justify-between mt-1" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                <span>$0</span>
                <span>{formatCurrency(availableCashFlow)} max</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payoff Overview */}
      <div className="rounded-2xl p-5 snowball-glow" style={{ background: 'rgba(19,29,46,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <Zap size={18} style={{ color: '#3b82f6' }} />
          {strategyName} Payoff Plan
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <div className="text-xs opacity-50 mb-1">Debt-Free In</div>
            <div className="mono font-bold text-lg" style={{ color: '#3b82f6' }}>
              {planResult.months >= 360 ? '30+ years' : timeStr}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">Total Interest Paid</div>
            <div className="mono font-bold text-lg" style={{ color: '#ef4444' }}>
              {formatCurrency(planResult.totalInterestPaid)}
            </div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">Total Amount Paid</div>
            <div className="mono font-bold text-lg">{formatCurrency(planResult.totalAmountPaid)}</div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">Monthly Snowball</div>
            <div className="mono font-bold text-lg">{formatCurrency(monthlyPayment)}</div>
          </div>
          <div>
            <div className="text-xs opacity-50 mb-1">Interest Saved vs Minimums</div>
            <div className="mono font-bold text-lg" style={{ color: '#22c55e' }}>
              {formatCurrency(interestSavedVsMinimums)}
            </div>
          </div>
        </div>
        {availableCashFlow === 0 && (
          <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: '#78350f33', color: '#fbbf24' }}>
            Note: No cash flow available after expenses. Reduce recurring costs or increase income to accelerate payoff.
          </div>
        )}
      </div>

      {/* Balance Over Time */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Balance Over Time</h2>
          {!hasAnyActual && (
            <span className="text-xs opacity-40">Log a balance on a debt card to see actual progress</span>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={balanceChartData} margin={{ top: 10, right: 18, left: 10, bottom: 10 }}>
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
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'totalBalance' ? `With Extra (+${formatCurrency(effectiveAcceleration)}/mo)`
                    : name === 'minimumsBalance' ? 'Minimums Only'
                    : 'Actual',
                ]}
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
      </div>

      {/* Payoff Timeline */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
        <h2 className="font-semibold text-base mb-4">Payoff Timeline</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
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
                {timelineData.map((entry) => (
                  <Cell key={entry.debtName} fill={getCategoryColor(entry.category)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payoff Order */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
        <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
          <ListOrdered size={18} style={{ color: '#3b82f6' }} />
          {payoffOrderLabel}
        </h2>
        <div className="space-y-3">
          {planResult.payoffSchedule.map((item, i: number) => {
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

      {/* AI Recommendations */}
      <AiRecommendations
        debts={debts}
        income={income}
        expenses={expenses}
        availableCashFlow={availableCashFlow}
        planMonths={planResult.months}
        totalInterestPaid={planResult.totalInterestPaid}
      />

      {/* Strategy Explanation */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(19,29,46,1)' }}>
        <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
          <Info size={18} style={{ color: '#3b82f6' }} />
          How This Strategy Works
        </h2>
        {payoffMethod === 'snowball' && (
          <ol className="text-sm opacity-70 space-y-2 pl-5 list-decimal">
            <li>Pay minimums on all debts except the <strong>smallest balance</strong>.</li>
            <li>Attack the smallest debt with all available cash flow above minimums.</li>
            <li>Once it&apos;s paid off, roll its minimum payment into the next smallest debt.</li>
            <li>Repeat and your monthly snowball grows with each debt eliminated.</li>
          </ol>
        )}
        {payoffMethod === 'avalanche' && (
          <ol className="text-sm opacity-70 space-y-2 pl-5 list-decimal">
            <li>Pay minimums on all debts except the <strong>highest APR debt</strong>.</li>
            <li>Apply all extra cash to the highest-interest debt first.</li>
            <li>Once paid, roll that payment into the next highest APR debt.</li>
            <li>Repeat to minimize total interest paid over time.</li>
          </ol>
        )}
        {payoffMethod === 'custom' && (
          <ol className="text-sm opacity-70 space-y-2 pl-5 list-decimal">
            <li>Debts are prioritized by your <strong>custom priority order</strong>.</li>
            <li>Minimums are paid on all debts each month.</li>
            <li>All extra cash is directed at the highest-priority open debt.</li>
            <li>When a debt is closed, its minimum payment rolls into the next debt.</li>
          </ol>
        )}
      </div>
    </section>
  );
}
