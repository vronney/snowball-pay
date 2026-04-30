"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useCreateDebt,
  useDeleteDebt,
  useIncome,
  useExpenses,
  useAllSnapshots,
} from "@/lib/hooks";
import PaymentCelebrationBanner from "@/components/PaymentCelebrationBanner";
import { Debt } from "@/types";
import {
  PlusCircle,
  Inbox,
  Bell,
  ChevronDown,
  Calendar,
  Mail,
  Loader2,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  calculateDebtSnowball,
  calculateDebtAvalanche,
  calculateDebtCustom,
} from "@/lib/snowball";
import DebtCard from "@/components/DebtCard";
import DebtForm from "@/components/DebtForm";
import PaymentCalendar from "@/components/PaymentCalendar";
import { getUpcomingPayments, computeStreak } from "@/lib/debtHelpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { track, Events } from "@/lib/analytics";

interface DebtTabProps {
  debts: Debt[];
  isLoading: boolean;
  openPaymentDebtId?: string | null;
  onPaymentPanelOpened?: () => void;
  requestAddDebt?: boolean;
  onAddDebtHandled?: () => void;
}

function DebtTabLoadingSkeleton() {
  return (
    <section id="section-debts">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 2xl:col-span-8 order-2 xl:order-1 space-y-4">
          <div
            className="rounded-xl p-4"
            style={{
              background: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "16px",
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-[10px] w-[70%] rounded-[4px]" />
                  <Skeleton className="h-5 w-[55%] rounded-[6px]" />
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-[14px] w-40 rounded-[5px]" />
              <Skeleton className="h-4 w-4 rounded-[4px]" />
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(15,23,42,0.06)",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div className="space-y-2" style={{ flex: 1 }}>
                  <Skeleton className="h-3 w-[35%] rounded-[4px]" />
                  <Skeleton className="h-[10px] w-[65%] rounded-[4px]" />
                </div>
                <div className="space-y-2 flex flex-col items-end">
                  <Skeleton className="h-[14px] w-[62px] rounded-[4px]" />
                  <Skeleton className="h-[10px] w-[46px] rounded-[4px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="xl:col-span-4 2xl:col-span-4 order-1 xl:order-2 self-start space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <Skeleton className="h-[14px] w-[80%] rounded-[5px]" />
          </div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <Skeleton className="h-3 w-[130px] rounded-[4px]" />
            <Skeleton className="h-8 w-full rounded-[10px]" />
            <Skeleton className="h-8 w-[88%] rounded-[10px]" />
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function DebtTab({
  debts,
  isLoading,
  openPaymentDebtId,
  onPaymentPanelOpened,
  requestAddDebt,
  onAddDebtHandled,
}: DebtTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(true);
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [addDebtError, setAddDebtError] = useState<string | null>(null);
  // null = follow the active strategy's natural order; set when user explicitly picks
  const [sortOverride, setSortOverride] = useState<
    | "default"
    | "balance-asc"
    | "balance-desc"
    | "apr-desc"
    | "min-desc"
    | "due"
    | null
  >(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [internalOpenDebtId, setInternalOpenDebtId] = useState<string | null>(
    null,
  );
  const [markedPaymentIds, setMarkedPaymentIds] = useState<Set<string>>(
    new Set(),
  );

  const handleSendEmail = async () => {
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/email/send-plan", { method: "POST" });
      if (res.ok) {
        setEmailStatus("sent");
        setTimeout(() => setEmailStatus("idle"), 4000);
      } else {
        setEmailStatus("error");
        setTimeout(() => setEmailStatus("idle"), 4000);
      }
    } catch {
      setEmailStatus("error");
      setTimeout(() => setEmailStatus("idle"), 4000);
    }
  };

  // When a specific debt is targeted from outside (e.g. notification click),
  // ensure the list is expanded so the card is rendered and can open its panel.
  useEffect(() => {
    if (openPaymentDebtId) setDebtsOpen(true);
  }, [openPaymentDebtId]);

  // FAB "Add Debt" on mobile signals us to open the form
  useEffect(() => {
    if (requestAddDebt) {
      setShowForm(true);
      onAddDebtHandled?.();
    }
  }, [requestAddDebt]); // eslint-disable-line react-hooks/exhaustive-deps

  const createDebt = useCreateDebt();
  const deleteDebt = useDeleteDebt();

  const { data: incomeData } = useIncome();
  const { data: expensesData } = useExpenses();
  const { data: snapshotData } = useAllSnapshots();

  const income = incomeData?.income;
  const snapshots = useMemo(
    () => snapshotData?.snapshots ?? [],
    [snapshotData?.snapshots],
  );

  // Earliest snapshot balance per debt (for % paid off)
  const earliestBalanceByDebt = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...snapshots].sort((a, b) =>
      a.recordedAt.localeCompare(b.recordedAt),
    );
    for (const s of sorted) {
      if (!map.has(s.debtId)) map.set(s.debtId, s.balance);
    }
    return map;
  }, [snapshots]);

  // Payment streak
  const streak = useMemo(() => computeStreak(snapshots), [snapshots]);

  // Payoff estimate — mirrors the PayoffTab acceleration logic so both tabs show the same date
  const payoffResult = useMemo(() => {
    if (!income || debts.length === 0) return null;
    const expenses = expensesData?.expenses ?? [];
    const essential = income.essentialExpenses ?? 0;
    const recurring = expenses.reduce((s, e) => s + e.amount, 0);
    const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);
    const naturalSurplus = Math.max(
      0,
      income.monthlyTakeHome - essential - recurring - totalMin,
    );
    const maxAccel = naturalSurplus + (income.extraPayment ?? 0);
    const targetAccel =
      income.accelerationAmount !== null &&
      income.accelerationAmount !== undefined
        ? Math.min(income.accelerationAmount, maxAccel)
        : maxAccel;
    const adjustedExtra = targetAccel - naturalSurplus;
    try {
      const method = income.payoffMethod ?? "snowball";
      const calc =
        method === "avalanche"
          ? calculateDebtAvalanche
          : method === "custom"
            ? calculateDebtCustom
            : calculateDebtSnowball;
      return calc(
        debts,
        income.monthlyTakeHome,
        essential,
        recurring,
        adjustedExtra,
      );
    } catch {
      return null;
    }
  }, [debts, income, expensesData?.expenses]);

  // Map strategy → natural sort order so the list mirrors the payoff plan by default
  const strategyDefaultSort = useMemo(():
    | "balance-asc"
    | "apr-desc"
    | "default" => {
    switch (income?.payoffMethod) {
      case "avalanche":
        return "apr-desc";
      case "custom":
        return "default"; // custom uses priorityOrder stored in DB
      default:
        return "balance-asc"; // snowball (and unset)
    }
  }, [income?.payoffMethod]);

  // Effective sort: user's explicit override takes priority; falls back to strategy
  const sortBy = sortOverride ?? strategyDefaultSort;

  // Priority rank per debt from the payoff schedule (1 = pay off first)
  const rankByDebtId = useMemo(() => {
    const map = new Map<string, number>();
    if (payoffResult) {
      payoffResult.payoffSchedule.forEach((s) =>
        map.set(s.debtId, s.orderInPayoff),
      );
    }
    return map;
  }, [payoffResult]);

  // Unique categories for the filter dropdown
  const categories = useMemo(() => {
    const set = new Set(debts.map((d) => d.category));
    return Array.from(set).sort();
  }, [debts]);

  // Sorted + filtered view of debts (does not mutate original array)
  const visibleDebts = useMemo(() => {
    let list =
      filterCategory === "all"
        ? debts
        : debts.filter((d) => d.category === filterCategory);
    switch (sortBy) {
      case "balance-asc":
        return [...list].sort((a, b) => a.balance - b.balance);
      case "balance-desc":
        return [...list].sort((a, b) => b.balance - a.balance);
      case "apr-desc":
        return [...list].sort((a, b) => b.interestRate - a.interestRate);
      case "min-desc":
        return [...list].sort((a, b) => b.minimumPayment - a.minimumPayment);
      case "due":
        return [...list].sort((a, b) => (a.dueDate ?? 99) - (b.dueDate ?? 99));
      default:
        return list;
    }
  }, [debts, sortBy, filterCategory]);

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMin = debts.reduce((s, d) => s + d.minimumPayment, 0);

  const upcomingPayments = useMemo(() => getUpcomingPayments(debts), [debts]);

  const handleSubmit = async (formData: any) => {
    setAddDebtError(null);
    try {
      await createDebt.mutateAsync(formData);
      track(Events.DEBT_ADDED, {
        category: formData.category,
        balance: formData.balance,
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating debt:", error);
      setAddDebtError("Failed to save debt. Please try again.");
    }
  };

  if (isLoading) {
    return <DebtTabLoadingSkeleton />;
  }

  return (
    <section id="section-debts">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 2xl:col-span-8 order-2 xl:order-1 space-y-4">
          {/* Debt Overview Banner */}
          {debts.length > 0 && (
            <div
              className="rounded-xl p-3"
              style={{
                background: "#f8fafc",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(15,23,42,0.07)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Total Remaining
                  </span>
                  <span
                    className="mono font-bold"
                    style={{ fontSize: "18px", color: "#f87171" }}
                  >
                    {formatCurrency(totalDebt)}
                  </span>
                </div>
                {payoffResult && (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.07)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Est. Debt-Free
                    </span>
                    <span
                      className="mono font-bold"
                      style={{ fontSize: "18px", color: "#059669" }}
                    >
                      {payoffResult.debtFreeDate.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {payoffResult && (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.07)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Interest (plan)
                    </span>
                    <span
                      className="mono font-bold"
                      style={{ fontSize: "18px", color: "#2563eb" }}
                    >
                      {formatCurrency(payoffResult.totalInterestPaid)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(15,23,42,0.07)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Monthly Minimums
                  </span>
                  <span
                    className="mono font-bold"
                    style={{ fontSize: "18px", color: "#0f172a" }}
                  >
                    {formatCurrency(totalMin)}
                  </span>
                </div>
                {streak > 0 && (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.07)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Payment Streak
                    </span>
                    <span
                      className="mono font-bold"
                      style={{ fontSize: "18px", color: "#7c3aed" }}
                    >
                      {streak} mo
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Collapsible
            open={debtsOpen}
            onOpenChange={setDebtsOpen}
            className="rounded-xl bg-white"
            style={{ border: "1px solid rgba(15,23,42,0.08)" }}
          >
            <CollapsibleTrigger
              type="button"
              className="w-full flex items-center justify-between p-4 bg-transparent border-0 cursor-pointer text-left"
              style={{ fontFamily: "inherit" }}
            >
              <span
                className="font-semibold text-sm flex items-center gap-2"
                style={{ color: "#0f172a" }}
              >
                Your debt accounts
                <Badge
                  variant="secondary"
                  className="bg-black/5 text-slate-600 border-transparent"
                >
                  {debts.length}
                </Badge>
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {!showForm && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowForm(true);
                    }}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(37,99,235,0.08)",
                      color: "#2563eb",
                      border: "1px solid rgba(37,99,235,0.18)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <PlusCircle size={12} />
                    Add Debt
                  </button>
                )}
                <ChevronDown
                  size={16}
                  style={{
                    color: "#94a3b8",
                    transition: "transform 0.2s",
                    transform: debtsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-4 pb-4">
                {/* Sort / Filter toolbar — only shown when there are debts */}
                {debts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-3 pt-1">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <ArrowUpDown
                        size={13}
                        style={{ color: "#94a3b8", flexShrink: 0 }}
                      />
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          const v = e.target.value as typeof sortBy;
                          // Selecting the derived strategy sort resets the override
                          setSortOverride(v === strategyDefaultSort ? null : v);
                        }}
                        className="text-xs rounded-lg px-2 py-1.5 border bg-white cursor-pointer"
                        style={{
                          color: "#475569",
                          borderColor: "rgba(15,23,42,0.12)",
                          fontFamily: "inherit",
                          appearance: "none",
                          paddingRight: "22px",
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 6px center",
                        }}
                      >
                        <option value="default">Custom order</option>
                        <option value="balance-asc">
                          Lowest balance (Snowball)
                        </option>
                        <option value="balance-desc">Highest balance</option>
                        <option value="apr-desc">
                          Highest APR (Avalanche)
                        </option>
                        <option value="min-desc">Highest minimum</option>
                        <option value="due">Soonest due date</option>
                      </select>
                    </div>

                    {categories.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <Filter
                          size={13}
                          style={{ color: "#94a3b8", flexShrink: 0 }}
                        />
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="text-xs rounded-lg px-2 py-1.5 border bg-white cursor-pointer"
                          style={{
                            color: "#475569",
                            borderColor: "rgba(15,23,42,0.12)",
                            fontFamily: "inherit",
                            appearance: "none",
                            paddingRight: "22px",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 6px center",
                          }}
                        >
                          <option value="all">All types</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <PaymentCelebrationBanner />

                {/* Debt List */}
                <div id="debt-list" className="space-y-3">
                  {visibleDebts.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      debt={debt}
                      allDebts={debts}
                      onDelete={() => deleteDebt.mutate(debt.id)}
                      firstSnapshotBalance={
                        earliestBalanceByDebt.get(debt.id) ?? null
                      }
                      openPaymentPanel={
                        openPaymentDebtId === debt.id ||
                        internalOpenDebtId === debt.id
                      }
                      onPaymentPanelOpened={() => {
                        onPaymentPanelOpened?.();
                        if (internalOpenDebtId === debt.id)
                          setInternalOpenDebtId(null);
                      }}
                      rank={rankByDebtId.get(debt.id)}
                    />
                  ))}

                  {/* No results after filter */}
                  {debts.length > 0 && visibleDebts.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm" style={{ color: "#94a3b8" }}>
                        No debts match the current filter.
                      </p>
                    </div>
                  )}
                </div>

                {/* Empty State — three helper cards */}
                {debts.length === 0 && !showForm && (
                  <div id="empty-debts" className="py-6 space-y-3">
                    <div className="text-center mb-5">
                      <div
                        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto mb-3"
                        style={{
                          background: "rgba(59,130,246,0.08)",
                          border: "1px solid rgba(59,130,246,0.18)",
                        }}
                      >
                        <Inbox
                          size={26}
                          style={{ color: "#3b82f6", opacity: 0.7 }}
                        />
                      </div>
                      <p
                        className="font-semibold text-sm mb-1"
                        style={{ color: "#334155" }}
                      >
                        No debts yet
                      </p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>
                        Add your first debt to start building your payoff plan.
                      </p>
                    </div>

                    {/* Helper cards */}
                    {[
                      {
                        title: "How payoff works",
                        body: "Each month, minimums are paid on all debts. Any extra money is focused on one debt at a time until it's gone — then that payment rolls to the next.",
                        color: "#2563eb",
                        bg: "rgba(37,99,235,0.05)",
                        border: "rgba(37,99,235,0.14)",
                      },
                      {
                        title: "Snowball vs Avalanche",
                        body: "Snowball targets the smallest balance first for quick wins. Avalanche targets the highest APR first to minimize total interest paid.",
                        color: "#059669",
                        bg: "rgba(5,150,105,0.05)",
                        border: "rgba(5,150,105,0.14)",
                      },
                      {
                        title: "What you'll see after setup",
                        body: "Your payoff timeline, estimated debt-free date, total interest saved, and a month-by-month plan — all updating in real time.",
                        color: "#7c3aed",
                        bg: "rgba(124,58,237,0.05)",
                        border: "rgba(124,58,237,0.14)",
                      },
                    ].map((card) => (
                      <div
                        key={card.title}
                        className="rounded-xl p-4"
                        style={{
                          background: card.bg,
                          border: `1px solid ${card.border}`,
                        }}
                      >
                        <p
                          className="font-semibold text-xs mb-1"
                          style={{ color: card.color }}
                        >
                          {card.title}
                        </p>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "#64748b" }}
                        >
                          {card.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <aside className="xl:col-span-4 2xl:col-span-4 order-1 xl:order-2 xl:sticky xl:top-24 self-start space-y-4">
          {/* Add Debt Form — the open form is always visible; the trigger button
              is hidden on mobile because the FAB provides that action there */}
          {showForm && (
            <div
              className="rounded-2xl p-5 snowball-glow"
              style={{
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                <PlusCircle size={18} style={{ color: "#3b82f6" }} />
                <span>Add New Debt</span>
              </h2>
              <DebtForm
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setAddDebtError(null);
                }}
                isLoading={createDebt.isPending}
              />
              {addDebtError && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "13px",
                    marginTop: "8px",
                    fontWeight: 500,
                  }}
                >
                  {addDebtError}
                </p>
              )}
            </div>
          )}

          {/* Upcoming Payment Notifications */}
          {upcomingPayments.length > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} style={{ color: "#ef4444" }} />
                <span
                  className="font-semibold text-xs tracking-wide uppercase"
                  style={{ color: "#475569" }}
                >
                  Upcoming payments
                </span>
              </div>
              <div className="space-y-2">
                {upcomingPayments.map(({ debt, label, color, bg, border }) => {
                  const isMarked = markedPaymentIds.has(debt.id);
                  return (
                    <div
                      key={debt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        background: isMarked ? "rgba(16,185,129,0.08)" : bg,
                        border: `1px solid ${isMarked ? "rgba(16,185,129,0.3)" : border}`,
                        transition: "all 0.3s ease",
                        opacity: isMarked ? 0.65 : 1,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMarkedPaymentIds((prev) => {
                            const n = new Set(prev);
                            n.add(debt.id);
                            return n;
                          });
                          setInternalOpenDebtId(debt.id);
                          setDebtsOpen(true);
                          setTimeout(
                            () =>
                              document
                                .getElementById("debt-list")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                }),
                            150,
                          );
                        }}
                        title="Mark as paid"
                        aria-label={`Mark ${debt.name} as paid`}
                        style={{
                          flexShrink: 0,
                          background: "none",
                          border: "none",
                          cursor: isMarked ? "default" : "pointer",
                          padding: "0",
                          color: isMarked ? "#10b981" : "#94a3b8",
                          transition: "color 0.2s",
                          display: "flex",
                          alignItems: "center",
                        }}
                        disabled={isMarked}
                      >
                        {isMarked ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <Circle size={15} />
                        )}
                      </button>
                      <span
                        style={{
                          fontSize: "12px",
                          color,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: isMarked ? "#94a3b8" : "#334155",
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textDecoration: isMarked ? "line-through" : "none",
                        }}
                      >
                        {debt.name} · {formatCurrency(debt.minimumPayment)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Calendar */}
          {debts.length > 0 && (
            <div>
              <PaymentCalendar debts={debts} />
            </div>
          )}

          {/* Export & Email */}
          {debts.length > 0 && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-semibold text-xs tracking-wide uppercase"
                  style={{ color: "#475569" }}
                >
                  Export & Share
                </span>
              </div>

              {debts.some((d) => d.dueDate) && (
                <a href="/api/calendar/export" download="debt-due-dates.ics">
                  <Button
                    variant="outline"
                    className="w-full gap-2 font-medium text-slate-700 hover:text-slate-900"
                  >
                    <Calendar size={14} />
                    Add to Calendar
                  </Button>
                </a>
              )}

              <Button
                variant="outline"
                onClick={handleSendEmail}
                disabled={emailStatus === "sending"}
                className="w-full gap-2 font-medium text-slate-700 hover:text-slate-900"
              >
                {emailStatus === "sending" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                {emailStatus === "sent"
                  ? "Plan Sent!"
                  : emailStatus === "error"
                    ? "Try Again"
                    : "Email My Plan"}
              </Button>
              {emailStatus === "error" && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#ef4444",
                    margin: "4px 0 0",
                    textAlign: "center",
                  }}
                >
                  Failed to send. Check your email address in Settings.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
