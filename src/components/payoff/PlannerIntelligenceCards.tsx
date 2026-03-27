'use client';

import {
  Target, TrendingUp, CalendarClock, Shield,
  ListChecks, BadgeCheck, Activity, Wrench,
} from 'lucide-react';
import { type Debt } from '@/types';
import { type PayoffMethod, type PayoffResult } from '@/lib/snowball';
import { formatCurrency } from '@/lib/utils';
import { type SmartCalendar, type MilestoneData, type RefinanceCandidate } from '@/lib/hooks/usePlannerComputed';

type ShockMode = 'none' | 'income-10' | 'expense-500';

function toTimeLabel(months: number) {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return years > 0 ? `${years}y ${rem}m` : `${rem}m`;
}

const CARD_STYLE = { background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' };
const INNER_STYLE = { background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' };

// ── 1. Forecast ───────────────────────────────────────────────────────────────
interface ForecastCardProps {
  planResult: PayoffResult;
  planGap: number | null;
  confidencePct: number;
  confidenceRangeMonths: number;
}

export function ForecastCard({ planResult, planGap, confidencePct, confidenceRangeMonths }: ForecastCardProps) {
  return (
    <div className="rounded-2xl p-5 xl:col-span-2 h-full flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} style={{ color: '#2563eb' }} />
        <h3 className="text-sm font-semibold">Debt-Free Forecast and Plan Tracking</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Projected debt-free date</p>
          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>
            {planResult.debtFreeDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs" style={{ color: '#64748b' }}>Confidence band: +/- {confidenceRangeMonths}m</p>
        </div>
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Progress vs plan</p>
          <p className="text-sm font-semibold" style={{ color: planGap == null ? '#64748b' : planGap >= 0 ? '#059669' : '#dc2626' }}>
            {planGap == null ? 'No snapshots yet' : planGap >= 0 ? `${formatCurrency(planGap)} ahead` : `${formatCurrency(Math.abs(planGap))} behind`}
          </p>
          <p className="text-xs" style={{ color: '#64748b' }}>Confidence score: {confidencePct}%</p>
        </div>
      </div>
    </div>
  );
}

// ── 2. Strategy Lab ───────────────────────────────────────────────────────────
interface StrategyLabCardProps {
  sandboxMethod: PayoffMethod;
  sandboxExtra: number;
  availableCashFlow: number;
  scenarioResult: PayoffResult;
  bestStrategy: [PayoffMethod, PayoffResult];
  onMethodChange: (m: PayoffMethod) => void;
  onExtraChange: (v: number) => void;
}

export function StrategyLabCard({ sandboxMethod, sandboxExtra, availableCashFlow, scenarioResult, bestStrategy, onMethodChange, onExtraChange }: StrategyLabCardProps) {
  return (
    <div className="rounded-2xl p-5 h-full flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} style={{ color: '#2563eb' }} />
        <h3 className="text-sm font-semibold">Strategy Lab and What-If Simulator</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(['snowball', 'avalanche', 'custom'] as const).map((method) => (
          <button key={method} type="button" onClick={() => onMethodChange(method)}
            className="rounded-lg px-2 py-2 text-xs font-semibold transition"
            style={{ background: sandboxMethod === method ? 'rgba(37,99,235,0.12)' : '#f8fafc', border: sandboxMethod === method ? '1px solid rgba(37,99,235,0.35)' : '1px solid rgba(15,23,42,0.08)', color: sandboxMethod === method ? '#1d4ed8' : '#334155' }}>
            {method === 'snowball' ? 'Snowball' : method === 'avalanche' ? 'Avalanche' : 'Custom'}
          </button>
        ))}
      </div>
      <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>What-if extra payment</label>
      <input type="range" min={0} max={Math.max(availableCashFlow, 1)} step={25}
        value={Math.min(sandboxExtra, availableCashFlow)}
        onChange={(e) => onExtraChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#2563eb' }} />
      <div className="flex items-center justify-between mt-1 mb-3">
        <span className="text-xs" style={{ color: '#64748b' }}>Scenario extra: {formatCurrency(sandboxExtra)}</span>
        <span className="text-xs" style={{ color: '#64748b' }}>Best: {bestStrategy[0]} ({toTimeLabel(bestStrategy[1].months)})</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Debt-free in</p>
          <p className="text-sm font-semibold">{toTimeLabel(scenarioResult.months)}</p>
        </div>
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Total interest</p>
          <p className="text-sm font-semibold">{formatCurrency(scenarioResult.totalInterestPaid)}</p>
        </div>
      </div>
    </div>
  );
}

// ── 3. Smart Calendar ─────────────────────────────────────────────────────────
export function SmartCalendarCard({ smartCalendar }: { smartCalendar: SmartCalendar }) {
  return (
    <div className="rounded-2xl p-5 h-full flex flex-col" style={CARD_STYLE}>
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
          <div key={item.debt.id} className="rounded-lg p-2 flex items-center justify-between" style={INNER_STYLE}>
            <span className="text-xs" style={{ color: '#334155' }}>{item.debt.name}</span>
            <span className="text-xs" style={{ color: '#64748b' }}>{item.daysUntil}d · {formatCurrency(item.debt.minimumPayment)}</span>
          </div>
        ))}
        {smartCalendar.items.length === 0 && (
          <p className="text-xs" style={{ color: '#94a3b8' }}>Add due dates on debts to activate smart calendar flags.</p>
        )}
      </div>
    </div>
  );
}

// ── 4. Guardrails ─────────────────────────────────────────────────────────────
interface GuardrailsCardProps {
  monthlyInterestLeak: number;
  monthlyInterestAvoided: number;
  leftoverAfterAcceleration: number;
  bufferTarget: number;
}

export function GuardrailsCard({ monthlyInterestLeak, monthlyInterestAvoided, leftoverAfterAcceleration, bufferTarget }: GuardrailsCardProps) {
  const isLow = leftoverAfterAcceleration < bufferTarget;
  return (
    <div className="rounded-2xl p-5 h-full flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} style={{ color: '#2563eb' }} />
        <h3 className="text-sm font-semibold">Interest Leak and Guardrails</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Interest burned this month</p>
          <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>{formatCurrency(monthlyInterestLeak)}</p>
        </div>
        <div className="rounded-xl p-3" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Interest avoided monthly</p>
          <p className="text-sm font-semibold" style={{ color: '#059669' }}>{formatCurrency(monthlyInterestAvoided)}</p>
        </div>
      </div>
      <div className="rounded-lg p-3" style={{ background: isLow ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }}>
        <p className="text-xs" style={{ color: isLow ? '#92400e' : '#065f46' }}>
          {isLow
            ? `Guardrail warning: ${formatCurrency(leftoverAfterAcceleration)} buffer left after acceleration.`
            : `Guardrail healthy: ${formatCurrency(leftoverAfterAcceleration)} left after acceleration.`}
        </p>
      </div>
    </div>
  );
}

// ── 5. Priority Queue ─────────────────────────────────────────────────────────
interface PriorityQueueCardProps {
  priorityQueue: Debt[];
  effectiveAcceleration: number;
  actions: string[];
  actionChecks: Record<string, boolean>;
  onActionCheck: (action: string) => void;
}

export function PriorityQueueCard({ priorityQueue, effectiveAcceleration, actions, actionChecks, onActionCheck }: PriorityQueueCardProps) {
  return (
    <div className="rounded-2xl p-5 h-full flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-3">
        <ListChecks size={16} style={{ color: '#2563eb' }} />
        <h3 className="text-sm font-semibold">Priority Queue and Action Center</h3>
      </div>
      <div className="space-y-2 mb-3 flex-1">
        {priorityQueue.map((debt, idx) => (
          <div key={debt.id} className="rounded-lg p-2 flex items-center justify-between" style={INNER_STYLE}>
            <span className="text-xs" style={{ color: '#334155' }}>{idx + 1}. {debt.name}</span>
            <span className="text-xs" style={{ color: '#64748b' }}>{formatCurrency(Math.min(debt.balance, Math.max(100, effectiveAcceleration / 2)))}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <label key={action} className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
            <input type="checkbox" checked={Boolean(actionChecks[action])} onChange={() => onActionCheck(action)} />
            {action}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── 6. Milestones ─────────────────────────────────────────────────────────────
interface MilestonesCardProps {
  milestoneData: MilestoneData;
  refinanceCandidates: RefinanceCandidate[];
}

export function MilestonesCard({ milestoneData, refinanceCandidates }: MilestonesCardProps) {
  return (
    <div className="rounded-2xl p-5 h-full flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-3">
        <BadgeCheck size={16} style={{ color: '#2563eb' }} />
        <h3 className="text-sm font-semibold">Milestones and Refinance Opportunities</h3>
      </div>
      <div className="rounded-lg p-3 mb-3" style={INNER_STYLE}>
        <p className="text-xs" style={{ color: '#64748b' }}>Paid down progress</p>
        <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{milestoneData.pctPaid.toFixed(1)}% paid off</p>
        <p className="text-xs" style={{ color: '#64748b' }}>On-plan streak: {milestoneData.streak} months</p>
      </div>
      <div className="space-y-2 flex-1">
        {refinanceCandidates.map(({ debt, estimatedSavings }) => (
          <div key={debt.id} className="rounded-lg p-2 flex items-center justify-between" style={INNER_STYLE}>
            <span className="text-xs" style={{ color: '#334155' }}>{debt.name} at {debt.interestRate.toFixed(2)}%</span>
            <span className="text-xs" style={{ color: '#059669' }}>~{formatCurrency(estimatedSavings)} potential save</span>
          </div>
        ))}
        {refinanceCandidates.length === 0 && (
          <p className="text-xs" style={{ color: '#94a3b8' }}>No strong refinance flags right now.</p>
        )}
      </div>
    </div>
  );
}

// ── 7. Goal Split ─────────────────────────────────────────────────────────────
interface GoalSplitCardProps {
  splitDebtPercent: number;
  debtSplitAmount: number;
  emergencySplitAmount: number;
  shockMode: ShockMode;
  shockResult: PayoffResult;
  onSplitChange: (v: number) => void;
  onShockChange: (m: ShockMode) => void;
}

export function GoalSplitCard({ splitDebtPercent, debtSplitAmount, emergencySplitAmount, shockMode, shockResult, onSplitChange, onShockChange }: GoalSplitCardProps) {
  const shockOptions: { key: ShockMode; label: string }[] = [
    { key: 'none', label: 'No shock' },
    { key: 'income-10', label: 'Income -10%' },
    { key: 'expense-500', label: 'Expense +$500' },
  ];
  return (
    <div className="rounded-2xl p-5 xl:col-span-2 h-full flex flex-col" style={CARD_STYLE}>
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
      <input type="range" min={0} max={100} step={5} value={splitDebtPercent}
        onChange={(e) => onSplitChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#2563eb' }} />
      <div className="grid grid-cols-2 gap-2 mt-2 mb-3">
        <div className="rounded-lg p-2" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Debt acceleration</p>
          <p className="text-sm font-semibold">{formatCurrency(debtSplitAmount)}</p>
        </div>
        <div className="rounded-lg p-2" style={INNER_STYLE}>
          <p className="text-xs" style={{ color: '#64748b' }}>Emergency reserve</p>
          <p className="text-sm font-semibold">{formatCurrency(emergencySplitAmount)}</p>
        </div>
      </div>
      <label className="text-xs mb-1 block" style={{ color: '#64748b' }}>Simulate a financial shock</label>
      <div className="flex gap-2 mb-3">
        {shockOptions.map((item) => (
          <button key={item.key} type="button" onClick={() => onShockChange(item.key)}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold"
            style={{ background: shockMode === item.key ? 'rgba(37,99,235,0.12)' : '#f8fafc', border: shockMode === item.key ? '1px solid rgba(37,99,235,0.35)' : '1px solid rgba(15,23,42,0.08)', color: shockMode === item.key ? '#1d4ed8' : '#334155' }}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg p-2 mt-auto" style={INNER_STYLE}>
        <p className="text-xs" style={{ color: '#64748b' }}>Shock forecast debt-free</p>
        <p className="text-sm font-semibold">{toTimeLabel(shockResult.months)}</p>
      </div>
    </div>
  );
}

// ── 8. Explainable Insights ───────────────────────────────────────────────────
interface Insight { title: string; why: string; impact: string; }

export function ExplainableInsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-2xl p-5 xl:col-span-3 h-full flex flex-col" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-3">
        <Wrench size={16} style={{ color: '#2563eb' }} />
        <h3 className="text-sm font-semibold">Explainable Insights</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-xl p-3" style={INNER_STYLE}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#0f172a' }}>{insight.title}</p>
            <p className="text-xs mb-2" style={{ color: '#64748b' }}>{insight.why}</p>
            <p className="text-xs" style={{ color: '#1d4ed8' }}>{insight.impact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
