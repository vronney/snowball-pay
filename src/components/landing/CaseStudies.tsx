const cases = [
  {
    accent: '#4f9eff',
    initials: 'SM',
    name: 'Sarah M.',
    location: 'Texas',
    tag: 'Debt Snowball',
    tagColor: '#4f9eff',
    before: '$23,400',
    after: '$0',
    time: '18 months',
    saved: '$6,200 saved',
    quote: '"I had three credit cards, a car loan, and no idea where to start. SnowballPay showed me exactly which debt to attack first — and I never looked back."',
    stats: [
      { label: 'Starting Debt', value: '$23,400' },
      { label: 'Time to Free',  value: '18 mo' },
      { label: 'Interest Saved', value: '$6,200' },
    ],
  },
  {
    accent: '#8b5cf6',
    initials: 'JK',
    name: 'James K.',
    location: 'Ohio',
    tag: 'Debt Avalanche',
    tagColor: '#8b5cf6',
    before: '$41,000',
    after: '$0',
    time: '3.1 years',
    saved: '$14,800 saved',
    quote: '"Student loans and two credit cards felt impossible. The avalanche method with AI tips cut my payoff time by over a year. Completely life-changing."',
    stats: [
      { label: 'Starting Debt', value: '$41,000' },
      { label: 'Time to Free',  value: '3.1 yrs' },
      { label: 'Interest Saved', value: '$14,800' },
    ],
  },
  {
    accent: '#10b981',
    initials: 'AT',
    name: 'Aisha T.',
    location: 'California',
    tag: 'Mixed Strategy',
    tagColor: '#10b981',
    before: '$15,700',
    after: '$0',
    time: '14 months',
    saved: '$3,900 saved',
    quote: '"The document import feature saved me hours of setup. Within 10 minutes I had a complete payoff plan. I was debt-free 14 months later."',
    stats: [
      { label: 'Starting Debt', value: '$15,700' },
      { label: 'Time to Free',  value: '14 mo' },
      { label: 'Interest Saved', value: '$3,900' },
    ],
  },
];

export default function CaseStudies() {
  return (
    <section style={{ padding: '112px 24px', background: 'rgba(255,255,255,0.015)', position: 'relative', overflow: 'hidden' }}>
      <div className="lp-orb" style={{ width: '640px', height: '640px', background: 'rgba(16,185,129,0.06)', bottom: '-280px', right: '-200px', animationDelay: '0.5s' }} />

      <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#10b981', marginBottom: '14px', display: 'block' }}>
            Real Results
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#eef4ff', margin: '0 0 18px', lineHeight: 1.1 }}>
            From debt-stressed to{' '}
            <span className="lp-text-blue">debt-free</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#7a9bbf', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            These aren&apos;t cherry-picked outliers. They&apos;re typical outcomes from people who committed to the plan.
          </p>
        </div>

        {/* Case study cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {cases.map((c, i) => (
            <div key={i} className="lp-glass lp-quote-card" style={{ borderRadius: '24px', padding: '32px', overflow: 'hidden', position: 'relative' }}>

              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${c.accent}, transparent)` }} />

              {/* Quote mark */}
              <div style={{ position: 'absolute', top: '18px', right: '22px', fontSize: '72px', lineHeight: 1, color: `${c.accent}09`, fontFamily: 'Georgia, serif', pointerEvents: 'none', userSelect: 'none' }}>&#8221;</div>

              {/* Author row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${c.accent}, ${c.accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {c.initials}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#eef4ff', margin: '0 0 2px' }}>{c.name}</p>
                  <p style={{ fontSize: '11px', color: '#3d5570', margin: 0 }}>{c.location}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 11px', borderRadius: '999px', background: `${c.accent}12`, border: `1px solid ${c.accent}25`, color: c.accent, letterSpacing: '0.04em' }}>
                    {c.tag}
                  </span>
                </div>
              </div>

              {/* Quote */}
              <p style={{ fontSize: '14px', lineHeight: 1.75, color: '#94afc8', marginBottom: '28px', fontStyle: 'italic' }}>{c.quote}</p>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', borderTop: '1px solid rgba(255,255,255,0.055)', paddingTop: '22px' }}>
                {c.stats.map((s, si) => (
                  <div key={si} style={{ textAlign: 'center', padding: '0 8px', borderRight: si < c.stats.length - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none' }}>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: c.accent, letterSpacing: '-0.03em', marginBottom: '4px' }}>{s.value}</div>
                    <div style={{ fontSize: '10px', color: '#3d5570', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
