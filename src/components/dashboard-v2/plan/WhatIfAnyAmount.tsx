"use client";

import { useId, useMemo, useState } from "react";
import type { Debt, Income } from "@/types";
import type { PayoffMethod, PayoffResult } from "@/lib/snowball";
import { calculateResultByMethod } from "@/lib/payoffPlan";
import { isPlanDebt } from "@/lib/monthlyFocusDebt";
import { track, Events } from "@/lib/analytics";
import { anyAmountView } from "@/lib/dashboard/plan";
import { CARD, EYEBROW } from "../styles";

interface WhatIfAnyAmountProps {
  debts: Debt[];
  income: Income;
  recurringTotal: number;
  adjustedExtra: number;
  payoffMethod: PayoffMethod;
  current: PayoffResult;
  availableCashFlow: number;
  effectiveAcceleration: number;
  onApply: (nextAcceleration: number) => void;
  /** True while the plan-gap fix's own save is in flight (PlanV2): disables Apply and the input so an edit can't race it. */
  disabled?: boolean;
}

const APPLY =
  "min-h-11 shrink-0 rounded-lg bg-action px-4 text-[13px] font-extrabold text-white outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Pro's "Any $" (spec §8.5): one typed rung, simulated exactly as WhatIfCard's
 * ladder is (calculateResultByMethod on the plan's debts at adjustedExtra +
 * delta, WhatIfCard.tsx:60-66) and applied with the same clamp.
 */
export default function WhatIfAnyAmount({
  debts, income, recurringTotal, adjustedExtra, payoffMethod, current, availableCashFlow, effectiveAcceleration, onApply, disabled,
}: WhatIfAnyAmountProps) {
  const inputId = useId();
  const [raw, setRaw] = useState("");
  const delta = raw.trim() === "" ? Number.NaN : Number(raw);
  const planDebts = useMemo(() => debts.filter(isPlanDebt), [debts]);
  const view = useMemo(() => {
    if (!Number.isFinite(delta) || delta <= 0) return null;
    const withExtra = calculateResultByMethod(planDebts, income, recurringTotal, adjustedExtra + delta, payoffMethod);
    return anyAmountView({ delta, current, withExtra, availableCashFlow, effectiveAcceleration });
  }, [delta, planDebts, income, recurringTotal, adjustedExtra, payoffMethod, current, availableCashFlow, effectiveAcceleration]);

  const apply = () => {
    if (!view?.canApply) return;
    // WhatIfCard's event and properties; the sanitiser redacts the numbers, as there.
    track(Events.WHAT_IF_APPLIED, { delta, next_acceleration: view.nextAcceleration });
    onApply(view.nextAcceleration);
  };

  return (
    <section aria-label="Any amount" className={`${CARD} p-4`}>
      <label htmlFor={inputId} className={`${EYEBROW} block text-txt-muted`}>Any amount extra per month</label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={1}
          step={1}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="e.g. 75"
          disabled={disabled}
          className="mono min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-[14px] font-bold text-txt outline-none focus-visible:outline-2 focus-visible:outline-action"
        />
        <button type="button" onClick={apply} disabled={disabled || !view?.canApply} className={APPLY}>
          Apply
        </button>
      </div>
      {view && (
        <p role="status" className="mt-2 text-[12px] text-txt-muted">
          {view.months} · {view.interest} · <span className={view.canApply && view.improves ? "font-bold text-success-text" : "font-semibold text-txt-muted"}>{view.caption}</span>
        </p>
      )}
    </section>
  );
}
