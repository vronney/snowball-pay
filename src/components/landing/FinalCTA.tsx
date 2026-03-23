export default function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.015)' }}>
      {/* Background orbs */}
      <div className="lp-orb" style={{ width: '700px', height: '700px', background: 'rgba(79,158,255,0.1)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animationDelay: '0.8s' }} />
      <div className="lp-orb" style={{ width: '360px', height: '360px', background: 'rgba(139,92,246,0.08)', top: '10%', right: '5%', animationDelay: '3s' }} />
      <div className="lp-orb" style={{ width: '280px', height: '280px', background: 'rgba(16,185,129,0.07)', bottom: '10%', left: '5%', animationDelay: '1.5s' }} />

      <div style={{ maxWidth: '660px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        {/* Card */}
        <div className="lp-glass-hi" style={{ borderRadius: '32px', padding: '72px 48px 64px', boxShadow: '0 48px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>

          {/* Top glow strip */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(to right, transparent, rgba(79,158,255,0.5), transparent)' }} />

          {/* Icon */}
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(79,158,255,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(79,158,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 28px' }}>
            🏁
          </div>

          {/* Headline */}
          <h2 style={{ fontSize: 'clamp(2rem, 5.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#eef4ff', margin: '0 0 16px', lineHeight: 1.1 }}>
            Your debt-free life{' '}
            <span className="lp-text-blue">starts today.</span>
          </h2>

          {/* Sub */}
          <p style={{ fontSize: '17px', color: '#7a9bbf', marginBottom: '40px', lineHeight: 1.7, maxWidth: '420px', margin: '0 auto 40px' }}>
            Join 10,000+ people who took control of their finances and reached debt-free ahead of schedule.
          </p>

          {/* CTAs */}
          <div className="lp-cta-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginBottom: '24px' }}>
            {isLoggedIn ? (
              <a href="/dashboard" className="lp-btn lp-btn-primary" style={{ fontSize: '17px', padding: '17px 40px' }}>
                Open Dashboard →
              </a>
            ) : (
              <>
                <a href="/auth/login?returnTo=/dashboard" className="lp-btn lp-btn-primary" style={{ fontSize: '17px', padding: '17px 40px' }}>
                  Create Free Account
                </a>
                <a href="#how-it-works" className="lp-btn lp-btn-ghost" style={{ fontSize: '15px' }}>
                  See How It Works ↓
                </a>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '32px', flexWrap: 'wrap' }}>
            {['🔒 Bank-level encryption', '⚡ Set up in 2 minutes', '🚫 No bank access required'].map((b, i) => (
              <span key={i} style={{ fontSize: '11px', color: '#3d5570', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>{b}</span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
