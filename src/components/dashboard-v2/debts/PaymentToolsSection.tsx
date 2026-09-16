"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Lock } from "lucide-react";
import type { Debt } from "@/types";
import { getUpcomingPayments } from "@/lib/debtHelpers";
import { formatCurrency } from "@/lib/utils";
import { upgradeEvents } from "@/lib/upgradeEvents";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PaymentCalendar from "@/components/PaymentCalendar";
import { CARD, EYEBROW } from "../styles";

const TOOL_BUTTON =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-[13px] font-bold outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

interface PaymentToolsSectionProps {
  debts: Debt[];
  paidDebtIds: ReadonlySet<string>;
  focusDebtId: string | null;
  focusExtra: number;
  isPro: boolean;
  /** False until the subscription query answers: the export control waits for it (as in v1). */
  subscriptionKnown: boolean;
  /** Opens that debt's row and its payment panel. */
  onOpenDebt: (debtId: string) => void;
}

/** v1 My Debts' reminders, calendar and calendar export, collapsed (spec §8.3). */
export default function PaymentToolsSection({
  debts, paidDebtIds, focusDebtId, focusExtra, isPro, subscriptionKnown, onOpenDebt,
}: PaymentToolsSectionProps) {
  const [open, setOpen] = useState(false);
  const upcoming = getUpcomingPayments(debts).filter((p) => !paidDebtIds.has(p.debt.id));
  const canExport = subscriptionKnown && debts.some((d) => d.dueDate);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={CARD}>
      <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-[13px] font-extrabold text-txt outline-none focus-visible:outline-2 focus-visible:outline-action">
        Payment calendar &amp; reminders
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-txt-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 px-4 pb-4">
        {upcoming.length > 0 && (
          <div>
            <p className={`${EYEBROW} text-txt-muted`}>Upcoming payments</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {upcoming.map(({ debt, label }) => (
                <li key={debt.id}>
                  <button
                    type="button"
                    onClick={() => onOpenDebt(debt.id)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border px-3 text-left text-[12px] outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action"
                  >
                    <span className="shrink-0 font-bold text-txt">{label}</span>
                    <span className="min-w-0 truncate text-txt-muted">
                      {debt.name} · {formatCurrency(debt.minimumPayment)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <PaymentCalendar debts={debts} focusDebtId={focusDebtId} focusExtra={focusExtra} />
        {canExport && (isPro ? (
          <a href="/api/calendar/export" download="debt-due-dates.ics" className={`${TOOL_BUTTON} text-txt`}>
            <Calendar size={14} aria-hidden="true" />
            Add to Calendar
          </a>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => upgradeEvents.dispatch("Export payoff plan")}
            className={`${TOOL_BUTTON} text-txt-muted`}
          >
            <Lock size={13} aria-hidden="true" />
            Add to Calendar — Pro
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
