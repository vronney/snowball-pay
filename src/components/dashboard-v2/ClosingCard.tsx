"use client";

import type { ReactNode } from "react";

interface ClosingCardProps {
  /** One sentence naming a number the user already owns (README "The System", rule 2). */
  children: ReactNode;
  cta: string;
  onCta: () => void;
}

/** A tab's closing card, ink variant (DESIGN.md 2026-09-12). PR 5 adds the red one. */
export default function ClosingCard({ children, cta, onCta }: ClosingCardProps) {
  return (
    <section className="rounded-xl bg-ink px-3.5 py-[13px]">
      <p className="text-[13px] font-bold leading-snug text-white [text-wrap:pretty]">{children}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-surface px-4 text-[14px] font-extrabold text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
      >
        {cta}
      </button>
    </section>
  );
}
