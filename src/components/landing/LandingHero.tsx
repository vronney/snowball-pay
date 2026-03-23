const debtRows = [
  { label: 'Credit Card',  remaining: '$3,200', paid: '$6,800', pct: 68, color: '#4f9eff' },
  { label: 'Car Loan',     remaining: '$8,100', paid: '$5,900', pct: 42, color: '#8b5cf6' },
  { label: 'Student Loan', remaining: '$7,120', paid: '$2,080', pct: 22, color: '#06b6d4' },
];

export default function LandingHero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section
      className="lp-hero-bg"
      style={{ position: 'relative', overflow: 'hidden', paddingTop: '148px', paddingBottom: '112px', paddingLeft: '24px', paddingRight: '24px' }}
    >
      {/* Background orbs */}
      <div className="lp-orb" style={{ width: '860px', height: '860px', background: 'rgba(79,158,255,0.09)', top: '-420px', right: '-180px', animationDelay: '0s' }} />
      <div className="lp-orb" style={{ width: '560px', height: '560px', background: 'rgba(139,92,246,0.08)', bottom: '-240px', left: '-180px', animationDelay: '3.5s' }} />
      <div className="lp-orb" style={{ width: '340px', height: '340px', background: 'rgba(6,182,212,0.07)', top: '55%', left: '35%', animationDelay: '1.8s' }} />

      {/* Subtle grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '72px 72px',
      }} />

      <div style={{ maxWidth: '1160px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="lp-hero-cols" style={{ display: 'flex', alignItems: 'center', gap: '56px' }}>

          {/* ── Left: Copy ───────────────────────────── */}
          <div style={{ flex: '1 1 500px', maxWidth: '560px' }}>

            {/* Eyebrow pill */}
            <div className="lp-f1 lp-glass-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '7px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#6bb8ff', marginBottom: '30px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4f9eff', boxShadow: '0 0 10px #4f9eff', flexShrink: 0, display: 'inline-block' }} />
              The proven path to debt freedom
            </div>

            {/* Headline */}
            <h1 className="lp-f2" style={{ fontSize: 'clamp(2.9rem, 7.5vw, 5rem)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.048em', marginBottom: '26px', color: '#eef4ff' }}>
              <span className="lp-text-blue">Eliminate Debt.</span>
              <br />
              <span>Build Lasting</span>
              <br />
              <span>Financial Freedom.</span>
            </h1>

            {/* Subheading */}
            <p className="lp-f3" style={{ fontSize: '18px', lineHeight: 1.72, color: '#7a9bbf', maxWidth: '500px', marginBottom: '42px' }}>
              Use the proven Debt Snowball method — track every balance, build unstoppable momentum, and reach debt-free faster than you think.
            </p>

            {/* CTA row */}
            <div className="lp-f4 lp-cta-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '52px' }}>
              {isLoggedIn ? (
                <a href="/dashboard" className="lp-btn lp-btn-primary" style={{ fontSize: '16px', padding: '16px 36px' }}>
                  Open Dashboard →
                </a>
              ) : (
                <>
                  <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-primary" style={{ fontSize: '16px', padding: '16px 36px' }}>
                    Start Free — No Card Needed
                  </a>
                  <a href="#how-it-works" className="lp-btn lp-btn-ghost" style={{ fontSize: '15px' }}>
                    See How It Works ↓
                  </a>
                </>
              )}
            </div>

            {/* Micro stats */}
            <div className="lp-f5" style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>
              {[
                { val: '10k+',  label: 'Active Users' },
                { val: '$14k',  label: 'Avg. Interest Saved' },
                { val: '3.2yr', label: 'Avg. Payoff Time' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  {i > 0 && <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.08)', margin: '0 24px' }} />}
                  <div>
                    <div style={{ fontSize: '19px', fontWeight: 900, color: '#eef4ff', letterSpacing: '-0.03em' }}>{s.val}</div>
                    <div style={{ fontSize: '11px', color: '#3d5570', fontWeight: 500, marginTop: '2px' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Visual composition ─────────────── */}
          <div className="lp-hero-right lp-f6" style={{ flex: '1 1 440px', maxWidth: '480px', position: 'relative', paddingBottom: '32px', paddingRight: '28px' }}>

            {/* Main dashboard card */}
            <div className="lp-glass lp-shimmer" style={{ borderRadius: '24px', padding: '28px 28px 24px', boxShadow: '0 48px 96px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)' }}>

              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '26px' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#3d5570', textTransform: 'uppercase', marginBottom: '6px' }}>Total Remaining</p>
                  <p style={{ fontSize: '36px', fontWeight: 900, color: '#eef4ff', letterSpacing: '-0.04em', lineHeight: 1 }}>$18,420</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: '#3d5570', textTransform: 'uppercase', marginBottom: '6px' }}>Est. Payoff</p>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: '#06b6d4', letterSpacing: '-0.02em' }}>Mar 2027</p>
                </div>
              </div>

              {/* Debt progress rows */}
              {debtRows.map((d, i) => (
                <div key={i} style={{ marginBottom: i < debtRows.length - 1 ? '20px' : '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#c0d4e8' }}>{d.label}</span>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#3d5570' }}>Paid {d.paid}</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#eef4ff' }}>{d.remaining}</span>
                    </div>
                  </div>
                  <div className="lp-track">
                    <div
                      className="lp-bar"
                      style={{ width: `${d.pct}%`, background: `linear-gradient(90deg, ${d.color}, ${d.color}88)`, ['--bar-w' as string]: `${d.pct}%` }}
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: '#3d5570', marginTop: '4px' }}>{d.pct}% paid off</p>
                </div>
              ))}

              {/* Footer strip */}
              <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.055)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#3d5570' }}>Next payment due</span>
                <span className="lp-glass-blue" style={{ fontSize: '12px', fontWeight: 800, padding: '5px 14px', borderRadius: '999px', color: '#6bb8ff' }}>$340 on Apr 1</span>
              </div>
            </div>

            {/* Floating badge — savings (top-right) */}
            <div className="lp-glass-green lp-float" style={{ position: 'absolute', top: '-22px', right: '-20px', borderRadius: '18px', padding: '14px 18px', boxShadow: '0 18px 44px rgba(0,0,0,0.55)', animationDelay: '0.8s' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#34d399', textTransform: 'uppercase', marginBottom: '4px' }}>Interest Saved</p>
              <p style={{ fontSize: '22px', fontWeight: 900, color: '#6ee7b7', letterSpacing: '-0.03em' }}>+$4,280</p>
              <p style={{ fontSize: '11px', color: '#1c5e42' }}>so far this year</p>
            </div>

            {/* Floating badge — streak (bottom-left) */}
            <div className="lp-glass-purple lp-float2" style={{ position: 'absolute', bottom: '-4px', left: '-26px', borderRadius: '18px', padding: '14px 18px', boxShadow: '0 18px 44px rgba(0,0,0,0.55)', animationDelay: '2.2s' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: '4px' }}>Payment Streak</p>
              <p style={{ fontSize: '22px', fontWeight: 900, color: '#c4b5fd', letterSpacing: '-0.03em' }}>8 months</p>
              <p style={{ fontSize: '11px', color: '#4a3070' }}>on-time payments</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
