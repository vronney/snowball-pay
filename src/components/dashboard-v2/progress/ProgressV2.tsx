"use client";

import { useId, useMemo, useState } from "react";
import type { Debt, Expense, Income } from "@/types";
import type { Tab } from "@/components/dashboard/types";
import { useAllSnapshots, useDashboardInsights, usePaymentRecords } from "@/lib/hooks";
import { calculatePlanMetrics } from "@/lib/payoffPlan";
import { isPlanDebt } from "@/lib/monthlyFocusDebt";
import { shortMonthLabel } from "@/lib/dashboard/format";
import { gridCaptionView, milestonesView, paidOffView, streakPill, unloggedRows } from "@/lib/dashboard/progressTab";
import type { LogRow } from "@/lib/dashboard/thisMonth";
import ProgressTab from "@/components/tabs/ProgressTab";
import BulkLogSheet from "../sheets/BulkLogSheet";
import { CARD, CTA_BLUE, EYEBROW } from "../styles";
import MilestonesCard from "./MilestonesCard";
import PaidOffCard from "./PaidOffCard";
import StreakGrid from "./StreakGrid";

interface ProgressV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  onNavigate: (tab: Tab) => void;
}

type LogSheet = { rows: LogRow[]; year: number; month: number } | null;

/**
 * Progress, dashboard v2 (spec §8.5): streak pill → paid-off bar → the
 * 12-cell grid with its log CTA → milestones, then v1's chart, insights,
 * badges and Journey (ProgressTab without its stat cards). The catch-up card
 * is not built (D6). Every figure is insights.progress: ProgressTab's own
 * formulas, extracted in PR 1.
 */
export default function ProgressV2({ debts, income, expenses, isLoading, onNavigate }: ProgressV2Props) {
  const streakHeadingId = useId();
  const { data: insights, isPlaceholderData } = useDashboardInsights();
  const { data: snapshotData } = useAllSnapshots();
  const today = new Date();
  // The month insights was computed for (the server may have rejected the client date), so
  // the rows and the sheet's month can't disagree; the browser's month only until insights arrive.
  const recordsYear = insights?.asOf.year ?? today.getFullYear();
  const recordsMonth = insights?.asOf.month ?? today.getMonth();
  const { data: paymentsData } = usePaymentRecords(recordsYear, recordsMonth);
  // The rows come from this month's records, so the sheet must not open (or the CTA
  // enable) before that query has data for the currently requested month.
  const recordsReady = paymentsData !== undefined;
  const [logSheet, setLogSheet] = useState<LogSheet>(null);

  // DebtsV2.tsx:77-84: the same plan every tab computes, here for the schedule.
  const planMetrics = useMemo(() => {
    if (!income || !debts.some(isPlanDebt)) return null;
    try {
      return calculatePlanMetrics(debts, income, [...expenses]);
    } catch {
      return null;
    }
  }, [debts, income, expenses]);
  const paidDebtIds = useMemo(
    () => new Set((paymentsData?.records ?? []).map((record) => record.debtId)),
    [paymentsData],
  );
  const milestones = useMemo(
    () => milestonesView(debts, snapshotData?.snapshots ?? [], planMetrics?.result.payoffSchedule ?? []),
    [debts, snapshotData?.snapshots, planMetrics],
  );

  const progress = insights?.progress ?? null;
  const pill = progress ? streakPill(progress.streak) : null;
  const paid = paidOffView(progress);
  const caption = insights ? gridCaptionView(insights.paymentGap, insights.asOf.month) : null;

  const openLog = () => {
    // Placeholder-day data can still name last month (ThisMonthV2's guard).
    if (!insights || isPlaceholderData || !recordsReady) return;
    const rows = unloggedRows(debts, paidDebtIds);
    if (rows.length === 0) return;
    setLogSheet({ rows, year: insights.asOf.year, month: insights.asOf.month });
  };

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      {pill && (
        <div>
          <span className="rounded-full bg-streak-pill px-2.5 py-1 text-[11px] font-extrabold text-streak-pill-text">{pill}</span>
        </div>
      )}
      {paid && <PaidOffCard view={paid} />}
      {progress && (
        <section aria-labelledby={streakHeadingId} className={`${CARD} p-4`}>
          <h2 id={streakHeadingId} className={`${EYEBROW} text-txt-muted`}>Payment streak</h2>
          <div className="mt-2">
            <StreakGrid cells={progress.grid} />
          </div>
          {caption && (
            <>
              <p className="mt-3 text-[13px] font-bold text-txt [text-wrap:pretty]">{caption.text}</p>
              <button type="button" onClick={openLog} disabled={!recordsReady} className={`mt-3 ${CTA_BLUE}`}>
                {caption.cta}
              </button>
            </>
          )}
        </section>
      )}
      {milestones.length > 0 && <MilestonesCard rows={milestones} />}
      <ProgressTab debts={debts} income={income} expenses={expenses} isLoading={isLoading} onNavigate={onNavigate} showStats={false} />
      {logSheet && (
        <BulkLogSheet
          title={`Log ${shortMonthLabel(logSheet.month)} payments`}
          rows={logSheet.rows}
          year={logSheet.year}
          month={logSheet.month}
          onClose={() => setLogSheet(null)}
        />
      )}
    </div>
  );
}
