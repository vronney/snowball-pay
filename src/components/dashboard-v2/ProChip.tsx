"use client";

/** The tier tag beside a gated control. Decorative: the control's accessible name already says "— Pro". */
export default function ProChip() {
  return (
    <span
      aria-hidden="true"
      className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-txt"
    >
      Pro
    </span>
  );
}
