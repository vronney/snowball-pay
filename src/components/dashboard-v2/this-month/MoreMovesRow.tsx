"use client";

interface MoreMovesRowProps {
  count: number;
  onOpen: () => void;
}

/**
 * The gate is volume, not blur (README "The System" 1). The count stays
 * readable, the row reads as disabled and names its tier, and pressing it opens
 * the upgrade modal. aria-disabled, not disabled, keeps it focusable and pressable.
 */
export default function MoreMovesRow({ count, onOpen }: MoreMovesRowProps) {
  const label = `${count} more ${count === 1 ? "move" : "moves"} found`;
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={`${label} — Pro`}
      onClick={onOpen}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:outline-2 focus-visible:outline-action"
    >
      <span className="text-[12px] text-txt-muted">{label}</span>
      <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-txt">
        Pro
      </span>
    </button>
  );
}
