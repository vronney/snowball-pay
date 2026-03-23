const steps = [
  {
    num: '01',
    icon: '➕',
    color: '#4f9eff',
    glow: 'rgba(79,158,255,0.35)',
    title: 'Add Your Debts',
    desc: 'Enter your balances, interest rates, and minimum payments. Import from a bank statement or add manually — takes under 2 minutes.',
  },
  {
    num: '02',
    icon: '🗺️',
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.35)',
    title: 'Get Your Plan',
    desc: 'We instantly generate a personalized payoff roadmap. Choose Snowball (smallest first) or Avalanche (highest rate first).',
  },
  {
    num: '03',
    icon: '🏆',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.35)',
    title: 'Reach Debt-Free',
    desc: 'Follow your monthly plan, log payments, and watch every balance disappear. Celebrate each milestone along the way.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden' }}>
      <div className="lp-orb" style={{ width: '520px', height: '520px', background: 'rgba(79,158,255,0.07)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animationDelay: '1.2s' }} />

      <div style={{ maxWidth: '1040px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#06b6d4', marginBottom: '14px', display: 'block' }}>
            Simple Process
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#eef4ff', margin: '0 0 18px', lineHeight: 1.1 }}>
            Three steps to{' '}
            <span className="lp-text-blue">debt freedom</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#7a9bbf', maxWidth: '440px', margin: '0 auto', lineHeight: 1.7 }}>
            No complicated setup. No financial degree required. Just a clear plan and consistent action.
          </p>
        </div>

        {/* Steps — with connector line */}
        <div style={{ position: 'relative' }}>

          {/* Connector line (desktop only) */}
          <div className="lp-hide-sm" style={{ position: 'absolute', top: '38px', left: 'calc(16.5% + 20px)', right: 'calc(16.5% + 20px)', height: '1px', background: 'linear-gradient(to right, rgba(79,158,255,0.3), rgba(139,92,246,0.3), rgba(16,185,129,0.3))' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>

                {/* Step number icon */}
                <div
                  className="lp-step-icon"
                  style={{
                    ['--icon-glow' as string]: s.glow,
                    width: '76px', height: '76px', borderRadius: '22px', margin: '0 auto 28px',
                    background: `${s.color}12`, border: `1px solid ${s.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px', position: 'relative', zIndex: 1,
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 8px 32px ${s.color}18`,
                  }}
                >
                  {s.icon}
                  {/* Step number badge */}
                  <span style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: s.color, color: '#fff', fontSize: '10px', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 12px ${s.color}44`,
                  }}>
                    {i + 1}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#eef4ff', marginBottom: '12px', letterSpacing: '-0.02em' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.72, color: '#5a7a9e', margin: 0 }}>{s.desc}</p>

                {/* Accent bar below title */}
                <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: s.color, margin: '16px auto 0', opacity: 0.5 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div className="lp-glass" style={{ borderRadius: '20px', padding: '32px 40px', marginTop: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#eef4ff', marginBottom: '6px' }}>Ready to see your personalized plan?</p>
          </div>
          <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-primary" style={{ fontSize: '15px', padding: '13px 28px', flexShrink: 0 }}>
            Build My Plan →
          </a>
        </div>

      </div>
    </section>
  );
}
