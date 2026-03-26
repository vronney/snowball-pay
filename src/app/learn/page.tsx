import type { Metadata } from 'next';
import { auth0 } from '@/lib/auth0';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'Debt Snowball vs Avalanche — Which Strategy Is Right for You?',
  description:
    'Learn how the Debt Snowball and Debt Avalanche methods work, compare their benefits, and find out which payoff strategy fits your personality and financial goals.',
  alternates: {
    canonical: 'https://getsnowballpay.com/learn',
  },
  openGraph: {
    title: 'Debt Snowball vs Avalanche — Which Strategy Is Right for You?',
    description:
      'Snowball vs Avalanche: compare both debt payoff methods side-by-side and find the strategy that fits you best.',
    url: 'https://getsnowballpay.com/learn',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Debt Snowball vs Avalanche — Which Strategy Is Right for You?',
    description: 'Compare both debt payoff methods and find the strategy that fits you best.',
  },
};

const snowballSteps = [
  { n: '01', title: 'List debts smallest to largest', body: 'Ignore interest rates. Order every balance from the smallest amount owed to the largest.' },
  { n: '02', title: 'Pay minimums on everything else', body: 'Keep all other debts current while you direct all available extra cash at debt #1.' },
  { n: '03', title: 'Attack the smallest balance hard', body: 'Throw every spare dollar at your smallest debt until it is completely gone.' },
  { n: '04', title: 'Roll that payment forward', body: 'When debt #1 is paid off, add its full payment to what you were already paying on debt #2 — your "snowball" grows with each victory.' },
];

const avalancheSteps = [
  { n: '01', title: 'List debts by interest rate', body: 'Sort every balance from highest APR to lowest, regardless of the balance size.' },
  { n: '02', title: 'Pay minimums on everything else', body: 'Keep all other debts current while you concentrate firepower on the highest-rate debt.' },
  { n: '03', title: 'Crush the highest-rate debt first', body: 'Direct all extra money at the most expensive debt — the one costing you the most every single month.' },
  { n: '04', title: 'Cascade the savings downward', body: 'Once the top-rate debt is gone, roll its freed-up payment onto the next highest rate. Your savings compound.' },
];

const compareRows = [
  { label: 'Priority',          snowball: 'Smallest balance first',          avalanche: 'Highest interest rate first' },
  { label: 'Best for',          snowball: 'Motivation-driven people',         avalanche: 'Mathematically-minded people' },
  { label: 'Momentum',          snowball: 'Fast early wins build confidence', avalanche: 'Wins come slower but save more' },
  { label: 'Total interest',    snowball: 'Slightly more paid overall',       avalanche: 'Least total interest paid' },
  { label: 'First payoff',      snowball: 'Fastest — smallest debt gone first', avalanche: 'Depends on balance sizes' },
  { label: 'Complexity',        snowball: 'Very simple to follow',            avalanche: 'Requires tracking APRs' },
];

const snowballTraits = [
  'You want to feel progress quickly',
  'Past debt attempts lost momentum',
  'Behavior and psychology matter most',
  'You have several small balances',
  'You need visible wins to stay on track',
];

const avalancheTraits = [
  'You are motivated by numbers and logic',
  'Minimizing total cost is your top priority',
  'You can stay disciplined without quick wins',
  'Your high-rate debt has a large balance',
  'You want the mathematically optimal path',
];

const BASE_URL = 'https://getsnowballpay.com';

const learnJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${BASE_URL}/learn#article`,
      headline: 'Debt Snowball vs Avalanche — Which Strategy Is Right for You?',
      description:
        'Learn how the Debt Snowball and Debt Avalanche methods work, compare their benefits, and find out which payoff strategy fits your personality and financial goals.',
      url: `${BASE_URL}/learn`,
      datePublished: '2025-01-01',
      dateModified: '2026-03-26',
      author: { '@type': 'Organization', name: 'SnowballPay', url: BASE_URL },
      publisher: {
        '@type': 'Organization',
        name: 'SnowballPay',
        url: BASE_URL,
        logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo-dark.svg` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/learn` },
    },
    {
      '@type': 'HowTo',
      '@id': `${BASE_URL}/learn#snowball-howto`,
      name: 'How to Use the Debt Snowball Method',
      description:
        'Pay off your smallest debt first while making minimum payments on all others, then roll each freed payment into the next smallest debt.',
      step: snowballSteps.map((s) => ({
        '@type': 'HowToStep',
        name: s.title,
        text: s.body,
      })),
    },
    {
      '@type': 'HowTo',
      '@id': `${BASE_URL}/learn#avalanche-howto`,
      name: 'How to Use the Debt Avalanche Method',
      description:
        'Target your highest-interest debt first to minimize total interest paid, then cascade each freed payment to the next highest-rate debt.',
      step: avalancheSteps.map((s) => ({
        '@type': 'HowToStep',
        name: s.title,
        text: s.body,
      })),
    },
  ],
};

export default async function LearnPage() {
  const session = await auth0.getSession();
  const isLoggedIn = !!session;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(learnJsonLd) }}
      />
    <div className="lp" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        className="lp-hero-bg"
        style={{
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '140px',
          paddingBottom: '96px',
          paddingLeft: '24px',
          paddingRight: '24px',
          textAlign: 'center',
        }}
      >
        <div className="lp-orb" style={{ width: '700px', height: '700px', background: 'rgba(37,99,235,0.06)',  top: '-300px', right: '-200px' }} />
        <div className="lp-orb" style={{ width: '480px', height: '480px', background: 'rgba(124,58,237,0.05)', bottom: '-200px', left: '-120px', animationDelay: '3s' }} />
        <div className="lp-grid-overlay" />

        <div style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="lp-f1 lp-glass-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#2563eb', marginBottom: '28px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
            Debt Payoff Strategies Explained
          </div>

          <h1 className="lp-f2" style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: '22px' }}>
            Two Proven Paths to{' '}
            <span className="lp-text-blue">Debt Freedom</span>
          </h1>

          <p className="lp-f3" style={{ fontSize: '18px', lineHeight: 1.72, color: '#64748b', maxWidth: '580px', margin: '0 auto 40px' }}>
            The Snowball and Avalanche methods are the gold standard of debt payoff. Both work — the difference is <em>how</em> they work and which one fits you best.
          </p>

          <div className="lp-f4" style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a href="#snowball" className="lp-btn lp-btn-primary" style={{ fontSize: '15px', padding: '13px 28px' }}>
              Snowball Method ↓
            </a>
            <a href="#avalanche" className="lp-btn lp-btn-ghost" style={{ fontSize: '15px', padding: '13px 28px' }}>
              Avalanche Method ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── Snowball Method ───────────────────────────────────────── */}
      <section id="snowball" style={{ padding: '96px 24px', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '48px', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
              ❄️
            </div>
            <div>
              <div className="lp-section-tag" style={{ marginBottom: '10px' }}>Method 01</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: '12px' }}>
                The <span className="lp-text-blue">Debt Snowball</span>
              </h2>
              <p style={{ fontSize: '17px', color: '#64748b', lineHeight: 1.7, maxWidth: '600px' }}>
                Pay off your smallest debt first — completely ignore interest rates. When it&apos;s gone, roll that payment into the next smallest. The momentum you build is the whole point.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '56px' }}>
            {snowballSteps.map((step) => (
              <div
                key={step.n}
                className="lp-glass lp-card-hover"
                style={{ borderRadius: '16px', padding: '24px', borderLeft: '3px solid #2563eb' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: '#2563eb', marginBottom: '10px' }}>STEP {step.n}</div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.65 }}>{step.body}</p>
              </div>
            ))}
          </div>

          {/* Benefits + who it's for */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div className="lp-glass-blue" style={{ borderRadius: '20px', padding: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1d4ed8', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧠</span> Why It Works Psychologically
              </h3>
              {[
                'Quick wins release dopamine — your brain craves the next payoff',
                'Fewer accounts reduces mental load over time',
                'Visible progress keeps you motivated through tough months',
                'Each paid-off debt is a concrete milestone you can celebrate',
                'Builds the habit loop that keeps you going to the end',
              ].map((b, i) => (
                <div key={i} className="lp-check-item" style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div style={{ borderRadius: '20px', padding: '32px', background: '#f8fafc', border: '1px solid rgba(15,23,42,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯</span> Snowball is the right pick if…
              </h3>
              {snowballTraits.map((t, i) => (
                <div key={i} className="lp-check-item" style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>→</span>
                  <span>{t}</span>
                </div>
              ))}
              <div style={{ marginTop: '24px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.14)' }}>
                <p style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, marginBottom: '4px' }}>DAVE RAMSEY ENDORSED</p>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  The Snowball is the method popularized by financial author Dave Ramsey and used by millions to escape debt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Avalanche Method ──────────────────────────────────────── */}
      <section id="avalanche" style={{ padding: '96px 24px', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '48px', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(124,58,237,0.08)', border: '1.5px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>
              🏔️
            </div>
            <div>
              <div className="lp-section-tag" style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.16)', color: '#7c3aed', marginBottom: '10px' }}>Method 02</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: '12px' }}>
                The <span className="lp-text-purple">Debt Avalanche</span>
              </h2>
              <p style={{ fontSize: '17px', color: '#64748b', lineHeight: 1.7, maxWidth: '600px' }}>
                Target your highest-interest debt first and eliminate it — regardless of the balance. Then cascade those savings down the list. Mathematically, this is the fastest way to destroy debt cost.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '56px' }}>
            {avalancheSteps.map((step) => (
              <div
                key={step.n}
                className="lp-glass lp-card-hover"
                style={{ borderRadius: '16px', padding: '24px', borderLeft: '3px solid #7c3aed' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: '#7c3aed', marginBottom: '10px' }}>STEP {step.n}</div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.65 }}>{step.body}</p>
              </div>
            ))}
          </div>

          {/* Benefits + who it's for */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div className="lp-glass-purple" style={{ borderRadius: '20px', padding: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#6d28d9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📐</span> Why It Wins Mathematically
              </h3>
              {[
                'Eliminates the highest-cost debt first — stopping the bleed immediately',
                'Saves more total money than any other ordering strategy',
                'Freed cash compounds: each payoff leaves more for the next',
                'High-rate cards like credit cards vanish before they can snowball negatively',
                'For large, high-APR balances, the savings can be thousands of dollars',
              ].map((b, i) => (
                <div key={i} className="lp-check-item" style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#7c3aed', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div style={{ borderRadius: '20px', padding: '32px', background: '#ffffff', border: '1px solid rgba(15,23,42,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯</span> Avalanche is the right pick if…
              </h3>
              {avalancheTraits.map((t, i) => (
                <div key={i} className="lp-check-item" style={{ marginBottom: '10px' }}>
                  <span style={{ color: '#7c3aed', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>→</span>
                  <span>{t}</span>
                </div>
              ))}
              <div style={{ marginTop: '24px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.14)' }}>
                <p style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 700, marginBottom: '4px' }}>FINANCIALLY OPTIMAL</p>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                  Independent studies consistently show the Avalanche minimizes total interest paid — often saving thousands versus other approaches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ──────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div className="lp-section-tag" style={{ display: 'inline-flex', marginBottom: '16px' }}>Side-by-Side Comparison</div>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1 }}>
              Snowball vs Avalanche at a Glance
            </h2>
          </div>

          {/* Table */}
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', background: '#0f172a' }}>
              <div style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: '#94a3b8', textTransform: 'uppercase' }} />
              <div style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 800, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>❄️</span> Snowball
              </div>
              <div style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏔️</span> Avalanche
              </div>
            </div>

            {compareRows.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr',
                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                  borderTop: '1px solid rgba(15,23,42,0.07)',
                }}
              >
                <div style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center' }}>
                  {row.label}
                </div>
                <div style={{ padding: '18px 24px', fontSize: '14px', color: '#334155', lineHeight: 1.5, borderLeft: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center' }}>
                  {row.snowball}
                </div>
                <div style={{ padding: '18px 24px', fontSize: '14px', color: '#334155', lineHeight: 1.5, borderLeft: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center' }}>
                  {row.avalanche}
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', marginTop: '20px' }}>
            The &quot;right&quot; method is the one you will actually stick with. Both reach the same destination.
          </p>
        </div>
      </section>

      {/* ── Which is right for you? ───────────────────────────────── */}
      <section style={{ padding: '96px 24px', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '940px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div className="lp-section-tag" style={{ display: 'inline-flex', marginBottom: '16px' }}>Decision Guide</div>
            <h2 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: '16px' }}>
              Which Strategy is Right for You?
            </h2>
            <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
              Honestly, the best method is the one you will stick with. Here is the quick way to decide.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

            {/* Snowball card */}
            <div className="lp-glass-glow lp-card-hover" style={{ borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>❄️</div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Choose Snowball if</p>
                  <p style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Motivation drives you</p>
                </div>
              </div>
              {snowballTraits.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#2563eb', fontWeight: 800, flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
              <div style={{ marginTop: '28px' }}>
                <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '14px', padding: '13px 20px' }}>
                  Start with Snowball →
                </a>
              </div>
            </div>

            {/* Avalanche card */}
            <div className="lp-glass lp-card-hover" style={{ borderRadius: '24px', padding: '36px', position: 'relative', overflow: 'hidden', border: '1.5px solid rgba(124,58,237,0.2)', boxShadow: '0 0 0 4px rgba(124,58,237,0.05), 0 16px 40px rgba(124,58,237,0.08)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(124,58,237,0.08)', border: '1.5px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🏔️</div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Choose Avalanche if</p>
                  <p style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Math motivates you</p>
                </div>
              </div>
              {avalancheTraits.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#7c3aed', fontWeight: 800, flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
              <div style={{ marginTop: '28px' }}>
                <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '14px', padding: '13px 20px' }}>
                  Start with Avalanche →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SnowballPay supports both ─────────────────────────────── */}
      <section style={{ padding: '80px 24px', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="lp-glass-glow" style={{ borderRadius: '24px', padding: '52px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(37,99,235,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '24px' }}>❄️</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>+</span>
                <span style={{ fontSize: '24px' }}>🏔️</span>
              </div>

              <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '16px', color: '#0f172a' }}>
                SnowballPay Supports{' '}
                <span className="lp-text-blue">Both Strategies</span>
              </h2>

              <p style={{ fontSize: '17px', color: '#64748b', lineHeight: 1.72, maxWidth: '560px', margin: '0 auto 32px' }}>
                When you set up your plan, simply choose your method. SnowballPay automatically orders your debts, calculates your payoff timeline, and shows you exactly how much interest you will save — whichever path you pick.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
                {[
                  { icon: '🗓️', label: 'Payoff timeline' },
                  { icon: '💰', label: 'Interest saved' },
                  { icon: '📊', label: 'Visual progress' },
                  { icon: '🔄', label: 'Switch methods anytime' },
                ].map((f) => (
                  <div key={f.label} className="lp-trust-badge" style={{ padding: '9px 16px', fontSize: '13px' }}>
                    <span>{f.icon}</span>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{f.label}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                You can switch between Snowball and Avalanche at any time — your data stays safe and your plan recalculates instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px 112px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
        <div style={{ maxWidth: '620px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏁</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '18px' }}>
            Ready to{' '}
            <span className="lp-text-blue">Pick Your Path</span>?
          </h2>
          <p style={{ fontSize: '17px', color: '#64748b', lineHeight: 1.72, marginBottom: '36px' }}>
            Create your free account, add your debts, and choose Snowball or Avalanche. SnowballPay does the math — you do the paying.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-primary" style={{ fontSize: '16px', padding: '15px 34px' }}>
              {isLoggedIn ? 'Open Dashboard →' : 'Start Free — No Card Needed'}
            </a>
            <a href="/calculator" className="lp-btn lp-btn-ghost" style={{ fontSize: '15px' }}>
              Try the Calculator
            </a>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '20px' }}>Free forever plan available. No credit card required.</p>
        </div>
      </section>

      <LandingFooter />
    </div>
    </>
  );
}
