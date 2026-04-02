"use client";

import { PlusCircle, DollarSign } from "lucide-react";

interface MobileFABProps {
  onAddDebt: () => void;
  /** Called with the target debtId to open its payment panel, or null if no debts yet. */
  onLogPayment: (debtId: string | null) => void;
  /** ID of the most urgent/focus debt — opened when "Log Payment" is tapped. */
  focusDebtId: string | null;
}

/**
 * Sticky bottom action bar shown only on mobile (< 768px).
 * "Add Debt" → switches to debts tab and opens the add form.
 * "Log Payment" → switches to debts tab and opens the payment panel on the focus debt.
 */
export function MobileFAB({ onAddDebt, onLogPayment, focusDebtId }: MobileFABProps) {
  return (
    <div
      className="db-fab fixed bottom-0 left-0 right-0 z-30 flex gap-2 p-3 pb-safe"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 -4px 24px rgba(17,24,39,0.08)",
        display: "none", // overridden by media query in DashboardClient styles
      }}
    >
      <button
        onClick={() => onLogPayment(focusDebtId)}
        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition hover:brightness-105"
        style={{
          background: "rgba(37,99,235,0.08)",
          color: "#2563eb",
          border: "1px solid rgba(37,99,235,0.2)",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <DollarSign size={16} />
        Log Payment
      </button>

      <button
        onClick={onAddDebt}
        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition hover:brightness-110"
        style={{
          background: "linear-gradient(135deg, #2563eb, #3b82f6)",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <PlusCircle size={16} />
        Add Debt
      </button>
    </div>
  );
}
