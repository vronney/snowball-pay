const debtRows = [
  { label: 'Credit Card',  remaining: '$3,200', paid: '$6,800', pct: 68, color: '#3b82f6' },
  { label: 'Car Loan',     remaining: '$8,100', paid: '$5,900', pct: 42, color: '#6ec1e4' },
  { label: 'Student Loan', remaining: '$7,120', paid: '$2,080', pct: 22, color: '#8b5cf6' },
];

export default function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="hero-bg" style={{ position: 'relative', overflow: 'hidden', paddingTop: '120px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
      <div className="orb" style={{ width: '700px', height: '700px', background: 'rgba(59,130,246,0.13)', top: '-300px', right: '-200px', animationDelay: '0s' }} />
      <div className="orb" style={{ width: '450px', height: '450px', background: 'rgba(110,193,228,0.09)', bottom: '-150px', left: '-150px', animationDelay: '2.5s' }} />

      <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        {/* Badge */}
        <div className="fade-1 glass-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '6px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, color: '#93c5fd', marginBottom: '28px' }}>
          <span>✨</span> The proven path to debt freedom
        </div>

        {/* Headline */}
        <h1 className="fade-2" style={{ fontSize: 'clamp(2.6rem, 7vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.04em', margin: '0 0 22px' }}>
          <span className="text-gradient">Crush Your Debt.</span>
          <br />
          <span style={{ color: '#e2e8f0' }}>One Payment at a Time.</span>
        </h1>

        {/* Sub */}
        <p className="fade-3" style={{ fontSize: '18px', lineHeight: 1.7, color: '#94a3b8', maxWidth: '580px', margin: '0 auto 36px' }}>
          Use the proven Debt Snowball method to pay off every balance faster — and actually see your progress.
        </p>

        {/* CTA buttons */}
        <div className="fade-4" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '60px' }}>
          {isLoggedIn ? (
            <a href="/dashboard" className="btn-glow" style={{ padding: '15px 32px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', textDecoration: 'none', display: 'inline-block' }}>
              Open Dashboard →
            </a>
          ) : (
            <>
              <a href="/auth/login?returnTo=/dashboard" className="btn-glow" style={{ padding: '15px 32px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', textDecoration: 'none', display: 'inline-block' }}>
                Start Free — Get Out of Debt
              </a>
              <a href="#how-it-works" className="btn-ghost glass" style={{ padding: '15px 28px', borderRadius: '12px', fontWeight: 600, fontSize: '15px', color: '#cbd5e1', textDecoration: 'none', display: 'inline-block' }}>
                See How It Works ↓
              </a>
            </>
          )}
        </div>

        {/* Mock Dashboard Card */}
        <div className="fade-5 glass" style={{ maxWidth: '480px', margin: '0 auto', borderRadius: '20px', padding: '28px', boxShadow: '0 32px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Total Remaining</p>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.03em' }}>$18,420</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Est. Payoff</p>
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#6ec1e4' }}>Mar 2027</p>
            </div>
          </div>

          {debtRows.map((d, i) => (
            <div key={i} style={{ marginBottom: i < debtRows.length - 1 ? '18px' : '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>{d.label}</span>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#475569' }}>Paid {d.paid}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{d.remaining}</span>
                </div>
              </div>
              <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.pct}%`, borderRadius: '999px', background: `linear-gradient(90deg, ${d.color}, ${d.color}88)` }} />
              </div>
              <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{d.pct}% paid off</p>
            </div>
          ))}

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Next payment due</span>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '999px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>$340 on Apr 1</span>
          </div>
        </div>
      </div>
    </section>
  );
}
