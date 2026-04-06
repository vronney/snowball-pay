import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free Debt Snowball Calculator — See Your Exact Payoff Date',
  description:
    'Use our free debt snowball calculator to see exactly when you\'ll be debt-free, how much interest you\'ll save, and your month-by-month payoff plan. No signup required.',
  keywords: [
    'debt snowball calculator',
    'debt payoff calculator',
    'debt free date calculator',
    'how long to pay off debt',
    'debt snowball method',
  ],
  alternates: {
    canonical: 'https://getsnowballpay.com/learn/debt-snowball-calculator',
  },
  openGraph: {
    title: 'Free Debt Snowball Calculator',
    description: 'See exactly when you\'ll be debt-free and how much interest you\'ll save.',
    url: 'https://getsnowballpay.com/learn/debt-snowball-calculator',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Free Debt Snowball Calculator — See Your Exact Payoff Date',
  description: 'Comprehensive guide to using the debt snowball method with a free interactive calculator.',
  author: { '@type': 'Organization', name: 'SnowballPay' },
  publisher: { '@type': 'Organization', name: 'SnowballPay', url: 'https://getsnowballpay.com' },
};

export default function DebtSnowballCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a', background: '#ffffff' }}>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid rgba(15,23,42,0.07)', background: '#ffffff', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a', textDecoration: 'none' }}>
              SnowballPay
            </Link>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Link href="/learn" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>Learn</Link>
              <Link href="/calculator" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none' }}>Calculator</Link>
              <a
                href="/auth/login?returnTo=/dashboard"
                style={{ fontSize: '14px', fontWeight: 600, color: '#fff', background: '#2563eb', padding: '8px 18px', borderRadius: '8px', textDecoration: 'none' }}
              >
                Try It Free
              </a>
            </div>
          </div>
        </nav>

        <article style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px 100px' }}>

          {/* Breadcrumb */}
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            {' › '}
            <Link href="/learn" style={{ color: 'inherit', textDecoration: 'none' }}>Learn</Link>
            {' › '}
            Debt Snowball Calculator
          </p>

          {/* Hero */}
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: '16px' }}>
            Free Debt Snowball Calculator
          </h1>
          <p style={{ fontSize: '18px', color: '#475569', lineHeight: 1.7, marginBottom: '32px', maxWidth: '640px' }}>
            See exactly when you&apos;ll be debt-free, how much interest you&apos;ll save, and get a
            month-by-month payoff plan — in under 2 minutes. No account required.
          </p>

          {/* CTA box */}
          <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(29,78,216,0.04))', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '16px', padding: '28px 32px', marginBottom: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Try the free calculator now</p>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Enter your debts below. Debt-free date in seconds.</p>
            </div>
            <Link
              href="/calculator"
              style={{ fontSize: '15px', fontWeight: 700, color: '#fff', background: '#2563eb', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Open Calculator →
            </Link>
          </div>

          {/* Article content */}
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            What is the Debt Snowball method?
          </h2>
          <p style={{ fontSize: '16px', color: '#334155', lineHeight: 1.8, marginBottom: '20px' }}>
            The Debt Snowball method, popularized by Dave Ramsey, is a debt payoff strategy where you
            pay off your debts from <strong>smallest balance to largest</strong>, regardless of interest rate.
            While making minimum payments on all other debts, you direct every extra dollar to the smallest one.
          </p>
          <p style={{ fontSize: '16px', color: '#334155', lineHeight: 1.8, marginBottom: '32px' }}>
            When the smallest debt is paid off, you &ldquo;snowball&rdquo; that freed payment into the next
            smallest — creating an accelerating payoff momentum that builds over time.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            How to use a Debt Snowball calculator
          </h2>
          <ol style={{ fontSize: '16px', color: '#334155', lineHeight: 1.8, paddingLeft: '24px', marginBottom: '32px' }}>
            <li style={{ marginBottom: '12px' }}><strong>List every debt</strong> — name, current balance, interest rate, and minimum payment.</li>
            <li style={{ marginBottom: '12px' }}><strong>Enter your take-home income</strong> and essential monthly expenses.</li>
            <li style={{ marginBottom: '12px' }}><strong>Add any extra monthly payment</strong> you can put toward debt.</li>
            <li style={{ marginBottom: '12px' }}><strong>Select Snowball strategy</strong> — the calculator ranks your debts by balance and builds your plan.</li>
            <li><strong>See your debt-free date</strong> and total interest saved vs. paying minimums only.</li>
          </ol>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Debt Snowball vs. Avalanche — which saves more money?
          </h2>
          <p style={{ fontSize: '16px', color: '#334155', lineHeight: 1.8, marginBottom: '16px' }}>
            The <strong>Debt Avalanche</strong> (highest interest first) mathematically saves more in total interest.
            The <strong>Debt Snowball</strong> (smallest balance first) is psychologically more effective for most people
            because of the quick wins it provides early on.
          </p>
          <p style={{ fontSize: '16px', color: '#334155', lineHeight: 1.8, marginBottom: '32px' }}>
            Research shows people who see quick progress are more likely to stay committed.
            The &ldquo;best&rdquo; method is the one you actually follow through on.{' '}
            <Link href="/learn" style={{ color: '#2563eb', fontWeight: 600 }}>
              Compare both methods in depth →
            </Link>
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Example: Paying off $41,500 in debt
          </h2>

          {/* Example table */}
          <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Debt', 'Balance', 'APR', 'Minimum'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155', borderBottom: '1px solid rgba(15,23,42,0.1)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Credit Card', '$14,200', '24.99%', '$285'],
                  ['Car Loan',    '$4,800',  '6.9%',   '$145'],
                  ['Student Loan','$22,500', '5.2%',   '$210'],
                ].map(([name, bal, apr, min]) => (
                  <tr key={name} style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{name}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{bal}</td>
                    <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 600 }}>{apr}</td>
                    <td style={{ padding: '10px 14px' }}>{min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>
            With $5,200/month take-home, $2,400 in essentials, and $200 extra toward debt,
            the Snowball method pays this off in <strong>~3.2 years</strong> vs. ~6+ years paying minimums only.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            Frequently asked questions
          </h2>

          {[
            {
              q: 'Does the Debt Snowball method hurt my credit score?',
              a: 'Making on-time minimum payments on all debts preserves your credit score. Paying off individual debts early typically improves your credit utilization ratio over time.',
            },
            {
              q: 'What if I can\'t afford extra payments?',
              a: 'Even $25–$50 extra per month accelerates payoff significantly. Run the calculator with your actual budget — the results may surprise you.',
            },
            {
              q: 'Should I use Snowball or Avalanche?',
              a: 'If you\'re motivated by wins and tend to lose momentum, Snowball. If your highest-rate debt has a significantly higher APR (e.g., 25%+ credit card vs 5% student loan), Avalanche saves meaningfully more.',
            },
            {
              q: 'What is a "snowflake" payment?',
              a: 'A snowflake payment is any irregular extra payment — a tax refund, birthday money, side gig income. These accelerate your plan without changing your monthly budget.',
            },
          ].map(({ q, a }) => (
            <div key={q} style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', paddingBottom: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>{q}</h3>
              <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, margin: 0 }}>{a}</p>
            </div>
          ))}

          {/* Bottom CTA */}
          <div style={{ background: '#0f172a', borderRadius: '20px', padding: '40px', textAlign: 'center', marginTop: '48px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '10px' }}>
              Ready to see your debt-free date?
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
              Free calculator. No account needed to see your plan.
            </p>
            <Link
              href="/calculator"
              style={{ fontSize: '16px', fontWeight: 700, color: '#fff', background: '#2563eb', padding: '14px 32px', borderRadius: '12px', textDecoration: 'none', display: 'inline-block' }}
            >
              Try the Free Calculator →
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
