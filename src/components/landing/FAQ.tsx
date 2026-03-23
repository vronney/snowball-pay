'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'What is the Debt Snowball method?',
    a: 'The Debt Snowball method involves paying off your smallest debt first while making minimum payments on all others. Once the smallest is gone, you roll that payment into the next smallest — creating a "snowball" of momentum. It\'s psychologically powerful because you see wins early, which keeps you motivated.',
  },
  {
    q: 'How is Snowball different from the Avalanche method?',
    a: 'The Avalanche method targets your highest-interest debt first, which saves the most money mathematically. Snowball focuses on smallest balance first for faster early wins. Both methods are available in SnowballPay — our AI even recommends which is better for your specific situation.',
  },
  {
    q: 'How does the document import feature work?',
    a: 'You can upload a PDF bank statement, credit card statement, or CSV export. Our parser automatically extracts your debt balances, interest rates, and minimum payments — filling your dashboard in seconds. No manual entry required.',
  },
  {
    q: 'Is my financial data secure?',
    a: 'Absolutely. We use bank-level AES-256 encryption at rest and TLS in transit. We never sell your data or share it with third parties. You can export or delete your data at any time from your account settings.',
  },
  {
    q: 'Does SnowballPay connect to my bank accounts?',
    a: 'Not directly — we don\'t require bank account access. You enter (or import) your debt details manually, which means zero risk of unauthorized transactions. Your data stays in your control at all times.',
  },
  {
    q: 'What types of debt can I track?',
    a: 'Any type: credit cards, personal loans, auto loans, student loans, medical debt, mortgage debt, payday loans, and more. Each debt entry supports custom names, balances, interest rates, and minimum payments.',
  },
  {
    q: 'Can I change my payoff strategy after I start?',
    a: 'Yes, anytime. Switch between Snowball and Avalanche strategies or set up a custom order. Your payoff timeline will automatically recalculate and update all projections instantly.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden' }}>
      <div className="lp-orb" style={{ width: '480px', height: '480px', background: 'rgba(139,92,246,0.07)', top: '20%', right: '-180px', animationDelay: '2s' }} />

      <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '68px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '14px', display: 'block' }}>
            FAQ
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#eef4ff', margin: '0 0 18px', lineHeight: 1.1 }}>
            Questions &amp; answers
          </h2>
          <p style={{ fontSize: '17px', color: '#7a9bbf', maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>
            Everything you need to know before you start your debt-free journey.
          </p>
        </div>

        {/* Accordion */}
        <div>
          {faqs.map((f, i) => (
            <div key={i} className="lp-faq-row">
              <button
                className="lp-faq-trigger"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span>{f.q}</span>
                <span style={{
                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                  background: open === i ? 'rgba(79,158,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${open === i ? 'rgba(79,158,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', color: open === i ? '#4f9eff' : '#3d5570',
                  transition: 'background 0.2s, border-color 0.2s, color 0.2s, transform 0.25s',
                  transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                }}>
                  +
                </span>
              </button>
              {open === i && (
                <p style={{ fontSize: '15px', lineHeight: 1.78, color: '#7a9bbf', paddingBottom: '26px', margin: 0 }}>
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Bottom support note */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#3d5570', marginTop: '48px' }}>
          Still have questions?{' '}
          <a href="mailto:hello@snowballpay.app" style={{ color: '#4f9eff', textDecoration: 'none', fontWeight: 600 }}>
            Email our team →
          </a>
        </p>
      </div>
    </section>
  );
}
