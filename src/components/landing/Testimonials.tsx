const testimonials = [
  { quote: "I paid off $23,000 in 18 months following this plan. Couldn't have done it without seeing the progress every single week.", name: 'Sarah M.', loc: 'Texas', init: 'SM' },
  { quote: "Finally something that makes debt feel manageable. The snowball tracker is genuinely addictive — in the best way.",           name: 'James K.', loc: 'Ohio',  init: 'JK' },
];

export default function Testimonials() {
  return (
    <section style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px' }}>Real Stories</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0 }}>People just like you, debt-free</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {testimonials.map((t, i) => (
            <div key={i} className="glass quote-card" style={{ borderRadius: '18px', padding: '32px' }}>
              <p style={{ fontSize: '14px', color: '#fbbf24', marginBottom: '10px', letterSpacing: '2px' }}>★★★★★</p>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#cbd5e1', marginBottom: '24px' }}>{t.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6ec1e4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{t.init}</div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{t.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
