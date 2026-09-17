"use client";

import { ExternalLink } from "lucide-react";
import { getErrorMessage, useOpenBillingPortal, type SubscriptionInfo } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { shouldShowLateTrialNotice, STRIPE_TRIAL_CHARGE_NOTICE } from "@/lib/upgradeMessaging";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until a future date string, 0 once it has passed. */
export function daysUntilCharge(dateStr: string, now = Date.now()): number {
  const end = new Date(dateStr).getTime();
  if (Number.isNaN(end)) return -1;
  return Math.max(0, Math.ceil((end - now) / DAY_MS));
}

/** "Pro starts billing today" / "… tomorrow" / "… in {n} days". */
export function chargeLabel(days: number): string {
  if (days === 0) return "Pro starts billing today";
  if (days === 1) return "Pro starts billing tomorrow";
  return `Pro starts billing in ${days} days`;
}

interface TrialChargeNoticeProps {
  sub: SubscriptionInfo | undefined;
}

/**
 * The auto-charge warning for a card-backed Stripe trial, on v2.
 *
 * v2 retires TrialCountdownBanner (spec §7), and a `trialing` account counts as
 * paid Pro, so the trial-emails cron skips it too — without this the only
 * disclosure left is a Settings page nobody is sent to. Shown for the final
 * LATE_TRIAL_NOTICE_DAYS days, the same window v1 uses, and not dismissible:
 * the charge is not dismissible either.
 *
 * The self-serve trial (spec §6.4) has no payment method and never charges, so
 * it never reaches this — `subscriptionStatus` is only set by Stripe.
 */
export default function TrialChargeNotice({ sub }: TrialChargeNoticeProps) {
  if (sub?.subscriptionStatus !== "trialing" || !sub.subscriptionEndsAt) return null;
  const days = daysUntilCharge(sub.subscriptionEndsAt);
  if (!shouldShowLateTrialNotice(days)) return null;
  return <ChargeNoticeBar days={days} />;
}

/**
 * Split from the gate above so the shell does not mount a billing mutation for
 * the overwhelming majority of accounts, which have no Stripe trial at all.
 */
function ChargeNoticeBar({ days }: { days: number }) {
  const openPortal = useOpenBillingPortal();

  return (
    <div
      role="status"
      className="flex flex-col gap-1.5 border-b border-focus-card-border bg-focus-card px-3.5 py-2.5 min-[769px]:flex-row min-[769px]:items-center min-[769px]:justify-between min-[769px]:gap-4 min-[769px]:px-[26px]"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold text-txt">{chargeLabel(days)}</p>
        <p className="text-[12px] leading-snug text-txt-muted">{STRIPE_TRIAL_CHARGE_NOTICE}</p>
      </div>
      <button
        type="button"
        disabled={openPortal.isPending}
        onClick={() => {
          track(Events.BILLING_PORTAL_OPENED, { source: "v2_trial_charge_notice" });
          openPortal.mutate(undefined);
        }}
        className="flex min-h-11 shrink-0 items-center gap-1.5 self-start text-[13px] font-bold text-action underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:opacity-60 min-[769px]:self-auto"
      >
        {openPortal.isPending ? "Opening…" : "Review billing"}
        <ExternalLink size={14} aria-hidden="true" />
      </button>
      {openPortal.isError && (
        <p role="alert" className="text-[12px] font-semibold text-txt">
          {getErrorMessage(openPortal.error, "Couldn't open billing. Please try again.")}
        </p>
      )}
    </div>
  );
}
