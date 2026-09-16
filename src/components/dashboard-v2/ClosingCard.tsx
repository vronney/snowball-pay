"use client";

import type { ReactNode } from "react";
import { EYEBROW } from "./styles";

interface ClosingCardProps {
  /** One sentence naming a number the user already owns (README "The System", rule 2). */
  children: ReactNode;
  cta?: string;
  onCta?: () => void;
  /** Ink (default), or the red plan-gap variant (spec §8.3; DESIGN.md 2026-09-12). */
  variant?: "ink" | "red";
  /** Red only: the label and the figure above the sentence. */
  eyebrow?: string;
  figure?: string;
  /** Red only: a status line under the CTA (the new date after "Fix it in one tap"). */
  note?: string;
}

const INK_CTA =
  "mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-ink px-4 text-[14px] font-extrabold text-white shadow-cta-ink outline-none transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none";

/** A tab's closing card: ink (My Debts, Coach) or red (My Plan, when behind). */
export default function ClosingCard({ children, cta, onCta, variant = "ink", eyebrow, figure, note }: ClosingCardProps) {
  if (variant === "red") {
    return (
      <section className="rounded-xl border border-danger/25 bg-surface px-3.5 py-[13px] shadow-card">
        {eyebrow && <p className={`${EYEBROW} text-txt-muted`}>{eyebrow}</p>}
        {figure && (
          // 19px extrabold is large text, so danger (3.8:1 on white) passes AA — as PR 4's "Not counted" figure does.
          <p className="mono mt-1 text-[19px] font-extrabold leading-none text-danger">{figure}</p>
        )}
        <p className="mt-2 text-[13px] font-semibold leading-snug text-txt [text-wrap:pretty]">{children}</p>
        {cta && onCta && (
          <button type="button" onClick={onCta} className={INK_CTA}>
            {cta}
          </button>
        )}
        {note && (
          <p role="status" className="mt-2 text-[12px] font-semibold text-success-text [text-wrap:pretty]">{note}</p>
        )}
      </section>
    );
  }
  return (
    <section className="rounded-xl bg-ink px-3.5 py-[13px]">
      <p className="text-[13px] font-bold leading-snug text-white [text-wrap:pretty]">{children}</p>
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-3 flex min-h-[46px] w-full items-center justify-center rounded-lg bg-surface px-4 text-[14px] font-extrabold text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none"
        >
          {cta}
        </button>
      )}
    </section>
  );
}
