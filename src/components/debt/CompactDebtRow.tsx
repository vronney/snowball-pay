"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Target, AlertCircle, AlertTriangle, Link2 } from "lucide-react";
import { type Debt } from "@/types";
import { getCategoryColor, getOrdinalDay, formatCurrency, formatPercent } from "@/lib/utils";
import { isDebtBankLinked, isDebtPastDueThisMonth } from "@/lib/debtHelpers";

interface CompactDebtRowProps {
  debt: Debt;
  isFocus: boolean;
  paidThisMonth: boolean;
  /** Expanded on first render (focus / past-due / needs-reauth stay open so
   *  nothing actionable is hidden). The user can still collapse. */
  defaultOpen: boolean;
  /** Deep-link (a notification or the upcoming-payments list targeted this
   *  debt): force the row open so the child card can open its payment panel. */
  forceOpen: boolean;
  /** This debt hosts a Plaid reconnect banner — surface a "Reconnect" chip so
   *  the reason survives a manual collapse. */
  needsReauth?: boolean;
  /** Bank sync is paused (downgraded plan) — surface a "Sync paused" chip. */
  syncPaused?: boolean;
  /** The untouched <DebtCard/> — rendered verbatim when expanded. */
  children: ReactNode;
}

const chipBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  fontSize: "10px",
  fontWeight: 700,
  borderRadius: "6px",
  padding: "1px 6px",
  whiteSpace: "nowrap" as const,
};

/**
 * Collapses a debt into a scannable one-line summary, expanding on click to
 * reveal the full DebtCard (with all its actions) unchanged. This is a pure
 * presentation wrapper — it owns no debt mutations and passes the card through
 * untouched, so every existing behavior (logging, edit, Plaid, celebrations,
 * deep-link scroll) is preserved.
 */
export default function CompactDebtRow({
  debt,
  isFocus,
  paidThisMonth,
  defaultOpen,
  forceOpen,
  needsReauth = false,
  syncPaused = false,
  children,
}: CompactDebtRowProps) {
  // `manual` is the user's explicit choice; null means "follow the data". While
  // null, the row tracks `defaultOpen` reactively — important because
  // defaultOpen derives from async payment/subscription queries, so a row that
  // only *becomes* focus / past-due / sync-paused once those resolve must still
  // open. Once the user toggles, their choice wins.
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? defaultOpen;

  // A deep-link targeting this row (notification / upcoming-payments) opens it
  // and keeps it open. Rising-edge only, so it doesn't re-open on every render.
  const wasForced = useRef(false);
  useEffect(() => {
    if (forceOpen && !wasForced.current) {
      wasForced.current = true;
      setManual(true);
    }
    if (!forceOpen) wasForced.current = false;
  }, [forceOpen]);

  const isPaidOff = debt.balance <= 0.01;
  const isLinked = isDebtBankLinked(debt);
  const isPastDue = isDebtPastDueThisMonth(debt, paidThisMonth);
  const categoryColor = getCategoryColor(debt.category);

  const nameChips = (
    <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: isPaidOff ? "#10b981" : categoryColor,
          flexShrink: 0,
        }}
      />
      <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "13.5px",
            fontWeight: 700,
            color: isPaidOff ? "#059669" : "#0f172a",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "190px",
          }}
        >
          {debt.name || "Unnamed"}
        </span>
        {isPaidOff && (
          <span style={{ ...chipBase, color: "#059669", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.22)" }}>
            <CheckCircle2 size={10} strokeWidth={2} /> Paid off
          </span>
        )}
        {!isPaidOff && isFocus && (
          <span style={{ ...chipBase, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <Target size={10} strokeWidth={2} /> Focus
          </span>
        )}
        {isPastDue && (
          <span style={{ ...chipBase, color: "#b91c1c", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
            <AlertCircle size={10} strokeWidth={2} /> Past due
          </span>
        )}
        {needsReauth && (
          <span style={{ ...chipBase, color: "#b45309", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.30)" }}>
            <AlertTriangle size={10} strokeWidth={2} /> Reconnect
          </span>
        )}
        {syncPaused && (
          <span style={{ ...chipBase, color: "#b45309", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.30)" }}>
            <AlertTriangle size={10} strokeWidth={2} /> Sync paused
          </span>
        )}
        {isLinked && (
          <span style={{ ...chipBase, color: "#64748b", background: "#f1f5f9", border: "1px solid rgba(15,23,42,0.10)" }}>
            <Link2 size={10} strokeWidth={2} /> Linked
          </span>
        )}
      </span>
    </span>
  );

  // Expanded: a slim header toggle above the untouched DebtCard (its own card).
  if (open) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          type="button"
          onClick={() => setManual(false)}
          aria-expanded={true}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            width: "100%",
            padding: "2px 4px",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
          }}
        >
          {nameChips}
          <ChevronUp size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
        </button>
        {children}
      </div>
    );
  }

  // Collapsed: the compact card row.
  return (
    <button
      type="button"
      onClick={() => setManual(true)}
      aria-expanded={false}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 14px",
        border: "1px solid rgba(15,23,42,0.09)",
        borderRadius: "12px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      {nameChips}
      <span style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        {paidThisMonth && !isPaidOff && (
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", whiteSpace: "nowrap" }}>
            Logged&nbsp;✓
          </span>
        )}
        <span style={{ textAlign: "right" }}>
          <span
            className="mono"
            style={{
              display: "block",
              fontSize: "13.5px",
              fontWeight: 700,
              color: isPaidOff ? "#059669" : "#0f172a",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(debt.balance)}
          </span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            {debt.interestRate > 0 ? formatPercent(debt.interestRate) : "0% APR"}
            {debt.dueDate ? ` · due ${getOrdinalDay(debt.dueDate)}` : ""}
          </span>
        </span>
        <ChevronDown size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
      </span>
    </button>
  );
}
