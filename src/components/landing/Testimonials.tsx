const testimonials = [
  { quote: "I paid off $23,000 in 18 months following this plan. Couldn't have done it without seeing the progress every single week.", name: 'Sarah M.', loc: 'Texas', init: 'SM', offset: '0px' },
  { quote: "Finally something that makes debt feel manageable. The snowball tracker is genuinely addictive — in the best way.",           name: 'James K.', loc: 'Ohio',  init: 'JK', offset: '28px' },
];

export default function Testimonials() {
  return (
    <section style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px' }}>Real Stories</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0 }}>People just like you, debt-free</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
          {testimonials.map((t, i) => (
            <div key={i} className="glass quote-card" style={{ borderRadius: '20px', padding: '32px', marginTop: t.offset, position: 'relative', overflow: 'hidden' }}>
              {/* Decorative quote mark */}
              <div style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '80px', lineHeight: 1, color: 'rgba(59,130,246,0.07)', fontFamily: 'Georgia, serif', userSelect: 'none', pointerEvents: 'none' }}>&#8221;</div>

              <p style={{ fontSize: '13px', color: '#f59e0b', marginBottom: '14px', letterSpacing: '3px' }}>★★★★★</p>
              <p style={{ fontSize: '15px', lineHeight: 1.75, color: '#cbd5e1', marginBottom: '28px', position: 'relative' }}>{t.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6ec1e4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{t.init}</div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 1px' }}>{t.name}</p>
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>{t.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
