const featured = [
  {
    accent: '#4f9eff',
    glow: 'rgba(79,158,255,0.08)',
    num: '01',
    icon: '❄️',
    title: 'Snowball Strategy',
    desc: 'Target your smallest debts first. Each payoff builds real momentum — the wins accumulate fast, keeping you motivated all the way to zero.',
    detail: 'Mathematically proven to accelerate payoff velocity by up to 40%.',
  },
  {
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.08)',
    num: '02',
    icon: '📈',
    title: 'Real-Time Progress',
    desc: 'Watch balances shrink in real time. Animated charts and progress bars transform abstract numbers into visible, satisfying wins.',
    detail: 'Visual feedback triggers dopamine — making consistency effortless.',
  },
];

const compact = [
  { accent: '#06b6d4', num: '03', icon: '🤖', title: 'AI Recommendations',  desc: 'Personalized payoff tips based on your income, goals, and behavior patterns.' },
  { accent: '#8b5cf6', num: '04', icon: '🗂️', title: 'Multi-Debt Tracking',  desc: 'Credit cards, car loans, student debt — every balance organized in one clean dashboard.' },
  { accent: '#f59e0b', num: '05', icon: '📄', title: 'Document Import',      desc: 'Upload bank statements or CSV files to auto-fill your debts in seconds.' },
  { accent: '#ec4899', num: '06', icon: '🧮', title: 'Interest Calculator',   desc: "See exactly how much interest you'll save with each extra payment you make." },
];

export default function FeaturesGrid() {
  return (
    <section id="features" style={{ padding: '112px 24px', position: 'relative' }}>
      <div className="lp-orb" style={{ width: '600px', height: '600px', background: 'rgba(79,158,255,0.07)', top: '10%', right: '-220px', animationDelay: '2s' }} />

      <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '68px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4f9eff', marginBottom: '14px', display: 'block' }}>
            Everything You Need
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#eef4ff', margin: '0 0 18px', lineHeight: 1.1 }}>
            Built for serious debt payoff
          </h2>
          <p style={{ fontSize: '17px', color: '#7a9bbf', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Every feature is designed around one goal: getting you to debt-free as fast as possible.
          </p>
        </div>

        {/* Two large feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px', marginBottom: '18px' }}>
          {featured.map((f) => (
            <div key={f.num} className="lp-glass lp-card-hover" style={{ borderRadius: '22px', padding: '36px', cursor: 'default', background: f.glow, position: 'relative', overflow: 'hidden' }}>
              {/* Decorative corner glow */}
              <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: `${f.accent}18`, filter: 'blur(48px)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: `${f.accent}14`, border: `1px solid ${f.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {f.icon}
                </div>
                <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, ${f.accent}30, transparent)` }} />
                <span style={{ fontSize: '11px', fontWeight: 800, color: f.accent, letterSpacing: '0.06em', opacity: 0.6 }}>{f.num}</span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#eef4ff', marginBottom: '12px', letterSpacing: '-0.02em' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.75, color: '#6a8aac', marginBottom: '20px' }}>{f.desc}</p>
              <p style={{ fontSize: '12px', color: f.accent, fontWeight: 600, padding: '8px 14px', borderRadius: '8px', background: `${f.accent}0e`, border: `1px solid ${f.accent}20`, display: 'inline-block' }}>
                {f.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Four compact feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(226px, 1fr))', gap: '18px' }}>
          {compact.map((f) => (
            <div key={f.num} className="lp-glass lp-card-hover" style={{ borderRadius: '18px', padding: '26px', cursor: 'default', borderLeft: `2px solid ${f.accent}35`, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '22px' }}>{f.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', color: f.accent }}>{f.num}</span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#eef4ff', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', lineHeight: 1.68, color: '#5a7a9e', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
