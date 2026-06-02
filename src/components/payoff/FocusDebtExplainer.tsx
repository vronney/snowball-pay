import { useMemo } from "react";
import { Debt } from "@/types";
import { type DebtPayoffSchedule, type PayoffMethod } from "@/lib/snowball";
import { formatCurrency, formatPercent, getCategoryColor } from "@/lib/utils";
import { CheckCircle2, Target } from "lucide-react";
import { isActiveDebt } from "@/lib/monthlyFocusDebt";

interface FocusDebtExplainerProps {
  payoffSchedule: DebtPayoffSchedule[];
  debts: Debt[];
  payoffMethod: PayoffMethod;
  focusDebtId?: string | null;
  paidThisMonthDebtIds?: string[];
  onLogPayment?: () => void;
}

function reasonText(
  method: PayoffMethod,
  debt: Debt,
  focusItem: DebtPayoffSchedule,
  hasResolvedEarlierDebt: boolean,
): string {
  if (hasResolvedEarlierDebt) {
    return `The debts ahead of this one are already paid off or logged for this month, so ${debt.name} is the next balance that should receive extra attention.`;
  }

  switch (method) {
    case "snowball":
      return `It has your smallest active balance (${formatCurrency(debt.balance)}). Paying it off first builds momentum; once it is gone, its full payment rolls into the next debt.`;
    case "avalanche":
      return `It carries your highest APR (${formatPercent(debt.interestRate)}). Eliminating it first stops the most expensive interest accrual immediately, saving the most money long-term.`;
    case "custom":
      return `You assigned it priority #${focusItem.orderInPayoff} in your custom order. Every extra dollar goes here until it is cleared.`;
  }
}

export default function FocusDebtExplainer({
  payoffSchedule,
  debts,
  payoffMethod,
  focusDebtId,
  paidThisMonthDebtIds = [],
  onLogPayment,
}: FocusDebtExplainerProps) {
  const paidThisMonth = useMemo(
    () => new Set(paidThisMonthDebtIds),
    [paidThisMonthDebtIds],
  );
  const activeDebts = useMemo(() => debts.filter(isActiveDebt), [debts]);

  const focus = useMemo(() => {
    const sortedSchedule = [...payoffSchedule].sort(
      (a, b) => a.orderInPayoff - b.orderInPayoff,
    );
    const focusItem = focusDebtId
      ? sortedSchedule.find((item) => item.debtId === focusDebtId)
      : sortedSchedule.find((item) => {
          const debt = debts.find((d) => d.id === item.debtId);
          return debt && isActiveDebt(debt) && !paidThisMonth.has(debt.id);
        });

    if (!focusItem) return null;
    const debt = debts.find((d) => d.id === focusItem.debtId);
    if (!debt || !isActiveDebt(debt)) return null;

    const hasResolvedEarlierDebt = sortedSchedule.some((item) => {
      if (item.orderInPayoff >= focusItem.orderInPayoff) return false;
      const earlierDebt = debts.find((d) => d.id === item.debtId);
      return !earlierDebt || !isActiveDebt(earlierDebt) || paidThisMonth.has(item.debtId);
    });

    return { item: focusItem, debt, hasResolvedEarlierDebt };
  }, [payoffSchedule, focusDebtId, debts, paidThisMonth]);

  if (!focus) {
    const hasActiveDebts = activeDebts.length > 0;
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: hasActiveDebts ? "rgba(16,185,129,0.07)" : "rgba(5,150,105,0.08)",
          border: "1px solid rgba(16,185,129,0.20)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={15} style={{ color: "#059669", flexShrink: 0 }} />
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "#059669" }}
          >
            {hasActiveDebts ? "Monthly focus complete" : "All debts paid off"}
          </span>
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: "#0f172a" }}>
          {hasActiveDebts
            ? "Every active debt has a payment logged for this month."
            : "There is no active focus debt left."}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
          {hasActiveDebts
            ? "Keep balances current, then next month the coach will pick the next active focus debt from your payoff order."
            : "Keep your paid-off accounts recorded here for the win, and add a new account only if a new balance appears."}
        </p>
      </div>
    );
  }

  const { item, debt, hasResolvedEarlierDebt } = focus;
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
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} style={{ color: categoryColor, flexShrink: 0 }} />
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: categoryColor }}
        >
          Focus debt - pay this one next
        </span>
      </div>

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

      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{
          background: "rgba(255,255,255,0.7)",
          border: `1px solid ${categoryColor}18`,
          color: "#475569",
        }}
      >
        <span className="font-semibold" style={{ color: "#111827" }}>
          Why this debt now?{" "}
        </span>
        {reasonText(payoffMethod, debt, item, hasResolvedEarlierDebt)}
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
            Log Payment
          </button>
        </div>
      )}
    </div>
  );
}
