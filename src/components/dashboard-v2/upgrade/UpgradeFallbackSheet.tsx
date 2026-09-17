"use client";

import { useEffect, useMemo, useRef } from "react";
import { Check } from "lucide-react";
import { getErrorMessage, useStartCheckout } from "@/lib/hooks";
import { PLANS } from "@/lib/stripe";
import { track, Events } from "@/lib/analytics";
import { formatCurrencyWhole } from "@/lib/utils";
import { getUpgradeMessage, UPGRADE_MESSAGE_VERSION } from "@/lib/upgradeMessaging";
import Sheet from "../sheets/Sheet";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";

/** Keeps v2's upgrade funnel separable from v1's UpgradeModal ("dashboard_upgrade_modal"). */
const SOURCE = "dashboard_v2_upgrade_sheet";

interface UpgradeFallbackSheetProps {
  feature?: string;
  /** Projected interest avoided vs minimum-only payments: DashboardClient's figure, as UpgradeModal receives it. */
  interestAtStake: number;
  onClose: () => void;
}

/**
 * The upgrade prompt for an account that can't start a trial (spec §7): the
 * existing UpgradeModal's feature copy, interest anchor and analytics, in the
 * v2 sheet. v1 keeps UpgradeModal itself.
 */
export default function UpgradeFallbackSheet({ feature, interestAtStake, onClose }: UpgradeFallbackSheetProps) {
  const checkout = useStartCheckout();
  const message = useMemo(() => getUpgradeMessage(feature), [feature]);
  const featureKey = feature ?? "general";
  const dismissedRef = useRef(false);

  useEffect(() => {
    track(Events.UPGRADE_MODAL_VIEWED, {
      feature: featureKey,
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      source: SOURCE,
    });
  }, [featureKey, message.id]);

  const dismiss = (reason: "sheet_close" | "continue_free") => {
    if (checkout.isPending || dismissedRef.current) return;
    dismissedRef.current = true;
    track(Events.UPGRADE_MODAL_DISMISSED, {
      feature: featureKey,
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      reason,
      source: SOURCE,
    });
    onClose();
  };

  const startCheckout = () => {
    track(Events.CHECKOUT_STARTED, {
      source: "upgrade_sheet",
      feature: featureKey,
      trigger: message.id,
      message_version: UPGRADE_MESSAGE_VERSION,
      billing: "monthly",
    });
    checkout.mutate();
  };

  const error = checkout.isError
    ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.")
    : null;

  return (
    <Sheet
      title={message.headline}
      description={message.description}
      busy={checkout.isPending}
      onClose={() => dismiss("sheet_close")}
      footer={
        <>
          <button type="button" onClick={startCheckout} disabled={checkout.isPending} className={CTA_BLUE}>
            {checkout.isPending ? "Redirecting…" : message.monthlyCta}
          </button>
          <button
            type="button"
            onClick={() => dismiss("continue_free")}
            disabled={checkout.isPending}
            className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg text-[13px] font-bold text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Free
          </button>
          {error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{error}</p>}
          <p className="mt-1 text-center text-[11px] text-txt-muted">Cancel anytime. Your debts and plan stay if you downgrade.</p>
        </>
      }
    >
      <p className={`${EYEBROW} text-txt-muted`}>SnowballPay Pro</p>
      {interestAtStake > 0 && (
        <p className="mt-2 rounded-lg border border-border bg-bg px-3 py-2 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">
          Your current plan is projected to avoid{" "}
          <strong className="mono tabular-nums">{formatCurrencyWhole(interestAtStake)}</strong>{" "}
          in interest compared with minimum-only payments. Pro helps you monitor and adjust that plan.
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {message.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-[13px] leading-snug text-txt">
            <Check size={16} strokeWidth={2.5} aria-hidden="true" className="mt-px shrink-0 text-success-text" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="mono text-[26px] font-extrabold tabular-nums text-txt">{formatCurrencyWhole(PLANS.pro.price)}</span>
        <span className="text-[13px] text-txt-muted">/month</span>
      </p>
    </Sheet>
  );
}
