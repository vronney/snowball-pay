"use client";

import { useMemo, useState } from "react";
import type { Debt, Expense, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import { useDashboardInsights, useSubscription } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { calculateResultByMethod } from "@/lib/payoffPlan";
import { isPlanDebt } from "@/lib/monthlyFocusDebt";
import { shortMonthLabel } from "@/lib/dashboard/format";
import {
  accelerationView, fixAppliedNote, FREE_WHAT_IF_DELTA, planClosingView, strategyPairView, whatIfFreeTile,
} from "@/lib/dashboard/plan";
import { missedPaymentRows, type LogRow } from "@/lib/dashboard/thisMonth";
import type { PlanGap } from "@/lib/dashboard/types";
import PayoffTab, { type PlanTopContext } from "@/components/tabs/PayoffTab";
import WhatIfCard from "@/components/payoff/WhatIfCard";
import ClosingCard from "../ClosingCard";
import BulkLogSheet from "../sheets/BulkLogSheet";
import AccelerationCard from "./AccelerationCard";
import StrategyControl from "./StrategyControl";
import WhatIfAnyAmount from "./WhatIfAnyAmount";
import WhatIfTiles from "./WhatIfTiles";

interface PlanV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}

type LogSheet = { rows: LogRow[]; year: number; month: number } | null;

/**
 * My Plan, dashboard v2 (spec §8.5): the v1 PayoffTab with its Strategy and
 * Cash flow cards replaced by the v2 top (control, pair, slider, what-if) and
 * the red plan-gap card closing the tab. Method and acceleration stay
 * PayoffTab's state, so every save is its debounced POST /api/income.
 */
export default function PlanV2({ debts, income, expenses, isLoading, onNavigate }: PlanV2Props) {
  const { data: insights, isPlaceholderData } = useDashboardInsights();
  const { data: subscription } = useSubscription();
  const [logSheet, setLogSheet] = useState<LogSheet>(null);
  // Undefined until either query answers: the what-if row waits rather than
  // flash Free's gated tiles at a Pro account (as v1's selector waits).
  const proEligible = insights?.tier.proEligible ?? subscription?.proEligible;

  const openLog = () => {
    // Placeholder-day data can still name last month (ThisMonthV2's guard).
    if (!insights || isPlaceholderData) return;
    const rows = missedPaymentRows(insights.paymentGap, debts);
    if (rows.length === 0) return;
    setLogSheet({ rows, year: insights.asOf.year, month: insights.asOf.month });
  };

  return (
    <>
      <PayoffTab
        debts={debts}
        income={income}
        expenses={expenses}
        isLoading={isLoading}
        onNavigate={onNavigate}
        renderTop={(ctx) => <PlanTop ctx={ctx} debts={debts} proEligible={proEligible} />}
        renderFooter={(ctx) => (
          <PlanClosing
            ctx={ctx}
            planGap={insights?.planGap ?? null}
            missedCount={insights?.paymentGap?.missed.length ?? 0}
            onLog={openLog}
          />
        )}
      />
      {logSheet && (
        <BulkLogSheet
          title={`Log ${shortMonthLabel(logSheet.month)} payments`}
          rows={logSheet.rows}
          year={logSheet.year}
          month={logSheet.month}
          onClose={() => setLogSheet(null)}
        />
      )}
    </>
  );
}

function PlanTop({ ctx, debts, proEligible }: { ctx: PlanTopContext; debts: Debt[]; proEligible: boolean | undefined }) {
  const pair = strategyPairView({
    method: ctx.payoffMethod,
    current: ctx.planResult,
    alternative: ctx.alternative?.result ?? null,
  });
  const accel = accelerationView(ctx.effectiveAcceleration, ctx.availableCashFlow);
  // The free rung: WhatIfCard's own call (WhatIfCard.tsx:60-66) at +$25.
  const freeTile = useMemo(() => {
    if (proEligible !== false) return null;
    const withExtra = calculateResultByMethod(
      debts.filter(isPlanDebt), ctx.income, ctx.recurringTotal, ctx.adjustedExtra + FREE_WHAT_IF_DELTA, ctx.payoffMethod,
    );
    return whatIfFreeTile(ctx.planResult, withExtra);
  }, [proEligible, debts, ctx.income, ctx.recurringTotal, ctx.adjustedExtra, ctx.payoffMethod, ctx.planResult]);

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <StrategyControl
        method={ctx.payoffMethod}
        onChange={ctx.setPayoffMethod}
        customOpen={proEligible === undefined ? undefined : proEligible === true}
        pair={pair}
      />
      {accel ? (
        <AccelerationCard view={accel} value={ctx.effectiveAcceleration} onChange={ctx.setAccelerationAmount} saving={ctx.saveIsPending} />
      ) : (
        // v1's RollForwardAdvice "review my plan" button scrolls to this id
        // regardless of whether the slider has room to show; keep the anchor alive.
        <div id="cash-flow-overview" className="scroll-mt-24" aria-hidden="true" />
      )}
      {proEligible === true && (
        <>
          <WhatIfCard
            debts={debts}
            income={ctx.income}
            expenses={ctx.expenses}
            adjustedExtra={ctx.adjustedExtra}
            currentMonths={ctx.planResult.months}
            currentInterestPaid={ctx.planResult.totalInterestPaid}
            payoffMethod={ctx.payoffMethod}
            effectiveAcceleration={ctx.effectiveAcceleration}
            availableCashFlow={ctx.availableCashFlow}
            onAccelerationChange={ctx.setAccelerationAmount}
            isPro
          />
          <WhatIfAnyAmount
            debts={debts}
            income={ctx.income}
            recurringTotal={ctx.recurringTotal}
            adjustedExtra={ctx.adjustedExtra}
            payoffMethod={ctx.payoffMethod}
            current={ctx.planResult}
            availableCashFlow={ctx.availableCashFlow}
            effectiveAcceleration={ctx.effectiveAcceleration}
            onApply={ctx.setAccelerationAmount}
          />
        </>
      )}
      {proEligible === false && <WhatIfTiles tile={freeTile} />}
    </div>
  );
}

function PlanClosing({
  ctx, planGap, missedCount, onLog,
}: { ctx: PlanTopContext; planGap: PlanGap | null; missedCount: number; onLog: () => void }) {
  const [fixRequestedAt, setFixRequestedAt] = useState<number | null>(null);
  const view = planClosingView({ planGap, canFix: ctx.availableCashFlow > ctx.effectiveAcceleration, missedCount });
  if (!view) return null;
  // The "Applied" note must reflect the save actually succeeding, not merely
  // the click: PayoffTab's save is debounced 600ms and can fail. A save only
  // counts when it was submitted at or after this fix request.
  const saveAfterRequest = fixRequestedAt !== null && ctx.saveSubmittedAt >= fixRequestedAt;
  const applied = saveAfterRequest && !ctx.saveIsPending && ctx.saveIsSuccess;
  const saveFailed = saveAfterRequest && !ctx.saveIsPending && ctx.saveIsError;
  const onCta = () => {
    if (!view.cta) return;
    if (view.cta.kind === "fix") {
      // README "Interactions": apply the unused cash flow. PayoffTab's
      // debounced save writes it, and the plan below recalculates at once.
      track(Events.PLAN_GAP_FIX_APPLIED);
      ctx.setAccelerationAmount(ctx.availableCashFlow);
      setFixRequestedAt(Date.now());
    } else {
      onLog();
    }
  };
  return (
    <ClosingCard
      variant="red"
      eyebrow={view.eyebrow}
      figure={view.figure}
      cta={view.cta?.label}
      onCta={view.cta ? onCta : undefined}
      note={applied ? fixAppliedNote(ctx.planResult.debtFreeDate) : undefined}
      error={saveFailed ? "Couldn't save the new amount. Try again." : undefined}
      ctaDisabled={saveAfterRequest && ctx.saveIsPending}
    >
      {view.text}
    </ClosingCard>
  );
}
