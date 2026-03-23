const stats = [
  { value: '10,000+', label: 'Active Users' },
  { value: '$14,200', label: 'Avg. Interest Saved' },
  { value: '3.2 yrs',  label: 'Avg. Time to Debt-Free' },
  { value: '97%',     label: 'User Satisfaction' },
];

const BRANDS = ['Forbes', 'TechCrunch', 'Product Hunt', 'Hacker News', 'Business Insider', 'The Motley Fool', 'NerdWallet', 'Forbes', 'TechCrunch', 'Product Hunt', 'Hacker News', 'Business Insider', 'The Motley Fool', 'NerdWallet'];

export default function SocialProofStrip() {
  return (
    <div>
      {/* Scrolling ticker */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', padding: '20px 0', background: 'rgba(255,255,255,0.012)', position: 'relative' }}>
        {/* Edge fade masks */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '120px', background: 'linear-gradient(to right, #05091a, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '120px', background: 'linear-gradient(to left, #05091a, transparent)', zIndex: 2, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0', paddingLeft: '140px' }}>
          <div style={{ flexShrink: 0, paddingRight: '56px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', color: '#2d4460', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            As seen in
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="lp-ticker">
              {BRANDS.map((b, i) => (
                <span key={i} style={{ fontSize: '13px', fontWeight: 700, color: '#3d5870', letterSpacing: '0.04em' }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: 'rgba(255,255,255,0.018)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="lp-stat-wrap" style={{ maxWidth: '960px', margin: '0 auto', padding: '44px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '0' }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0 40px' }}>
                <div className="lp-text-blue" style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.3rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '5px' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: '#3d5570', letterSpacing: '0.03em', fontWeight: 500 }}>{s.label}</div>
              </div>
              {i < stats.length - 1 && (
                <div style={{ width: '1px', height: '52px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
