export default function LandingFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>❄️</span>
          <span style={{ fontWeight: 800, fontSize: '16px', color: '#e2e8f0' }}>SnowballPay</span>
          <span style={{ fontSize: '13px', color: '#475569', marginLeft: '12px' }}>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy</a>
          <a href="#" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Terms</a>
        </div>
      </div>
    </footer>
  );
}
