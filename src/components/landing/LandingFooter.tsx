import Image from 'next/image';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Case Studies', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
  ],
  Company: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Contact', href: 'mailto:hello@snowballpay.app' },
  ],
  Resources: [
    { label: 'Debt Snowball Guide', href: '#how-it-works' },
    { label: 'Interest Calculator', href: '/auth/login?returnTo=/dashboard' },
    { label: 'Payoff Planner', href: '/auth/login?returnTo=/dashboard' },
  ],
};

export default function LandingFooter() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '64px 24px 40px' }}>

        {/* Top section */}
        <div className="lp-ftr-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '48px', marginBottom: '56px' }}>

          {/* Brand col */}
          <div>
            <a href="/" style={{ display: 'inline-block', marginBottom: '18px', textDecoration: 'none' }}>
              <Image src="/logo.svg" alt="SnowballPay" width={152} height={29} />
            </a>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#3d5570', maxWidth: '280px', marginBottom: '24px' }}>
              The proven Debt Snowball tracker that turns overwhelming balances into a clear, motivating path to financial freedom.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['𝕏', 'in', 'yt'].map((s, i) => (
                <div key={i} style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#3d5570', cursor: 'pointer' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', color: '#eef4ff', textTransform: 'uppercase', marginBottom: '20px' }}>
                {heading}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {links.map((l) => (
                  <a key={l.label} href={l.href} className="lp-ftr-link">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.055)', marginBottom: '28px' }} />

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: '#2d4460' }}>
            © {new Date().getFullYear()} SnowballPay. All rights reserved.
          </p>
          <p style={{ fontSize: '12px', color: '#2d4460' }}>
            Built to help real people reach financial freedom. 🏔️
          </p>
        </div>
      </div>
    </footer>
  );
}
