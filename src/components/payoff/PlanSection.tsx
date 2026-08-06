import type { ReactNode } from 'react';
import { color } from '@/lib/designTokens';

interface PlanSectionProps {
  title: string;
  /** One line on what this group is for — skipped when the title says it. */
  description?: string;
  children: ReactNode;
}

/**
 * A titled group within the Plan tab.
 *
 * The tab is a long stack of cards with no landmarks, so scanning it means
 * reading every card to find the one you want. This adds the landmarks without
 * touching the cards: a heading, a hairline, and the existing spacing.
 *
 * Renders a real <section> with an accessible name, so the groups show up in
 * screen-reader landmark navigation rather than being visual-only.
 */
export default function PlanSection({
  title,
  description,
  children,
}: PlanSectionProps) {
  return (
    // gap-5 within a section against space-y-8 between them: the rhythm is what
    // separates the groups, so the inner gap has to stay clearly tighter.
    <section aria-label={title} className="flex flex-col gap-5">
      <div
        style={{
          borderBottom: '1px solid rgba(15,23,42,0.08)',
          paddingBottom: '8px',
        }}
      >
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: color.text,
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: '12px', color: color.muted, margin: '3px 0 0' }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
