"use client";

import { useEffect, useId, useState } from "react";
import { Check, X } from "lucide-react";
import type { MonthlyInterest, PlanReadiness, RateWatch, TrialMoment } from "@/lib/dashboard/types";
import { getErrorMessage, useCachedCoachBrief, useStartCheckout } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { PLANS } from "@/lib/stripe";
import {
  momentBView, momentCView, momentDView, momentDismissKey, type ChecklistRowId,
} from "@/lib/dashboard/upgradeMoments";
import { CTA_BLUE, ERROR_LINE, EYEBROW } from "../styles";

/** README §7's shared card, at DESIGN.md's 12px card radius. */
const MOMENT_CARD = "rounded-xl border border-border bg-surface p-[18px] shadow-float";
const TITLE = "text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-txt [text-wrap:pretty]";
const GHOST_CTA =
  "mt-1 flex min-h-11 w-full items-center justify-center rounded-lg text-[13px] font-bold text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action";

type MomentB = Extract<TrialMoment, { state: "B" }>;
type MomentC = Extract<TrialMoment, { state: "C" }>;
type MomentD = Extract<TrialMoment, { state: "D" }>;

interface TrialMomentCardProps {
  moment: TrialMoment;
  /** tier.trial.endsAt: keys moment B's dismissal to this trial. */
  trialEndsAt: string | null;
  readiness: PlanReadiness;
  rateWatch: RateWatch | null;
  interest: MonthlyInterest | null;
  onChecklist: (row: ChecklistRowId) => void;
}

/** The one inline upgrade moment at the top of This Month (spec §7 B, C, D). */
export default function TrialMomentCard(props: TrialMomentCardProps) {
  const { moment } = props;
  if (moment.state === "B") {
    return <MomentBCard moment={moment} trialEndsAt={props.trialEndsAt} readiness={props.readiness} rateWatch={props.rateWatch} onChecklist={props.onChecklist} />;
  }
  if (moment.state === "C") return <MomentCCard moment={moment} interest={props.interest} />;
  return <MomentDCard moment={moment} />;
}

function useViewed(state: TrialMoment["state"], visible: boolean) {
  useEffect(() => {
    if (visible) track(Events.UPGRADE_MOMENT_VIEWED, { state });
  }, [state, visible]);
}

function readDismissed(key: string | null): boolean {
  if (!key) return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Hidden for this trial once dismissed; without storage, for this visit only. */
function useDismissal(key: string | null): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(() => readDismissed(key));
  const dismiss = () => {
    setDismissed(true);
    if (!key) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode): the state above hides it for this visit.
    }
  };
  return [dismissed, dismiss];
}

function useCheckout(state: "C" | "D") {
  const checkout = useStartCheckout();
  const start = () => {
    track(Events.UPGRADE_MOMENT_CTA, { state, action: "checkout" });
    track(Events.CHECKOUT_STARTED, { source: state === "C" ? "upgrade_moment_c" : "upgrade_moment_d", billing: "monthly" });
    checkout.mutate();
  };
  const error = checkout.isError ? getErrorMessage(checkout.error, "Could not start checkout. Please try again.") : null;
  return { start, pending: checkout.isPending, error };
}

function MomentBCard({ moment, trialEndsAt, readiness, rateWatch, onChecklist }: {
  moment: MomentB;
  trialEndsAt: string | null;
  readiness: PlanReadiness;
  rateWatch: RateWatch | null;
  onChecklist: (row: ChecklistRowId) => void;
}) {
  const titleId = useId();
  const [dismissed, dismiss] = useDismissal(trialEndsAt ? momentDismissKey("B", trialEndsAt) : null);
  useViewed("B", !dismissed);
  if (dismissed) return null;
  const view = momentBView(moment, readiness, rateWatch);

  return (
    <section aria-labelledby={titleId} className={MOMENT_CARD}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-extrabold text-success-text">{view.eyebrow}</p>
        <div className="-mr-2 -mt-2 flex items-center">
          <span className="mono text-[12px] font-bold tabular-nums text-txt-muted">{view.daysLeft}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              track(Events.UPGRADE_MOMENT_CTA, { state: "B", action: "dismiss" });
              dismiss();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-txt-muted outline-none hover:bg-bg focus-visible:outline-2 focus-visible:outline-action"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <h2 id={titleId} className={`mt-1 ${TITLE}`}>{view.title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {view.rows.map((row) => (
          <li key={row.id}>
            {row.done ? (
              <p className="flex min-h-11 items-center gap-2 rounded-lg border border-success/25 bg-success/5 px-3 text-[13px] font-semibold text-txt">
                <Check size={16} strokeWidth={2.5} aria-hidden="true" className="shrink-0 text-success-text" />
                <span>{row.label}</span>
                <span className="sr-only"> — done</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  track(Events.UPGRADE_MOMENT_CTA, { state: "B", action: row.id });
                  onChecklist(row.id);
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 text-left text-[13px] font-semibold text-txt outline-none transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-action motion-reduce:transition-none"
              >
                <span>{row.label}</span>
                <span aria-hidden="true" className="shrink-0 text-[12px] font-extrabold text-action">{row.affordance}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MomentCCard({ moment, interest }: { moment: MomentC; interest: MonthlyInterest | null }) {
  const titleId = useId();
  const checkout = useCheckout("C");
  useViewed("C", true);
  const view = momentCView(moment, interest, PLANS.pro.price);

  return (
    <section aria-labelledby={titleId} className={MOMENT_CARD}>
      {view.eyebrow && <p className="text-[12px] font-extrabold text-txt">{view.eyebrow}</p>}
      <h2 id={titleId} className={`mt-1 ${TITLE}`}>{view.title}</h2>
      {view.rows.length > 0 && (
        <dl className="mt-3 divide-y divide-border rounded-lg border border-border">
          {view.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-[13px] text-txt-muted">{row.label}</dt>
              <dd className="mono text-[13px] font-extrabold tabular-nums text-txt">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 flex flex-wrap items-baseline gap-1">
        <span className="mono text-[26px] font-extrabold tabular-nums text-txt">{view.price}</span>
        <span className="text-[13px] text-txt-muted">{view.priceNote}</span>
      </p>
      <button type="button" onClick={checkout.start} disabled={checkout.pending} className={`mt-3 ${CTA_BLUE}`}>
        {checkout.pending ? "Redirecting…" : view.cta}
      </button>
      {checkout.error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{checkout.error}</p>}
    </section>
  );
}

function MomentDCard({ moment }: { moment: MomentD }) {
  const titleId = useId();
  const [dismissed, dismiss] = useDismissal(momentDismissKey("D", moment.endedAt));
  const { data: cache, isLoading } = useCachedCoachBrief();
  const checkout = useCheckout("D");
  // Wait for the brief query, so the title never flips from one variant to the other.
  const visible = !dismissed && !isLoading;
  useViewed("D", visible);
  if (!visible) return null;

  const verdict = cache?.brief?.verdict ?? null;
  const view = momentDView(
    verdict ? { headline: verdict.headline, summary: verdict.summary } : null,
    cache?.generatedAt ?? null,
    PLANS.pro.price,
  );

  return (
    <section aria-labelledby={titleId} className={MOMENT_CARD}>
      <p className="text-[12px] font-extrabold text-txt-muted">{view.eyebrow}</p>
      <h2 id={titleId} className={`mt-1 ${TITLE}`}>{view.title}</h2>
      {view.kept && (
        <div className="mt-3 rounded-lg bg-bg px-3 py-2.5">
          <p className={`${EYEBROW} text-txt-muted`}>{view.kept.label}</p>
          <p className="mt-1 text-[14px] font-extrabold text-txt [text-wrap:pretty]">{view.kept.headline}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{view.kept.summary}</p>
          <p className="mt-1.5 text-[12px] text-txt-muted [text-wrap:pretty]">{view.kept.note}</p>
        </div>
      )}
      {view.body && <p className="mt-3 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{view.body}</p>}
      <button type="button" onClick={checkout.start} disabled={checkout.pending} className={`mt-3 ${CTA_BLUE}`}>
        {checkout.pending ? "Redirecting…" : view.primaryCta}
      </button>
      <button
        type="button"
        onClick={() => {
          track(Events.UPGRADE_MOMENT_CTA, { state: "D", action: "dismiss" });
          dismiss();
        }}
        disabled={checkout.pending}
        className={GHOST_CTA}
      >
        {view.secondaryCta}
      </button>
      {checkout.error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{checkout.error}</p>}
    </section>
  );
}
