import Image from 'next/image';

export default function LandingFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image src="/logo.svg" alt="SnowballPay" width={146} height={28} />
          <span style={{ fontSize: '13px', color: '#475569' }}>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy</a>
          <a href="#" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Terms</a>
        </div>
      </div>
    </footer>
  );
}
