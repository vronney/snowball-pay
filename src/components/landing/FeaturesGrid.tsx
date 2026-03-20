const featured = [
  {
    accent: '#3b82f6',
    label: '01',
    title: 'Snowball Strategy',
    desc: 'Target smallest debts first. Each payoff builds real momentum — you feel the wins accumulate fast, which keeps you on track.',
  },
  {
    accent: '#10b981',
    label: '02',
    title: 'Real-Time Progress',
    desc: 'Watch balances shrink. Charts and progress bars update live as you pay down each debt, turning abstract numbers into visible wins.',
  },
];

const compact = [
  { accent: '#6ec1e4', label: '03', title: 'AI Recommendations',  desc: 'Payoff tips personalised to your income and goals.' },
  { accent: '#8b5cf6', label: '04', title: 'Multi-Debt Tracking',  desc: 'Cards, loans, student debt — all in one dashboard.' },
  { accent: '#f59e0b', label: '05', title: 'Document Import',      desc: 'Upload statements. Auto-fill your debts in seconds.' },
  { accent: '#ec4899', label: '06', title: 'Savings Calculator',   desc: "See exactly how much interest you'll save." },
];

export default function FeaturesGrid() {
  return (
    <section style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px' }}>Everything You Need</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#e2e8f0', margin: 0 }}>Built for serious debt payoff</h2>
        </div>

        {/* Featured two — wider cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {featured.map((f) => (
            <div key={f.label} className="glass feat-card" style={{ borderRadius: '20px', padding: '32px', cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${f.accent}15`, border: `1px solid ${f.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', color: f.accent }}>
                  {f.label}
                </div>
                <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, ${f.accent}28, transparent)` }} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#64748b', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Compact four — smaller cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {compact.map((f) => (
            <div key={f.label} className="glass feat-card" style={{ borderRadius: '16px', padding: '22px 24px', cursor: 'default', borderLeft: `2px solid ${f.accent}40` }}>
              <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', color: f.accent, marginBottom: '10px' }}>{f.label}</div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '7px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#64748b', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
