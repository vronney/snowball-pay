"use client";

import { useEffect, useMemo, useState } from "react";
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
  // Mirrors PlanClosing's own fixInFlight (a sibling slot, not a descendant):
  // while the one-tap fix's own save is in flight, PlanTop's inputs must be
  // disabled so an edit can't write a second complete income payload that
  // races the fix's (README "Interactions").
  const [fixInFlight, setFixInFlight] = useState(false);
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
        renderTop={(ctx) => <PlanTop ctx={ctx} debts={debts} proEligible={proEligible} inputsDisabled={fixInFlight} />}
        renderFooter={(ctx) => (
          <PlanClosing
            ctx={ctx}
            planGap={insights?.planGap ?? null}
            missedCount={insights?.paymentGap?.missed.length ?? 0}
            onLog={openLog}
            onInFlightChange={setFixInFlight}
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

function PlanTop({
  ctx, debts, proEligible, inputsDisabled,
}: { ctx: PlanTopContext; debts: Debt[]; proEligible: boolean | undefined; inputsDisabled: boolean }) {
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
      {/* inputsDisabled: the one-tap plan-gap fix's own save must settle
          before another complete income payload is written — an edit here
          while it's in flight would race the fix's save. */}
      <StrategyControl
        method={ctx.payoffMethod}
        onChange={ctx.setPayoffMethod}
        customOpen={proEligible === undefined ? undefined : proEligible === true}
        pair={pair}
        disabled={inputsDisabled}
      />
      {accel ? (
        <AccelerationCard
          view={accel}
          value={ctx.effectiveAcceleration}
          onChange={ctx.setAccelerationAmount}
          saving={ctx.saveIsPending}
          disabled={inputsDisabled}
        />
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
            onAccelerationChange={inputsDisabled ? undefined : ctx.setAccelerationAmount}
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
            disabled={inputsDisabled}
          />
        </>
      )}
      {proEligible === false && <WhatIfTiles tile={freeTile} />}
    </div>
  );
}

function PlanClosing({
  ctx, planGap, missedCount, onLog, onInFlightChange,
}: {
  ctx: PlanTopContext;
  planGap: PlanGap | null;
  missedCount: number;
  onLog: () => void;
  /** Reports this fix's own in-flight window to PlanV2, which disables PlanTop's inputs for its duration. */
  onInFlightChange: (inFlight: boolean) => void;
}) {
  const [fixRequestedAt, setFixRequestedAt] = useState<number | null>(null);
  // The acceleration this fix requested, captured at the press — distinguishes
  // this control's own save from a later save made by the slider (or a Pro
  // what-if control), which also writes through PayoffTab's debounced path.
  const [requestedAmount, setRequestedAmount] = useState<number | null>(null);
  // The acceleration to restore to if the save behind a fix request fails.
  const [restoreTo, setRestoreTo] = useState(0);
  const [errorShown, setErrorShown] = useState(false);
  // Set once this fix's own save succeeds, kept independent of fixRequestedAt
  // so a later, unrelated save can clear the request without silently
  // wiping an already-shown note; cleared by a fresh press or once the plan
  // moves away from the fix (below). Only whether the note should show — its
  // text is derived from the live projection at render time (below), so a
  // strategy switch after the fix can't leave it stating a stale month.
  const [applied, setApplied] = useState(false);
  // The "Applied" note must reflect THIS fix's own save actually succeeding,
  // not merely the click, and not some other control's later save: PayoffTab's
  // save is debounced 600ms, can fail, and is shared with the slider and Pro
  // what-if controls. A save only counts as this fix's own when it was
  // submitted at or after this fix request AND carried the exact acceleration
  // this fix requested — another control's save (a different amount) neither
  // confirms nor fails the fix.
  const ownSave = fixRequestedAt !== null && requestedAmount !== null
    && ctx.saveSubmittedAt >= fixRequestedAt && ctx.lastSavedAcceleration === requestedAmount;
  const saveSucceeded = ownSave && !ctx.saveIsPending && ctx.saveIsSuccess;
  const saveFailed = ownSave && !ctx.saveIsPending && ctx.saveIsError;
  // "In flight" means only "requested and not yet settled" — both terminal
  // paths below (success and failure) clear fixRequestedAt, so this alone
  // keeps the fix CTA mounted and disabled from the click until the save settles.
  const fixInFlight = fixRequestedAt !== null;
  const view = planClosingView({
    planGap, canFix: ctx.availableCashFlow > ctx.effectiveAcceleration || fixInFlight, missedCount,
  });

  // Reports this fix's own in-flight window to PlanV2 so PlanTop's inputs
  // freeze for its duration only — never every pending debounced slider save.
  // The cleanup also fires on unmount, so a tab switch mid-save can't leave
  // PlanV2's inputsDisabled stuck true.
  useEffect(() => {
    onInFlightChange(fixInFlight);
    return () => onInFlightChange(false);
  }, [fixInFlight, onInFlightChange]);

  useEffect(() => {
    if (!saveSucceeded) return;
    // This fix's own save succeeded — the note now renders from the live
    // projection (below), so only the flag is recorded here. Clear the
    // request so a later, unrelated save can't be mistaken for this fix's own.
    setApplied(true);
    setFixRequestedAt(null);
    setRequestedAmount(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSucceeded]);

  useEffect(() => {
    if (!saveFailed) return;
    // Restore the previous acceleration so canFix becomes true again on its
    // own, letting a new press change the value and re-trigger PayoffTab's
    // debounced save (whose guard compares against its lastLoadedRef).
    ctx.setAccelerationAmount(restoreTo);
    setFixRequestedAt(null);
    setRequestedAmount(null);
    setErrorShown(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveFailed]);

  // Drop the note once the plan moves away from the fix: if the user lowers
  // the acceleration again (the slider, a what-if control), "Applied — your
  // plan now ends …" would no longer describe the current plan.
  useEffect(() => {
    if (applied && ctx.availableCashFlow > ctx.effectiveAcceleration) setApplied(false);
  }, [applied, ctx.availableCashFlow, ctx.effectiveAcceleration]);

  if (!view) return null;

  const onCta = () => {
    if (!view.cta) return;
    if (view.cta.kind === "fix") {
      // Another control's save (the slider, a Pro what-if) must settle before
      // the fix's own write: firing while one is already pending would race
      // two complete income payloads against each other. Bail before tracking
      // or recording anything — the disabled CTA should already prevent this,
      // this is the guard against a stale click landing after a save started.
      if (ctx.saveIsPending) return;
      // README "Interactions": apply the unused cash flow. Saved immediately
      // (not PayoffTab's debounced path) so the fix survives a tab switch
      // before the debounce would have settled; the plan recalculates at once.
      // The request timestamp must be captured BEFORE the save call: the save
      // is synchronous and stamps ctx.saveSubmittedAt itself, and the
      // "Applied" gate below requires saveSubmittedAt >= fixRequestedAt. If
      // the timestamp were taken after the save, a same-millisecond ordering
      // could make submittedAt < fixRequestedAt and the note would never show.
      const requestedAt = Date.now();
      track(Events.PLAN_GAP_FIX_APPLIED);
      setRestoreTo(ctx.effectiveAcceleration);
      setErrorShown(false);
      setApplied(false);
      setFixRequestedAt(requestedAt);
      setRequestedAmount(ctx.availableCashFlow);
      ctx.saveAccelerationNow(ctx.availableCashFlow);
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
      error={errorShown ? "Couldn't save the new amount. Try again." : undefined}
      ctaDisabled={fixInFlight || ctx.saveIsPending}
    >
      {view.text}
    </ClosingCard>
  );
}
