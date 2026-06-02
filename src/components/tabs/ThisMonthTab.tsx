import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, ChevronRight, CreditCard, TrendingDown } from "lucide-react";
import { Debt, Income, Expense } from "@/types";
import { type Tab } from "@/components/dashboard/types";
import { calculateMinimumsOnlyResult } from "@/lib/payoffPlan";
import { calculatePlanMetrics } from "@/lib/payoffPlan";
import { selectMonthlyFocusDebt } from "@/lib/monthlyFocusDebt";
import { formatCurrency } from "@/lib/utils";
import { usePaymentRecords, useMarkPaid } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import InterestReclaimedBanner from "@/components/dashboard/InterestReclaimedBanner";
import RollForwardAdvice from "@/components/payoff/RollForwardAdvice";

interface ThisMonthTabProps {
  debts: Debt[];
  income: Income | null | undefined;
  expenses: Expense[];
  isLoading: boolean;
  userName: string | null | undefined;
  onNavigate: (tab: Tab) => void;
}

function greeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name?.split(" ")[0];
  return first ? `${time}, ${first}.` : `${time}.`;
}

function monthsToStr(months: number): string {
  const yrs = Math.floor(months / 12);
  const mo = months % 12;
  if (yrs === 0) return `${mo} month${mo !== 1 ? "s" : ""}`;
  if (mo === 0) return `${yrs} year${yrs !== 1 ? "s" : ""}`;
  return `${yrs} yr ${mo} mo`;
}

export default function ThisMonthTab({
  debts,
  income,
  expenses,
  isLoading,
  userName,
  onNavigate,
}: ThisMonthTabProps) {
  const method = (income?.payoffMethod as "snowball" | "avalanche" | "custom") ?? "snowball";
  const today = new Date();
  const markPaid = useMarkPaid();
  const { data: paymentsData } = usePaymentRecords(today.getFullYear(), today.getMonth());

  const paidThisMonth = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const r of paymentsData?.records ?? []) map.set(r.debtId, true);
    return map;
  }, [paymentsData]);

  const paidDebtIds = useMemo(
    () => new Set((paymentsData?.records ?? []).map((record) => record.debtId)),
    [paymentsData],
  );

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + d.balance, 0), [debts]);

  const recurringExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses],
  );

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

  const extraPayment = income?.extraPayment ?? 0;

  // Focus debt = first active debt in payoff order that still needs this month's payment.
  const focusDebt = useMemo(() => {
    return selectMonthlyFocusDebt(debts, result, paidDebtIds);
  }, [debts, paidDebtIds, result]);

  const focusSchedule = useMemo(() => {
    if (!result || !focusDebt) return null;
    return result.payoffSchedule.find((s) => s.debtId === focusDebt.id) ?? null;
  }, [result, focusDebt]);

  const [logPending, setLogPending] = useState(false);

  function handleLogPayment() {
    if (!focusDebt || logPending) return;
    setLogPending(true);
    markPaid.mutate(
      {
        debtId: focusDebt.id,
        amount: focusDebt.minimumPayment,
        dueYear: today.getFullYear(),
        dueMonth: today.getMonth(),
      },
      { onSettled: () => setLogPending(false) },
    );
  }

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
  const focusPaid = focusDebt ? paidThisMonth.get(focusDebt.id) ?? false : false;

  return (
    <div style={{ maxWidth: "680px", display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
          {greeting(userName)}
        </h1>
        {hasDebts && result ? (
          <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
            You&apos;re on track to be debt-free in{" "}
            <strong style={{ color: "#0f172a" }}>{monthsToStr(result.months)}</strong>
            {" — "}
            {result.debtFreeDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
          </p>
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

      {/* Interest reclaimed banner */}
      <InterestReclaimedBanner
        interestSaved={interestSaved}
        monthsSaved={monthsSaved}
        hasData={hasDebts && !!result}
      />

      {/* Focus debt card */}
      {focusDebt && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.09)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2563eb" }}>
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

          {/* Balance bar */}
          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Current balance</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(focusDebt.balance)}
              </span>
            </div>
            {focusDebt.originalBalance > 0 && focusDebt.originalBalance > focusDebt.balance && (
              <div style={{ height: "6px", borderRadius: "999px", background: "#f1f5f9", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: "999px",
                    background: "#2563eb",
                    width: `${Math.round(((focusDebt.originalBalance - focusDebt.balance) / focusDebt.originalBalance) * 100)}%`,
                    transition: "width 0.6s cubic-bezier(0,0,0.2,1)",
                  }}
                />
              </div>
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
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Minimum payment</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatCurrency(focusDebt.minimumPayment)}
              </div>
              {focusDebt.dueDate && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Due the {focusDebt.dueDate}{focusDebt.dueDate === 1 ? "st" : focusDebt.dueDate === 2 ? "nd" : focusDebt.dueDate === 3 ? "rd" : "th"}
                </div>
              )}
            </div>
            <button
              onClick={handleLogPayment}
              disabled={focusPaid || logPending}
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
              Paid off in {monthsToStr(focusSchedule.monthPaidOff)} · {formatCurrency(focusSchedule.interestPaid)} interest total
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
          style={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.09)",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <CreditCard size={32} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>No debts added yet</p>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
            Add your debts to see your payoff plan.
          </p>
          <button
            onClick={() => onNavigate("debts")}
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

      {/* Monthly snapshot */}
      {hasDebts && income && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {[
            {
              label: "Total Debt",
              value: formatCurrency(totalDebt),
              sub: `${debts.length} account${debts.length !== 1 ? "s" : ""}`,
            },
            {
              label: "Monthly Income",
              value: formatCurrency(income.monthlyTakeHome),
              sub: "take-home",
            },
            {
              label: "Extra Payment",
              value: formatCurrency(extraPayment),
              sub: "toward focus debt",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.09)",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{stat.label}</div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* All debts list */}
      {debts.length > 1 && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid rgba(15,23,42,0.09)",
            borderRadius: "12px",
            padding: "16px 20px",
          }}
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
              const paid = paidThisMonth.get(debt.id);
              const isFocus = debt.id === focusDebt?.id;
              const isPaidOff = debt.balance <= 0.01;
              return (
                <div
                  key={debt.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: i < debts.length - 1 ? "1px solid rgba(15,23,42,0.06)" : "none",
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
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>{formatCurrency(debt.minimumPayment)}/mo minimum</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: isPaidOff ? "#059669" : "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(debt.balance)}
                    </div>
                    {!isPaidOff && paid && (
                      <div style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>Paid ✓</div>
                    )}
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
  );
}
