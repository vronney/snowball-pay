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
    <section id="faq" style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden', background: '#ffffff' }}>

      <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '68px' }}>
          <div className="lp-section-tag" style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.14)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
            FAQ
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 18px', lineHeight: 1.1 }}>
            Questions &amp; answers
          </h2>
          <p style={{ fontSize: '17px', color: '#64748b', maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>
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
                  background: open === i ? 'rgba(37,99,235,0.08)' : 'rgba(15,23,42,0.04)',
                  border: `1px solid ${open === i ? 'rgba(37,99,235,0.25)' : 'rgba(15,23,42,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', color: open === i ? '#2563eb' : '#94a3b8',
                  transition: 'background 0.2s, border-color 0.2s, color 0.2s, transform 0.25s',
                  transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                }}>
                  +
                </span>
              </button>
              {open === i && (
                <p style={{ fontSize: '15px', lineHeight: 1.78, color: '#64748b', paddingBottom: '26px', margin: 0 }}>
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Bottom support note */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#94a3b8', marginTop: '48px' }}>
          Still have questions?{' '}
          <a href="mailto:hello@snowballpay.app" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
            Email our team →
          </a>
        </p>
      </div>
    </section>
  );
}
