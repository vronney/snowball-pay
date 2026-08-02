import { Check } from 'lucide-react';

export interface CalculatorStep {
  label: string;
  done: boolean;
}

/**
 * Live 4-step progress strip above the calculator form. Mirrors the HowTo
 * steps already published in the page's JSON-LD so the visible UI and the
 * structured data tell the same story. Steps tick as the user works —
 * seeded debts count as step 1, so the strip never reads "0 of 4".
 */
export default function CalculatorSteps({ steps }: { steps: CalculatorStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="mb-8">
      <p
        className="text-center mb-3"
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#64748b',
        }}
      >
        {doneCount} of {steps.length} steps done
      </p>
      <ol
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: step.done ? '#2563eb' : '#ffffff',
                border: step.done
                  ? '1px solid #2563eb'
                  : '1px solid rgba(15,23,42,0.15)',
                color: step.done ? '#ffffff' : '#64748b',
                fontSize: '11px',
                fontWeight: 700,
                transition: 'background 0.2s cubic-bezier(0,0,0.2,1), border-color 0.2s cubic-bezier(0,0,0.2,1)',
              }}
            >
              {step.done ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: step.done ? '#0f172a' : '#64748b',
              }}
            >
              {step.label}
              {step.done && (
                <span className="sr-only"> — done</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
