"use client";

import { useState, useEffect, useRef } from "react";
import { Debt } from "@/types";
import { Trash2, Pencil, DollarSign, RefreshCw, CheckCircle2, Target } from "lucide-react";
import {
  formatCurrency,
  formatMonths,
  formatPercent,
  getCategoryColor,
  getOrdinalDay,
  calculateUtilization,
} from "@/lib/utils";
import { color, primaryButton, quietButton } from "@/lib/designTokens";
import { useAddBulkSnapshots, useUpdateDebt, useMarkPaid } from "@/lib/hooks";
import DebtForm from "@/components/DebtForm";
import {
  DebtCardPaymentPanel,
  DebtCardBalancePanel,
} from "@/components/debt/DebtCardPanels";
import { DebtPaidOffModal } from "@/components/debt/DebtPaidOffModal";

interface DebtCardProps {
  debt: Debt;
  allDebts: Debt[];
  onDelete: () => void;
  firstSnapshotBalance?: number | null;
  openPaymentPanel?: boolean;
  onPaymentPanelOpened?: () => void;
  rank?: number;
  isActiveFocus?: boolean;
  /** Whether a payment was already logged for this debt this month. */
  paidThisMonth?: boolean;
  /** Months until this debt is cleared on the current plan (payoff schedule). */
  monthPaidOff?: number | null;
  /** Extra acceleration available this month — applies to the focus debt. */
  focusExtra?: number;
}

type Panel = "payment" | "balance" | "edit" | null;

export default function DebtCard({
  debt,
  allDebts,
  onDelete,
  firstSnapshotBalance,
  openPaymentPanel,
  onPaymentPanelOpened,
  rank,
  isActiveFocus = false,
  paidThisMonth = false,
  monthPaidOff = null,
  focusExtra = 0,
}: DebtCardProps) {
  const util =
    debt.creditLimit > 0
      ? calculateUtilization(debt.balance, debt.creditLimit)
      : null;
  const categoryColor = getCategoryColor(debt.category);
  const isHighInterest = debt.interestRate >= 20;
  const isMedInterest = debt.interestRate >= 15 && debt.interestRate < 20;
  const isPaidOff = debt.balance <= 0.01;
  const [panel, setPanel] = useState<Panel>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [newBalance, setNewBalance] = useState(String(debt.balance));
  const [showPaidOffModal, setShowPaidOffModal] = useState(false);
  const [clearedAmount, setClearedAmount] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openPaymentPanel) {
      setPanel("payment");
      onPaymentPanelOpened?.();
      setTimeout(
        () =>
          cardRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          }),
        50,
      );
    }
  }, [openPaymentPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setNewBalance(String(debt.balance));
  }, [debt.balance]);

  const addBulkSnapshots = useAddBulkSnapshots();
  const updateDebt = useUpdateDebt();
  const markPaid = useMarkPaid();

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const snapshotAllDebts = (updatedDebtBalance: number) => {
    const now = new Date();
    const recordedAt = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const entries = allDebts.map((d) => ({
      debtId: d.id,
      balance: d.id === debt.id ? updatedDebtBalance : d.balance,
      recordedAt,
    }));
    return addBulkSnapshots.mutateAsync(entries);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaidOff) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    const now = new Date();
    // markPaid handles: paymentRecord creation, balance decrement, and snapshot for this debt.
    // 'log' mode: each submitted payment deducts from the balance, even if one
    // was already recorded this month (amounts accumulate into the month total).
    await markPaid.mutateAsync({
      debtId: debt.id,
      amount,
      dueYear: now.getFullYear(),
      dueMonth: now.getMonth(),
      mode: 'log',
    });
    // snapshot remaining debts so their balances are recorded for this month too
    const recordedAt = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const otherEntries = allDebts
      .filter((d) => d.id !== debt.id)
      .map((d) => ({ debtId: d.id, balance: d.balance, recordedAt }));
    if (otherEntries.length > 0) {
      await addBulkSnapshots.mutateAsync(otherEntries);
    }
    setPaymentAmount("");
    setPanel(null);
    // Celebrate if this payment wipes out the balance
    if (amount >= debt.balance) {
      setClearedAmount(debt.balance);
      setShowPaidOffModal(true);
    }
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newBalance);
    if (isNaN(val) || val < 0) return;
    await updateDebt.mutateAsync({ id: debt.id, updates: { balance: val } });
    await snapshotAllDebts(val);
    setPanel(null);
  };

  const handleEditSubmit = async (formData: any) => {
    await updateDebt.mutateAsync({ id: debt.id, updates: formData });
    setPanel(null);
  };

  // Start balance for the paid-off progress bar
  const startBalance = debt.originalBalance || firstSnapshotBalance || 0;
  const paidPct =
    startBalance > 0
      ? Math.min(100, Math.max(0, ((startBalance - debt.balance) / startBalance) * 100))
      : null;

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });
  const suggestedPayment =
    debt.minimumPayment + (isActiveFocus ? Math.max(0, focusExtra) : 0);
  const hasEta = monthPaidOff != null && monthPaidOff > 0;

  return (
    <div
      ref={cardRef}
      className="rounded-xl card-enter overflow-hidden flex flex-col"
      style={{
        background: color.surface,
        border: isActiveFocus
          ? "1px solid rgba(37,99,235,0.25)"
          : isPaidOff
            ? "1px solid rgba(16,185,129,0.22)"
            : "1px solid rgba(15,23,42,0.08)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: isActiveFocus
          ? "0 1px 4px rgba(15,23,42,0.06), 0 0 0 1px rgba(37,99,235,0.10)"
          : isPaidOff
            ? "0 1px 4px rgba(15,23,42,0.05)"
            : "0 1px 4px rgba(15,23,42,0.06)",
        opacity: isPaidOff ? 0.92 : 1,
      }}
    >
      {/* ── Card face: identity band + balance, like the front of a wallet card ── */}
      <div
        className="px-3.5 pt-3 pb-3.5 sm:px-4 sm:pt-3.5 sm:pb-4"
        style={{
          background: isPaidOff ? "rgba(16,185,129,0.05)" : `${categoryColor}10`,
          borderBottom: `1px solid ${isPaidOff ? "rgba(16,185,129,0.16)" : `${categoryColor}26`}`,
        }}
      >
        {/* Identity row */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: isPaidOff ? color.success : categoryColor }}
              />
              <span className="font-semibold text-sm truncate min-w-0">
                {debt.name || "Unnamed"}
              </span>
              {isPaidOff && (
                <span
                  className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{
                    background: "rgba(16,185,129,0.10)",
                    color: color.successDeep,
                    border: "1px solid rgba(16,185,129,0.22)",
                  }}
                >
                  <CheckCircle2 size={10} strokeWidth={2} />
                  Paid off
                </span>
              )}
              {!isPaidOff && isActiveFocus && (
                <span
                  className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{
                    background: color.primary,
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                  }}
                >
                  <Target size={10} strokeWidth={2} />
                  Focus
                </span>
              )}
              {!isPaidOff && rank !== undefined && !isActiveFocus && (
                <span
                  className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full"
                  title="Payoff priority order"
                  style={{
                    background: "rgba(15,23,42,0.06)",
                    color: color.muted,
                    border: "1px solid rgba(15,23,42,0.1)",
                  }}
                >
                  #{rank}
                </span>
              )}
            </div>
            <span
              className="text-[0.65rem] px-1.5 py-0.5 inline-block"
              style={{
                background: `${categoryColor}20`,
                color: categoryColor,
                border: `1px solid ${categoryColor}35`,
                borderRadius: "6px",
              }}
            >
              {debt.category}
            </span>
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center gap-0.5 flex-shrink-0 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(15,23,42,0.06)",
              padding: "1px",
            }}
          >
            <button
              onClick={() => {
                if (!isPaidOff) togglePanel("payment");
              }}
              title={isPaidOff ? "Debt paid off" : "Log payment"}
              className="p-1 sm:p-1.5 rounded-md hover:bg-slate-100 cursor-pointer bg-transparent border-0 transition"
              aria-label={isPaidOff ? "Debt paid off" : "Log payment"}
              disabled={isPaidOff}
              style={{
                color: panel === "payment" ? "#34d399" : undefined,
                cursor: isPaidOff ? "default" : "pointer",
                opacity: isPaidOff ? 0.2 : panel === "payment" ? 1 : 0.4,
              }}
            >
              <DollarSign size={13} />
            </button>
            <button
              onClick={() => togglePanel("balance")}
              title="Update balance"
              className="p-1 sm:p-1.5 rounded-md hover:bg-slate-100 cursor-pointer bg-transparent border-0 transition"
              aria-label="Update balance"
              style={{
                color: panel === "balance" ? "#fbbf24" : undefined,
                opacity: panel === "balance" ? 1 : 0.4,
              }}
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => togglePanel("edit")}
              title="Edit debt"
              className="p-1 sm:p-1.5 rounded-md hover:bg-slate-100 cursor-pointer bg-transparent border-0 transition"
              aria-label="Edit debt"
              style={{
                color: panel === "edit" ? "#93c5fd" : undefined,
                opacity: panel === "edit" ? 1 : 0.4,
              }}
            >
              <Pencil size={13} />
            </button>
            {confirmingDelete ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "0 2px",
                }}
              >
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded cursor-pointer bg-transparent border-0 transition"
                  style={{
                    fontSize: "11px",
                    color: color.faint,
                    fontWeight: 600,
                    padding: "2px 4px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmingDelete(false);
                    onDelete();
                  }}
                  className="rounded cursor-pointer border-0 transition"
                  style={{
                    fontSize: "11px",
                    background: color.error,
                    color: "#fff",
                    fontWeight: 700,
                    padding: "2px 8px",
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="p-1 sm:p-1.5 rounded-md hover:bg-red-500/10 cursor-pointer bg-transparent border-0 opacity-30 hover:opacity-80 transition"
                aria-label="Delete debt"
                style={{ color: "#f87171" }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Balance hero */}
        <div className="mt-2.5">
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isPaidOff ? color.successDeep : color.faint,
              marginBottom: "2px",
            }}
          >
            {isPaidOff ? "Balance cleared" : "Current balance"}
          </div>
          <div className="flex items-baseline gap-x-2.5 gap-y-1 flex-wrap">
            <span
              className="mono font-bold leading-none whitespace-nowrap text-xl sm:text-2xl"
              style={{
                color: isPaidOff ? color.successDeep : color.text,
                fontVariantNumeric: "tabular-nums",
                textDecoration: isPaidOff ? "line-through" : "none",
                textDecorationThickness: isPaidOff ? "2px" : undefined,
              }}
            >
              {formatCurrency(debt.balance)}
            </span>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{
                background: isHighInterest
                  ? "rgba(239,68,68,0.1)"
                  : isMedInterest
                    ? "rgba(245,158,11,0.1)"
                    : "rgba(15,23,42,0.05)",
                color: isHighInterest
                  ? "#dc2626"
                  : isMedInterest
                    ? "#d97706"
                    : color.muted,
              }}
            >
              {formatPercent(debt.interestRate)} APR
            </span>
            <span className="text-xs whitespace-nowrap">
              <span style={{ color: color.faint, fontSize: "10px" }}>Min </span>
              <span style={{ color: "#475569", fontWeight: 600 }}>
                {formatCurrency(debt.minimumPayment)}
              </span>
            </span>
            {debt.dueDate ? (
              <span className="text-xs whitespace-nowrap">
                <span style={{ color: color.faint, fontSize: "10px" }}>Due </span>
                <span style={{ color: "#475569", fontWeight: 600 }}>
                  {getOrdinalDay(debt.dueDate)}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
        {/* Paid-off progress bar — uses earliest snapshot or original balance at entry */}
        {paidPct !== null && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs" style={{ color: color.faint }}>
                Paid off
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: isPaidOff ? color.success : color.primary, fontVariantNumeric: "tabular-nums" }}
              >
                {Math.round(paidPct)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(15,23,42,0.07)" }}
            >
              <div
                className="h-full rounded-full progress-bar"
                style={{
                  width: `${paidPct}%`,
                  background: isPaidOff ? color.success : color.primary,
                }}
              />
            </div>
          </div>
        )}

        {/* Credit utilization bar */}
        {debt.creditLimit > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs" style={{ color: color.faint }}>
                Credit utilization
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: (util ?? 0) > 30 ? "#f87171" : "#34d399" }}
              >
                {util?.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(15,23,42,0.07)" }}
            >
              <div
                className="h-full rounded-full progress-bar"
                style={{
                  width: `${Math.min(100, util || 0)}%`,
                  background: (util ?? 0) > 30 ? color.error : categoryColor,
                }}
              />
            </div>
          </div>
        )}

        {/* Next-step strip — what to do with this debt and how it fits the plan */}
        {!isPaidOff && (
          <div
            className="flex items-center justify-between gap-3 flex-wrap"
            style={{ borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: "10px" }}
          >
            <div className="min-w-0">
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: isActiveFocus ? color.primary : color.faint,
                }}
              >
                {isActiveFocus ? "This month's move" : "Stay on plan"}
              </div>
              <div
                style={{ fontSize: "13px", fontWeight: 600, color: color.text, marginTop: "2px" }}
              >
                {paidThisMonth
                  ? `${monthName} payment logged — you're on plan.`
                  : isActiveFocus
                    ? `Pay ${formatCurrency(suggestedPayment)} here this month`
                    : `Pay the ${formatCurrency(debt.minimumPayment)} minimum${debt.dueDate ? ` by the ${getOrdinalDay(debt.dueDate)}` : ""}`}
              </div>
              {!paidThisMonth && isActiveFocus && suggestedPayment > debt.minimumPayment ? (
                <div style={{ fontSize: "11px", color: color.faint, marginTop: "2px" }}>
                  {formatCurrency(debt.minimumPayment)} minimum + {formatCurrency(suggestedPayment - debt.minimumPayment)} extra
                  {hasEta ? ` · gone in ${formatMonths(monthPaidOff!)}` : ""}
                </div>
              ) : hasEta ? (
                <div style={{ fontSize: "11px", color: color.faint, marginTop: "2px" }}>
                  On your plan: cleared in {formatMonths(monthPaidOff!)}
                  {rank !== undefined ? ` · #${rank} in your snowball` : ""}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => togglePanel("payment")}
              style={{
                ...(isActiveFocus && !paidThisMonth ? primaryButton : quietButton),
                ...(paidThisMonth ? { color: color.successDeep } : {}),
                fontSize: "12px",
                padding: "8px 14px",
                flexShrink: 0,
              }}
            >
              {paidThisMonth ? "Logged ✓" : "Log payment"}
            </button>
          </div>
        )}

        {/* Paid-off strip — the win, and where the freed-up payment goes */}
        {isPaidOff && (
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{ borderTop: "1px solid rgba(15,23,42,0.06)", paddingTop: "10px" }}
          >
            <CheckCircle2 size={14} style={{ color: color.successDeep, flexShrink: 0 }} />
            <span style={{ fontSize: "12.5px", fontWeight: 600, color: color.successDeep }}>
              Paid off{startBalance > 0 ? ` — ${formatCurrency(startBalance)} eliminated` : ""}.
            </span>
            <span style={{ fontSize: "12px", color: color.faint }}>
              Its payment now snowballs into your next debt.
            </span>
          </div>
        )}

        {/* Log Payment panel */}
        {panel === "payment" && (
          <DebtCardPaymentPanel
            debtId={debt.id}
            minimumPayment={debt.minimumPayment}
            paymentAmount={paymentAmount}
            onAmountChange={setPaymentAmount}
            onSubmit={(e) => void handlePaymentSubmit(e)}
            onClose={() => setPanel(null)}
            isPending={markPaid.isPending || updateDebt.isPending || addBulkSnapshots.isPending}
          />
        )}

        {/* Update Balance panel */}
        {panel === "balance" && (
          <DebtCardBalancePanel
            newBalance={newBalance}
            onBalanceChange={setNewBalance}
            onSubmit={(e) => void handleBalanceSubmit(e)}
            onClose={() => setPanel(null)}
            isPending={updateDebt.isPending || addBulkSnapshots.isPending}
          />
        )}

        {/* Edit panel */}
        {panel === "edit" && (
          <div
            className="rounded-lg p-4"
            style={{
              background: color.bg,
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <DebtForm
              initialData={debt}
              submitLabel="Save Changes"
              onSubmit={(data) => void handleEditSubmit(data)}
              onCancel={() => setPanel(null)}
              isLoading={updateDebt.isPending}
            />
          </div>
        )}
      </div>

      {/* Paid-off celebration modal */}
      {showPaidOffModal && (
        <DebtPaidOffModal
          debtName={debt.name || "Debt"}
          amountCleared={clearedAmount}
          onClose={() => setShowPaidOffModal(false)}
        />
      )}
    </div>
  );
}
