"use client";

import { useEffect, useState } from "react";
import type { Debt, Expense, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import { getErrorMessage, useDashboardInsights, useSaveIncome } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { UPGRADE_FEATURE } from "@/lib/dashboard/upgradeFeatures";
import { PLANS } from "@/lib/stripe";
import { incomeSavePayload } from "@/lib/dashboard/incomePayload";
import { longMonthLabel, shortMonthLabel } from "@/lib/dashboard/format";
import {
  interestView, missedPaymentRows, rateWatchView, type FreeMoveAction, type LogRow,
} from "@/lib/dashboard/thisMonth";
import {
  coachClosingView, coachFreeMoveView, moreMovesView, openMoveRows, type OpenMoveAction,
} from "@/lib/dashboard/coach";
import type { CoachMove, CoachMoveId } from "@/lib/dashboard/types";
import type { AprOpenRequest } from "@/components/AprNegotiationCard";
import IntelligenceTab from "@/components/tabs/IntelligenceTab";
import { Skeleton } from "@/components/ui/skeleton";
import ClosingCard from "../ClosingCard";
import BulkLogSheet from "../sheets/BulkLogSheet";
import FreeMoveCard from "../this-month/FreeMoveCard";
import InterestMeter from "../this-month/InterestMeter";
import RateWatchCard from "../this-month/RateWatchCard";
import { CARD } from "../styles";
import MoreMovesList from "./MoreMovesList";
import OpenMovesList from "./OpenMovesList";

const INLINE_BUTTON =
  "mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 text-[13px] font-extrabold text-white outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

interface CoachV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  pendingExtra?: number | null;
  onConsumePendingExtra?: () => void;
  onNavigate: (tab: Tab) => void;
  /** Moment B's "Script →" on This Month: the card whose APR script to open, once (plan decision 11). */
  pendingAprDebtId?: string | null;
  onConsumePendingApr?: () => void;
}

type LogSheet = { rows: LogRow[]; year: number; month: number } | null;
type MoveAction = FreeMoveAction | OpenMoveAction;

/**
 * Coach, dashboard v2 (spec §8.5). Free: compact interest → the free move →
 * rate watch → the priced gated list → the ink closing card. Pro and trial:
 * compact interest → every move open → rate watch → the existing Pro content
 * (IntelligenceTab). Every figure is the insights endpoint's.
 */
export default function CoachV2({
  debts, income, expenses, isLoading, pendingExtra, onConsumePendingExtra, onNavigate,
  pendingAprDebtId, onConsumePendingApr,
}: CoachV2Props) {
  const { data: insights, isError, isPlaceholderData, refetch } = useDashboardInsights();
  const saveIncome = useSaveIncome();
  const [logSheet, setLogSheet] = useState<LogSheet>(null);
  const [pendingMove, setPendingMove] = useState<CoachMoveId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aprRequest, setAprRequest] = useState<AprOpenRequest | null>(null);

  // The script lives in the Pro content, so a request waits for a Pro tier.
  const tierIsPro = insights?.tier.proEligible === true;
  useEffect(() => {
    if (!tierIsPro || !pendingAprDebtId) return;
    setAprRequest({ debtId: pendingAprDebtId, nonce: Date.now() });
    onConsumePendingApr?.();
  }, [tierIsPro, pendingAprDebtId, onConsumePendingApr]);

  if (!insights) {
    return isError ? <LoadFailed onRetry={() => void refetch()} /> : <LoadingCards />;
  }

  const pro = insights.tier.proEligible;
  const { year, month } = insights.asOf;
  const interest = interestView(insights.interest);
  const rateWatch = rateWatchView(insights.rateWatch);
  const freeMove = coachFreeMoveView(insights);
  const more = moreMovesView(insights);
  const closing = coachClosingView(insights, PLANS.pro.price);
  const openRows = openMoveRows(insights);

  const save = (move: CoachMove, patch: Parameters<typeof incomeSavePayload>[1]) => {
    if (!income || pendingMove !== null) return;
    track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
    setError(null);
    setPendingMove(move.id);
    // The Plan tab's own write; the global mutation cache then refreshes insights.
    saveIncome.mutate(incomeSavePayload(income, patch), {
      onError: (err) => setError(getErrorMessage(err, "Couldn't save. Try again.")),
      onSettled: () => setPendingMove(null),
    });
  };

  const run = (move: CoachMove, action: MoveAction) => {
    if (action === "bulk_log") {
      // Placeholder-day data can still name last month (ThisMonthV2's guard).
      if (isPlaceholderData) return;
      const rows = missedPaymentRows(insights.paymentGap, debts);
      if (rows.length === 0) return;
      track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
      setLogSheet({ rows, year, month });
    } else if (action === "open_plan") {
      track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
      onNavigate("plan");
    } else if (action === "apr_script" && move.id === "call_apr") {
      track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
      setAprRequest({ debtId: move.facts.debtId, nonce: Date.now() });
    } else if (action === "switch_strategy" && move.id === "switch_strategy") {
      save(move, { payoffMethod: move.facts.alternative });
    } else if (action === "apply_unallocated" && move.id === "use_unallocated") {
      save(move, { accelerationAmount: move.facts.targetAcceleration });
    }
  };

  const openGated = () => {
    track(Events.COACH_MOVE_CTA, { move: "more_moves", gated: true });
    upgradeEvents.dispatch(UPGRADE_FEATURE.coachMoves);
  };

  const meter = interest && <InterestMeter view={interest} compact />;
  // On Coach, rate watch shows at every width (README §1 note; it is cut only from This Month's phone stack).
  const watch = rateWatch && <RateWatchCard view={rateWatch} />;
  const sheet = logSheet && (
    <BulkLogSheet
      title={`Log ${shortMonthLabel(logSheet.month)} payments`}
      rows={logSheet.rows}
      year={logSheet.year}
      month={logSheet.month}
      onClose={() => setLogSheet(null)}
    />
  );

  if (pro) {
    return (
      <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
        {meter}
        {openRows.length > 0 && (
          <OpenMovesList rows={openRows} onAction={(row) => run(row.move, row.cta.action)} pendingId={pendingMove} error={error} />
        )}
        {watch}
        {/* insights.tier.proEligible and IntelligenceTab's own useSubscription()
            can skew transiently (different queries, different cache
            lifetimes); passing this page's one resolved tier verdict keeps
            the Pro content these Coach actions target mounted instead of
            letting a stale Free subscription cache unmount it under the
            Free IntelligenceUpgradeTeaser. */}
        <IntelligenceTab
          debts={debts}
          income={income}
          expenses={expenses}
          isLoading={isLoading}
          pendingExtra={pendingExtra}
          onConsumePendingExtra={onConsumePendingExtra}
          aprOpenRequest={aprRequest}
          isPro
        />
        {sheet}
      </div>
    );
  }

  const nothingToShow = !meter && !freeMove && !watch && !more;
  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {meter}
      {freeMove && (
        <FreeMoveCard
          view={freeMove}
          showPriority={false}
          onAction={(action) => run(freeMove.move, action)}
          onMoreMoves={openGated}
          pending={pendingMove === freeMove.move.id}
          error={error}
        />
      )}
      {watch}
      {more && <MoreMovesList view={more} onOpen={openGated} />}
      {closing && (
        <ClosingCard cta={closing.cta} onCta={openGated}>
          {closing.text}
        </ClosingCard>
      )}
      {nothingToShow && (
        <section className={`${CARD} p-5 text-center`}>
          <p className="text-[14px] font-semibold text-txt">Nothing to show for {longMonthLabel(month)} yet.</p>
          <button type="button" onClick={() => onNavigate("debts")} className={INLINE_BUTTON}>
            Go to My Debts
          </button>
        </section>
      )}
      {sheet}
    </div>
  );
}

function LoadingCards() {
  return (
    <div role="status" aria-label="Loading your coach" className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={`${CARD} p-5 text-center`}>
      <p className="text-[14px] font-semibold text-txt">We couldn&apos;t load your coach.</p>
      <button type="button" onClick={onRetry} className={INLINE_BUTTON}>
        Try again
      </button>
    </section>
  );
}
