"use client";

import { useId } from "react";
import type { FocusCardView } from "@/lib/dashboard/myDebts";
import { CTA_BLUE } from "../styles";

interface FocusDebtCardProps {
  view: FocusCardView;
  pending: boolean;
  onLog: () => void;
}

/**
 * The month's focus debt (D12: on My Debts, not This Month), with v1 This
 * Month's figures. The APR is muted: red at 11px fails AA contrast.
 */
export default function FocusDebtCard({ view, pending, onLog }: FocusDebtCardProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-focus-card-border bg-focus-card px-3.5 py-[13px]">
      <div className="flex items-center gap-2">
        <h3 id={titleId} className="min-w-0 truncate text-[15px] font-extrabold text-txt">{view.name}</h3>
        <span className="shrink-0 rounded-full bg-action/10 px-2 py-0.5 text-[10px] font-extrabold text-action">Focus</span>
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="mono text-[23px] font-extrabold tabular-nums tracking-[-0.02em] text-txt">{view.balance}</span>
        {view.apr && <span className="text-[11px] font-bold text-txt-muted">{view.apr}</span>}
      </p>
      <p className="mt-1 text-[13px] text-txt-muted [text-wrap:pretty]">
        Pay <strong className="mono font-extrabold tabular-nums text-txt">{view.amountLabel}</strong> here this month
        {view.goneIn && ` · gone in ${view.goneIn}`}
      </p>
      <button type="button" onClick={onLog} disabled={pending} className={`mt-3 ${CTA_BLUE}`}>
        {pending ? "Saving…" : "Log payment"}
      </button>
    </section>
  );
}
