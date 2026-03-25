const cases = [
  {
    accent: '#2563eb', initials: 'SM', name: 'Sarah M.', location: 'Texas', tag: 'Debt Snowball',
    quote: '"I had three credit cards, a car loan, and no idea where to start. SnowballPay showed me exactly which debt to attack first — and I never looked back."',
    stats: [
      { label: 'Starting Debt',   value: '$23,400' },
      { label: 'Time to Free',    value: '18 mo'   },
      { label: 'Interest Saved',  value: '$6,200'  },
    ],
  },
  {
    accent: '#7c3aed', initials: 'JK', name: 'James K.', location: 'Ohio', tag: 'Debt Avalanche',
    quote: '"Student loans and two credit cards felt impossible. The avalanche method with AI tips cut my payoff time by over a year. Completely life-changing."',
    stats: [
      { label: 'Starting Debt',   value: '$41,000'  },
      { label: 'Time to Free',    value: '3.1 yrs'  },
      { label: 'Interest Saved',  value: '$14,800'  },
    ],
  },
  {
    accent: '#059669', initials: 'AT', name: 'Aisha T.', location: 'California', tag: 'Mixed Strategy',
    quote: '"The document import feature saved me hours of setup. Within 10 minutes I had a complete payoff plan. I was debt-free 14 months later."',
    stats: [
      { label: 'Starting Debt',   value: '$15,700' },
      { label: 'Time to Free',    value: '14 mo'   },
      { label: 'Interest Saved',  value: '$3,900'  },
    ],
  },
];

export default function CaseStudies() {
  return (
    <section style={{ padding: '112px 24px', background: '#ffffff', position: 'relative', overflow: 'hidden' }}>

      <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <div className="lp-section-tag" style={{ color: '#059669', background: 'rgba(5,150,105,0.06)', borderColor: 'rgba(5,150,105,0.14)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
            Real Results
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 18px', lineHeight: 1.1 }}>
            From debt-stressed to{' '}
            <span className="lp-text-blue">debt-free</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#64748b', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            These aren&apos;t cherry-picked outliers. They&apos;re typical outcomes from people who committed to the plan.
          </p>
        </div>

        {/* Case study cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {cases.map((c, i) => (
            <div key={i} className="lp-glass lp-quote-card" style={{ borderRadius: '20px', padding: '32px', overflow: 'hidden', position: 'relative' }}>

              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(to right, ${c.accent}, ${c.accent}44)` }} />

              {/* Author row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `${c.accent}15`, border: `2px solid ${c.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: c.accent, flexShrink: 0 }}>
                  {c.initials}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{c.name}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{c.location}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 11px', borderRadius: '999px', background: `${c.accent}0f`, border: `1px solid ${c.accent}22`, color: c.accent, letterSpacing: '0.04em' }}>
                    {c.tag}
                  </span>
                </div>
              </div>

              {/* Stars */}
              <p style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '12px', letterSpacing: '2px' }}>★★★★★</p>

              {/* Quote */}
              <p style={{ fontSize: '14px', lineHeight: 1.75, color: '#475569', marginBottom: '28px', fontStyle: 'italic' }}>{c.quote}</p>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid rgba(15,23,42,0.07)', paddingTop: '20px' }}>
                {c.stats.map((s, si) => (
                  <div key={si} style={{ textAlign: 'center', padding: '0 8px', borderRight: si < c.stats.length - 1 ? '1px solid rgba(15,23,42,0.07)' : 'none' }}>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: c.accent, letterSpacing: '-0.03em', marginBottom: '4px' }}>{s.value}</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
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
