"use client";

import { useEffect } from "react";
import type { Debt } from "@/types";
import { getErrorMessage, useStartCheckout } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";
import type { UpgradeSheetEView } from "@/lib/dashboard/myDebts";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";
import Sheet from "./Sheet";

type SheetDebt = Pick<Debt, "id" | "name" | "balance">;

interface UpgradeSheetProps {
  view: UpgradeSheetEView;
  counted: ReadonlyArray<SheetDebt>;
  outside: ReadonlyArray<SheetDebt>;
  onClose: () => void;
}

/**
 * Upgrade moment E (spec §7): at the Free cap, opened from the My Debts
 * closing card. Its CTA is the existing checkout; states A–D arrive in PR 6.
 */
export default function UpgradeSheet({ view, counted, outside, onClose }: UpgradeSheetProps) {
  const checkout = useStartCheckout();

  useEffect(() => {
    track(Events.UPGRADE_MOMENT_VIEWED, { state: "E" });
  }, []);

  const startCheckout = () => {
    track(Events.UPGRADE_MOMENT_CTA, { state: "E", action: "checkout" });
    track(Events.CHECKOUT_STARTED, { source: "upgrade_moment_e", billing: "monthly" });
    checkout.mutate();
  };

  const error = checkout.isError
    ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.")
    : null;

  return (
    <Sheet
      title={view.title}
      busy={checkout.isPending}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={startCheckout} disabled={checkout.isPending} className={CTA_BLUE}>
            {checkout.isPending ? "Redirecting…" : view.cta}
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
