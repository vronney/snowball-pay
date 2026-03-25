'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useUserSettings, useUpdatePreferences } from '@/lib/hooks';
import {
  Sparkles,
  CalendarClock,
  Shield,
  Target,
  TrendingUp,
  Activity,
  BadgeCheck,
  Wrench,
  ListChecks,
} from 'lucide-react';
import { type Debt, type Income, type Expense } from '@/types';
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
  type PayoffMethod,
  type PayoffResult,
} from '@/lib/snowball';
import { formatCurrency } from '@/lib/utils';
import { type ChartEntry } from '@/components/payoff/BalanceOverTimeChart';

interface PlannerIntelligenceProps {
  debts: Debt[];
  income: Income;
  expenses: Expense[];
  payoffMethod: PayoffMethod;
  planResult: PayoffResult;
  minimumsOnlyResult: PayoffResult;
  availableCashFlow: number;
  effectiveAcceleration: number;
  totalEssential: number;
  totalMinPayments: number;
  balanceChartData: ChartEntry[];
  hasRealSnapshots: boolean;
}

type ShockMode = 'none' | 'income-10' | 'expense-500';

const TODAY = new Date();

function toTimeLabel(months: number) {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return years > 0 ? `${years}y ${rem}m` : `${rem}m`;
}

export default function PlannerIntelligence({
  debts,
  income,
  expenses,
  payoffMethod,
  planResult,
  minimumsOnlyResult,
  availableCashFlow,
  effectiveAcceleration,
  totalEssential,
  totalMinPayments,
  balanceChartData,
  hasRealSnapshots,
}: PlannerIntelligenceProps) {
  const [sandboxMethod, setSandboxMethod] = useState<PayoffMethod>(payoffMethod);
  const [sandboxExtra, setSandboxExtra] = useState<number>(Math.min(effectiveAcceleration, availableCashFlow));
  const [splitDebtPercent, setSplitDebtPercent] = useState<number>(70);
  const [shockMode, setShockMode] = useState<ShockMode>('none');

  const recurringTotal = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const runScenario = (method: PayoffMethod, monthlyTakeHome: number, essentials: number, extraAccel: number) => {
    const adjustedExtra = extraAccel - (monthlyTakeHome - essentials - totalMinPayments);
    if (method === 'avalanche') {
      return calculateDebtAvalanche(debts, monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra);
    }
    if (method === 'custom') {
      return calculateDebtCustom(debts, monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra);
    }
    return calculateDebtSnowball(debts, monthlyTakeHome, income.essentialExpenses, recurringTotal, adjustedExtra);
  };

  const strategyResults = useMemo(() => {
    return {
      snowball: runScenario('snowball', income.monthlyTakeHome, totalEssential, sandboxExtra),
      avalanche: runScenario('avalanche', income.monthlyTakeHome, totalEssential, sandboxExtra),
      custom: runScenario('custom', income.monthlyTakeHome, totalEssential, sandboxExtra),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxExtra, debts, income.monthlyTakeHome, totalEssential, recurringTotal, totalMinPayments]);

  const scenarioResult = strategyResults[sandboxMethod];
  const bestStrategy = (Object.entries(strategyResults) as [PayoffMethod, PayoffResult][])
    .sort((a, b) => a[1].months - b[1].months)[0];

  const lastActualPoint = useMemo(() => {
    const reversed = [...balanceChartData].reverse();
    return reversed.find((point) => point.actualBalance != null);
  }, [balanceChartData]);

  const planGap =
    lastActualPoint?.actualBalance != null && lastActualPoint.totalBalance != null
      ? lastActualPoint.totalBalance - lastActualPoint.actualBalance
      : null;

  const confidencePct = useMemo(() => {
    if (!hasRealSnapshots || planGap == null) return 60;
    const score = 65 + (planGap > 0 ? 18 : planGap < 0 ? -16 : 8);
    return Math.max(45, Math.min(95, score));
  }, [hasRealSnapshots, planGap]);

  const confidenceRangeMonths = Math.max(1, Math.round((100 - confidencePct) / 10));

  const smartCalendar = useMemo(() => {
    const items = debts
      .filter((debt) => debt.dueDate != null)
      .map((debt) => {
        const day = debt.dueDate as number;
        const thisMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), day);
        const nextDue = thisMonth >= TODAY
          ? thisMonth
          : new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, day);
        const ms = nextDue.getTime() - TODAY.getTime();
        const daysUntil = Math.ceil(ms / (1000 * 60 * 60 * 24));
        return { debt, nextDue, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const dueIn7 = items.filter((item) => item.daysUntil <= 7).length;
    const dueIn14 = items.filter((item) => item.daysUntil <= 14).length;
    return { items, dueIn7, dueIn14 };
  }, [debts]);

  const monthlyInterestLeak = useMemo(() => {
    return debts.reduce((sum, debt) => sum + ((debt.balance * debt.interestRate) / 100) / 12, 0);
  }, [debts]);

  const monthlyInterestAvoided = useMemo(() => {
    const totalSaved = Math.max(0, minimumsOnlyResult.totalInterestPaid - planResult.totalInterestPaid);
    return planResult.months > 0 ? totalSaved / planResult.months : 0;
  }, [minimumsOnlyResult.totalInterestPaid, planResult.totalInterestPaid, planResult.months]);

  const priorityQueue = useMemo(() => {
    const sorted = [...debts];
    if (payoffMethod === 'avalanche') {
      sorted.sort((a, b) => b.interestRate - a.interestRate);
    } else if (payoffMethod === 'custom') {
      sorted.sort((a, b) => (a.priorityOrder ?? Number.MAX_SAFE_INTEGER) - (b.priorityOrder ?? Number.MAX_SAFE_INTEGER));
    } else {
      sorted.sort((a, b) => a.balance - b.balance);
    }
    return sorted.slice(0, 3);
  }, [debts, payoffMethod]);

  const leftoverAfterAcceleration = Math.max(0, availableCashFlow - effectiveAcceleration);
  const bufferTarget = income.monthlyTakeHome * 0.1;

  const milestoneData = useMemo(() => {
    const totalOriginal = debts.reduce((sum, debt) => sum + Math.max(debt.originalBalance || debt.balance, debt.balance), 0);
    const totalCurrent = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const pctPaid = totalOriginal > 0 ? ((totalOriginal - totalCurrent) / totalOriginal) * 100 : 0;

    let streak = 0;
    const actualSeries = balanceChartData
      .filter((p) => p.actualBalance != null)
      .map((p) => p.actualBalance as number);
    for (let i = actualSeries.length - 1; i > 0; i -= 1) {
      if (actualSeries[i] <= actualSeries[i - 1]) streak += 1;
      else break;
    }

    return { pctPaid, streak };
  }, [debts, balanceChartData]);

  const refinanceCandidates = useMemo(() => {
    return debts
      .filter((debt) => debt.interestRate >= 10 && debt.balance >= 3000)
      .sort((a, b) => b.interestRate - a.interestRate)
      .slice(0, 3)
      .map((debt) => {
        const estimatedSavings = debt.balance * ((debt.interestRate - 7.5) / 100) * 0.35;
        return { debt, estimatedSavings: Math.max(0, estimatedSavings) };
      });
  }, [debts]);

  const debtSplitAmount = (availableCashFlow * splitDebtPercent) / 100;
  const emergencySplitAmount = Math.max(0, availableCashFlow - debtSplitAmount);

  const shockInputs = useMemo(() => {
    const shockedIncome = shockMode === 'income-10' ? income.monthlyTakeHome * 0.9 : income.monthlyTakeHome;
    const shockedEssential = shockMode === 'expense-500' ? totalEssential + 500 : totalEssential;
    const shockMax = Math.max(0, shockedIncome - shockedEssential - totalMinPayments + income.extraPayment);
    return { shockedIncome, shockedEssential, shockMax };
  }, [shockMode, income.monthlyTakeHome, income.extraPayment, totalEssential, totalMinPayments]);

  const shockResult = useMemo(() => {
    const shockExtra = Math.min(sandboxExtra, shockInputs.shockMax);
    return runScenario(sandboxMethod, shockInputs.shockedIncome, shockInputs.shockedEssential, shockExtra);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxMethod, sandboxExtra, shockInputs, debts, recurringTotal]);

  const explainableInsights = useMemo(() => {
    const insights = [] as { title: string; why: string; impact: string }[];
    if (priorityQueue[0]) {
      insights.push({
        title: `Focus ${priorityQueue[0].name} next`,
        why: payoffMethod === 'avalanche'
          ? 'It has the highest APR, so each payment removes expensive interest first.'
          : payoffMethod === 'custom'
          ? 'It is currently top in your custom priority queue.'
          : 'It is your smallest balance, which compounds momentum quickly.',
        impact: `Expected payoff lift: ${toTimeLabel(Math.max(1, planResult.months - 1))} trajectory confidence`,
      });
    }
    insights.push({
      title: 'Acceleration materially changes payoff speed',
      why: `You are currently allocating ${formatCurrency(effectiveAcceleration)} extra each month.`,
      impact: `${formatCurrency(Math.max(0, minimumsOnlyResult.totalInterestPaid - planResult.totalInterestPaid))} interest avoided vs minimums`,
    });
    insights.push({
      title: leftoverAfterAcceleration < bufferTarget ? 'Guardrail warning: low cash buffer' : 'Cash guardrail is healthy',
      why: `Post-acceleration cash is ${formatCurrency(leftoverAfterAcceleration)} vs target ${formatCurrency(bufferTarget)}.`,
      impact: leftoverAfterAcceleration < bufferTarget ? 'Consider splitting some cash to emergency reserve.' : 'You can likely sustain this pace.',
    });
    return insights;
  }, [priorityQueue, payoffMethod, planResult.months, effectiveAcceleration, minimumsOnlyResult.totalInterestPaid, planResult.totalInterestPaid, leftoverAfterAcceleration, bufferTarget]);

  const { data: savedSettings } = useUserSettings();
  const updatePreferences = useUpdatePreferences();
  const [actionChecks, setActionChecks] = useState<Record<string, boolean>>({});
  const actions = [
    'Review next 14 days due dates',
    'Apply this month extra payment',
    'Check refinance opportunities',
    'Confirm strategy and shock mode',
  ];

  // Sync all persisted state from DB when preferences first load
  useEffect(() => {
    const p = savedSettings?.preferences;
    if (!p) return;
    if (p.actionChecks) setActionChecks(p.actionChecks);
    if (p.sandboxMethod) setSandboxMethod(p.sandboxMethod as PayoffMethod);
    if (p.sandboxExtra != null) setSandboxExtra(p.sandboxExtra);
    if (p.splitDebtPercent != null) setSplitDebtPercent(p.splitDebtPercent);
    if (p.shockMode) setShockMode(p.shockMode as ShockMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSettings?.preferences]);

  const handleActionCheck = (action: string) => {
    const next = { ...actionChecks, [action]: !actionChecks[action] };
    setActionChecks(next);
    updatePreferences.mutate({ actionChecks: next });
  };

  const handleSandboxMethod = (method: PayoffMethod) => {
    setSandboxMethod(method);
    updatePreferences.mutate({ sandboxMethod: method });
  };

  const sandboxExtraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSandboxExtra = (value: number) => {
    setSandboxExtra(value);
    if (sandboxExtraTimer.current) clearTimeout(sandboxExtraTimer.current);
    sandboxExtraTimer.current = setTimeout(() => updatePreferences.mutate({ sandboxExtra: value }), 600);
  };

  const splitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSplitDebtPercent = (value: number) => {
    setSplitDebtPercent(value);
    if (splitTimer.current) clearTimeout(splitTimer.current);
    splitTimer.current = setTimeout(() => updatePreferences.mutate({ splitDebtPercent: value }), 600);
  };

  const handleShockMode = (mode: ShockMode) => {
    setShockMode(mode);
    updatePreferences.mutate({ shockMode: mode });
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} style={{ color: '#2563eb' }} />
          <h2 className="font-semibold text-base" style={{ color: '#0f172a' }}>Planner Intelligence</h2>
        </div>
        <p className="text-xs" style={{ color: '#64748b' }}>
          Enhanced planning layer with forecasting, what-if scenarios, risk guardrails, and action guidance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
        <div className="rounded-2xl p-5 xl:col-span-2 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Debt-Free Forecast and Plan Tracking</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Projected debt-free date</p>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                {planResult.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>Confidence band: +/- {confidenceRangeMonths}m</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Progress vs plan</p>
              <p className="text-sm font-semibold" style={{ color: planGap == null ? '#64748b' : planGap >= 0 ? '#059669' : '#dc2626' }}>
                {planGap == null ? 'No snapshots yet' : planGap >= 0 ? `${formatCurrency(planGap)} ahead` : `${formatCurrency(Math.abs(planGap))} behind`}
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>Confidence score: {confidencePct}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Strategy Lab and What-If Simulator</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['snowball', 'avalanche', 'custom'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => handleSandboxMethod(method)}
                className="rounded-lg px-2 py-2 text-xs font-semibold transition"
                style={{
                  background: sandboxMethod === method ? 'rgba(37,99,235,0.12)' : '#f8fafc',
                  border: sandboxMethod === method ? '1px solid rgba(37,99,235,0.35)' : '1px solid rgba(15,23,42,0.08)',
                  color: sandboxMethod === method ? '#1d4ed8' : '#334155',
                }}
              >
                {method === 'snowball' ? 'Snowball' : method === 'avalanche' ? 'Avalanche' : 'Custom'}
              </button>
            ))}
          </div>
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>What-if extra payment</label>
          <input
            type="range"
            min={0}
            max={Math.max(availableCashFlow, 1)}
            step={25}
            value={Math.min(sandboxExtra, availableCashFlow)}
            onChange={(e) => handleSandboxExtra(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb' }}
          />
          <div className="flex items-center justify-between mt-1 mb-3">
            <span className="text-xs" style={{ color: '#64748b' }}>Scenario extra: {formatCurrency(sandboxExtra)}</span>
            <span className="text-xs" style={{ color: '#64748b' }}>Best: {bestStrategy[0]} ({toTimeLabel(bestStrategy[1].months)})</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Debt-free in</p>
              <p className="text-sm font-semibold">{toTimeLabel(scenarioResult.months)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Total interest</p>
              <p className="text-sm font-semibold">{formatCurrency(scenarioResult.totalInterestPaid)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Smart Payment Calendar</h3>
          </div>
          <div className="rounded-lg p-3 mb-3" style={{ background: smartCalendar.dueIn7 >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.08)' }}>
            <p className="text-xs" style={{ color: smartCalendar.dueIn7 >= 3 ? '#b91c1c' : '#1d4ed8' }}>
              {smartCalendar.dueIn7 >= 3
                ? `Risk flag: ${smartCalendar.dueIn7} payments due in 7 days`
                : `${smartCalendar.dueIn14} payments due in next 14 days`}
            </p>
          </div>
          <div className="space-y-2 flex-1">
            {smartCalendar.items.slice(0, 4).map((item) => (
              <div key={item.debt.id} className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
                <span className="text-xs" style={{ color: '#334155' }}>{item.debt.name}</span>
                <span className="text-xs" style={{ color: '#64748b' }}>{item.daysUntil}d · {formatCurrency(item.debt.minimumPayment)}</span>
              </div>
            ))}
            {smartCalendar.items.length === 0 && (
              <p className="text-xs" style={{ color: '#94a3b8' }}>Add due dates on debts to activate smart calendar flags.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Interest Leak and Guardrails</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Interest burned this month</p>
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>{formatCurrency(monthlyInterestLeak)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Interest avoided monthly</p>
              <p className="text-sm font-semibold" style={{ color: '#059669' }}>{formatCurrency(monthlyInterestAvoided)}</p>
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: leftoverAfterAcceleration < bufferTarget ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }}>
            <p className="text-xs" style={{ color: leftoverAfterAcceleration < bufferTarget ? '#92400e' : '#065f46' }}>
              {leftoverAfterAcceleration < bufferTarget
                ? `Guardrail warning: ${formatCurrency(leftoverAfterAcceleration)} buffer left after acceleration.`
                : `Guardrail healthy: ${formatCurrency(leftoverAfterAcceleration)} left after acceleration.`}
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Priority Queue and Action Center</h3>
          </div>
          <div className="space-y-2 mb-3 flex-1">
            {priorityQueue.map((debt, idx) => (
              <div key={debt.id} className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
                <span className="text-xs" style={{ color: '#334155' }}>{idx + 1}. {debt.name}</span>
                <span className="text-xs" style={{ color: '#64748b' }}>{formatCurrency(Math.min(debt.balance, Math.max(100, effectiveAcceleration / 2)))}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {actions.map((action) => (
              <label key={action} className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={Boolean(actionChecks[action])}
                  onChange={() => handleActionCheck(action)}
                />
                {action}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <BadgeCheck size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Milestones and Refinance Opportunities</h3>
          </div>
          <div className="rounded-lg p-3 mb-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
            <p className="text-xs" style={{ color: '#64748b' }}>Paid down progress</p>
            <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{milestoneData.pctPaid.toFixed(1)}% paid off</p>
            <p className="text-xs" style={{ color: '#64748b' }}>On-plan streak: {milestoneData.streak} months</p>
          </div>
          <div className="space-y-2 flex-1">
            {refinanceCandidates.map(({ debt, estimatedSavings }) => (
              <div key={debt.id} className="rounded-lg p-2 flex items-center justify-between" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
                <span className="text-xs" style={{ color: '#334155' }}>{debt.name} at {debt.interestRate.toFixed(2)}%</span>
                <span className="text-xs" style={{ color: '#059669' }}>~{formatCurrency(estimatedSavings)} potential save</span>
              </div>
            ))}
            {refinanceCandidates.length === 0 && (
              <p className="text-xs" style={{ color: '#94a3b8' }}>No strong refinance flags right now.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-5 xl:col-span-2 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Goal Split and Shock Forecast</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: '#64748b' }}>
            Use the slider to decide how to divide your available cash between paying off debt and building an emergency fund.
            Then simulate a financial setback — a drop in income or a spike in expenses — to see how your debt-free date shifts.
            This is a planning tool only; it does not change your actual payoff plan.
          </p>
          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Debt vs emergency split</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={splitDebtPercent}
            onChange={(e) => handleSplitDebtPercent(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb' }}
          />
          <div className="grid grid-cols-2 gap-2 mt-2 mb-3">
            <div className="rounded-lg p-2" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Debt acceleration</p>
              <p className="text-sm font-semibold">{formatCurrency(debtSplitAmount)}</p>
            </div>
            <div className="rounded-lg p-2" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <p className="text-xs" style={{ color: '#64748b' }}>Emergency reserve</p>
              <p className="text-sm font-semibold">{formatCurrency(emergencySplitAmount)}</p>
            </div>
          </div>

          <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Simulate a financial shock</label>
          <div className="flex gap-2 mb-3">
            {([
              { key: 'none', label: 'No shock' },
              { key: 'income-10', label: 'Income -10%' },
              { key: 'expense-500', label: 'Expense +$500' },
            ] as { key: ShockMode; label: string }[]).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleShockMode(item.key)}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold"
                style={{
                  background: shockMode === item.key ? 'rgba(37,99,235,0.12)' : '#f8fafc',
                  border: shockMode === item.key ? '1px solid rgba(37,99,235,0.35)' : '1px solid rgba(15,23,42,0.08)',
                  color: shockMode === item.key ? '#1d4ed8' : '#334155',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg p-2 mt-auto" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
            <p className="text-xs" style={{ color: '#64748b' }}>Shock forecast debt-free</p>
            <p className="text-sm font-semibold">{toTimeLabel(shockResult.months)}</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 xl:col-span-3 h-full flex flex-col" style={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} style={{ color: '#2563eb' }} />
            <h3 className="text-sm font-semibold">Explainable Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {explainableInsights.map((insight) => (
              <div key={insight.title} className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#0f172a' }}>{insight.title}</p>
                <p className="text-xs mb-2" style={{ color: '#64748b' }}>{insight.why}</p>
                <p className="text-xs" style={{ color: '#1d4ed8' }}>{insight.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
