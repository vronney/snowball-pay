"use client";

import { useState } from "react";
import type { Debt, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import type { ReadinessStepId } from "@/lib/dashboard/types";
import { getErrorMessage, useDashboardInsights, useSaveIncome } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { longMonthLabel, shortMonthLabel } from "@/lib/dashboard/format";
import {
  activeDebtRows,
  debtsMissingDueDate,
  freeMoveView,
  heroView,
  interestView,
  missedPaymentRows,
  rateWatchView,
  readinessTarget,
  readinessView,
  type FreeMoveAction,
  type LogRow,
} from "@/lib/dashboard/thisMonth";
import { Skeleton } from "@/components/ui/skeleton";
import CoachBriefCard from "@/components/payoff/CoachBriefCard";
import BulkLogSheet from "../sheets/BulkLogSheet";
import DueDatesSheet from "../sheets/DueDatesSheet";
import { CARD } from "../styles";
import DebtFreeHero from "./DebtFreeHero";
import FreeMoveCard from "./FreeMoveCard";
import InterestMeter from "./InterestMeter";
import RateWatchCard from "./RateWatchCard";
import ReadinessCard from "./ReadinessCard";

/** Opens UpgradeModal with its coach copy, like the sidebar rail (V2Shell). */
const MOVES_UPGRADE_FEATURE = "Coach moves";

const INLINE_BUTTON =
  "mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 text-[13px] font-extrabold text-white outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

interface ThisMonthV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  onNavigate: (tab: Tab) => void;
  onSetPendingCoachExtra: (targetExtra: number) => void;
}

type OpenSheet = { kind: "dueDates" } | { kind: "log"; rows: LogRow[] } | null;

/**
 * This Month, dashboard v2 (spec §8.5): readiness → interest → debt-free hero
 * → one free move (Pro and trial: the AI brief), with rate watch in the
 * desktop row. Every figure comes from the insights endpoint; a card
 * without a real figure doesn't render.
 */
export default function ThisMonthV2({ debts, income, onNavigate, onSetPendingCoachExtra }: ThisMonthV2Props) {
  const { data: insights, isError, refetch } = useDashboardInsights();
  const saveIncome = useSaveIncome();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  if (!insights) {
    return isError ? <LoadFailed onRetry={() => void refetch()} /> : <LoadingCards />;
  }

  const readiness = readinessView(insights.readiness);
  const interest = interestView(insights.interest);
  const hero = heroView(insights.plan, debts);
  const rateWatch = rateWatchView(insights.rateWatch);
  const freeMove = freeMoveView(insights);
  const { year, month } = insights.asOf;

  const openLog = (rows: LogRow[]) => {
    if (rows.length > 0) setSheet({ kind: "log", rows });
  };

  const onStep = (stepId: ReadinessStepId, via: "cta" | "chip") => {
    const step = insights.readiness.steps.find((s) => s.id === stepId);
    if (!step) return;
    if (via === "cta") track(Events.READINESS_CTA, { step: stepId });
    const target = readinessTarget(step);
    if (target.kind === "tab") {
      onNavigate(target.tab);
    } else if (target.kind === "dueDatesSheet") {
      // Insights can trail a debt edit by a refetch; with nothing left to
      // date, go where due dates live instead of opening an empty sheet.
      if (debtsMissingDueDate(debts).length > 0) setSheet({ kind: "dueDates" });
      else onNavigate("debts");
    } else {
      openLog(activeDebtRows(debts));
    }
  };

  const onMoveAction = (action: FreeMoveAction) => {
    if (!freeMove) return;
    const { move } = freeMove;
    track(Events.COACH_MOVE_CTA, { move: move.id, gated: false });
    if (action === "bulk_log") {
      openLog(missedPaymentRows(insights.paymentGap, debts));
    } else if (action === "open_plan") {
      onNavigate("plan");
    } else if (move.id === "switch_strategy" && income) {
      setSwitchError(null);
      // PayoffTab's exact save payload: the same write as the Plan tab's
      // method toggle. The global mutation cache then refreshes insights.
      saveIncome.mutate(
        {
          monthlyTakeHome: income.monthlyTakeHome,
          essentialExpenses: income.essentialExpenses,
          extraPayment: income.extraPayment,
          payoffMethod: move.facts.alternative,
          accelerationAmount: income.accelerationAmount ?? null,
        },
        { onError: (err) => setSwitchError(getErrorMessage(err, "Couldn't switch. Try again.")) },
      );
    }
  };

  const coach = insights.tier.proEligible ? (
    <CoachBriefCard
      hasDebts={debts.length > 0}
      hasIncome={!!income}
      onApplyAction={(targetExtra) => {
        onSetPendingCoachExtra(targetExtra);
        onNavigate("intelligence");
      }}
    />
  ) : freeMove ? (
    <FreeMoveCard
      view={freeMove}
      onAction={onMoveAction}
      onMoreMoves={() => upgradeEvents.dispatch(MOVES_UPGRADE_FEATURE)}
      pending={saveIncome.isPending}
      error={switchError}
    />
  ) : null;

  const nothingToShow = !readiness && !interest && !hero && !coach;

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {readiness && <ReadinessCard view={readiness} onStep={onStep} />}
      {(interest || hero || rateWatch) && (
        <div className="flex flex-col gap-2.5 min-[769px]:gap-4 min-[1024px]:flex-row">
          {interest && (
            <div className="min-w-0 min-[1024px]:flex-[1.15_1_0%] [&>section]:h-full">
              <InterestMeter view={interest} />
            </div>
          )}
          {hero && (
            <div className="min-w-0 min-[1024px]:flex-[1_1_0%] [&>section]:h-full">
              <DebtFreeHero view={hero} />
            </div>
          )}
          {rateWatch && (
            // Cut from the phone stack to keep it short (README §1 note); on phones it lives on Coach (PR 5).
            <div data-card="rate-watch" className="min-w-0 max-[768px]:hidden min-[1024px]:flex-[1_1_0%] [&>section]:h-full">
              <RateWatchCard view={rateWatch} />
            </div>
          )}
        </div>
      )}
      {coach}
      {nothingToShow && (
        <section className={`${CARD} p-5 text-center`}>
          <p className="text-[14px] font-semibold text-txt">Nothing to show for {longMonthLabel(month)} yet.</p>
          <button type="button" onClick={() => onNavigate("debts")} className={INLINE_BUTTON}>
            Go to My Debts
          </button>
        </section>
      )}
      {sheet?.kind === "dueDates" && (
        <DueDatesSheet debts={debtsMissingDueDate(debts)} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "log" && (
        <BulkLogSheet
          title={`Log ${shortMonthLabel(month)} payments`}
          rows={sheet.rows}
          year={year}
          month={month}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function LoadingCards() {
  return (
    <div role="status" aria-label="Loading this month" className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <section className={`${CARD} p-5 text-center`}>
      <p className="text-[14px] font-semibold text-txt">We couldn&apos;t load this month&apos;s numbers.</p>
      <button type="button" onClick={onRetry} className={INLINE_BUTTON}>
        Try again
      </button>
    </section>
  );
}
