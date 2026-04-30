"use client";

import { useMemo } from "react";
import { Debt } from "@/types";
import { type DebtPayoffSchedule, type PayoffMethod } from "@/lib/snowball";
import { formatCurrency, formatPercent, getCategoryColor } from "@/lib/utils";
import { Target } from "lucide-react";

interface FocusDebtExplainerProps {
  payoffSchedule: DebtPayoffSchedule[];
  debts: Debt[];
  payoffMethod: PayoffMethod;
  onLogPayment?: () => void;
}

function reasonText(
  method: PayoffMethod,
  debt: Debt,
  focusItem: DebtPayoffSchedule,
): string {
  switch (method) {
    case "snowball":
      return `It has your smallest current balance (${formatCurrency(debt.balance)}). Paying it off first builds momentum — once it's gone, its full payment rolls into the next debt.`;
    case "avalanche":
      return `It carries your highest APR (${formatPercent(debt.interestRate)}). Eliminating it first stops the most expensive interest accrual immediately, saving the most money long-term.`;
    case "custom":
      return `You assigned it priority #1 in your custom order. Every extra dollar goes here until it's cleared.`;
  }
}

export default function FocusDebtExplainer({
  payoffSchedule,
  debts,
  payoffMethod,
  onLogPayment,
}: FocusDebtExplainerProps) {
  const focus = useMemo(() => {
    const first = [...payoffSchedule].sort(
      (a, b) => a.orderInPayoff - b.orderInPayoff,
    )[0];
    if (!first) return null;
    const debt = debts.find((d) => d.id === first.debtId);
    return debt ? { item: first, debt } : null;
  }, [payoffSchedule, debts]);

  if (!focus) return null;

  const { item, debt } = focus;
  const categoryColor = getCategoryColor(debt.category);
  const yrs = Math.floor(item.monthPaidOff / 12);
  const mos = item.monthPaidOff % 12;
  const timeStr = yrs > 0 ? `${yrs}y ${mos}m` : `${mos}m`;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: `linear-gradient(135deg, ${categoryColor}08, ${categoryColor}04)`,
        border: `1px solid ${categoryColor}28`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} style={{ color: categoryColor, flexShrink: 0 }} />
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: categoryColor }}
        >
          Focus debt — pay this one first
        </span>
      </div>

      {/* Debt name + stats */}
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: categoryColor, marginTop: 2 }}
          />
          <span className="font-bold text-base" style={{ color: "#111827" }}>
            {debt.name || "Unnamed"}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: `${categoryColor}18`, color: categoryColor }}
          >
            {debt.category}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <span className="mono text-xs block" style={{ color: "#6B7280" }}>
              Balance
            </span>
            <span
              className="mono font-bold text-sm"
              style={{ color: "#111827" }}
            >
              {formatCurrency(debt.balance)}
            </span>
          </div>
          <div className="text-right">
            <span className="mono text-xs block" style={{ color: "#6B7280" }}>
              APR
            </span>
            <span
              className="mono font-bold text-sm"
              style={{
                color:
                  debt.interestRate >= 20
                    ? "#EF4444"
                    : debt.interestRate >= 15
                      ? "#F59E0B"
                      : "#6B7280",
              }}
            >
              {formatPercent(debt.interestRate)}
            </span>
          </div>
          <div className="text-right">
            <span className="mono text-xs block" style={{ color: "#6B7280" }}>
              Paid off in
            </span>
            <span
              className="mono font-bold text-sm"
              style={{ color: "#27AE60" }}
            >
              {timeStr}
            </span>
          </div>
          <div className="text-right">
            <span className="mono text-xs block" style={{ color: "#6B7280" }}>
              Interest cost
            </span>
            <span
              className="mono font-bold text-sm"
              style={{ color: "#EF4444" }}
            >
              {formatCurrency(item.interestPaid)}
            </span>
          </div>
        </div>
      </div>

      {/* Why explainer */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{
          background: "rgba(255,255,255,0.7)",
          border: `1px solid ${categoryColor}18`,
          color: "#475569",
        }}
      >
        <span className="font-semibold" style={{ color: "#111827" }}>
          Why this debt first?{" "}
        </span>
        {reasonText(payoffMethod, debt, item)}
      </div>

      {onLogPayment && (
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onLogPayment}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              background: `${categoryColor}14`,
              border: `1px solid ${categoryColor}30`,
              color: categoryColor,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            Log Payment →
          </button>
        </div>
      )}
    </div>
  );
}
