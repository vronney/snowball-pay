"use client";

import { ExternalLink } from "lucide-react";
import { getErrorMessage, useOpenBillingPortal, type SubscriptionInfo } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import {
  proBillingStartsLabel,
  shouldShowLateTrialNotice,
  STRIPE_TRIAL_CHARGE_NOTICE,
  TRIAL_CANCELED_NOTICE,
} from "@/lib/upgradeMessaging";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until a future date string, 0 once it has passed. */
export function daysUntilCharge(dateStr: string, now = Date.now()): number {
  const end = new Date(dateStr).getTime();
  if (Number.isNaN(end)) return -1;
  return Math.max(0, Math.ceil((end - now) / DAY_MS));
}

/**
 * The heading, which now names the charge because `cancelAt` proves one is
 * coming. A trial scheduled to cancel keeps `status: "trialing"`, and
 * `subscriptionEndsAt` holds `cancel_at` OR `trial_end`, so before `cancelAt`
 * existed this had to hedge for both.
 */
export function trialEndLabel(days: number, isCanceling = false): string {
  if (!isCanceling) return proBillingStartsLabel(days);
  if (days === 0) return "Your Pro trial ends today";
  if (days === 1) return "Your Pro trial ends tomorrow";
  return `Your Pro trial ends in ${days} days`;
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
 *
 * A trial already scheduled to cancel gets the reassuring variant instead: it
 * still ends, but nobody is charged. `isCanceling` can say so now that the
 * subscription record carries Stripe's `cancel_at` separately.
 */
export default function TrialChargeNotice({ sub }: TrialChargeNoticeProps) {
  if (sub?.subscriptionStatus !== "trialing" || !sub.subscriptionEndsAt) return null;
  const days = daysUntilCharge(sub.subscriptionEndsAt);
  if (!shouldShowLateTrialNotice(days)) return null;
  return <ChargeNoticeBar days={days} isCanceling={sub.isCanceling === true} />;
}

/**
 * Split from the gate above so the shell does not mount a billing mutation for
 * the overwhelming majority of accounts, which have no Stripe trial at all.
 */
function ChargeNoticeBar({ days, isCanceling }: { days: number; isCanceling: boolean }) {
  const openPortal = useOpenBillingPortal();

  return (
    <div
      role="status"
      className={`flex flex-col gap-1.5 border-b px-3.5 py-2.5 min-[769px]:flex-row min-[769px]:items-center min-[769px]:justify-between min-[769px]:gap-4 min-[769px]:px-[26px] ${
        isCanceling ? "border-border bg-surface-2" : "border-focus-card-border bg-focus-card"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-extrabold text-txt">{trialEndLabel(days, isCanceling)}</p>
        <p className="text-[12px] leading-snug text-txt-muted">
          {isCanceling ? TRIAL_CANCELED_NOTICE : STRIPE_TRIAL_CHARGE_NOTICE}
        </p>
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
