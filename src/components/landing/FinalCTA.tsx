export default function FinalCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section style={{ padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
      <div className="orb" style={{ width: '600px', height: '600px', background: 'rgba(59,130,246,0.1)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animationDelay: '1s' }} />
      <div style={{ maxWidth: '580px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div className="glass" style={{ borderRadius: '28px', padding: '60px 40px', boxShadow: '0 32px 70px rgba(0,0,0,0.45)' }}>
          <p style={{ fontSize: '52px', marginBottom: '20px' }}>🏁</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
            Your debt-free life{' '}
            <span className="text-gradient">starts today.</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', lineHeight: 1.6 }}>
            Join thousands who&apos;ve taken control of their finances.
          </p>
          {isLoggedIn ? (
            <a href="/dashboard" className="btn-glow" style={{ display: 'inline-block', padding: '15px 36px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', textDecoration: 'none' }}>
              Open Dashboard →
            </a>
          ) : (
            <a href="/auth/login?returnTo=/dashboard" className="btn-glow" style={{ display: 'inline-block', padding: '15px 36px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', textDecoration: 'none' }}>
              Create Free Account
            </a>
          )}
          <p style={{ fontSize: '12px', color: '#475569', marginTop: '16px' }}>
            No credit card required. Free forever for up to 5 debts.
          </p>
        </div>
      </div>
    </section>
  );
}
