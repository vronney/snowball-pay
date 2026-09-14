/** 10px/700 tracked uppercase label. Add a color utility: `.eyebrow` hardcodes its own color. */
export const EYEBROW = "text-[10px] font-bold uppercase tracking-[0.08em]";

/** White card at the 12px card radius (DESIGN.md). */
export const CARD = "rounded-xl border border-border bg-surface shadow-card";

/** Blue primary CTA: 46px tall, 8px radius, the CTA glow. */
export const CTA_BLUE =
  "flex min-h-[46px] w-full items-center justify-center rounded-lg bg-action px-4 text-[14px] font-extrabold text-white shadow-cta-blue outline-none hover:bg-action/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-60";

/** Error line: dark text marked by a danger rule (danger-colored text is under 4.5:1 at this size). */
export const ERROR_LINE = "border-l-2 border-danger pl-2 text-[13px] font-semibold text-txt";
