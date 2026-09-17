"use client";

import type { ReactNode } from "react";
import { upgradeEvents } from "@/lib/upgradeEvents";
import ProChip from "./ProChip";

interface GatedTileProps {
  /** The control's visible name, e.g. "+$100" or "Custom". */
  label: string;
  /** UpgradeModal's feature key (getUpgradeMessage), e.g. "What-if scenarios". */
  feature: string;
  /** An optional line under the label. */
  children?: ReactNode;
  className?: string;
  /** Runs before the modal opens (analytics). */
  onOpen?: () => void;
}

/**
 * A Pro-only control (spec §8.3 GatedTile): visibly disabled, never blurred,
 * focusable, named "{label} — Pro". Pressing it opens the upgrade modal
 * (PR 6 routes it to the upgrade sheet). aria-disabled, not disabled, keeps
 * it in the tab order so the name is announced (README "The System", rule 1).
 */
export default function GatedTile({ label, feature, children, className = "", onOpen }: GatedTileProps) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label} — Pro`}
      onClick={() => {
        onOpen?.();
        upgradeEvents.dispatch(feature);
      }}
      className={`flex min-h-11 flex-col items-start justify-center gap-1 rounded-lg border border-border bg-bg px-3 py-2 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action ${className}`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold text-txt-muted">{label}</span>
        <ProChip />
      </span>
      {children}
    </button>
  );
}
