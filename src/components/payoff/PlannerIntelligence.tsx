'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useUserSettings, useUpdatePreferences } from '@/lib/hooks';
import { Sparkles } from 'lucide-react';
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
import { usePlannerComputed } from '@/lib/hooks/usePlannerComputed';
import {
  ForecastCard,
  StrategyLabCard,
  SmartCalendarCard,
  GuardrailsCard,
  PriorityQueueCard,
  MilestonesCard,
  GoalSplitCard,
  ExplainableInsightsCard,
} from '@/components/payoff/PlannerIntelligenceCards';

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

const ACTIONS = [
  'Review next 14 days due dates',
  'Apply this month extra payment',
  'Check refinance opportunities',
  'Confirm strategy and shock mode',
];

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
  const [actionChecks, setActionChecks] = useState<Record<string, boolean>>({});

  const recurringTotal = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const runScenario = (method: PayoffMethod, monthlyTakeHome: number, essentials: number, extraAccel: number) => {
    const adjustedExtra = extraAccel - (monthlyTakeHome - essentials - totalMinPayments);
    const essentialsOnly = essentials - recurringTotal;
    if (method === 'avalanche') return calculateDebtAvalanche(debts, monthlyTakeHome, essentialsOnly, recurringTotal, adjustedExtra);
    if (method === 'custom') return calculateDebtCustom(debts, monthlyTakeHome, essentialsOnly, recurringTotal, adjustedExtra);
    return calculateDebtSnowball(debts, monthlyTakeHome, essentialsOnly, recurringTotal, adjustedExtra);
  };

  const strategyResults = useMemo(() => ({
    snowball: runScenario('snowball', income.monthlyTakeHome, totalEssential, sandboxExtra),
    avalanche: runScenario('avalanche', income.monthlyTakeHome, totalEssential, sandboxExtra),
    custom: runScenario('custom', income.monthlyTakeHome, totalEssential, sandboxExtra),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sandboxExtra, debts, income.monthlyTakeHome, totalEssential, recurringTotal, totalMinPayments]);

  const scenarioResult = strategyResults[sandboxMethod];
  const bestStrategy = (Object.entries(strategyResults) as [PayoffMethod, PayoffResult][])
    .sort((a, b) => a[1].months - b[1].months)[0];

  const shockInputs = useMemo(() => ({
    shockedIncome: shockMode === 'income-10' ? income.monthlyTakeHome * 0.9 : income.monthlyTakeHome,
    shockedEssential: shockMode === 'expense-500' ? totalEssential + 500 : totalEssential,
  }), [shockMode, income.monthlyTakeHome, totalEssential]);

  const shockResult = useMemo(() => {
    const essentialsOnly = shockInputs.shockedEssential - recurringTotal;
    if (sandboxMethod === 'avalanche') return calculateDebtAvalanche(debts, shockInputs.shockedIncome, essentialsOnly, recurringTotal, income.extraPayment);
    if (sandboxMethod === 'custom') return calculateDebtCustom(debts, shockInputs.shockedIncome, essentialsOnly, recurringTotal, income.extraPayment);
    return calculateDebtSnowball(debts, shockInputs.shockedIncome, essentialsOnly, recurringTotal, income.extraPayment);
  }, [sandboxMethod, shockInputs, debts, recurringTotal, income.extraPayment]);

  const computed = usePlannerComputed(
    debts, income, payoffMethod, planResult, minimumsOnlyResult,
    availableCashFlow, effectiveAcceleration, balanceChartData, hasRealSnapshots,
  );

  const explainableInsights = useMemo(() => {
    const { priorityQueue, leftoverAfterAcceleration, bufferTarget } = computed;
    const insights = [] as { title: string; why: string; impact: string }[];
    if (priorityQueue[0]) {
      insights.push({
        title: `Focus ${priorityQueue[0].name} next`,
        why: payoffMethod === 'avalanche'
          ? 'It has the highest APR, so each payment removes expensive interest first.'
          : payoffMethod === 'custom'
          ? 'It is currently top in your custom priority queue.'
          : 'It is your smallest balance, which compounds momentum quickly.',
        impact: `Expected payoff lift: ${Math.max(1, planResult.months - 1)}m trajectory confidence`,
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
  }, [computed, payoffMethod, planResult.months, effectiveAcceleration, minimumsOnlyResult.totalInterestPaid, planResult.totalInterestPaid]);

  const { data: savedSettings } = useUserSettings();
  const updatePreferences = useUpdatePreferences();

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

  const debtSplitAmount = (availableCashFlow * splitDebtPercent) / 100;
  const emergencySplitAmount = Math.max(0, availableCashFlow - debtSplitAmount);

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
        <ForecastCard planResult={planResult} planGap={computed.planGap} confidencePct={computed.confidencePct} confidenceRangeMonths={computed.confidenceRangeMonths} />
        <StrategyLabCard sandboxMethod={sandboxMethod} sandboxExtra={sandboxExtra} availableCashFlow={availableCashFlow} scenarioResult={scenarioResult} bestStrategy={bestStrategy} onMethodChange={handleSandboxMethod} onExtraChange={handleSandboxExtra} />
        <SmartCalendarCard smartCalendar={computed.smartCalendar} />
        <GuardrailsCard monthlyInterestLeak={computed.monthlyInterestLeak} monthlyInterestAvoided={computed.monthlyInterestAvoided} leftoverAfterAcceleration={computed.leftoverAfterAcceleration} bufferTarget={computed.bufferTarget} />
        <PriorityQueueCard priorityQueue={computed.priorityQueue} effectiveAcceleration={effectiveAcceleration} actions={ACTIONS} actionChecks={actionChecks} onActionCheck={handleActionCheck} />
        <MilestonesCard milestoneData={computed.milestoneData} refinanceCandidates={computed.refinanceCandidates} />
        <GoalSplitCard splitDebtPercent={splitDebtPercent} debtSplitAmount={debtSplitAmount} emergencySplitAmount={emergencySplitAmount} shockMode={shockMode} shockResult={shockResult} onSplitChange={handleSplitDebtPercent} onShockChange={handleShockMode} />
        <ExplainableInsightsCard insights={explainableInsights} />
      </div>
    </section>
  );
}
