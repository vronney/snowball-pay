export default function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav className="nav-blur fixed top-0 left-0 right-0 z-50">
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>❄️</span>
          <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: '#e2e8f0' }}>SnowballPay</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isLoggedIn ? (
            <>
              <a href="/auth/logout" style={{ fontSize: '14px', color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Sign Out</a>
              <a href="/dashboard" className="btn-glow" style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', textDecoration: 'none', display: 'inline-block' }}>
                Open Dashboard →
              </a>
            </>
          ) : (
            <a href="/auth/login?returnTo=/dashboard" className="btn-glow" style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', textDecoration: 'none', display: 'inline-block' }}>
              Sign In
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
