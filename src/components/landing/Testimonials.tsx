const testimonials = [
  {
    quote: "I paid off $23,000 in 18 months following this plan. Couldn't have done it without seeing the progress every single week.",
    name: 'Sarah M.', loc: 'Texas', init: 'SM', color: '#4f9eff', offset: '0',
    role: 'Nurse',
    highlight: '$23k paid off',
  },
  {
    quote: "Finally something that makes debt feel manageable. The snowball tracker is genuinely addictive — in the best way.",
    name: 'James K.', loc: 'Ohio', init: 'JK', color: '#8b5cf6', offset: '32px',
    role: 'Software Engineer',
    highlight: 'Debt-free in 3 yrs',
  },
  {
    quote: "The AI recommendations were shockingly accurate. It knew exactly when to suggest throwing extra money at my car loan over my credit card.",
    name: 'Aisha T.', loc: 'California', init: 'AT', color: '#10b981', offset: '16px',
    role: 'Teacher',
    highlight: '$3,900 interest saved',
  },
  {
    quote: "I set it up on a Sunday afternoon. By Monday I already had more clarity about my debt than I'd had in three years. It just works.",
    name: 'Marcus D.', loc: 'New York', init: 'MD', color: '#f59e0b', offset: '48px',
    role: 'Freelance Designer',
    highlight: 'Setup in 5 minutes',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" style={{ padding: '112px 24px', background: 'rgba(255,255,255,0.015)', position: 'relative', overflow: 'hidden' }}>
      <div className="lp-orb" style={{ width: '500px', height: '500px', background: 'rgba(79,158,255,0.07)', top: '-180px', left: '-160px', animationDelay: '0s' }} />
      <div className="lp-orb" style={{ width: '400px', height: '400px', background: 'rgba(245,158,11,0.06)', bottom: '-160px', right: '-120px', animationDelay: '3s' }} />

      <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: '14px', display: 'block' }}>
            Real Stories
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#eef4ff', margin: '0 0 18px', lineHeight: 1.1 }}>
            People just like you,{' '}
            <span className="lp-text-blue">debt-free</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#7a9bbf', maxWidth: '440px', margin: '0 auto', lineHeight: 1.7 }}>
            10,000+ people have used SnowballPay to transform their relationship with money.
          </p>
        </div>

        {/* Testimonial grid — staggered vertically */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', alignItems: 'start' }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="lp-glass lp-quote-card"
              style={{ borderRadius: '22px', padding: '30px', marginTop: t.offset, position: 'relative', overflow: 'hidden' }}
            >
              {/* Top border accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(to right, ${t.color}, transparent)` }} />

              {/* Large quote mark */}
              <div style={{ position: 'absolute', top: '14px', right: '18px', fontSize: '64px', lineHeight: 1, color: `${t.color}08`, fontFamily: 'Georgia, serif', userSelect: 'none', pointerEvents: 'none' }}>
                &#8221;
              </div>

              {/* Stars */}
              <p style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '14px', letterSpacing: '2px' }}>★★★★★</p>

              {/* Highlight badge */}
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 11px', borderRadius: '999px', background: `${t.color}12`, border: `1px solid ${t.color}22`, color: t.color, letterSpacing: '0.04em', display: 'inline-block', marginBottom: '16px' }}>
                {t.highlight}
              </span>

              {/* Quote */}
              <p style={{ fontSize: '14px', lineHeight: 1.78, color: '#94afc8', marginBottom: '26px', fontStyle: 'italic' }}>
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {t.init}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#eef4ff', margin: '0 0 1px' }}>{t.name}</p>
                  <p style={{ fontSize: '11px', color: '#3d5570', margin: 0 }}>{t.role} · {t.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
