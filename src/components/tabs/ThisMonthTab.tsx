import { useMemo, useState, useCallback } from "react";
import { CalendarCheck, CheckCircle2, ChevronRight, CreditCard, TrendingDown } from "lucide-react";
import { Debt, Income, Expense } from "@/types";
import { type Tab } from "@/components/dashboard/types";
import { calculateMinimumsOnlyResult } from "@/lib/payoffPlan";
import { calculatePlanMetrics } from "@/lib/payoffPlan";
import { selectMonthlyFocusDebt } from "@/lib/monthlyFocusDebt";
import { displayFirstName, formatCurrency, formatCurrencyWhole, formatMonths, getOrdinalDay } from "@/lib/utils";
import { usePaymentRecords, useMarkPaid, useCachedCoachBrief, useSubscription } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import DebtFreeCountdownHero from "@/components/dashboard/DebtFreeCountdownHero";
import DebtCapUpsell from "@/components/billing/DebtCapUpsell";
import RadialGauge from "@/components/ui/RadialGauge";
import RollForwardAdvice from "@/components/payoff/RollForwardAdvice";
import CoachBriefCard from "@/components/payoff/CoachBriefCard";
import { cardSurface, color } from "@/lib/designTokens";
import PlanStatStrip from "@/components/dashboard/PlanStatStrip";

interface ThisMonthTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  userName: string | null | undefined;
  onNavigate: (tab: Tab) => void;
  onSetPendingCoachExtra: (targetExtra: number) => void;
}

function greeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = displayFirstName(name);
  return first ? `${time}, ${first}.` : `${time}.`;
}

export default function ThisMonthTab({
  debts,
  income,
  expenses,
  isLoading,
  userName,
  onNavigate,
  onSetPendingCoachExtra,
}: ThisMonthTabProps) {
  const method = (income?.payoffMethod as "snowball" | "avalanche" | "custom") ?? "snowball";
  const today = new Date();
  const markPaid = useMarkPaid();
  const { data: paymentsData } = usePaymentRecords(today.getFullYear(), today.getMonth());
  // Read the coach's committed verdict so the header can't assert "on track"
  // while the coach card below says the plan is at risk. Shared React Query
  // cache — the CoachBriefCard already fetches this key, so no extra request.
  // Null (free users, or no brief yet) → neutral, factual copy that makes no
  // pace claim either way.
  const { data: coachCache } = useCachedCoachBrief();
  // Confirmed-Free gate for the debt-cap prompt — never flash an upsell at a
  // Pro user while the subscription query is still loading.
  const { data: subscription } = useSubscription();
  const isConfirmedFree = subscription != null && subscription.proEligible !== true;
  // A stale brief predates the current balances/income/payments (the coach card
  // shows a "your numbers changed" banner in that case), so its verdict must not
  // be presented as current here — fall back to the neutral projection.
  const coachStatus = coachCache?.stale ? null : (coachCache?.brief?.verdict.status ?? null);

  const paidDebtIds = useMemo(
    () => new Set((paymentsData?.records ?? []).map((record) => record.debtId)),
    [paymentsData],
  );

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + d.balance, 0), [debts]);

  // Accelerated plan (user's actual strategy)
  const planMetrics = useMemo(() => {
    if (!debts.length || !income) return null;
    try {
      return calculatePlanMetrics(debts, income, expenses, { method });
    } catch {
      return null;
    }
  }, [debts, income, method, expenses]);

  const result = planMetrics?.result ?? null;

  // Minimums-only baseline for interest reclaimed calculation
  const minimumsResult = useMemo(() => {
    if (!debts.length) return null;
    try {
      return calculateMinimumsOnlyResult(debts);
    } catch {
      return null;
    }
  }, [debts]);

  const interestSaved = useMemo(() => {
    if (!result || !minimumsResult) return 0;
    return Math.max(0, minimumsResult.totalInterestPaid - result.totalInterestPaid);
  }, [result, minimumsResult]);

  const monthsSaved = useMemo(() => {
    if (!result || !minimumsResult) return 0;
    return Math.max(0, minimumsResult.months - result.months);
  }, [result, minimumsResult]);

  // Overall payoff progress for the hero gauge: principal paid across all
  // debts. Debts without a recorded originalBalance contribute their current
  // balance to the denominator (0% progress) rather than skewing the ratio.
  const { totalPaid, totalOriginal, hasOriginalBalances } = useMemo(() => {
    let paid = 0;
    let original = 0;
    let known = false;
    for (const d of debts) {
      const hasOriginal = d.originalBalance > 0;
      if (hasOriginal) known = true;
      const base = hasOriginal ? d.originalBalance : d.balance;
      original += base;
      paid += Math.max(0, base - d.balance);
    }
    return { totalPaid: paid, totalOriginal: original, hasOriginalBalances: known };
  }, [debts]);

  // Focus debt = first active debt in payoff order that still needs this month's payment.
  const focusDebt = useMemo(() => {
    return selectMonthlyFocusDebt(debts, result, paidDebtIds);
  }, [debts, paidDebtIds, result]);

  const focusSchedule = useMemo(() => {
    if (!result || !focusDebt) return null;
    return result.payoffSchedule.find((s) => s.debtId === focusDebt.id) ?? null;
  }, [result, focusDebt]);

  // The focus debt's planned payment = its minimum plus this month's extra,
  // matching the debt card's "Pay $X here this month" guidance.
  const focusExtra = Math.max(0, planMetrics?.effectiveAcceleration ?? 0);
  const plannedPayment = focusDebt
    ? focusDebt.minimumPayment + focusExtra
    : 0;

  const [logPending, setLogPending] = useState(false);

  const handleLogPayment = useCallback(() => {
    if (!focusDebt || logPending) return;
    setLogPending(true);
    const currentDate = new Date();
    markPaid.mutate(
      {
        debtId: focusDebt.id,
        amount: plannedPayment,
        dueYear: currentDate.getFullYear(),
        dueMonth: currentDate.getMonth(),
      },
      { onSettled: () => setLogPending(false) },
    );
  }, [focusDebt, plannedPayment, logPending, markPaid]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const hasDebts = debts.length > 0;
  const focusPaid = focusDebt ? paidDebtIds.has(focusDebt.id) : false;

  return (
    // Two columns on wide desktop, one below. The split is action-path (left)
    // vs reference data (right), and the DOM order is deliberately the
    // single-column reading order —
    // stacked, these render in exactly the sequence the single column used to,
    // so the narrow layout is unchanged by the reflow.
    <div style={{ maxWidth: "1120px" }} className="flex flex-col gap-5">

      {/* Greeting — the hero below owns the date/months, so the sub-line only
          carries what the hero can't: the coach's verdict, or setup prompts. */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
          {greeting(userName)}
        </h1>
        {hasDebts && result ? (
          coachStatus && (
            <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
              {coachStatus === "on_track"
                ? "You're on track. Keep the plan working."
                : // The verdict can stem from pace, cash flow, debt load, or a
                  // bank-reauth issue — so point at the coach without asserting
                  // a specific "behind pace" claim the verdict didn't establish.
                  "Your coach flagged something to review."}
            </p>
          )
        ) : hasDebts ? (
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
            Add your income to see your debt-free date.
          </p>
        ) : (
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
            Add your debts to get started.
          </p>
        )}
      </div>

      {/* Current numbers, full width above the split — a summary bar reads as
          one row, not as a card belonging to either column. */}
      {hasDebts && income && planMetrics && result && (
        <PlanStatStrip
          totalDebt={totalDebt}
          debtCount={debts.length}
          monthlyTakeHome={income.monthlyTakeHome}
          totalMinPayments={planMetrics.totalMinPayments}
          acceleration={focusExtra}
          // Gated on `result` rather than defaulted: PlanMetrics.result is
          // non-optional so the old `?? 0` could never fire, but it implied a
          // state where the strip would show $0 of projected interest as if it
          // were real. Let the strip not render instead of inventing a zero.
          projectedInterest={result.totalInterestPaid}
        />
      )}

      {/* Splits at xl (1280px), not lg — the 220px sidebar means a 1024px
          viewport leaves only ~740px of content, and the right column lands at
          ~300px. The monthly snapshot below uses `sm:grid-cols-3`, a VIEWPORT
          query, so it stays 3-up inside that narrow column and its mono values
          overflow by up to 30px (measured). At xl the right column is ~407px
          and the columns fit. Below 1280 the layout is the single column it
          has always been, so narrow widths are untouched.

          items-start so a tall left column doesn't stretch the right one's
          cards to match its height. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5 items-start">

      {/* ── Left: the action path — where you stand, and what to do now ── */}
      <div className="flex flex-col gap-5">

      {/* Debt-free countdown hero — date, months to go, progress, interest */}
      {hasDebts && result && (
        <DebtFreeCountdownHero
          months={result.months}
          debtFreeDate={result.debtFreeDate}
          interestSaved={interestSaved}
          monthsSaved={monthsSaved}
          totalPaid={totalPaid}
          totalOriginal={totalOriginal}
          hasOriginalBalances={hasOriginalBalances}
        />
      )}

      {/* Debt-cap prompt — the hero above shows the (possibly partial) plan;
          this names the limitation truthfully for Free users at the cap. */}
      {hasDebts && (
        <DebtCapUpsell
          debtCount={debts.length}
          planMonths={result?.months ?? null}
          isConfirmedFree={isConfirmedFree}
        />
      )}

      {/* Primary coach card */}
      <CoachBriefCard
        hasDebts={hasDebts}
        hasIncome={!!income}
        onApplyAction={(targetExtra) => {
          onSetPendingCoachExtra(targetExtra);
          onNavigate("intelligence");
        }}
      />

      {/* Focus debt card */}
      {focusDebt && (
        <div
          style={{ ...cardSurface, padding: "20px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            {/* .eyebrow carries weight/tracking/uppercase; size and the blue
                accent are this caption's own (it marks the active target). */}
            <span className="eyebrow" style={{ fontSize: "11px", color: color.primary }}>
              Focus this month
            </span>
            {focusPaid && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, color: "#10b981" }}>
                ✓ Paid
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "2px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              {focusDebt.name}
            </h2>
            {focusDebt.interestRate > 0 && (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{focusDebt.interestRate}% APR</span>
            )}
          </div>

          {/* Balance readout + progress gauge */}
          <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: "2px" }}>Current balance</div>
              <div className="mono" style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(focusDebt.balance)}
              </div>
              {focusDebt.originalBalance > 0 && focusDebt.originalBalance > focusDebt.balance && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  of {formatCurrency(focusDebt.originalBalance)} original
                </div>
              )}
            </div>
            {focusDebt.originalBalance > 0 && focusDebt.originalBalance > focusDebt.balance && (
              <RadialGauge
                pct={((focusDebt.originalBalance - focusDebt.balance) / focusDebt.originalBalance) * 100}
              />
            )}
          </div>

          {/* Payment row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid rgba(15,23,42,0.07)",
            }}
          >
            <div>
              <div className="eyebrow">
                {focusExtra > 0 ? "Planned payment" : "Minimum payment"}
              </div>
              <div className="mono" style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(plannedPayment)}
              </div>
              {focusExtra > 0 && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  {formatCurrency(focusDebt.minimumPayment)} minimum + {formatCurrency(focusExtra)} extra
                </div>
              )}
              {focusDebt.dueDate && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Due the {getOrdinalDay(focusDebt.dueDate)}
                </div>
              )}
            </div>
            <button
              onClick={handleLogPayment}
              disabled={focusPaid || logPending}
              className={focusPaid ? undefined : "glow-primary"}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: focusPaid || logPending ? "default" : "pointer",
                fontSize: "13px",
                fontWeight: 700,
                background: focusPaid ? "#f1f5f9" : "#2563eb",
                color: focusPaid ? "#94a3b8" : "#ffffff",
                transition: "background 0.15s",
              }}
            >
              {focusPaid ? "Logged ✓" : logPending ? "Saving…" : "Log Payment"}
            </button>
          </div>

          {focusSchedule && focusSchedule.monthPaidOff > 0 && (
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "12px" }}>
              Paid off in {formatMonths(focusSchedule.monthPaidOff)} · {formatCurrency(focusSchedule.interestPaid)} interest total
            </p>
          )}
        </div>
      )}

      {hasDebts && (
        <RollForwardAdvice
          debts={debts}
          focusDebt={focusDebt}
          currentAcceleration={planMetrics?.effectiveAcceleration ?? 0}
          availableCashFlow={planMetrics?.availableCashFlow}
          surface="this_month"
          onReviewPlan={() => onNavigate("plan")}
        />
      )}

      {/* Empty state */}
      {!hasDebts && (
        <div
          style={{ ...cardSurface, padding: "32px 20px", textAlign: "center" }}
        >
          <CreditCard size={32} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>No debts added yet</p>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
            Add your debts to see your payoff plan.
          </p>
          <button
            onClick={() => onNavigate("debts")}
            className="glow-primary"
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
              background: "#2563eb",
              color: "#ffffff",
            }}
          >
            Add My First Debt
          </button>
        </div>
      )}

      </div>
      {/* ── Right: reference data — the numbers behind the plan ── */}
      <div className="flex flex-col gap-5">

      {/* The monthly-snapshot card that used to sit here is now the stat strip
          above: Total Debt and Monthly Income became strip tiles, and
          Acceleration became the "min + extra" subline under Monthly payment. */}

      {/* All debts list */}
      {debts.length > 1 && (
        <div
          style={{ ...cardSurface, padding: "16px 20px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", margin: 0 }}>All Debts</h3>
            <button
              onClick={() => onNavigate("debts")}
              style={{ fontSize: "12px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              Manage →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {debts.map((debt, i) => {
              const paid = paidDebtIds.has(debt.id);
              const isFocus = debt.id === focusDebt?.id;
              const isPaidOff = debt.balance <= 0.01;
              // Progress is only meaningful when the debt records where it
              // started AND has actually moved. Without that, a bar would
              // either read 0% forever or imply paydown that never happened —
              // so the row drops the bar rather than inventing one.
              const hasProgress =
                debt.originalBalance > 0 && debt.originalBalance > debt.balance;
              const paidPct = hasProgress
                ? Math.min(
                    100,
                    ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100,
                  )
                : 0;
              return (
                <div
                  key={debt.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: i < debts.length - 1 ? "1px solid rgba(15,23,42,0.06)" : "none",
                  }}
                >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: isPaidOff ? "#10b981" : isFocus ? "#2563eb" : "#e2e8f0",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: isPaidOff ? "#059669" : "#0f172a" }}>
                          {debt.name}
                        </span>
                        {isPaidOff && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "10px", fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: "999px", padding: "1px 6px" }}>
                            <CheckCircle2 size={10} strokeWidth={2} />
                            Paid off
                          </span>
                        )}
                        {!isPaidOff && isFocus && (
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: "999px", padding: "1px 6px" }}>
                            Focus
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: "13px", fontWeight: 700, color: isPaidOff ? "#059669" : "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(debt.balance)}
                    </div>
                    {hasProgress && !isPaidOff && (
                      <div className="mono" style={{ fontSize: "11px", color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
                        was {formatCurrencyWhole(debt.originalBalance)}
                      </div>
                    )}
                    {!isPaidOff && paid && (
                      <div style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>Paid ✓</div>
                    )}
                  </div>
                </div>

                {/* Paydown bar — blue is the documented progress-fill colour;
                    a cleared debt switches to success green. */}
                {hasProgress && (
                  <div
                    style={{
                      height: "4px",
                      borderRadius: "999px",
                      background: color.border,
                      overflow: "hidden",
                      marginTop: "8px",
                    }}
                  >
                    <div
                      className="progress-bar"
                      style={{
                        height: "100%",
                        width: `${paidPct}%`,
                        borderRadius: "999px",
                        background: isPaidOff ? color.success : color.primary,
                      }}
                    />
                  </div>
                )}

                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                  {[
                    hasProgress ? `${paidPct.toFixed(1)}% paid` : null,
                    `${formatCurrency(debt.minimumPayment)}/mo min`,
                    debt.dueDate ? `due the ${getOrdinalDay(debt.dueDate)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick nav */}
      {hasDebts && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { tab: "plan" as Tab, icon: TrendingDown, label: "View My Plan", sub: "Strategy, payoff order, and what-if scenarios" },
            { tab: "progress" as Tab, icon: CalendarCheck, label: "Track Progress", sub: "Balance history, milestones, and streaks" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                onClick={() => onNavigate(item.tab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(15,23,42,0.08)",
                  background: "#ffffff",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Icon size={18} strokeWidth={1.7} style={{ color: "#64748b", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{item.sub}</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "#cbd5e1" }} />
              </button>
            );
          })}
        </div>
      )}

      </div>
      </div>
    </div>
  );
}
