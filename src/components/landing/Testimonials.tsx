const testimonials = [
  {
    quote: "I paid off $23,000 in 18 months following this plan. Couldn't have done it without seeing the progress every single week.",
    name: 'Sarah M.', loc: 'Texas', init: 'SM', color: '#2563eb', offset: '0px',
    role: 'Nurse', highlight: '$23k paid off',
  },
  {
    quote: "Finally something that makes debt feel manageable. The snowball tracker is genuinely addictive — in the best way.",
    name: 'James K.', loc: 'Ohio', init: 'JK', color: '#7c3aed', offset: '28px',
    role: 'Software Engineer', highlight: 'Debt-free in 3 yrs',
  },
  {
    quote: "The AI recommendations were shockingly accurate. It knew exactly when to suggest throwing extra money at my car loan over my credit card.",
    name: 'Aisha T.', loc: 'California', init: 'AT', color: '#059669', offset: '14px',
    role: 'Teacher', highlight: '$3,900 interest saved',
  },
  {
    quote: "I set it up on a Sunday afternoon. By Monday I already had more clarity about my debt than I'd had in three years. It just works.",
    name: 'Marcus D.', loc: 'New York', init: 'MD', color: '#d97706', offset: '42px',
    role: 'Freelance Designer', highlight: 'Setup in 5 minutes',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" style={{ padding: '112px 24px', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>

      <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <div className="lp-section-tag" style={{ color: '#d97706', background: 'rgba(217,119,6,0.06)', borderColor: 'rgba(217,119,6,0.14)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
            Real Stories
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 18px', lineHeight: 1.1 }}>
            People just like you,{' '}
            <span className="lp-text-blue">debt-free</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.7 }}>
            10,000+ people have used SnowballPay to transform their relationship with money.
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', alignItems: 'start' }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="lp-glass lp-quote-card"
              style={{ borderRadius: '20px', padding: '28px', marginTop: t.offset, position: 'relative', overflow: 'hidden' }}
            >
              {/* Top border accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(to right, ${t.color}, ${t.color}44)` }} />

              {/* Stars */}
              <p style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '12px', letterSpacing: '2px' }}>★★★★★</p>

              {/* Highlight badge */}
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 11px', borderRadius: '999px', background: `${t.color}0e`, border: `1px solid ${t.color}20`, color: t.color, letterSpacing: '0.04em', display: 'inline-block', marginBottom: '14px' }}>
                {t.highlight}
              </span>

              {/* Quote */}
              <p style={{ fontSize: '14px', lineHeight: 1.78, color: '#475569', marginBottom: '24px', fontStyle: 'italic' }}>
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${t.color}12`, border: `2px solid ${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: t.color, flexShrink: 0 }}>
                  {t.init}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 1px' }}>{t.name}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{t.role} · {t.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
