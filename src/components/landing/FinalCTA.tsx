const trustRows = [
  [
    { icon: '🔒', label: 'AES-256 Encryption' },
    { icon: '⚡', label: 'Setup in 2 minutes' },
    { icon: '🚫', label: 'No bank access required' },
  ],
  [
    { icon: '🛡️', label: 'GDPR Compliant' },
    { icon: '↩',  label: 'Cancel anytime' },
    { icon: '💳', label: 'No credit card needed' },
  ],
];

export default function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>

      <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        {/* Card */}
        <div style={{
          borderRadius: '32px', padding: '72px 48px 60px',
          background: '#ffffff',
          border: '1px solid rgba(37,99,235,0.12)',
          boxShadow: '0 4px 32px rgba(37,99,235,0.08), 0 1px 4px rgba(15,23,42,0.06)',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: 'linear-gradient(to right, transparent, #2563eb, transparent)' }} />

          {/* Icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '22px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.08))',
            border: '1px solid rgba(37,99,235,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '30px', margin: '0 auto 30px',
          }}>
            🏁
          </div>

          {/* Headline */}
          <h2 style={{ fontSize: 'clamp(2rem, 5.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#0f172a', margin: '0 0 16px', lineHeight: 1.1 }}>
            Your debt-free life{' '}
            <span className="lp-text-blue">starts today.</span>
          </h2>

          {/* Sub */}
          <p style={{ fontSize: '17px', color: '#64748b', lineHeight: 1.7, maxWidth: '420px', margin: '0 auto 40px' }}>
            Join 10,000+ people who took control of their finances and reached debt-free ahead of schedule.
          </p>

          {/* CTAs */}
          <div className="lp-cta-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginBottom: '36px' }}>
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

          {/* Trust badges grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            {trustRows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {row.map((b, bi) => (
                  <div key={bi} className="lp-trust-badge">
                    <span style={{ fontSize: '13px' }}>{b.icon}</span>
                    {b.label}
                  </div>
                ))}
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
