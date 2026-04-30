"use client";

import { useState, useEffect, useRef } from "react";
import { Debt } from "@/types";
import { Trash2, Pencil, DollarSign, RefreshCw } from "lucide-react";
import {
  formatCurrency,
  formatPercent,
  getCategoryColor,
  getOrdinalDay,
  calculateUtilization,
} from "@/lib/utils";
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
}: DebtCardProps) {
  const util =
    debt.creditLimit > 0
      ? calculateUtilization(debt.balance, debt.creditLimit)
      : null;
  const categoryColor = getCategoryColor(debt.category);
  const isHighInterest = debt.interestRate >= 20;
  const isMedInterest = debt.interestRate >= 15 && debt.interestRate < 20;
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
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    const now = new Date();
    // markPaid handles: paymentRecord creation, balance decrement, and snapshot for this debt
    await markPaid.mutateAsync({
      debtId: debt.id,
      amount,
      dueYear: now.getFullYear(),
      dueMonth: now.getMonth(),
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

  return (
    <div
      ref={cardRef}
      className="rounded-xl p-4 card-enter flex flex-col gap-3"
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.08)",
        borderLeft:
          rank === 1 ? "3px solid #2563eb" : `3px solid ${categoryColor}`,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: isHighInterest
          ? `0 0 0 1px ${categoryColor}18, 0 2px 12px rgba(15,23,42,0.08)`
          : "0 1px 4px rgba(15,23,42,0.06)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name row — full width, no badges competing */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: categoryColor }}
            />
            <span className="font-semibold text-sm truncate min-w-0 flex-1">
              {debt.name || "Unnamed"}
            </span>
          </div>
          {/* Badges row */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="text-[0.65rem] px-1.5 py-0.5 rounded-full"
              style={{
                background: `${categoryColor}20`,
                color: categoryColor,
                border: `1px solid ${categoryColor}35`,
              }}
            >
              {debt.category}
            </span>
            {rank !== undefined && rank !== 1 && (
              <span
                className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full"
                title="Payoff priority order"
                style={{
                  background: "rgba(15,23,42,0.06)",
                  color: "#64748b",
                  border: "1px solid rgba(15,23,42,0.1)",
                }}
              >
                #{rank}
              </span>
            )}
            {rank === 1 && (
              <span
                className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                }}
              >
                🎯 Active Target
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-x-3 gap-y-1.5 flex-wrap">
            <span
              className="mono font-bold text-lg leading-none whitespace-nowrap"
              style={{ color: "#0f172a" }}
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
                    : "#64748b",
              }}
            >
              {formatPercent(debt.interestRate)} APR
            </span>
            <span className="text-xs whitespace-nowrap">
              <span style={{ color: "#94a3b8", fontSize: "10px" }}>Min </span>
              <span style={{ color: "#475569", fontWeight: 600 }}>
                {formatCurrency(debt.minimumPayment)}
              </span>
            </span>
            {debt.dueDate ? (
              <span className="text-xs whitespace-nowrap">
                <span style={{ color: "#94a3b8", fontSize: "10px" }}>Due </span>
                <span style={{ color: "#475569", fontWeight: 600 }}>
                  {getOrdinalDay(debt.dueDate)}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-0.5 flex-shrink-0 rounded-lg"
          style={{
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.06)",
            padding: "2px",
          }}
        >
          <button
            onClick={() => togglePanel("payment")}
            title="Log payment"
            className="p-1.5 rounded-md hover:bg-slate-100 cursor-pointer bg-transparent border-0 transition"
            aria-label="Log payment"
            style={{
              color: panel === "payment" ? "#34d399" : undefined,
              opacity: panel === "payment" ? 1 : 0.4,
            }}
          >
            <DollarSign size={13} />
          </button>
          <button
            onClick={() => togglePanel("balance")}
            title="Update balance"
            className="p-1.5 rounded-md hover:bg-slate-100 cursor-pointer bg-transparent border-0 transition"
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
            className="p-1.5 rounded-md hover:bg-slate-100 cursor-pointer bg-transparent border-0 transition"
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
                  color: "#94a3b8",
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
                  background: "#ef4444",
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
              className="p-1.5 rounded-md hover:bg-red-500/10 cursor-pointer bg-transparent border-0 opacity-30 hover:opacity-80 transition"
              aria-label="Delete debt"
              style={{ color: "#f87171" }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Paid-off progress bar — uses earliest snapshot or original balance at entry */}
      {(() => {
        const startBalance = debt.originalBalance || firstSnapshotBalance;
        if (!startBalance || startBalance <= 0) return null;
        const pct = Math.min(
          100,
          Math.max(0, ((startBalance - debt.balance) / startBalance) * 100),
        );
        return (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs" style={{ color: "#94a3b8" }}>
                Paid off
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: "#34d399" }}
              >
                {Math.round(pct)}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(15,23,42,0.07)" }}
            >
              <div
                className="h-full rounded-full progress-bar"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* Credit utilization bar */}
      {debt.creditLimit > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs" style={{ color: "#94a3b8" }}>
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
                background: (util ?? 0) > 30 ? "#ef4444" : categoryColor,
              }}
            />
          </div>
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
          isPending={updateDebt.isPending || addBulkSnapshots.isPending}
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
            background: "#f8fafc",
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
