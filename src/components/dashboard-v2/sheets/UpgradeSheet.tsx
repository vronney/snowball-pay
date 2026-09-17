"use client";

import { useEffect } from "react";
import type { Debt } from "@/types";
import { getErrorMessage, useStartCheckout, useStartTrial } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import type { UpgradeSheetEView } from "@/lib/dashboard/myDebts";
import { MOMENT_A } from "@/lib/dashboard/upgradeMoments";
import { trialStartError } from "../upgrade/trialStartError";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";
import Sheet from "./Sheet";

type SheetDebt = Pick<Debt, "id" | "name" | "balance">;

interface UpgradeSheetProps {
  view: UpgradeSheetEView;
  counted: ReadonlyArray<SheetDebt>;
  outside: ReadonlyArray<SheetDebt>;
  /** The CTA starts the self-serve trial instead of checkout (plan decision 9). */
  trialEligible: boolean;
  onClose: () => void;
}

/**
 * Upgrade moment E (spec §7): at the Free cap, opened from the My Debts
 * closing card. Its CTA starts the trial for an account that can start one,
 * and the existing checkout otherwise; either way every debt then counts.
 */
export default function UpgradeSheet({ view, counted, outside, trialEligible, onClose }: UpgradeSheetProps) {
  const checkout = useStartCheckout();
  const startTrial = useStartTrial();
  const busy = checkout.isPending || startTrial.isPending;

  useEffect(() => {
    track(Events.UPGRADE_MOMENT_VIEWED, { state: "E" });
  }, []);

  const onCta = () => {
    if (busy) return;
    if (trialEligible) {
      track(Events.UPGRADE_MOMENT_CTA, { state: "E", action: "start_trial" });
      startTrial.mutate(undefined, { onSuccess: onClose });
      return;
    }
    track(Events.UPGRADE_MOMENT_CTA, { state: "E", action: "checkout" });
    track(Events.CHECKOUT_STARTED, { source: "upgrade_moment_e", billing: "monthly" });
    checkout.mutate();
  };

  let error: string | null = null;
  if (trialEligible && startTrial.isError) error = trialStartError(startTrial.error);
  if (!trialEligible && checkout.isError) {
    error = getErrorMessage(checkout.error, "Could not start checkout. Please try again.");
  }
  const pendingLabel = trialEligible ? MOMENT_A.pending : "Redirecting…";

  return (
    <Sheet
      title={view.title}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onCta} disabled={busy} className={CTA_BLUE}>
            {busy ? pendingLabel : view.cta}
          </button>
          {error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{error}</p>}
        </>
      }
    >
      <p className={`${EYEBROW} text-txt-muted`}>{view.eyebrow}</p>
      <ul aria-label="Your debts" className="mt-2 flex flex-col gap-1.5">
        {counted.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-txt">{d.name}</span>
            <span className="mono shrink-0 font-bold tabular-nums text-txt">{formatCurrency(d.balance)}</span>
          </li>
        ))}
        {outside.map((d) => (
          // Dashed = saved outside the plan, and nothing else (DESIGN.md 2026-09-12).
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-txt-muted/40 bg-bg px-3 py-2 text-[13px]">
            <span className="min-w-0 truncate font-semibold text-txt-muted">{d.name}</span>
            <span className="shrink-0 text-[11px] font-bold text-txt-muted">not in plan</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{view.body}</p>
    </Sheet>
  );
}
