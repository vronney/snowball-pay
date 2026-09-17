"use client";

import { useId, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Debt, Income } from "@/types";
import {
  useAllSnapshots,
  useDashboardInsights,
  useDeleteDebt,
  useMarkPaid,
  usePaymentRecords,
  useSubscription,
} from "@/lib/hooks";
import { calculatePlanMetrics } from "@/lib/payoffPlan";
import { isPlanDebt, selectMonthlyFocusDebt } from "@/lib/monthlyFocusDebt";
import { isDebtBankLinked, isDebtPastDueThisMonth } from "@/lib/debtHelpers";
import { PLANS } from "@/lib/stripe";
import {
  debtsClosingView,
  debtsSummaryView,
  focusCardView,
  orderByPlan,
  outsidePlanNotice,
  planMembership,
  upgradeSheetEView,
} from "@/lib/dashboard/myDebts";
import CompactDebtRow from "@/components/debt/CompactDebtRow";
import DebtCard from "@/components/DebtCard";
import PaymentCelebrationBanner from "@/components/PaymentCelebrationBanner";
import ClosingCard from "../ClosingCard";
import UpgradeSheet from "../sheets/UpgradeSheet";
import { CARD, CTA_BLUE, EYEBROW } from "../styles";
import DebtFormSheet from "./DebtFormSheet";
import DebtsSummary from "./DebtsSummary";
import FocusDebtCard from "./FocusDebtCard";
import PaymentToolsSection from "./PaymentToolsSection";

const NO_RANK: ReadonlyMap<string, number> = new Map();

interface DebtsV2Props {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: ReadonlyArray<{ amount: number }>;
  /** A notification's deep link: open this debt's payment panel. */
  openPaymentDebtId?: string | null;
  onPaymentPanelOpened?: () => void;
}

type OpenSheet = "add" | "upgrade" | null;

/**
 * My Debts, dashboard v2 (spec §8.3, §8.5):
 * - the focus debt
 * - the plan's debts as compact rows over the v1 DebtCard
 * - debts saved outside the plan
 * - reminders and calendar, collapsed
 * - the ink closing card, which opens upgrade moment E
 *
 * v1 DebtTab stays untouched for flag-off users. The logic below mirrors it
 * (cited lines), so v1 can be deleted after rollout without a shared refactor.
 */
export default function DebtsV2({ debts, income, expenses, openPaymentDebtId, onPaymentPanelOpened }: DebtsV2Props) {
  const outsideHeadingId = useId();
  const { data: insights } = useDashboardInsights();
  const { data: subscription } = useSubscription();
  const { data: snapshotData } = useAllSnapshots();
  const today = new Date();
  const { data: paymentsData } = usePaymentRecords(today.getFullYear(), today.getMonth());
  const deleteDebt = useDeleteDebt();
  const markPaid = useMarkPaid();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [openDebtId, setOpenDebtId] = useState<string | null>(null);
  const [logPending, setLogPending] = useState(false);

  // v1 My Debts' plan (DebtTab.tsx:233-240): the same function and inputs, so
  // rank, payoff months and the focus debt match every other tab.
  const planMetrics = useMemo(() => {
    if (!income || !debts.some(isPlanDebt)) return null;
    try {
      return calculatePlanMetrics(debts, income, [...expenses]);
    } catch {
      return null;
    }
  }, [debts, income, expenses]);
  const payoffResult = planMetrics?.result ?? null;
  const focusExtra = planMetrics?.effectiveAcceleration ?? 0;

  const scheduleById = useMemo(
    () => new Map((payoffResult?.payoffSchedule ?? []).map((s) => [s.debtId, s])),
    [payoffResult],
  );
  const rankById = useMemo(
    () => new Map((payoffResult?.payoffSchedule ?? []).map((s) => [s.debtId, s.orderInPayoff])),
    [payoffResult],
  );
  const paidDebtIds = useMemo(
    () => new Set((paymentsData?.records ?? []).map((record) => record.debtId)),
    [paymentsData],
  );
  // DebtTab.tsx:291-298: the latest payment per debt, for the bank-posting hint.
  const lastPaidAtById = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of paymentsData?.records ?? []) {
      const prev = map.get(record.debtId);
      if (!prev || record.paidAt > prev) map.set(record.debtId, record.paidAt);
    }
    return map;
  }, [paymentsData]);
  // DebtTab.tsx:217-226: the earliest snapshot balance per debt, for "% paid off".
  const earliestBalanceById = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...(snapshotData?.snapshots ?? [])].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    for (const s of sorted) if (!map.has(s.debtId)) map.set(s.debtId, s.balance);
    return map;
  }, [snapshotData?.snapshots]);

  const focusDebt = useMemo(
    () => selectMonthlyFocusDebt(debts, payoffResult, paidDebtIds),
    [debts, payoffResult, paidDebtIds],
  );
  const membership = useMemo(() => planMembership(debts), [debts]);
  const inPlanRows = useMemo(() => orderByPlan(membership.counted, rankById), [membership.counted, rankById]);
  const outsideRows = useMemo(() => orderByPlan(membership.outside, NO_RANK), [membership.outside]);

  // DebtTab.tsx:342-352: one reconnect banner per linked item, on its first shown debt.
  const reauthHostIds = useMemo(() => {
    const seenItems = new Set<string>();
    const hosts = new Set<string>();
    for (const d of [...inPlanRows, ...outsideRows]) {
      if (d.needsReauth && d.plaidItemId && !seenItems.has(d.plaidItemId)) {
        seenItems.add(d.plaidItemId);
        hosts.add(d.id);
      }
    }
    return hosts;
  }, [inPlanRows, outsideRows]);

  // While either query is still loading, proEligible is undefined — show no
  // notice rather than defaulting to Free's "saved outside it" copy, which
  // would briefly flash for a Pro account.
  const proEligible = insights?.tier.proEligible ?? subscription?.proEligible;
  const summary = debtsSummaryView(membership);
  const notice =
    proEligible === undefined
      ? null
      : outsidePlanNotice(membership.counted.length, PLANS.free.debtLimit, proEligible);
  const closing = insights
    ? debtsClosingView({
        uncounted: insights.uncounted,
        plan: insights.plan,
        tier: insights.tier,
        total: debts.length,
        price: PLANS.pro.price,
      })
    : null;
  const focusView = focusDebt
    ? focusCardView(focusDebt, scheduleById.get(focusDebt.id) ?? null, focusExtra)
    : null;

  const logFocusPayment = () => {
    if (!focusView || focusView.amount <= 0 || logPending) return;
    setLogPending(true);
    const now = new Date();
    // v1 This Month's focus-card write (ThisMonthTab.tsx:131-144), unchanged.
    markPaid.mutate(
      { debtId: focusView.debtId, amount: focusView.amount, dueYear: now.getFullYear(), dueMonth: now.getMonth() },
      { onSettled: () => setLogPending(false) },
    );
  };

  const renderRow = (debt: Debt, outsidePlan: boolean) => {
    const isFocus = debt.id === focusDebt?.id;
    const paidThisMonth = paidDebtIds.has(debt.id);
    const deepLink = openPaymentDebtId === debt.id || openDebtId === debt.id;
    const needsReauth = reauthHostIds.has(debt.id);
    const syncPaused = isDebtBankLinked(debt) && subscription?.plaidEligible === false;
    // The focus card carries the focus debt's action, so unlike v1 its row
    // stays collapsed. Rows that need attention still open.
    const needsAttention = needsReauth || syncPaused || isDebtPastDueThisMonth(debt, paidThisMonth);
    return (
      <CompactDebtRow
        key={debt.id}
        debt={debt}
        isFocus={isFocus}
        paidThisMonth={paidThisMonth}
        needsReauth={needsReauth}
        syncPaused={syncPaused}
        defaultOpen={needsAttention || deepLink}
        forceOpen={deepLink}
        outsidePlan={outsidePlan}
      >
        <DebtCard
          debt={debt}
          allDebts={debts}
          isReauthBannerHost={needsReauth}
          onDelete={() => deleteDebt.mutate(debt.id)}
          firstSnapshotBalance={earliestBalanceById.get(debt.id) ?? null}
          openPaymentPanel={deepLink}
          onPaymentPanelOpened={() => {
            onPaymentPanelOpened?.();
            if (openDebtId === debt.id) setOpenDebtId(null);
          }}
          rank={rankById.get(debt.id)}
          isActiveFocus={isFocus}
          paidThisMonth={paidThisMonth}
          lastPaymentAt={lastPaidAtById.get(debt.id) ?? null}
          monthPaidOff={scheduleById.get(debt.id)?.monthPaidOff ?? null}
          focusExtra={focusExtra}
        />
      </CompactDebtRow>
    );
  };

  const addSheet = sheet === "add" && (
    <DebtFormSheet
      notice={notice}
      allowOutsidePlan={notice !== null}
      onClose={() => setSheet(null)}
    />
  );

  if (debts.length === 0) {
    return (
      <>
        <section className={`${CARD} p-5 text-center`}>
          <p className="text-[14px] font-semibold text-txt">No debts yet.</p>
          <p className="mt-1 text-[13px] text-txt-muted">Add your first debt to build your payoff plan.</p>
          <button type="button" onClick={() => setSheet("add")} className={`mt-3 ${CTA_BLUE}`}>
            Add your first debt
          </button>
        </section>
        {addSheet}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 min-[769px]:gap-4">
      <div className="flex items-center justify-between gap-3">
        {summary ? (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-extrabold text-txt">{summary.pill}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setSheet("add")}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-[13px] font-extrabold text-txt outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
        >
          <Plus size={15} aria-hidden="true" />
          Add debt
        </button>
      </div>
      {summary && <DebtsSummary view={summary} />}
      <PaymentCelebrationBanner />
      {focusView && focusView.amount > 0 && (
        <FocusDebtCard view={focusView} pending={logPending} onLog={logFocusPayment} />
      )}
      <section aria-label="Debts in your plan" className="flex flex-col gap-2">
        {inPlanRows.map((debt) => renderRow(debt, false))}
      </section>
      {outsideRows.length > 0 && (
        // Dashed = saved outside the plan, and nothing else (DESIGN.md 2026-09-12).
        <section aria-labelledby={outsideHeadingId} className="flex flex-col gap-2 border-t border-dashed border-txt-muted/30 pt-3">
          <h3 id={outsideHeadingId} className={`${EYEBROW} text-txt-muted`}>Saved, outside the plan</h3>
          {outsideRows.map((debt) => renderRow(debt, true))}
        </section>
      )}
      <PaymentToolsSection
        debts={debts}
        paidDebtIds={paidDebtIds}
        focusDebtId={focusDebt?.id ?? null}
        focusExtra={focusExtra}
        isPro={subscription?.proEligible === true}
        subscriptionKnown={subscription !== undefined}
        onOpenDebt={setOpenDebtId}
      />
      {closing && (
        <ClosingCard cta={closing.cta} onCta={() => setSheet("upgrade")}>
          {closing.text}
        </ClosingCard>
      )}
      {addSheet}
      {sheet === "upgrade" && closing && insights?.uncounted && (
        <UpgradeSheet
          view={upgradeSheetEView({
            countedCount: membership.counted.length,
            total: debts.length,
            uncounted: insights.uncounted,
            date: closing.date,
            price: PLANS.pro.price,
            trialEligible: insights.tier.trial.eligible,
          })}
          counted={membership.counted}
          outside={membership.outside}
          trialEligible={insights.tier.trial.eligible}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
