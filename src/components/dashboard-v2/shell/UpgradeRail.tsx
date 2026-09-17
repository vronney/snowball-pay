"use client";

import { upgradeRailCopy, type UpgradeRailSummary } from "@/lib/dashboard/upgradeRail";

interface UpgradeRailProps {
  rail: UpgradeRailSummary;
  /** "Try Pro free" for an account that can start the trial. */
  trialEligible?: boolean;
  onUpgrade: () => void;
}

/**
 * Sidebar foot for Free users with gated coach moves (README "Sidebar foot"):
 * persistent and quiet, not a dismissible banner. Ink per DESIGN.md 2026-09-12.
 */
export default function UpgradeRail({ rail, trialEligible = false, onUpgrade }: UpgradeRailProps) {
  const copy = upgradeRailCopy(rail, trialEligible);
  return (
    <div className="m-3.5 rounded-xl bg-ink p-[13px]">
      <p className="text-pretty text-xs font-bold leading-snug text-white">
        <span>{copy.title}</span>
        {copy.value && (
          <>
            {" · "}
            <span className="mono tabular-nums text-ink-accent">{copy.value}</span>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-2.5 min-h-[38px] w-full rounded-lg bg-surface text-[13px] font-extrabold text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
      >
        {copy.cta}
      </button>
    </div>
  );
}
