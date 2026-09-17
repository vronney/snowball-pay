"use client";

import { useEffect } from "react";
import { useStartTrial } from "@/lib/hooks";
import { track, Events } from "@/lib/analytics";
import { MOMENT_A } from "@/lib/dashboard/upgradeMoments";
import Sheet from "../sheets/Sheet";
import { CTA_BLUE, ERROR_LINE } from "../styles";
import { trialStartError } from "./trialStartError";

interface TrialStartSheetProps {
  onClose: () => void;
}

/**
 * Upgrade moment A (spec §7): a Free account that never had a trial starts
 * its own from any gated control. No card; the server's once-per-email grant
 * means a second press can only be refused. On success the sheet closes and
 * the refreshed insights turn the dashboard Pro.
 */
export default function TrialStartSheet({ onClose }: TrialStartSheetProps) {
  const startTrial = useStartTrial();

  useEffect(() => {
    track(Events.UPGRADE_MOMENT_VIEWED, { state: "A" });
  }, []);

  const start = () => {
    if (startTrial.isPending) return;
    track(Events.UPGRADE_MOMENT_CTA, { state: "A", action: "start_trial" });
    startTrial.mutate(undefined, { onSuccess: onClose });
  };

  const error = startTrial.isError ? trialStartError(startTrial.error) : null;

  return (
    <Sheet
      title={MOMENT_A.title}
      busy={startTrial.isPending}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={start} disabled={startTrial.isPending} className={CTA_BLUE}>
            {startTrial.isPending ? MOMENT_A.pending : MOMENT_A.cta}
          </button>
          {error && <p role="alert" className={`mt-2 ${ERROR_LINE}`}>{error}</p>}
          <p className="mt-2 text-center text-[12px] text-txt-muted">{MOMENT_A.footnote}</p>
        </>
      }
    >
      {/* Neutral, not the handoff's blue: blue is for CTAs and active states (DESIGN.md). */}
      <span className="inline-flex rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-extrabold text-txt">
        {MOMENT_A.badge}
      </span>
      <p className="mt-3 text-[13px] leading-relaxed text-txt [text-wrap:pretty]">{MOMENT_A.body}</p>
    </Sheet>
  );
}
