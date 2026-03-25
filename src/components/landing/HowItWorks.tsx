const steps = [
  {
    num: '01', color: '#2563eb', glow: 'rgba(37,99,235,0.18)', bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.15)',
    icon: '➕',
    title: 'Add Your Debts',
    desc: 'Enter your balances, interest rates, and minimum payments. Import from a bank statement or add manually — takes under 2 minutes.',
  },
  {
    num: '02', color: '#7c3aed', glow: 'rgba(124,58,237,0.18)', bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.15)',
    icon: '🗺️',
    title: 'Get Your Plan',
    desc: 'We instantly generate a personalized payoff roadmap. Choose Snowball (smallest first) or Avalanche (highest rate first).',
  },
  {
    num: '03', color: '#059669', glow: 'rgba(5,150,105,0.18)', bg: 'rgba(5,150,105,0.07)', border: 'rgba(5,150,105,0.15)',
    icon: '🏆',
    title: 'Reach Debt-Free',
    desc: 'Follow your monthly plan, log payments, and watch every balance disappear. Celebrate each milestone along the way.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: '112px 24px', position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>

      <div style={{ maxWidth: '1040px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div className="lp-section-tag" style={{ color: '#0891b2', background: 'rgba(8,145,178,0.06)', borderColor: 'rgba(8,145,178,0.14)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
            Simple Process
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 18px', lineHeight: 1.1 }}>
            Three steps to{' '}
            <span className="lp-text-blue">debt freedom</span>
          </h2>
          <p style={{ fontSize: '17px', color: '#64748b', maxWidth: '440px', margin: '0 auto', lineHeight: 1.7 }}>
            No complicated setup. No financial degree required. Just a clear plan and consistent action.
          </p>
        </div>

        {/* Steps */}
        <div style={{ position: 'relative' }}>

          {/* Connector line (desktop) */}
          <div className="lp-hide-sm" style={{ position: 'absolute', top: '38px', left: 'calc(16.5% + 20px)', right: 'calc(16.5% + 20px)', height: '1px', background: 'linear-gradient(to right, rgba(37,99,235,0.25), rgba(124,58,237,0.25), rgba(5,150,105,0.25))' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div
                  className="lp-step-icon"
                  style={{
                    ['--icon-glow' as string]: s.glow,
                    width: '76px', height: '76px', borderRadius: '22px', margin: '0 auto 28px',
                    background: s.bg, border: `1px solid ${s.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px', position: 'relative', zIndex: 1,
                    boxShadow: `0 4px 20px ${s.glow}`,
                  }}
                >
                  {s.icon}
                  <span style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: s.color, color: '#fff', fontSize: '10px', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 2px 10px ${s.glow}`,
                  }}>
                    {i + 1}
                  </span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.02em' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.72, color: '#64748b', margin: 0 }}>{s.desc}</p>
                <div style={{ width: '28px', height: '3px', borderRadius: '2px', background: s.color, margin: '16px auto 0', opacity: 0.4 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA strip */}
        <div className="lp-glass" style={{ borderRadius: '16px', padding: '28px 36px', marginTop: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', boxShadow: 'rgba(15, 23, 42, 0.12) 0px 24px 64px, rgba(15, 23, 42, 0.06) 0px 0px 0px 1px' }}>
          <div>
            <p style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Ready to see your personalized plan?</p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Takes less than 2 minutes to set up.</p>
          </div>
          <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-primary" style={{ fontSize: '15px', padding: '12px 26px', flexShrink: 0 }}>
            Build My Plan →
          </a>
        </div>

      </div>
    </section>
  );
}
