"use client";

import { ChevronDown, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CollapsibleTrigger } from "@/components/ui/collapsible";

export interface DebtAccountsHeaderProps {
  open: boolean;
  debtCount: number;
  activeDebtCount: number;
  loggedCount: number;
  /** False while the add-debt form is open. */
  showAddButton: boolean;
  /** Free user at 4+ debts: show "N/5 on Free". */
  showFreeCount: boolean;
  onAddDebt: () => void;
}

/**
 * Header row of the "Your debt accounts" list in DebtTab. Must render inside
 * <Collapsible>. The row is a plain div so "Add Debt" is never nested inside
 * a trigger <button> (invalid HTML → hydration error, and a control screen
 * readers can't reach). Two triggers keep the old click targets: the title
 * area (flex-1, so the gap still toggles) and the chevron.
 */
export default function DebtAccountsHeader({
  open,
  debtCount,
  activeDebtCount,
  loggedCount,
  showAddButton,
  showFreeCount,
  onAddDebt,
}: DebtAccountsHeaderProps) {
  const done = loggedCount === activeDebtCount;
  return (
    <div className="w-full flex items-center justify-between gap-2 p-4">
      <CollapsibleTrigger
        type="button"
        className="flex-1 min-w-0 flex items-center p-0 bg-transparent border-0 cursor-pointer text-left"
        style={{ fontFamily: "inherit" }}
      >
        <span
          className="font-semibold text-sm flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0"
          style={{ color: "#0f172a" }}
        >
          <span className="whitespace-nowrap">Your debt accounts</span>
          <Badge
            variant="secondary"
            className="bg-black/5 text-slate-600 border-transparent"
          >
            {debtCount}
          </Badge>
          {activeDebtCount > 0 && (
            <span
              className="mono"
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: done ? "#059669" : "#64748b",
                background: done ? "rgba(16,185,129,0.10)" : "rgba(15,23,42,0.05)",
                border: `1px solid ${done ? "rgba(16,185,129,0.22)" : "rgba(15,23,42,0.08)"}`,
                borderRadius: "6px",
                padding: "1px 7px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loggedCount}/{activeDebtCount} logged{done ? " ✓" : ""}
            </span>
          )}
        </span>
      </CollapsibleTrigger>
      <div
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        {showAddButton && (
          <div className="flex items-center gap-2">
            {showFreeCount && (
              <span
                className="mono"
                style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", fontVariantNumeric: "tabular-nums" }}
              >
                {debtCount}/5 on Free
              </span>
            )}
            <button
              type="button"
              aria-label="Add debt"
              onClick={onAddDebt}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold flex-shrink-0"
              style={{
                background: "rgba(37,99,235,0.08)",
                color: "#2563eb",
                border: "1px solid rgba(37,99,235,0.18)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <PlusCircle size={12} />
              <span className="hidden sm:inline">Add Debt</span>
            </button>
          </div>
        )}
        <CollapsibleTrigger
          type="button"
          aria-label={open ? "Collapse debt accounts" : "Expand debt accounts"}
          className="flex items-center p-0 bg-transparent border-0 cursor-pointer"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            style={{
              color: "#94a3b8",
              transition: "transform 0.2s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </CollapsibleTrigger>
      </div>
    </div>
  );
}
