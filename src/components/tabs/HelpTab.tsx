'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(15,23,42,0.08)', background: '#ffffff' }}
    >
      {items.map((item, i) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} style={{ borderTop: i > 0 ? '1px solid rgba(15,23,42,0.07)' : undefined }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : item.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span className="font-semibold text-sm" style={{ color: '#111827' }}>
                {item.title}
              </span>
              <ChevronDown
                size={15}
                style={{
                  color: '#94a3b8',
                  flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>
            {isOpen && (
              <div
                className="px-5 pb-5 text-sm leading-relaxed space-y-3"
                style={{ color: '#475569' }}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs leading-relaxed"
      style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)', color: '#334155' }}
    >
      <span className="font-bold block mb-1" style={{ color: '#2563eb' }}>Example</span>
      {children}
    </div>
  );
}

const SECTIONS: AccordionItem[] = [
  {
    id: 'apr',
    title: 'What is APR?',
    content: (
      <>
        <p>
          APR stands for <strong>Annual Percentage Rate</strong>. It&apos;s the yearly cost of borrowing
          money, expressed as a percentage of the outstanding balance. Each month, a fraction of
          the APR is charged as interest on your balance.
        </p>
        <p>The monthly interest charge is calculated as:</p>
        <div
          className="rounded-xl px-4 py-3 font-mono text-xs"
          style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.1)', color: '#111827' }}
        >
          Monthly interest = Balance × (APR ÷ 12)
        </div>
        <ExampleBox>
          A $5,000 credit card at 24% APR charges $5,000 × (0.24 ÷ 12) = <strong>$100 in interest
          every month</strong> when you only pay the minimum. That $100 gets added back to your
          balance before next month&apos;s minimum is calculated.
        </ExampleBox>
        <p>
          Higher APR = more of your payment goes to interest and less to reducing the actual balance.
          That&apos;s why high-APR debts are the most expensive to carry.
        </p>
      </>
    ),
  },
  {
    id: 'strategies',
    title: 'Snowball vs Avalanche — what\'s the difference?',
    content: (
      <>
        <p>Both strategies pay minimums on every debt, then put all extra money toward one target at a time. They differ only in which debt gets the extra payment:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              name: '❄️ Snowball',
              rule: 'Target the smallest balance first.',
              pro: 'Quick wins keep you motivated. Great if you need momentum.',
              con: 'May pay slightly more total interest.',
              color: '#2563eb',
              bg: 'rgba(37,99,235,0.05)',
              border: 'rgba(37,99,235,0.14)',
            },
            {
              name: '🏔 Avalanche',
              rule: 'Target the highest APR first.',
              pro: 'Minimizes total interest paid. Mathematically optimal.',
              con: 'First payoff may take longer if that debt has a large balance.',
              color: '#7c3aed',
              bg: 'rgba(124,58,237,0.05)',
              border: 'rgba(124,58,237,0.14)',
            },
          ].map((s) => (
            <div key={s.name} className="rounded-xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <p className="font-semibold text-xs mb-2" style={{ color: s.color }}>{s.name}</p>
              <p className="text-xs mb-1"><strong>Rule:</strong> {s.rule}</p>
              <p className="text-xs mb-1" style={{ color: '#27AE60' }}>✓ {s.pro}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>⚠ {s.con}</p>
            </div>
          ))}
        </div>
        <p>
          The best strategy is the one you&apos;ll stick to. You can switch between them at any time
          from the Payoff Plan tab — your data is never lost.
        </p>
      </>
    ),
  },
  {
    id: 'payoff-dates',
    title: 'How are payoff dates calculated?',
    content: (
      <>
        <p>
          Payoff dates are computed by simulating your payments month by month until every balance
          reaches zero. Each month, the engine does three things for every debt:
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-xs">
          <li>Calculates interest: <code className="bg-slate-100 px-1 rounded">balance × (APR ÷ 12)</code></li>
          <li>Applies your payment: reduces balance by <code className="bg-slate-100 px-1 rounded">payment − interest</code></li>
          <li>When a debt hits $0, its freed minimum rolls into the next target debt (the &quot;snowball&quot; effect)</li>
        </ol>
        <ExampleBox>
          You owe $2,000 at 18% APR with a $50 minimum and $100 extra per month.<br />
          Month 1: Interest = $2,000 × 0.015 = $30. Payment = $150. Principal paid = $120. New balance = $1,880.<br />
          This continues until the balance hits $0 — roughly 15 months.
        </ExampleBox>
        <p>
          The projected debt-free date shown in your plan is based on this simulation running
          from today using your current balances, APRs, and monthly budget.
        </p>
      </>
    ),
  },
  {
    id: 'minimums',
    title: 'Why do minimum payments slow your progress?',
    content: (
      <>
        <p>
          Credit card and loan minimums are designed to keep you paying for as long as possible.
          They are typically calculated as a percentage of the balance — so as the balance slowly
          shrinks, the minimum also shrinks. This means you pay less and less principal each month.
        </p>
        <ExampleBox>
          A $10,000 credit card at 22% APR with a 2% minimum payment:<br />
          Month 1 minimum ≈ $200. Interest charge ≈ $183. Principal paid = <strong>only $17</strong>.<br />
          If you only ever pay the minimum, it takes <strong>over 30 years</strong> to pay off and
          costs more than $20,000 in interest alone.
        </ExampleBox>
        <p>
          Even a small extra payment — $25 or $50/month — dramatically shortens the timeline.
          Every dollar above the minimum goes directly to reducing the principal balance, which
          in turn reduces next month&apos;s interest charge. The effect compounds over time.
        </p>
        <p>
          The &quot;Interest Saved vs Minimums&quot; figure in your Payoff Plan shows exactly how much
          you save by following your plan instead of paying minimums only.
        </p>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'Frequently asked questions',
    content: (
      <div className="space-y-4">
        {[
          {
            q: 'Can I switch strategies after I\'ve started?',
            a: 'Yes. Switching between Snowball, Avalanche, or Custom in the Payoff Plan tab recalculates your plan instantly. Your payment history and balances are never affected.',
          },
          {
            q: 'What does "extra payment" mean in my budget?',
            a: 'It\'s any amount above your required minimums that you can put toward debt. The app applies it to your focus debt each month according to your chosen strategy.',
          },
          {
            q: 'Why does my actual balance not match the projected line on the chart?',
            a: 'The projected line assumes you pay exactly the planned amount every month. If you paid less, more, or at a different time, the actual balance will diverge. Update your balance on the debt card to keep the chart accurate.',
          },
          {
            q: 'Does the app connect to my bank account?',
            a: 'No. SnowballPay is fully manual — you enter balances and record payments yourself. This keeps your banking credentials completely private.',
          },
          {
            q: 'What is credit utilization and why does it matter?',
            a: 'Credit utilization is your credit card balance divided by your credit limit, expressed as a percentage. Lenders and credit scoring models prefer it below 30%. Paying down card balances improves your utilization and can raise your credit score.',
          },
        ].map(({ q, a }) => (
          <div key={q}>
            <p className="font-semibold text-xs mb-1" style={{ color: '#111827' }}>Q: {q}</p>
            <p className="text-xs" style={{ color: '#475569' }}>A: {a}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export default function HelpTab() {
  return (
    <div style={{ maxWidth: '720px' }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.16)' }}
        >
          <HelpCircle size={18} style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="font-bold text-base" style={{ color: '#111827' }}>Help &amp; Education</h1>
          <p className="text-xs" style={{ color: '#6B7280' }}>Answers, examples, and explanations — no jargon.</p>
        </div>
      </div>

      <Accordion items={SECTIONS} />

      <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
        Still have questions?{' '}
        <a href="/learn" style={{ color: '#2563eb', textDecoration: 'underline' }}>
          Read the full strategy guide →
        </a>
      </p>
    </div>
  );
}
